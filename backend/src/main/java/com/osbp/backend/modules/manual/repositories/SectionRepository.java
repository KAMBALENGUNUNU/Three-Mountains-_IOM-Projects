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

    /**
     * Database-level fallback search when Lucene is indexing or unavailable.
     */
    @org.springframework.data.jpa.repository.Query("SELECT s FROM Section s WHERE LOWER(s.title) LIKE LOWER(CONCAT('%', :q, '%')) OR LOWER(s.content) LIKE LOWER(CONCAT('%', :q, '%')) ORDER BY s.id ASC")
    List<Section> searchByKeyword(@org.springframework.data.repository.query.Param("q") String q);
}
