package com.osbp.backend.modules.manual.dtos;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

/**
 * Request payload for an admin creating a new top-level topic (section).
 *
 * @param topicNumber optional ordering number (auto-computed if omitted)
 * @param title       the topic / section title
 * @param imageUrl    optional image URL or data URI for the module illustration
 */
public record CreateTopicRequestDTO(
        @PositiveOrZero(message = "Topic number must be 0 or positive")
        Integer topicNumber,

        @NotBlank(message = "Title is required")
        @Size(max = 512, message = "Title must not exceed 512 characters")
        String title,

        String imageUrl
) {
    public CreateTopicRequestDTO(String title) {
        this(null, title, null);
    }
}
