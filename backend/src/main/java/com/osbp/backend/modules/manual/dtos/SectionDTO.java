package com.osbp.backend.modules.manual.dtos;

/**
 * DTO representing a single section of content.
 *
 * @param id      the section's database ID
 * @param title   the section's title
 * @param content the full text content of the section
 */
public record SectionDTO(Long id, String title, String content) { }
