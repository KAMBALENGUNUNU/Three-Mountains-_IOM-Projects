package com.osbp.backend.modules.search.services;

import com.osbp.backend.modules.search.dtos.SearchHitDTO;
import com.osbp.backend.modules.search.dtos.SearchResultDTO;

import java.util.List;

/**
 * Service interface for running full-text searches against the Lucene index.
 */
public interface LuceneSearchService {

    /**
     * Searches the Lucene index for sections matching the given query string.
     *
     * @param queryString the raw search query entered by the user
     * @return ordered list of {@link SearchHitDTO} (best match first)
     * @throws Exception if a Lucene parsing or I/O error occurs
     */
    List<SearchHitDTO> search(String queryString) throws Exception;

    /**
     * Searches the manual with full occurrence counts and configurable result limits.
     *
     * @param queryString the raw search query
     * @param limit       maximum number of matching sections to return (null or <=0 for all hits)
     * @return a {@link SearchResultDTO} containing total occurrences, section count, and hits
     * @throws Exception if search fails
     */
    SearchResultDTO searchDetailed(String queryString, Integer limit) throws Exception;
}
