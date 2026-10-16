package com.osbp.backend.modules.manual.repositories;

import com.osbp.backend.modules.manual.models.SubTopic;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/**
 * Repository for {@link SubTopic} entities.
 */
@Repository
public interface SubTopicRepository extends JpaRepository<SubTopic, Long> {
}
