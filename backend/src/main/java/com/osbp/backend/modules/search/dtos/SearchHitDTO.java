package com.osbp.backend.modules.search.dtos;

/**
 * DTO representing a single Lucene search hit.
 *
 * @param sectionId   the database ID of the matching section
 * @param title       the title of the matching section
 * @param snippet     a short excerpt from the section content containing the matched terms
 * @param score       the Lucene relevance score for this hit
 * @param occurrences number of times the search query appears in this section
 */
public record SearchHitDTO(Long sectionId, String title, String snippet, float score, int occurrences) {

    public SearchHitDTO(Long sectionId, String title, String snippet, float score) {
        this(sectionId, title, snippet, score, 1);
    }
}
