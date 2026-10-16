package com.osbp.backend.modules.manual.models;

import jakarta.persistence.*;

/**
 * Represents a section of content within a {@link SubTopic}.
 * <p>
 * The {@code content} column stores the full extracted text for this section
 * and is also indexed by Apache Lucene for full-text search.
 */
@Entity
@Table(
    name = "sections",
    indexes = {
        @Index(name = "idx_sections_sub_topic_id", columnList = "sub_topic_id"),
        @Index(name = "idx_sections_title", columnList = "title")
    }
)
public class Section {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 512)
    private String title;

    /** Full text content of this section — stored as unbounded TEXT in PostgreSQL. */
    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;

    /** Concise overview/summary of this section — stored as TEXT in PostgreSQL. */
    @Column(columnDefinition = "TEXT")
    private String overview;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "sub_topic_id", nullable = false)
    private SubTopic subTopic;

    // ------------------------------------------------------------------ //
    //  Constructors
    // ------------------------------------------------------------------ //

    protected Section() { }

    public Section(String title, String content, SubTopic subTopic) {
        this(title, content, null, subTopic);
    }

    public Section(String title, String content, String overview, SubTopic subTopic) {
        this.title = title;
        this.content = content;
        this.overview = overview;
        this.subTopic = subTopic;
    }

    // ------------------------------------------------------------------ //
    //  Getters / Setters
    // ------------------------------------------------------------------ //

    public Long getId()           { return id; }
    public String getTitle()      { return title; }
    public String getContent()    { return content; }
    public String getOverview()   { return overview; }
    public SubTopic getSubTopic() { return subTopic; }

    public void setTitle(String title)       { this.title = title; }
    public void setContent(String content)   { this.content = content; }
    public void setOverview(String overview) { this.overview = overview; }
    public void setSubTopic(SubTopic subTopic) { this.subTopic = subTopic; }
}
