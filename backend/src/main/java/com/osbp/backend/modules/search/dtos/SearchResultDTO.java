package com.osbp.backend.modules.search.dtos;

import java.util.List;

/**
 * Root response DTO for search operations.
 *
 * @param query                 the original search term
 * @param matchingSectionsCount total number of sections containing the term
 * @param totalOccurrences      total number of times the term appears across the entire manual (matches PDF Ctrl+F)
 * @param hits                  the ranked list of matching sections
 */
public record SearchResultDTO(
        String query,
        long matchingSectionsCount,
        long totalOccurrences,
        List<SearchHitDTO> hits
) { }
