package com.osbp.backend.modules.manual.services.impl;

import com.osbp.backend.modules.manual.dtos.*;
import com.osbp.backend.modules.manual.models.Section;
import com.osbp.backend.modules.manual.models.SubTopic;
import com.osbp.backend.modules.manual.models.Topic;
import com.osbp.backend.modules.manual.repositories.SectionRepository;
import com.osbp.backend.modules.manual.repositories.SubTopicRepository;
import com.osbp.backend.modules.manual.repositories.TopicRepository;
import com.osbp.backend.modules.manual.services.ManualService;
import com.osbp.backend.modules.search.services.LuceneIndexService;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Implementation of {@link ManualService}.
 */
@Service
@Transactional(readOnly = true)
public class ManualServiceImpl implements ManualService {

    private final TopicRepository topicRepository;
    private final SubTopicRepository subTopicRepository;
    private final SectionRepository sectionRepository;
    private final LuceneIndexService luceneIndexService;

    public ManualServiceImpl(
            TopicRepository topicRepository,
            SubTopicRepository subTopicRepository,
            SectionRepository sectionRepository,
            LuceneIndexService luceneIndexService) {
        this.topicRepository = topicRepository;
        this.subTopicRepository = subTopicRepository;
        this.sectionRepository = sectionRepository;
        this.luceneIndexService = luceneIndexService;
    }

    // ------------------------------------------------------------------ //
    //  Table of Contents
    // ------------------------------------------------------------------ //

    @Override
    @Cacheable(value = "toc")
    public TocResponseDTO getTableOfContents() {
        List<Topic> topics = topicRepository.findAllWithSubTopics();
        List<TopicDTO> topicDTOs = topics.stream()
                .map(this::toTopicDTO)
                .toList();
        return new TocResponseDTO(topicDTOs);
    }

    // ------------------------------------------------------------------ //
    //  Section by ID
    // ------------------------------------------------------------------ //

    @Override
    @Cacheable(value = "sections", key = "#id")
    public SectionDTO getSectionById(Long id) {
        Section section = sectionRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Section not found with id: " + id));
        return toSectionDTO(section);
    }

    // ------------------------------------------------------------------ //
    //  Admin Modification Operations
    // ------------------------------------------------------------------ //

    @Override
    @Transactional
    @CacheEvict(value = {"toc", "sections"}, allEntries = true)
    public SectionDTO updateSection(Long id, UpdateSectionRequestDTO request) {
        Section section = sectionRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Section not found with id: " + id));

        section.setTitle(request.title());
        section.setContent(request.content());
        if (request.overview() != null) {
            section.setOverview(request.overview().trim().isEmpty() ? null : request.overview().trim());
        }
        if (request.imageUrl() != null) {
            section.setImageUrl(request.imageUrl().trim().isEmpty() ? null : request.imageUrl().trim());
        }
        Section saved = sectionRepository.save(section);

        try {
            luceneIndexService.updateSectionIndex(saved);
        } catch (Exception e) {
            throw new RuntimeException("Failed to update search index for section: " + id, e);
        }

        return toSectionDTO(saved);
    }

    @Override
    @Transactional
    @CacheEvict(value = {"toc", "sections"}, allEntries = true)
    public SectionDTO createSection(Long subTopicId, CreateSectionRequestDTO request) {
        SubTopic subTopic = subTopicRepository.findById(subTopicId)
                .orElseThrow(() -> new EntityNotFoundException("SubTopic not found with id: " + subTopicId));

        String overview = (request.overview() != null && !request.overview().isBlank()) ? request.overview().trim() : null;
        String imageUrl = (request.imageUrl() != null && !request.imageUrl().isBlank()) ? request.imageUrl().trim() : null;
        Section section = new Section(request.title(), request.content(), overview, imageUrl, subTopic);
        subTopic.addSection(section);
        Section saved = sectionRepository.save(section);

        try {
            luceneIndexService.updateSectionIndex(saved);
        } catch (Exception e) {
            throw new RuntimeException("Failed to index new section: " + saved.getId(), e);
        }

        return toSectionDTO(saved);
    }

    @Override
    @Transactional
    @CacheEvict(value = {"toc", "sections"}, allEntries = true)
    public void deleteSection(Long id) {
        Section section = sectionRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Section not found with id: " + id));

        sectionRepository.delete(section);

        try {
            luceneIndexService.deleteSectionIndex(id);
        } catch (Exception e) {
            throw new RuntimeException("Failed to remove section from search index: " + id, e);
        }
    }

    @Override
    @Transactional
    @CacheEvict(value = {"toc", "sections"}, allEntries = true)
    public TopicDTO updateTopic(Long id, UpdateTopicRequestDTO request) {
        Topic topic = topicRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Topic not found with id: " + id));

        if (request.topicNumber() != null) {
            topic.setTopicNumber(request.topicNumber());
        }
        if (request.title() != null && !request.title().isBlank()) {
            topic.setTitle(request.title().trim());
        }
        Topic saved = topicRepository.save(topic);
        return toTopicDTO(saved);
    }

    @Override
    @Transactional
    @CacheEvict(value = {"toc", "sections"}, allEntries = true)
    public SubTopicDTO updateSubTopic(Long id, UpdateSubTopicRequestDTO request) {
        SubTopic subTopic = subTopicRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("SubTopic not found with id: " + id));

        if (request.subNumber() != null) {
            subTopic.setSubNumber(request.subNumber());
        }
        if (request.title() != null && !request.title().isBlank()) {
            subTopic.setTitle(request.title().trim());
        }
        SubTopic saved = subTopicRepository.save(subTopic);
        return toSubTopicDTO(saved);
    }

    @Override
    @Transactional
    @CacheEvict(value = {"toc", "sections"}, allEntries = true)
    public void deleteTopic(Long id) {
        Topic topic = topicRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Topic not found with id: " + id));

        // Remove all sections from search index
        for (SubTopic st : topic.getSubTopics()) {
            for (Section s : st.getSections()) {
                try {
                    luceneIndexService.deleteSectionIndex(s.getId());
                } catch (Exception ignored) {}
            }
        }
        topicRepository.delete(topic);
    }

    @Override
    @Transactional
    @CacheEvict(value = {"toc", "sections"}, allEntries = true)
    public void deleteSubTopic(Long id) {
        SubTopic subTopic = subTopicRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("SubTopic not found with id: " + id));

        // Remove all sections from search index
        for (Section s : subTopic.getSections()) {
            try {
                luceneIndexService.deleteSectionIndex(s.getId());
            } catch (Exception ignored) {}
        }
        subTopicRepository.delete(subTopic);
    }

    // ------------------------------------------------------------------ //
    //  Mapping helpers
    // ------------------------------------------------------------------ //

    private TopicDTO toTopicDTO(Topic topic) {
        List<SubTopicDTO> subTopicDTOs = topic.getSubTopics().stream()
                .map(this::toSubTopicDTO)
                .toList();
        return new TopicDTO(topic.getId(), topic.getTopicNumber(), topic.getTitle(), subTopicDTOs);
    }

    private SubTopicDTO toSubTopicDTO(SubTopic subTopic) {
        List<SectionDTO> sectionDTOs = subTopic.getSections().stream()
                .map(this::toSectionDTO)
                .toList();
        return new SubTopicDTO(subTopic.getId(), subTopic.getSubNumber(), subTopic.getTitle(), sectionDTOs);
    }

    private SectionDTO toSectionDTO(Section section) {
        return new SectionDTO(section.getId(), section.getTitle(), section.getContent(), section.getOverview(), section.getImageUrl());
    }
}
