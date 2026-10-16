package com.osbp.backend.modules.manual.dtos;

/**
 * Statistics returned to the admin dashboard.
 */
public record AdminStatsDTO(
        long sections,
        long topics,
        long subtopics,
        int totalPages,
        String lastRebuild,
        String version
) { }
