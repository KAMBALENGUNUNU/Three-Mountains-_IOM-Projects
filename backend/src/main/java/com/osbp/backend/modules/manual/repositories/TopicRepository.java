package com.osbp.backend.modules.manual.repositories;

import com.osbp.backend.modules.manual.models.Topic;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * Repository for {@link Topic} entities.
 */
@Repository
public interface TopicRepository extends JpaRepository<Topic, Long> {

    /**
     * Fetches all topics together with their subtopics in a single query
     * to avoid N+1 problems when building the Table of Contents.
     */
    @Query("SELECT DISTINCT t FROM Topic t LEFT JOIN FETCH t.subTopics ORDER BY t.topicNumber ASC")
    List<Topic> findAllWithSubTopics();

    /**
     * Returns the maximum topicNumber currently assigned, or null if no topics exist.
     */
    @Query("SELECT MAX(t.topicNumber) FROM Topic t")
    Integer findMaxTopicNumber();

    /**
     * Returns the maximum topicNumber among core curriculum topics (topicNumber < threshold, e.g. < 9).
     */
    @Query("SELECT MAX(t.topicNumber) FROM Topic t WHERE t.topicNumber < :threshold")
    Integer findMaxTopicNumberLessThan(@org.springframework.data.repository.query.Param("threshold") int threshold);
}
