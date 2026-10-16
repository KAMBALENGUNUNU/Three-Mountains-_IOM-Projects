package com.osbp.backend.modules.search.services.impl;

import com.osbp.backend.modules.manual.models.Section;
import com.osbp.backend.modules.manual.repositories.SectionRepository;
import com.osbp.backend.modules.search.services.LuceneIndexService;
import org.apache.lucene.analysis.standard.StandardAnalyzer;
import org.apache.lucene.document.Document;
import org.apache.lucene.document.Field;
import org.apache.lucene.document.StoredField;
import org.apache.lucene.document.StringField;
import org.apache.lucene.document.TextField;
import org.apache.lucene.index.IndexWriter;
import org.apache.lucene.index.IndexWriterConfig;
import org.apache.lucene.store.Directory;
import org.apache.lucene.store.FSDirectory;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;

/**
 * Builds and maintains the Apache Lucene full-text search index.
 * <p>
 * The index is stored on disk at the path configured by {@code lucene.index.path}.
 * Each {@link Section} entity is mapped to a Lucene {@link Document} containing:
 * <ul>
 *   <li>{@code sectionId} — stored {@link StringField} (not tokenized)</li>
 *   <li>{@code title}     — stored + indexed {@link TextField} (tokenized)</li>
 *   <li>{@code content}   — stored + indexed {@link TextField} (tokenized)</li>
 * </ul>
 */
@Service
public class LuceneIndexServiceImpl implements LuceneIndexService {

    private static final Logger log = LoggerFactory.getLogger(LuceneIndexServiceImpl.class);

    /** Lucene field name constants — shared with the search service. */
    public static final String FIELD_SECTION_ID = "sectionId";
    public static final String FIELD_TITLE      = "title";
    public static final String FIELD_CONTENT    = "content";

    @Value("${lucene.index.path}")
    private String indexPath;

    private final SectionRepository sectionRepository;

    public LuceneIndexServiceImpl(SectionRepository sectionRepository) {
        this.sectionRepository = sectionRepository;
    }

    // ------------------------------------------------------------------ //
    //  Public API
    // ------------------------------------------------------------------ //

    /**
     * Drops and fully rebuilds the index from all sections currently in the database.
     */
    @Override
    @Transactional(readOnly = true)
    public void rebuildIndex() throws Exception {
        List<Section> sections = sectionRepository.findAllByOrderByIdAsc();
        log.info("Rebuilding Lucene index for {} sections at path: {}", sections.size(), indexPath);

        Path path = Paths.get(indexPath);
        try (Directory directory = FSDirectory.open(path);
             StandardAnalyzer analyzer = new StandardAnalyzer();
             IndexWriter writer = new IndexWriter(directory, new IndexWriterConfig(analyzer))) {

            // Delete all existing documents first
            writer.deleteAll();

            for (Section section : sections) {
                writer.addDocument(toDocument(section));
            }

            writer.commit();
        }

        log.info("Lucene index rebuild complete. {} documents indexed.", sections.size());
    }

    @Override
    public void updateSectionIndex(Section section) throws Exception {
        Path path = Paths.get(indexPath);
        try (Directory directory = FSDirectory.open(path);
             StandardAnalyzer analyzer = new StandardAnalyzer();
             IndexWriter writer = new IndexWriter(directory, new IndexWriterConfig(analyzer))) {

            writer.updateDocument(new org.apache.lucene.index.Term(FIELD_SECTION_ID, section.getId().toString()), toDocument(section));
            writer.commit();
        }
        log.info("Updated Lucene index for section: id={}, title='{}'", section.getId(), section.getTitle());
    }

    @Override
    public void deleteSectionIndex(Long sectionId) throws Exception {
        Path path = Paths.get(indexPath);
        try (Directory directory = FSDirectory.open(path);
             StandardAnalyzer analyzer = new StandardAnalyzer();
             IndexWriter writer = new IndexWriter(directory, new IndexWriterConfig(analyzer))) {

            writer.deleteDocuments(new org.apache.lucene.index.Term(FIELD_SECTION_ID, sectionId.toString()));
            writer.commit();
        }
        log.info("Deleted section id={} from Lucene index.", sectionId);
    }

    // ------------------------------------------------------------------ //
    //  Mapping
    // ------------------------------------------------------------------ //

    private Document toDocument(Section section) {
        Document doc = new Document();

        // sectionId: stored but NOT tokenized — used to look up the entity later
        doc.add(new StringField(FIELD_SECTION_ID, section.getId().toString(), Field.Store.YES));

        // title: stored AND indexed/tokenized for full-text search
        doc.add(new TextField(FIELD_TITLE, section.getTitle(), Field.Store.YES));

        // content: stored AND indexed/tokenized for full-text search
        doc.add(new TextField(FIELD_CONTENT, section.getContent(), Field.Store.YES));

        return doc;
    }
}
