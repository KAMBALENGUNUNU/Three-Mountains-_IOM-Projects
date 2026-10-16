package com.osbp.backend.modules.manual.models;

import jakarta.persistence.*;

import java.util.ArrayList;
import java.util.List;

/**
 * Represents a subtopic within a {@link Topic}.
 * <p>
 * A SubTopic groups one or more {@link Section} entries.
 */
@Entity
@Table(name = "sub_topics")
public class SubTopic {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "sub_number", nullable = false)
    private int subNumber;

    @Column(nullable = false, length = 512)
    private String title;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "topic_id", nullable = false)
    private Topic topic;

    @OneToMany(mappedBy = "subTopic", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    private List<Section> sections = new ArrayList<>();

    // ------------------------------------------------------------------ //
    //  Constructors
    // ------------------------------------------------------------------ //

    protected SubTopic() { }

    public SubTopic(int subNumber, String title, Topic topic) {
        this.subNumber = subNumber;
        this.title = title;
        this.topic = topic;
    }

    // ------------------------------------------------------------------ //
    //  Helpers
    // ------------------------------------------------------------------ //

    public void addSection(Section section) {
        sections.add(section);
        section.setSubTopic(this);
    }

    // ------------------------------------------------------------------ //
    //  Getters / Setters
    // ------------------------------------------------------------------ //

    public Long getId()           { return id; }
    public int getSubNumber()     { return subNumber; }
    public String getTitle()      { return title; }
    public Topic getTopic()       { return topic; }
    public List<Section> getSections() { return sections; }

    public void setSubNumber(int subNumber) { this.subNumber = subNumber; }
    public void setTitle(String title)      { this.title = title; }
    public void setTopic(Topic topic)       { this.topic = topic; }
}
