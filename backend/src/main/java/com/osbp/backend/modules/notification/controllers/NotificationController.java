package com.osbp.backend.modules.notification.controllers;

import com.osbp.backend.common.dtos.ApiResponse;
import com.osbp.backend.modules.notification.dtos.CreateNotificationDTO;
import com.osbp.backend.modules.notification.dtos.NotificationDTO;
import com.osbp.backend.modules.notification.services.NotificationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/notifications")
@Tag(name = "Notifications & Bulletins", description = "Endpoints for broadcasting and receiving real-time operational notifications")
public class NotificationController {

    private final NotificationService notificationService;

    public NotificationController(NotificationService notificationService) {
        this.notificationService = notificationService;
    }

    @Operation(summary = "Get active notifications", description = "Public / Authenticated: Returns all active notifications for display in the bottom bar")
    @GetMapping
    public ResponseEntity<ApiResponse<List<NotificationDTO>>> getActiveNotifications() {
        List<NotificationDTO> list = notificationService.getActiveNotifications();
        return ResponseEntity.ok(ApiResponse.ok(list));
    }

    @Operation(summary = "Post a new notification", description = "ADMIN only: Broadcasts a new operational notification")
    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<NotificationDTO>> createNotification(
            @Valid @RequestBody CreateNotificationDTO request,
            Authentication auth) {
        String createdBy = (auth != null && auth.getName() != null) ? auth.getName() : "EAC Administration";
        NotificationDTO created = notificationService.createNotification(request, createdBy);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Notification broadcasted successfully", created));
    }

    @Operation(summary = "Deactivate notification", description = "ADMIN only: Deactivates an active notification")
    @PutMapping("/{id}/deactivate")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> deactivateNotification(@PathVariable Long id) {
        notificationService.deactivateNotification(id);
        return ResponseEntity.ok(ApiResponse.ok("Notification dismissed", null));
    }

    @Operation(summary = "Delete notification", description = "ADMIN only: Permanently removes a notification")
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> deleteNotification(@PathVariable Long id) {
        notificationService.deleteNotification(id);
        return ResponseEntity.ok(ApiResponse.ok("Notification deleted", null));
    }
}
