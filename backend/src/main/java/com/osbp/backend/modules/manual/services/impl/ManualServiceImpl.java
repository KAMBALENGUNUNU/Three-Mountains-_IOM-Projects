package com.osbp.backend.modules.manual.services.impl;

import com.osbp.backend.modules.manual.dtos.*;
import com.osbp.backend.modules.manual.models.Section;
import com.osbp.backend.modules.manual.models.SectionVersion;
import com.osbp.backend.modules.manual.models.SubTopic;
import com.osbp.backend.modules.manual.models.Topic;
import com.osbp.backend.modules.manual.repositories.SectionRepository;
import com.osbp.backend.modules.manual.repositories.SectionVersionRepository;
import com.osbp.backend.modules.manual.repositories.SubTopicRepository;
import com.osbp.backend.modules.manual.repositories.TopicRepository;
import com.osbp.backend.modules.manual.services.ManualService;
import com.osbp.backend.modules.search.services.LuceneIndexService;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
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
    private final SectionVersionRepository sectionVersionRepository;
    private final LuceneIndexService luceneIndexService;

    public ManualServiceImpl(
            TopicRepository topicRepository,
            SubTopicRepository subTopicRepository,
            SectionRepository sectionRepository,
            SectionVersionRepository sectionVersionRepository,
            LuceneIndexService luceneIndexService) {
        this.topicRepository = topicRepository;
        this.subTopicRepository = subTopicRepository;
        this.sectionRepository = sectionRepository;
        this.sectionVersionRepository = sectionVersionRepository;
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

        // Get current highest version number
        Integer maxVersion = sectionVersionRepository.findMaxVersionNumberBySectionId(id);
        if (maxVersion == null) maxVersion = 0;

        // If no previous version was recorded yet, capture initial live state as version 1
        if (maxVersion == 0) {
            SectionVersion v1 = new SectionVersion(
                    section,
                    1,
                    section.getTitle(),
                    section.getContent(),
                    section.getOverview(),
                    section.getImageUrl(),
                    "PUBLISHED",
                    "Initial baseline version",
                    "system"
            );
            sectionVersionRepository.save(v1);
            maxVersion = 1;
        }

        boolean isDraft = Boolean.TRUE.equals(request.isDraft());
        int nextVersion = maxVersion + 1;
        String status = isDraft ? "DRAFT" : "PUBLISHED";
        String summary = request.changeSummary() != null && !request.changeSummary().isBlank()
                ? request.changeSummary().trim()
                : (isDraft ? "Draft revision" : "Published update");

        // Record the new version snapshot
        SectionVersion newVersion = new SectionVersion(
                section,
                nextVersion,
                request.title(),
                request.content(),
                request.overview(),
                request.imageUrl(),
                status,
                summary,
                "admin"
        );
        sectionVersionRepository.save(newVersion);

        // If draft, do NOT overwrite public live content or rebuild search index
        if (isDraft) {
            return toSectionDTO(section);
        }

        // Apply published changes to the live section
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

        boolean isDraft = Boolean.TRUE.equals(request.isDraft());
        String status = isDraft ? "DRAFT" : "PUBLISHED";
        String summary = request.changeSummary() != null && !request.changeSummary().isBlank()
                ? request.changeSummary().trim()
                : (isDraft ? "Initial draft page creation" : "Initial published page creation");
        SectionVersion v1 = new SectionVersion(
                saved,
                1,
                saved.getTitle(),
                saved.getContent(),
                saved.getOverview(),
                saved.getImageUrl(),
                status,
                summary,
                "admin"
        );
        sectionVersionRepository.save(v1);

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

        sectionVersionRepository.deleteBySectionId(id);
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
        topic.setImageUrl(request.imageUrl() != null && !request.imageUrl().trim().isEmpty()
                ? request.imageUrl().trim()
                : null);
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

    @Override
    @Transactional
    @CacheEvict(value = {"toc", "sections"}, allEntries = true)
    public void reorderTopics(List<Long> topicIds) {
        if (topicIds == null || topicIds.isEmpty()) return;
        for (int i = 0; i < topicIds.size(); i++) {
            int order = i + 1;
            topicRepository.findById(topicIds.get(i)).ifPresent(t -> {
                t.setTopicNumber(order);
                topicRepository.save(t);
            });
        }
    }

    @Override
    @Transactional
    @CacheEvict(value = {"toc", "sections"}, allEntries = true)
    public void reorderSections(List<Long> sectionIds) {
        if (sectionIds == null || sectionIds.isEmpty()) return;
        for (int i = 0; i < sectionIds.size(); i++) {
            int order = i + 1;
            sectionRepository.findById(sectionIds.get(i)).ifPresent(s -> {
                s.setOrderIndex(order);
                sectionRepository.save(s);
            });
        }
    }

    @Override
    @Transactional
    @CacheEvict(value = {"toc", "sections"}, allEntries = true)
    public TopicDTO createTopic(CreateTopicRequestDTO request) {
        int topicNum;
        if (request.topicNumber() != null) {
            topicNum = request.topicNumber();
        } else {
            Integer maxCore = topicRepository.findMaxTopicNumberLessThan(9);
            if (maxCore != null && maxCore >= 1) {
                topicNum = maxCore + 1;
            } else {
                Integer maxAny = topicRepository.findMaxTopicNumber();
                topicNum = (maxAny != null && maxAny > 0) ? (maxAny + 1) : 1;
            }
        }

        String rawTitle = request.title().trim();
        String finalTitle;
        if (rawTitle.matches("(?i)^(section|module)\\s*\\d*[:.-]?\\s*.*")) {
            finalTitle = rawTitle.replaceFirst("(?i)^(section|module)\\s*\\d*[:.-]?\\s*", "Section " + topicNum + ": ");
        } else {
            finalTitle = "Section " + topicNum + ": " + rawTitle;
        }

        String imageUrl = (request.imageUrl() != null && !request.imageUrl().isBlank()) ? request.imageUrl().trim() : null;
        Topic topic = new Topic(topicNum, finalTitle, imageUrl);

        SubTopic defaultSubTopic = new SubTopic(1, finalTitle, topic);
        topic.addSubTopic(defaultSubTopic);

        Topic saved = topicRepository.save(topic);
        return toTopicDTO(saved);
    }

    @Override
    @Transactional
    @CacheEvict(value = {"toc", "sections"}, allEntries = true)
    public SectionDTO createPageUnderTopic(Long topicId, CreateSectionRequestDTO request) {
        Topic topic = topicRepository.findById(topicId)
                .orElseThrow(() -> new EntityNotFoundException("Topic not found with id: " + topicId));

        SubTopic subTopic;
        if (topic.getSubTopics().isEmpty()) {
            subTopic = new SubTopic(1, topic.getTitle(), topic);
            topic.addSubTopic(subTopic);
            subTopic = subTopicRepository.save(subTopic);
        } else {
            subTopic = topic.getSubTopics().get(0);
        }

        String overview = (request.overview() != null && !request.overview().isBlank()) ? request.overview().trim() : null;
        String imageUrl = (request.imageUrl() != null && !request.imageUrl().isBlank()) ? request.imageUrl().trim() : null;
        int nextOrder = subTopic.getSections().size() + 1;

        Section section = new Section(request.title().trim(), request.content().trim(), overview, imageUrl, subTopic);
        section.setOrderIndex(nextOrder);
        subTopic.addSection(section);
        Section saved = sectionRepository.save(section);

        boolean isDraft = Boolean.TRUE.equals(request.isDraft());
        String status = isDraft ? "DRAFT" : "PUBLISHED";
        String summary = request.changeSummary() != null && !request.changeSummary().isBlank()
                ? request.changeSummary().trim()
                : (isDraft ? "Initial draft page creation" : "Initial published page creation");
        SectionVersion v1 = new SectionVersion(
                saved,
                1,
                saved.getTitle(),
                saved.getContent(),
                saved.getOverview(),
                saved.getImageUrl(),
                status,
                summary,
                "admin"
        );
        sectionVersionRepository.save(v1);

        try {
            luceneIndexService.updateSectionIndex(saved);
        } catch (Exception e) {
            throw new RuntimeException("Failed to index new section: " + saved.getId(), e);
        }

        return toSectionDTO(saved);
    }

    // ------------------------------------------------------------------ //
    //  Version Control & Revert Operations
    // ------------------------------------------------------------------ //

    @Override
    public List<SectionVersionDTO> getSectionVersions(Long sectionId) {
        // Verify section exists
        if (!sectionRepository.existsById(sectionId)) {
            throw new EntityNotFoundException("Section not found with id: " + sectionId);
        }

        List<SectionVersion> versions = sectionVersionRepository.findBySectionIdOrderByVersionNumberDesc(sectionId);
        return versions.stream()
                .map(v -> new SectionVersionDTO(
                        v.getId(),
                        v.getSection().getId(),
                        v.getVersionNumber(),
                        v.getTitle(),
                        v.getContent(),
                        v.getOverview(),
                        v.getImageUrl(),
                        v.getStatus(),
                        v.getChangeSummary(),
                        v.getCreatedBy(),
                        v.getCreatedAt()
                ))
                .toList();
    }

    @Override
    @Transactional
    @CacheEvict(value = {"toc", "sections"}, allEntries = true)
    public SectionDTO revertSectionVersion(Long sectionId, Integer versionNumber) {
        Section section = sectionRepository.findById(sectionId)
                .orElseThrow(() -> new EntityNotFoundException("Section not found with id: " + sectionId));

        SectionVersion targetVersion = sectionVersionRepository
                .findBySectionIdAndVersionNumber(sectionId, versionNumber)
                .orElseThrow(() -> new EntityNotFoundException(
                        "Version " + versionNumber + " not found for section: " + sectionId));

        // Restore section state from target version
        section.setTitle(targetVersion.getTitle());
        section.setContent(targetVersion.getContent());
        section.setOverview(targetVersion.getOverview());
        section.setImageUrl(targetVersion.getImageUrl());
        Section saved = sectionRepository.save(section);

        // Record a new version denoting the revert action
        Integer maxVersion = sectionVersionRepository.findMaxVersionNumberBySectionId(sectionId);
        int nextVersion = (maxVersion != null ? maxVersion : 0) + 1;
        SectionVersion revertSnapshot = new SectionVersion(
                section,
                nextVersion,
                targetVersion.getTitle(),
                targetVersion.getContent(),
                targetVersion.getOverview(),
                targetVersion.getImageUrl(),
                "PUBLISHED",
                "Reverted to Version " + versionNumber,
                "admin"
        );
        sectionVersionRepository.save(revertSnapshot);

        try {
            luceneIndexService.updateSectionIndex(saved);
        } catch (Exception e) {
            throw new RuntimeException("Failed to update search index on revert: " + sectionId, e);
        }

        return toSectionDTO(saved);
    }

    // ------------------------------------------------------------------ //
    //  Mapping helpers
    // ------------------------------------------------------------------ //

    private TopicDTO toTopicDTO(Topic topic) {
        List<SubTopicDTO> subTopicDTOs = topic.getSubTopics().stream()
                .map(this::toTocSubTopicDTO)
                .toList();
        return new TopicDTO(topic.getId(), topic.getTopicNumber(), topic.getTitle(), topic.getImageUrl(), subTopicDTOs);
    }

    private SubTopicDTO toTocSubTopicDTO(SubTopic subTopic) {
        List<SectionDTO> sectionDTOs = subTopic.getSections().stream()
                .sorted(Comparator.comparing((Section s) -> s.getOrderIndex() != null ? s.getOrderIndex() : 0)
                        .thenComparing(Section::getId))
                .map(this::toTocSectionDTO)
                .toList();
        return new SubTopicDTO(subTopic.getId(), subTopic.getSubNumber(), subTopic.getTitle(), sectionDTOs);
    }

    private SectionDTO toTocSectionDTO(Section section) {
        String content = section.getContent();
        int words = (content != null && !content.isBlank()) ? content.trim().split("\\s+").length : 500;
        // In TOC responses, omit massive content text to achieve high-speed minimal network payload
        return new SectionDTO(section.getId(), section.getTitle(), null, section.getOverview(), section.getImageUrl(), section.getOrderIndex(), words);
    }

    private SubTopicDTO toSubTopicDTO(SubTopic subTopic) {
        List<SectionDTO> sectionDTOs = subTopic.getSections().stream()
                .sorted(Comparator.comparing((Section s) -> s.getOrderIndex() != null ? s.getOrderIndex() : 0)
                        .thenComparing(Section::getId))
                .map(this::toSectionDTO)
                .toList();
        return new SubTopicDTO(subTopic.getId(), subTopic.getSubNumber(), subTopic.getTitle(), sectionDTOs);
    }

    private SectionDTO toSectionDTO(Section section) {
        String content = section.getContent();
        int words = (content != null && !content.isBlank()) ? content.trim().split("\\s+").length : 0;
        return new SectionDTO(section.getId(), section.getTitle(), content, section.getOverview(), section.getImageUrl(), section.getOrderIndex(), words);
    }
}
