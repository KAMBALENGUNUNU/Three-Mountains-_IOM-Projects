package com.osbp.backend.modules.search.services.impl;

import com.osbp.backend.modules.manual.models.Section;
import com.osbp.backend.modules.manual.repositories.SectionRepository;
import com.osbp.backend.modules.search.dtos.SearchHitDTO;
import com.osbp.backend.modules.search.dtos.SearchResultDTO;
import com.osbp.backend.modules.search.services.LuceneIndexService;
import com.osbp.backend.modules.search.services.LuceneSearchService;
import org.apache.lucene.analysis.standard.StandardAnalyzer;
import org.apache.lucene.document.Document;
import org.apache.lucene.index.DirectoryReader;
import org.apache.lucene.index.IndexReader;
import org.apache.lucene.queryparser.classic.MultiFieldQueryParser;
import org.apache.lucene.queryparser.classic.QueryParser;
import org.apache.lucene.search.*;
import org.apache.lucene.store.Directory;
import org.apache.lucene.store.FSDirectory;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.nio.file.Files;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Runs full-text searches against the Lucene index with occurrence metrics,
 * snippet extraction, and configurable result limits.
 * Includes automatic index verification, on-the-fly container rebuilding,
 * and seamless PostgreSQL database search fallback.
 */
@Service
public class LuceneSearchServiceImpl implements LuceneSearchService {

    private static final Logger log = LoggerFactory.getLogger(LuceneSearchServiceImpl.class);
    private static final int DEFAULT_MAX_RESULTS = 50;
    private static final int SNIPPET_RADIUS      = 120;

    @Value("${lucene.index.path}")
    private String indexPath;

    private final SectionRepository sectionRepository;
    private final LuceneIndexService luceneIndexService;

    public LuceneSearchServiceImpl(SectionRepository sectionRepository,
                                   LuceneIndexService luceneIndexService) {
        this.sectionRepository = sectionRepository;
        this.luceneIndexService = luceneIndexService;
    }

    @Override
    public List<SearchHitDTO> search(String queryString) throws Exception {
        return searchDetailed(queryString, DEFAULT_MAX_RESULTS).hits();
    }

    @Override
    public SearchResultDTO searchDetailed(String queryString, Integer limit) throws Exception {
        if (queryString == null || queryString.isBlank()) {
            return new SearchResultDTO("", 0, 0, List.of());
        }

        String queryTrimmed = queryString.trim();
        java.nio.file.Path path = Paths.get(indexPath);

        boolean hasIndex = false;
        if (Files.exists(path)) {
            try (Directory dir = FSDirectory.open(path)) {
                hasIndex = DirectoryReader.indexExists(dir);
            } catch (Exception ignored) {}
        }

        // If Lucene index does not exist in this container, trigger async/on-demand rebuild and use DB fallback
        if (!hasIndex) {
            log.warn("Lucene search index directory does not exist or has no segments at: {}. Triggering rebuild and serving from PostgreSQL database.", indexPath);
            try {
                luceneIndexService.rebuildIndex();
            } catch (Exception e) {
                log.error("Failed to rebuild Lucene index on-the-fly: {}", e.getMessage());
            }
            return databaseFallbackSearch(queryTrimmed, limit);
        }

        try (Directory directory = FSDirectory.open(path);
             IndexReader reader = DirectoryReader.open(directory);
             StandardAnalyzer analyzer = new StandardAnalyzer()) {

            if (reader.numDocs() == 0) {
                log.warn("Lucene index at {} has 0 docs. Using database search.", indexPath);
                return databaseFallbackSearch(queryTrimmed, limit);
            }

            IndexSearcher searcher = new IndexSearcher(reader);
            String[] fields = {
                    LuceneIndexServiceImpl.FIELD_TITLE,
                    LuceneIndexServiceImpl.FIELD_CONTENT
            };

            int maxHits = (limit != null && limit > 0) ? limit : Math.max(DEFAULT_MAX_RESULTS, reader.numDocs());

            // Build combined query: exact match has high boost, fuzzy query enables typo tolerance
            BooleanQuery.Builder mainQueryBuilder = new BooleanQuery.Builder();

            // 1. Exact query (boosted)
            MultiFieldQueryParser exactParser = new MultiFieldQueryParser(fields, analyzer);
            exactParser.setDefaultOperator(QueryParser.Operator.OR);
            try {
                Query exactQuery = exactParser.parse(QueryParser.escape(queryTrimmed));
                BoostQuery boostedExact = new BoostQuery(exactQuery, 3.0f);
                mainQueryBuilder.add(boostedExact, BooleanClause.Occur.SHOULD);
            } catch (Exception ignored) { }

            // 2. Fuzzy query (typo-tolerant)
            String fuzzyString = buildFuzzyQueryString(queryTrimmed);
            MultiFieldQueryParser fuzzyParser = new MultiFieldQueryParser(fields, analyzer);
            fuzzyParser.setDefaultOperator(QueryParser.Operator.OR);
            try {
                Query fuzzyQuery = fuzzyParser.parse(fuzzyString);
                mainQueryBuilder.add(fuzzyQuery, BooleanClause.Occur.SHOULD);
            } catch (Exception ignored) { }

            Query combinedQuery = mainQueryBuilder.build();
            TopDocs topDocs = searcher.search(combinedQuery, maxHits);

            long matchingSections = topDocs.totalHits.value;

            // If Lucene produced 0 hits (e.g. specialized terminology or partial word prefix), try database fallback
            if (matchingSections == 0) {
                SearchResultDTO dbResults = databaseFallbackSearch(queryTrimmed, limit);
                if (dbResults.matchingSectionsCount() > 0) {
                    return dbResults;
                }
            }

            long globalOccurrences = 0;
            List<SearchHitDTO> hits = new ArrayList<>();

            // Search word regex for counting occurrences in text
            Pattern wordPattern = Pattern.compile(Pattern.quote(queryTrimmed), Pattern.CASE_INSENSITIVE);

            for (ScoreDoc scoreDoc : topDocs.scoreDocs) {
                Document doc = searcher.storedFields().document(scoreDoc.doc);

                String sectionIdStr = doc.get(LuceneIndexServiceImpl.FIELD_SECTION_ID);
                String title        = doc.get(LuceneIndexServiceImpl.FIELD_TITLE);
                String content      = doc.get(LuceneIndexServiceImpl.FIELD_CONTENT);

                Long sectionId = Long.parseLong(sectionIdStr);

                // Count exact term occurrences in this section (title + content)
                int sectionOccurrences = countOccurrences(title + "\n" + content, wordPattern);
                globalOccurrences += sectionOccurrences;

                String snippet = buildContextSnippet(content, title, queryTrimmed);

                hits.add(new SearchHitDTO(sectionId, title, snippet, scoreDoc.score, Math.max(1, sectionOccurrences)));
            }

            return new SearchResultDTO(queryTrimmed, matchingSections, globalOccurrences, hits);
        } catch (Exception ex) {
            log.error("Lucene error during search for '{}': {}. Falling back to PostgreSQL search.", queryTrimmed, ex.getMessage());
            return databaseFallbackSearch(queryTrimmed, limit);
        }
    }

    /**
     * Database-level search fallback using PostgreSQL directly.
     * Ensures search NEVER fails in cloud/container environments.
     */
    private SearchResultDTO databaseFallbackSearch(String queryTrimmed, Integer limit) {
        log.info("Executing database fallback search for query: '{}'", queryTrimmed);
        List<Section> matching = sectionRepository.searchByKeyword(queryTrimmed);
        if (matching.isEmpty()) {
            return new SearchResultDTO(queryTrimmed, 0, 0, List.of());
        }

        Pattern wordPattern = Pattern.compile(Pattern.quote(queryTrimmed), Pattern.CASE_INSENSITIVE);
        long globalOccurrences = 0;
        List<SearchHitDTO> hits = new ArrayList<>();
        int max = (limit != null && limit > 0) ? limit : DEFAULT_MAX_RESULTS;

        for (Section section : matching) {
            String title = section.getTitle();
            String content = section.getContent();
            int sectionOccurrences = countOccurrences(title + "\n" + content, wordPattern);
            globalOccurrences += sectionOccurrences;
            String snippet = buildContextSnippet(content, title, queryTrimmed);

            hits.add(new SearchHitDTO(
                    section.getId(),
                    title,
                    snippet,
                    1.0f,
                    Math.max(1, sectionOccurrences)
            ));

            if (hits.size() >= max) {
                break;
            }
        }

        return new SearchResultDTO(
                queryTrimmed,
                hits.size(),
                globalOccurrences,
                hits
        );
    }

    private String buildFuzzyQueryString(String raw) {
        String escaped = QueryParser.escape(raw.trim());
        String[] tokens = escaped.split("\\s+");
        StringBuilder sb = new StringBuilder();
        for (String token : tokens) {
            if (!token.isBlank()) {
                sb.append(token).append("~ ").append(token).append("* ");
            }
        }
        return sb.toString().trim();
    }

    private int countOccurrences(String text, Pattern pattern) {
        if (text == null || text.isEmpty()) return 0;
        Matcher m = pattern.matcher(text);
        int count = 0;
        while (m.find()) {
            count++;
        }
        return count;
    }

    private String buildContextSnippet(String content, String title, String term) {
        if (content == null || content.isBlank()) {
            return title;
        }

        int idx = content.toLowerCase().indexOf(term.toLowerCase());
        if (idx == -1) {
            return content.length() <= 200 ? content : content.substring(0, 200) + "…";
        }

        int start = Math.max(0, idx - SNIPPET_RADIUS);
        int end = Math.min(content.length(), idx + term.length() + SNIPPET_RADIUS);

        String prefix = (start > 0) ? "…" : "";
        String suffix = (end < content.length()) ? "…" : "";

        return prefix + content.substring(start, end).trim() + suffix;
    }
}
