package com.osbp.backend.modules.notification.repositories;

import com.osbp.backend.modules.notification.models.Notification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, Long> {

    /**
     * Retrieve all active operational notifications in reverse chronological order.
     */
    List<Notification> findByActiveTrueOrderByCreatedAtDesc();

    /**
     * Retrieve all notifications for admin audit view.
     */
    List<Notification> findAllByOrderByCreatedAtDesc();
}
