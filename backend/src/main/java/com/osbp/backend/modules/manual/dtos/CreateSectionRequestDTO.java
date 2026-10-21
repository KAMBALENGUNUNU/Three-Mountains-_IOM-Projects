package com.osbp.backend.modules.manual.dtos;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Request payload for an admin creating a new section under a subtopic or topic.
 *
 * @param title         the title of the new section
 * @param content       the text / markdown content of the new section
 * @param overview      optional overview / summary snippet
 * @param imageUrl      optional illustration image URL or data URI
 * @param isDraft       optional boolean flag; if true, creates section as DRAFT
 * @param changeSummary optional brief description of changes / version notes
 */
public record CreateSectionRequestDTO(
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
    public CreateSectionRequestDTO(String title, String content) {
        this(title, content, null, null, false, null);
    }

    public CreateSectionRequestDTO(String title, String content, String overview) {
        this(title, content, overview, null, false, null);
    }

    public CreateSectionRequestDTO(String title, String content, String overview, String imageUrl) {
        this(title, content, overview, imageUrl, false, null);
    }
}
