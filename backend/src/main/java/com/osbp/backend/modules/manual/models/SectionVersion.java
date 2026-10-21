package com.osbp.backend.modules.manual.models;

import jakarta.persistence.*;
import java.time.Instant;

/**
 * Historical snapshot / revision of a {@link Section} for full version control and draft history.
 */
@Entity
@Table(
    name = "section_versions",
    indexes = {
        @Index(name = "idx_section_versions_section_id", columnList = "section_id"),
        @Index(name = "idx_section_versions_created_at", columnList = "created_at")
    }
)
public class SectionVersion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "section_id", nullable = false)
    private Section section;

    @Column(name = "version_number", nullable = false)
    private Integer versionNumber;

    @Column(nullable = false, length = 512)
    private String title;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;

    @Column(columnDefinition = "TEXT")
    private String overview;

    @Column(columnDefinition = "TEXT")
    private String imageUrl;

    @Column(length = 64)
    private String status; // "DRAFT" or "PUBLISHED"

    @Column(name = "change_summary", length = 512)
    private String changeSummary;

    @Column(name = "created_by", length = 128)
    private String createdBy;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    protected SectionVersion() {}

    public SectionVersion(Section section, Integer versionNumber, String title, String content,
                          String overview, String imageUrl, String status, String changeSummary, String createdBy) {
        this.section = section;
        this.versionNumber = versionNumber;
        this.title = title;
        this.content = content;
        this.overview = overview;
        this.imageUrl = imageUrl;
        this.status = status != null ? status : "PUBLISHED";
        this.changeSummary = changeSummary;
        this.createdBy = createdBy != null ? createdBy : "admin";
        this.createdAt = Instant.now();
    }

    public Long getId() { return id; }
    public Section getSection() { return section; }
    public Integer getVersionNumber() { return versionNumber; }
    public String getTitle() { return title; }
    public String getContent() { return content; }
    public String getOverview() { return overview; }
    public String getImageUrl() { return imageUrl; }
    public String getStatus() { return status; }
    public String getChangeSummary() { return changeSummary; }
    public String getCreatedBy() { return createdBy; }
    public Instant getCreatedAt() { return createdAt; }

    public void setSection(Section section) { this.section = section; }
    public void setVersionNumber(Integer versionNumber) { this.versionNumber = versionNumber; }
    public void setTitle(String title) { this.title = title; }
    public void setContent(String content) { this.content = content; }
    public void setOverview(String overview) { this.overview = overview; }
    public void setImageUrl(String imageUrl) { this.imageUrl = imageUrl; }
    public void setStatus(String status) { this.status = status; }
    public void setChangeSummary(String changeSummary) { this.changeSummary = changeSummary; }
    public void setCreatedBy(String createdBy) { this.createdBy = createdBy; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
