package com.osbp.backend.modules.manual.dtos;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

/**
 * Request payload for an admin modifying a top-level topic.
 *
 * @param topicNumber the ordering number
 * @param title       the topic title
 * @param imageUrl    optional image URL or data URI for the module illustration
 */
public record UpdateTopicRequestDTO(
        @PositiveOrZero(message = "Topic number must be 0 or positive")
        Integer topicNumber,

        @NotBlank(message = "Title is required")
        @Size(max = 512, message = "Title must not exceed 512 characters")
        String title,

        String imageUrl
) {
    public UpdateTopicRequestDTO(Integer topicNumber, String title) {
        this(topicNumber, title, null);
    }
}
