package com.osbp.backend.modules.manual.dtos;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

/**
 * Request payload for an admin modifying a subtopic.
 *
 * @param subNumber the subtopic number within its parent topic
 * @param title     the subtopic title
 */
public record UpdateSubTopicRequestDTO(
        @PositiveOrZero(message = "Subtopic number must be 0 or positive")
        Integer subNumber,

        @NotBlank(message = "Title is required")
        @Size(max = 512, message = "Title must not exceed 512 characters")
        String title
) { }
