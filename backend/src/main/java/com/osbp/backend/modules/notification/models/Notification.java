package com.osbp.backend.modules.notification.models;

import jakarta.persistence.*;
import java.time.Instant;

/**
 * Entity representing an administrative bulletin or operational notification
 * broadcasted to all OSBP officers and trainees.
 */
@Entity
@Table(
    name = "notifications",
    indexes = {
        @Index(name = "idx_notifications_active_created", columnList = "active, created_at")
    }
)
public class Notification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 255)
    private String title;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String message;

    @Column(nullable = false, length = 50)
    private String type = "INFO"; // INFO, WARNING, URGENT, SUCCESS

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Column(nullable = false)
    private boolean active = true;

    @Column(name = "created_by", length = 255)
    private String createdBy;

    // ------------------------------------------------------------------ //
    //  Constructors
    // ------------------------------------------------------------------ //

    protected Notification() { }

    public Notification(String title, String message, String type, String createdBy) {
        this.title = title;
        this.message = message;
        this.type = (type != null && !type.isBlank()) ? type.toUpperCase() : "INFO";
        this.createdBy = createdBy;
        this.createdAt = Instant.now();
        this.active = true;
    }

    // ------------------------------------------------------------------ //
    //  Getters / Setters
    // ------------------------------------------------------------------ //

    public Long getId()             { return id; }
    public String getTitle()        { return title; }
    public String getMessage()      { return message; }
    public String getType()         { return type; }
    public Instant getCreatedAt()   { return createdAt; }
    public boolean isActive()       { return active; }
    public String getCreatedBy()    { return createdBy; }

    public void setTitle(String title)       { this.title = title; }
    public void setMessage(String message)   { this.message = message; }
    public void setType(String type)         { this.type = type; }
    public void setActive(boolean active)   { this.active = active; }
    public void setCreatedBy(String createdBy) { this.createdBy = createdBy; }
}
