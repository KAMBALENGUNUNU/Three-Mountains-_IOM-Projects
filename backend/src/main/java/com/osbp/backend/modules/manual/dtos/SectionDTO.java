package com.osbp.backend.modules.manual.dtos;

/**
 * DTO representing a single section of content.
 *
 * @param id       the section's database ID
 * @param title    the section's title
 * @param content  the full text content of the section
 * @param overview optional concise summary/overview of the section
 * @param imageUrl optional image URL or data URI for the section illustration
 */
public record SectionDTO(Long id, String title, String content, String overview, String imageUrl, Integer orderIndex) {
    public SectionDTO(Long id, String title, String content, String overview, String imageUrl) {
        this(id, title, content, overview, imageUrl, null);
    }

    public SectionDTO(Long id, String title, String content, String overview) {
        this(id, title, content, overview, null, null);
    }

    public SectionDTO(Long id, String title, String content) {
        this(id, title, content, null, null, null);
    }
}
