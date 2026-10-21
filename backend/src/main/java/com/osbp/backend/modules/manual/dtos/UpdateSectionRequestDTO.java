package com.osbp.backend.modules.manual.dtos;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Request payload for an admin modifying an existing section with versioning & draft support.
 *
 * @param title         the new title of the section (max 512 chars)
 * @param content       the updated markdown / text content of the section
 * @param overview      optional overview snippet
 * @param imageUrl      optional image URL or data URI for the section illustration
 * @param isDraft       if true, saves as a draft version without updating public live content
 * @param changeSummary optional brief description of changes made in this version
 */
public record UpdateSectionRequestDTO(
        @NotBlank(message = "Title is required")
        @Size(max = 512, message = "Title must not exceed 512 characters")
        String title,

        @NotBlank(message = "Content is required")
        String content,

        String overview,
        String imageUrl,
        Boolean isDraft,
        String changeSummary
) {
    public UpdateSectionRequestDTO(String title, String content, String overview, String imageUrl) {
        this(title, content, overview, imageUrl, false, null);
    }

    public UpdateSectionRequestDTO(String title, String content) {
        this(title, content, null, null, false, null);
    }

    public UpdateSectionRequestDTO(String title, String content, String overview) {
        this(title, content, overview, null, false, null);
    }
}
