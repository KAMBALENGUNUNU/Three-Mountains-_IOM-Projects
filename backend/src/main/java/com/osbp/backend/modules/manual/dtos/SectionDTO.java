package com.osbp.backend.modules.manual.dtos;

/**
 * DTO representing a single section of content.
 *
 * @param id         the section's database ID
 * @param title      the section's title
 * @param content    the full text content of the section (omitted in TOC for high performance)
 * @param overview   optional concise summary/overview of the section
 * @param imageUrl   optional image URL or data URI for the section illustration
 * @param orderIndex optional sort order index
 * @param wordCount  approximate or exact word count
 */
public record SectionDTO(
        Long id,
        String title,
        String content,
        String overview,
        String imageUrl,
        Integer orderIndex,
        Integer wordCount
) {
    public SectionDTO(Long id, String title, String content, String overview, String imageUrl, Integer orderIndex) {
        this(id, title, content, overview, imageUrl, orderIndex, content != null ? content.trim().split("\\s+").length : 0);
    }

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
