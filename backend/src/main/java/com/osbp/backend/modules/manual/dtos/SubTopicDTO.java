package com.osbp.backend.modules.manual.dtos;

import java.util.List;

/**
 * DTO representing a subtopic with its list of sections.
 *
 * @param id        the subtopic's database ID
 * @param subNumber the subtopic's ordering number within its parent topic
 * @param title     the subtopic's title
 * @param sections  the sections belonging to this subtopic
 */
public record SubTopicDTO(Long id, int subNumber, String title, List<SectionDTO> sections) { }
