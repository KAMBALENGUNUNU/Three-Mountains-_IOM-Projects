package com.osbp.backend.modules.manual.dtos;

import java.time.Instant;

/**
 * DTO representing a historical version or draft snapshot of a Section.
 */
public record SectionVersionDTO(
        Long id,
        Long sectionId,
        Integer versionNumber,
        String title,
        String content,
        String overview,
        String imageUrl,
        String status,
        String changeSummary,
        String createdBy,
        Instant createdAt
) {}
