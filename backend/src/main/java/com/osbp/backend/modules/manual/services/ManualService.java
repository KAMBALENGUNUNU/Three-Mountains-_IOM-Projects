package com.osbp.backend.modules.manual.services;

import com.osbp.backend.modules.manual.dtos.SectionDTO;
import com.osbp.backend.modules.manual.dtos.TocResponseDTO;

/**
 * Service interface for manual content retrieval operations.
 */
public interface ManualService {

    /**
     * Returns the full hierarchical Table of Contents
     * (Topics → SubTopics → Sections).
     *
     * @return a {@link TocResponseDTO} with the complete TOC tree
     */
    TocResponseDTO getTableOfContents();

    /**
     * Returns a specific section by its database ID.
     *
     * @param id the section ID
     * @return the {@link SectionDTO} for the given ID
     * @throws jakarta.persistence.EntityNotFoundException if the section does not exist
     */
    SectionDTO getSectionById(Long id);

    /**
     * Updates an existing section's title and content, and updates the search index.
     *
     * @param id      the database ID of the section
     * @param request the updated title and content
     * @return the updated {@link SectionDTO}
     */
    SectionDTO updateSection(Long id, com.osbp.backend.modules.manual.dtos.UpdateSectionRequestDTO request);

    /**
     * Creates a new section under a subtopic, and indexes it.
     *
     * @param subTopicId the parent subtopic ID
     * @param request    the new section's title and content
     * @return the newly created {@link SectionDTO}
     */
    SectionDTO createSection(Long subTopicId, com.osbp.backend.modules.manual.dtos.CreateSectionRequestDTO request);

    /**
     * Deletes a section by ID and removes it from the search index.
     *
     * @param id the section ID
     */
    void deleteSection(Long id);

    /**
     * Updates a top-level topic.
     *
     * @param id      the topic ID
     * @param request the update data
     * @return the updated {@link com.osbp.backend.modules.manual.dtos.TopicDTO}
     */
    com.osbp.backend.modules.manual.dtos.TopicDTO updateTopic(Long id, com.osbp.backend.modules.manual.dtos.UpdateTopicRequestDTO request);

    /**
     * Updates a subtopic.
     *
     * @param id      the subtopic ID
     * @param request the update data
     * @return the updated {@link com.osbp.backend.modules.manual.dtos.SubTopicDTO}
     */
    com.osbp.backend.modules.manual.dtos.SubTopicDTO updateSubTopic(Long id, com.osbp.backend.modules.manual.dtos.UpdateSubTopicRequestDTO request);

    /**
     * Deletes a top-level topic and all its descendants.
     *
     * @param id the topic ID
     */
    void deleteTopic(Long id);

    /**
     * Deletes a subtopic and all its sections.
     *
     * @param id the subtopic ID
     */
    void deleteSubTopic(Long id);

    /**
     * Reorders topics by assigning new sequential topicNumbers according to the provided topic ID order.
     *
     * @param topicIds list of topic IDs in their desired order
     */
    void reorderTopics(java.util.List<Long> topicIds);

    /**
     * Reorders sections (pages) by assigning sequential orderIndex according to the provided section ID order.
     *
     * @param sectionIds list of section IDs in their desired order
     */
    void reorderSections(java.util.List<Long> sectionIds);

    /**
     * Creates a new top-level topic (section) and an initial subtopic.
     *
     * @param request the topic creation payload
     * @return the created {@link com.osbp.backend.modules.manual.dtos.TopicDTO}
     */
    com.osbp.backend.modules.manual.dtos.TopicDTO createTopic(com.osbp.backend.modules.manual.dtos.CreateTopicRequestDTO request);

    /**
     * Creates a new page (section) under a specified top-level topic.
     *
     * @param topicId the topic ID
     * @param request the section creation payload
     * @return the created {@link com.osbp.backend.modules.manual.dtos.SectionDTO}
     */
    com.osbp.backend.modules.manual.dtos.SectionDTO createPageUnderTopic(Long topicId, com.osbp.backend.modules.manual.dtos.CreateSectionRequestDTO request);
}
