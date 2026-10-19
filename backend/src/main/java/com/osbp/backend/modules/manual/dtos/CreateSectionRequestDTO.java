package com.osbp.backend.modules.manual.dtos;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Request payload for an admin creating a new section under a subtopic.
 *
 * @param title   the title of the new section
 * @param content the text / markdown content of the new section
 */
public record CreateSectionRequestDTO(
        @NotBlank(message = "Title is required")
        @Size(max = 512, message = "Title must not exceed 512 characters")
        String title,

        @NotBlank(message = "Content is required")
        String content,

        String overview,
        String imageUrl
) {
    public CreateSectionRequestDTO(String title, String content) {
        this(title, content, null, null);
    }

    public CreateSectionRequestDTO(String title, String content, String overview) {
        this(title, content, overview, null);
    }
}
