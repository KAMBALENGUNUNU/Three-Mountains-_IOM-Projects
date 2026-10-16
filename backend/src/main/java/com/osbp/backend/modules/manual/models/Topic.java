package com.osbp.backend.modules.manual.models;

import jakarta.persistence.*;

import java.util.ArrayList;
import java.util.List;

/**
 * Represents a top-level topic in the OSBP Field Guide manual.
 * <p>
 * A Topic contains one or more {@link SubTopic} entries.
 */
@Entity
@Table(name = "topics")
public class Topic {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "topic_number", nullable = false)
    private int topicNumber;

    @Column(nullable = false, length = 512)
    private String title;

    @OneToMany(mappedBy = "topic", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @OrderBy("subNumber ASC")
    private List<SubTopic> subTopics = new ArrayList<>();

    // ------------------------------------------------------------------ //
    //  Constructors
    // ------------------------------------------------------------------ //

    protected Topic() { }

    public Topic(int topicNumber, String title) {
        this.topicNumber = topicNumber;
        this.title = title;
    }

    // ------------------------------------------------------------------ //
    //  Helpers
    // ------------------------------------------------------------------ //

    public void addSubTopic(SubTopic subTopic) {
        subTopics.add(subTopic);
        subTopic.setTopic(this);
    }

    // ------------------------------------------------------------------ //
    //  Getters / Setters
    // ------------------------------------------------------------------ //

    public Long getId()           { return id; }
    public int getTopicNumber()   { return topicNumber; }
    public String getTitle()      { return title; }
    public List<SubTopic> getSubTopics() { return subTopics; }

    public void setTopicNumber(int topicNumber) { this.topicNumber = topicNumber; }
    public void setTitle(String title)          { this.title = title; }
}
