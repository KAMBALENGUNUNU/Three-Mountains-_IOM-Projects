package com.osbp.backend.modules.manual.dtos;

import java.util.List;

/**
 * DTO representing a topic with its list of subtopics.
 *
 * @param id          the topic's database ID
 * @param topicNumber the topic's ordering number
 * @param title       the topic's title
 * @param imageUrl    optional image URL or data URI for the module illustration
 * @param subTopics   the subtopics belonging to this topic
 */
public record TopicDTO(Long id, int topicNumber, String title, String imageUrl, List<SubTopicDTO> subTopics) {
    public TopicDTO(Long id, int topicNumber, String title, List<SubTopicDTO> subTopics) {
        this(id, topicNumber, title, null, subTopics);
    }
}
