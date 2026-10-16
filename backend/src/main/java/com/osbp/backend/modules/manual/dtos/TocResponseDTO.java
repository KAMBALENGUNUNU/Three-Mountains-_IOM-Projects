package com.osbp.backend.modules.manual.dtos;

import java.util.List;

/**
 * Root DTO for the full Table of Contents hierarchy.
 *
 * @param topics the ordered list of all top-level topics
 */
public record TocResponseDTO(List<TopicDTO> topics) { }
