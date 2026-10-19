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

    /** Optional image URL or base64 data URI for custom section illustration. */
    @Column(columnDefinition = "TEXT")
    private String imageUrl;

    @Column(name = "order_index")
    private Integer orderIndex;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "sub_topic_id", nullable = false)
    private SubTopic subTopic;

    // ------------------------------------------------------------------ //
    //  Constructors
    // ------------------------------------------------------------------ //

    protected Section() { }

    public Section(String title, String content, SubTopic subTopic) {
        this(title, content, null, null, subTopic);
    }

    public Section(String title, String content, String overview, SubTopic subTopic) {
        this(title, content, overview, null, subTopic);
    }

    public Section(String title, String content, String overview, String imageUrl, SubTopic subTopic) {
        this.title = title;
        this.content = content;
        this.overview = overview;
        this.imageUrl = imageUrl;
        this.subTopic = subTopic;
    }

    // ------------------------------------------------------------------ //
    //  Getters / Setters
    // ------------------------------------------------------------------ //

    public Long getId()           { return id; }
    public String getTitle()      { return title; }
    public String getContent()    { return content; }
    public String getOverview()   { return overview; }
    public String getImageUrl()   { return imageUrl; }
    public Integer getOrderIndex(){ return orderIndex; }
    public SubTopic getSubTopic() { return subTopic; }

    public void setTitle(String title)       { this.title = title; }
    public void setContent(String content)   { this.content = content; }
    public void setOverview(String overview) { this.overview = overview; }
    public void setImageUrl(String imageUrl) { this.imageUrl = imageUrl; }
    public void setOrderIndex(Integer orderIndex) { this.orderIndex = orderIndex; }
    public void setSubTopic(SubTopic subTopic) { this.subTopic = subTopic; }
}
