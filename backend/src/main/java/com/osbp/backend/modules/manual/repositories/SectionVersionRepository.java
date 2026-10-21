package com.osbp.backend.modules.manual.repositories;

import com.osbp.backend.modules.manual.models.SectionVersion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SectionVersionRepository extends JpaRepository<SectionVersion, Long> {

    List<SectionVersion> findBySectionIdOrderByVersionNumberDesc(Long sectionId);

    @Query("SELECT COALESCE(MAX(v.versionNumber), 0) FROM SectionVersion v WHERE v.section.id = :sectionId")
    Integer findMaxVersionNumberBySectionId(@Param("sectionId") Long sectionId);

    Optional<SectionVersion> findBySectionIdAndVersionNumber(Long sectionId, Integer versionNumber);

    void deleteBySectionId(Long sectionId);
}
