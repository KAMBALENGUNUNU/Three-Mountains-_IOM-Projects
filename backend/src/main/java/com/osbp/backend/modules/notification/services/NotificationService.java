package com.osbp.backend.modules.notification.services;

import com.osbp.backend.modules.notification.dtos.CreateNotificationDTO;
import com.osbp.backend.modules.notification.dtos.NotificationDTO;

import java.util.List;

public interface NotificationService {

    List<NotificationDTO> getActiveNotifications();

    List<NotificationDTO> getAllNotifications();

    NotificationDTO createNotification(CreateNotificationDTO request, String createdBy);

    void deactivateNotification(Long id);

    void deleteNotification(Long id);
}
