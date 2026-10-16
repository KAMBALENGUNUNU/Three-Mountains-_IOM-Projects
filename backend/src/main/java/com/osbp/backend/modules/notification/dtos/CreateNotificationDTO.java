package com.osbp.backend.modules.notification.dtos;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateNotificationDTO(
        @NotBlank(message = "Title is required")
        @Size(max = 255, message = "Title must not exceed 255 characters")
        String title,

        @NotBlank(message = "Notification message is required")
        String message,

        String type // INFO, WARNING, URGENT, SUCCESS
) { }
