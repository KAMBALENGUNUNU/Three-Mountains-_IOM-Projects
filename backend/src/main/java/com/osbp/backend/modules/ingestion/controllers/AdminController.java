package com.osbp.backend.modules.ingestion.controllers;

import com.osbp.backend.common.dtos.ApiResponse;
import com.osbp.backend.modules.ingestion.services.TikaExtractionService;
import com.osbp.backend.modules.manual.dtos.*;
import com.osbp.backend.modules.manual.services.ManualService;
import com.osbp.backend.modules.search.services.LuceneIndexService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import com.osbp.backend.modules.manual.repositories.SectionRepository;
import com.osbp.backend.modules.manual.repositories.SubTopicRepository;
import com.osbp.backend.modules.manual.repositories.TopicRepository;

import java.time.Instant;
import java.util.List;

/**
 * Admin-only REST controller for PDF ingestion and manual content management.
 * <p>
 * All endpoints require the {@code ADMIN} role.
 */
@RestController
@RequestMapping("/api/admin")
@Tag(name = "Admin — Content Management & Ingestion", description = "Admin-only: Ingest PDF, edit, create and delete topics, subtopics and sections")
@SecurityRequirement(name = "bearerAuth")
@PreAuthorize("hasRole('ADMIN')")
public class AdminController {

    private final TikaExtractionService tikaExtractionService;
    private final ManualService manualService;
    private final LuceneIndexService luceneIndexService;
    private final TopicRepository topicRepository;
    private final SubTopicRepository subTopicRepository;
    private final SectionRepository sectionRepository;

    public AdminController(
            TikaExtractionService tikaExtractionService,
            ManualService manualService,
            LuceneIndexService luceneIndexService,
            TopicRepository topicRepository,
            SubTopicRepository subTopicRepository,
            SectionRepository sectionRepository) {
        this.tikaExtractionService = tikaExtractionService;
        this.manualService = manualService;
        this.luceneIndexService = luceneIndexService;
        this.topicRepository = topicRepository;
        this.subTopicRepository = subTopicRepository;
        this.sectionRepository = sectionRepository;
    }

    // ------------------------------------------------------------------ //
    //  PDF Ingestion
    // ------------------------------------------------------------------ //

    @Operation(
            summary = "Upload & ingest the manual PDF",
            description = "ADMIN only. Uploads the OSBP Field Guide PDF, extracts text via Apache Tika, " +
                    "parses the content hierarchy, persists it to the database, and rebuilds the Lucene index. " +
                    "WARNING: This replaces ALL existing manual content."
    )
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Manual ingested successfully"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "400", description = "No file uploaded or invalid file type"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "403", description = "Forbidden — ADMIN role required"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "500", description = "Ingestion or indexing error")
    })
    @PostMapping(value = "/upload-manual", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<String>> uploadManual(
            @Parameter(description = "The PDF file to ingest", required = true,
                    content = @Content(mediaType = MediaType.MULTIPART_FORM_DATA_VALUE))
            @RequestParam("file") MultipartFile file) throws Exception {

        if (file.isEmpty()) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("No file was provided or the file is empty."));
        }

        tikaExtractionService.extractAndIngest(file);

        String message = String.format(
                "Manual '%s' ingested and indexed successfully.", file.getOriginalFilename());
        return ResponseEntity.ok(ApiResponse.ok(message, message));
    }

    // ------------------------------------------------------------------ //
    //  Section Management
    // ------------------------------------------------------------------ //

    @Operation(
            summary = "Update an existing section",
            description = "ADMIN only. Modifies a section's title and/or content, and updates the Lucene search index."
    )
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "200",
                    description = "Section updated successfully",
                    content = @Content(schema = @Schema(implementation = SectionDTO.class))
            ),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "Section not found"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "400", description = "Validation error")
    })
    @PutMapping("/sections/{id}")
    public ResponseEntity<ApiResponse<SectionDTO>> updateSection(
            @PathVariable Long id,
            @Valid @RequestBody UpdateSectionRequestDTO request) {

        SectionDTO updated = manualService.updateSection(id, request);
        return ResponseEntity.ok(ApiResponse.ok("Section updated successfully", updated));
    }

    @Operation(
            summary = "Create a new section under a subtopic",
            description = "ADMIN only. Creates a new section under an existing subtopic and adds it to the Lucene search index."
    )
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "201",
                    description = "Section created successfully",
                    content = @Content(schema = @Schema(implementation = SectionDTO.class))
            ),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "SubTopic not found")
    })
    @PostMapping("/subtopics/{subTopicId}/sections")
    public ResponseEntity<ApiResponse<SectionDTO>> createSection(
            @PathVariable Long subTopicId,
            @Valid @RequestBody CreateSectionRequestDTO request) {

        SectionDTO created = manualService.createSection(subTopicId, request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Section created successfully", created));
    }

    @Operation(
            summary = "Delete a section",
            description = "ADMIN only. Permanently deletes a section from the database and removes it from the search index."
    )
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Section deleted successfully"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "Section not found")
    })
    @DeleteMapping("/sections/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteSection(@PathVariable Long id) {
        manualService.deleteSection(id);
        return ResponseEntity.ok(ApiResponse.ok("Section deleted successfully", null));
    }

    // ------------------------------------------------------------------ //
    //  Topic & SubTopic Management
    // ------------------------------------------------------------------ //

    @Operation(
            summary = "Create a new top-level section (topic)",
            description = "ADMIN only. Creates a new section (topic) and an initial subtopic."
    )
    @PostMapping("/topics")
    public ResponseEntity<ApiResponse<TopicDTO>> createTopic(
            @Valid @RequestBody CreateTopicRequestDTO request) {

        TopicDTO created = manualService.createTopic(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Section created successfully", created));
    }

    @Operation(
            summary = "Create a new page (section) under a topic",
            description = "ADMIN only. Creates a new page under the specified topic's primary subtopic and indexes it."
    )
    @PostMapping("/topics/{topicId}/sections")
    public ResponseEntity<ApiResponse<SectionDTO>> createPageUnderTopic(
            @PathVariable Long topicId,
            @Valid @RequestBody CreateSectionRequestDTO request) {

        SectionDTO created = manualService.createPageUnderTopic(topicId, request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Page created successfully", created));
    }

    @Operation(
            summary = "Update a top-level topic",
            description = "ADMIN only. Modifies a topic's title and/or ordering number."
    )
    @PutMapping("/topics/{id}")
    public ResponseEntity<ApiResponse<TopicDTO>> updateTopic(
            @PathVariable Long id,
            @Valid @RequestBody UpdateTopicRequestDTO request) {

        TopicDTO updated = manualService.updateTopic(id, request);
        return ResponseEntity.ok(ApiResponse.ok("Topic updated successfully", updated));
    }

    @Operation(
            summary = "Delete a top-level topic",
            description = "ADMIN only. Permanently deletes a topic and all its subtopics and sections from the database."
    )
    @DeleteMapping("/topics/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteTopic(@PathVariable Long id) {
        manualService.deleteTopic(id);
        return ResponseEntity.ok(ApiResponse.ok("Topic deleted successfully", null));
    }

    @Operation(
            summary = "Update a subtopic",
            description = "ADMIN only. Modifies a subtopic's title and/or ordering number."
    )
    @PutMapping("/subtopics/{id}")
    public ResponseEntity<ApiResponse<SubTopicDTO>> updateSubTopic(
            @PathVariable Long id,
            @Valid @RequestBody UpdateSubTopicRequestDTO request) {

        SubTopicDTO updated = manualService.updateSubTopic(id, request);
        return ResponseEntity.ok(ApiResponse.ok("SubTopic updated successfully", updated));
    }

    @Operation(
            summary = "Delete a subtopic",
            description = "ADMIN only. Permanently deletes a subtopic and all its sections from the database."
    )
    @DeleteMapping("/subtopics/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteSubTopic(@PathVariable Long id) {
        manualService.deleteSubTopic(id);
        return ResponseEntity.ok(ApiResponse.ok("SubTopic deleted successfully", null));
    }

    @Operation(
            summary = "Reorder topics (sections on main page)",
            description = "ADMIN only. Updates topic numbers based on the ordered list of topic IDs."
    )
    @PutMapping("/topics/reorder")
    public ResponseEntity<ApiResponse<Void>> reorderTopics(@RequestBody List<Long> topicIds) {
        manualService.reorderTopics(topicIds);
        return ResponseEntity.ok(ApiResponse.ok("Topics reordered successfully", null));
    }

    @Operation(
            summary = "Reorder sections (pages)",
            description = "ADMIN only. Updates section order indices based on the ordered list of section IDs."
    )
    @PutMapping("/sections/reorder")
    public ResponseEntity<ApiResponse<Void>> reorderSections(@RequestBody List<Long> sectionIds) {
        manualService.reorderSections(sectionIds);
        return ResponseEntity.ok(ApiResponse.ok("Sections reordered successfully", null));
    }

    // ------------------------------------------------------------------ //
    //  Manual Search Index Rebuild
    // ------------------------------------------------------------------ //

    @Operation(
            summary = "Rebuild Lucene search index",
            description = "ADMIN only. Drops and regenerates the entire Lucene full-text search index from all sections currently in the database."
    )
    @PostMapping("/rebuild-index")
    public ResponseEntity<ApiResponse<String>> rebuildIndex() throws Exception {
        luceneIndexService.rebuildIndex();
        return ResponseEntity.ok(ApiResponse.ok("Lucene search index rebuilt successfully.", "Index rebuilt"));
    }

    // ------------------------------------------------------------------ //
    //  Admin Dashboard Statistics
    // ------------------------------------------------------------------ //

    @Operation(
            summary = "Get system statistics",
            description = "ADMIN only. Returns total counts for sections, topics, subtopics, pages, and index state."
    )
    @GetMapping("/stats")
    public ResponseEntity<ApiResponse<AdminStatsDTO>> getStats() {
        AdminStatsDTO stats = new AdminStatsDTO(
                sectionRepository.count(),
                topicRepository.count(),
                subTopicRepository.count(),
                127,
                Instant.now().toString(),
                "5.4 — February 2024"
        );
        return ResponseEntity.ok(ApiResponse.ok(stats));
    }
}
