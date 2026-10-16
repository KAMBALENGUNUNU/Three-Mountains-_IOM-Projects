package com.osbp.backend.modules.notification.dtos;

import java.time.Instant;

public record NotificationDTO(
        Long id,
        String title,
        String message,
        String type,
        Instant createdAt,
        boolean active,
        String createdBy
) { }
