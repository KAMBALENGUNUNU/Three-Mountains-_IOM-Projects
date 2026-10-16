package com.osbp.backend.modules.search.services;

/**
 * Service interface for building and maintaining the Lucene search index.
 */
public interface LuceneIndexService {

    /**
     * Drops and rebuilds the entire Lucene index from all {@code Section} records
     * in the database. This should be called after a successful PDF ingestion.
     *
     * @throws Exception if an I/O or Lucene error occurs
     */
    void rebuildIndex() throws Exception;

    /**
     * Updates or adds a single section in the Lucene index.
     *
     * @param section the modified section entity
     * @throws Exception if indexing fails
     */
    void updateSectionIndex(com.osbp.backend.modules.manual.models.Section section) throws Exception;

    /**
     * Removes a section from the Lucene index by its ID.
     *
     * @param sectionId the database ID of the section to remove
     * @throws Exception if deletion from index fails
     */
    void deleteSectionIndex(Long sectionId) throws Exception;
}
