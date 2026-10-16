package com.osbp.backend.modules.manual.repositories;

import com.osbp.backend.modules.manual.models.Section;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * Repository for {@link Section} entities.
 */
@Repository
public interface SectionRepository extends JpaRepository<Section, Long> {

    /**
     * Returns all sections ordered by their ID (insertion order).
     * Used by the Lucene indexing service to load all sections for re-indexing.
     */
    List<Section> findAllByOrderByIdAsc();
}
