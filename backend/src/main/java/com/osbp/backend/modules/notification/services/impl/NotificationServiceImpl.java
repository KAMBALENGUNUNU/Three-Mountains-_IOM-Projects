package com.osbp.backend.modules.notification.services.impl;

import com.osbp.backend.modules.notification.dtos.CreateNotificationDTO;
import com.osbp.backend.modules.notification.dtos.NotificationDTO;
import com.osbp.backend.modules.notification.models.Notification;
import com.osbp.backend.modules.notification.repositories.NotificationRepository;
import com.osbp.backend.modules.notification.services.NotificationService;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@Transactional(readOnly = true)
public class NotificationServiceImpl implements NotificationService {

    private final NotificationRepository notificationRepository;

    public NotificationServiceImpl(NotificationRepository notificationRepository) {
        this.notificationRepository = notificationRepository;
    }

    @Override
    @Cacheable(value = "notifications")
    public List<NotificationDTO> getActiveNotifications() {
        return notificationRepository.findByActiveTrueOrderByCreatedAtDesc().stream()
                .map(this::toDTO)
                .toList();
    }

    @Override
    public List<NotificationDTO> getAllNotifications() {
        return notificationRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(this::toDTO)
                .toList();
    }

    @Override
    @Transactional
    @CacheEvict(value = "notifications", allEntries = true)
    public NotificationDTO createNotification(CreateNotificationDTO request, String createdBy) {
        Notification notification = new Notification(
                request.title().trim(),
                request.message().trim(),
                request.type(),
                createdBy
        );
        Notification saved = notificationRepository.save(notification);
        return toDTO(saved);
    }

    @Override
    @Transactional
    @CacheEvict(value = "notifications", allEntries = true)
    public void deactivateNotification(Long id) {
        Notification notification = notificationRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Notification not found with id: " + id));
        notification.setActive(false);
        notificationRepository.save(notification);
    }

    @Override
    @Transactional
    @CacheEvict(value = "notifications", allEntries = true)
    public void deleteNotification(Long id) {
        notificationRepository.deleteById(id);
    }

    private NotificationDTO toDTO(Notification n) {
        return new NotificationDTO(
                n.getId(),
                n.getTitle(),
                n.getMessage(),
                n.getType(),
                n.getCreatedAt(),
                n.isActive(),
                n.getCreatedBy()
        );
    }
}
