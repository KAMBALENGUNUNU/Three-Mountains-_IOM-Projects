package com.osbp.backend.modules.manual.controllers;

import com.osbp.backend.common.dtos.ApiResponse;
import com.osbp.backend.modules.manual.dtos.SectionDTO;
import com.osbp.backend.modules.manual.dtos.TocResponseDTO;
import com.osbp.backend.modules.manual.services.ManualService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * REST controller for reading the manual's Table of Contents and sections.
 */
@RestController
@RequestMapping("/api/manual")
@Tag(name = "Manual", description = "Table of Contents and section content retrieval")
@SecurityRequirement(name = "bearerAuth")
public class ManualController {

    private final ManualService manualService;

    public ManualController(ManualService manualService) {
        this.manualService = manualService;
    }

    /**
     * Returns the full hierarchical Table of Contents.
     */
    @Operation(
            summary = "Get Table of Contents",
            description = "Returns the full hierarchical TOC: Topics → SubTopics → Sections."
    )
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "200",
                    description = "TOC retrieved successfully",
                    content = @Content(schema = @Schema(implementation = TocResponseDTO.class))
            ),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "401", description = "Unauthorized")
    })
    @GetMapping("/toc")
    public ResponseEntity<ApiResponse<TocResponseDTO>> getTableOfContents() {
        TocResponseDTO toc = manualService.getTableOfContents();
        return ResponseEntity.ok(ApiResponse.ok(toc));
    }

    /**
     * Returns the full content of a specific section by its ID.
     */
    @Operation(
            summary = "Get Section by ID",
            description = "Returns the full text content of a specific section."
    )
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "200",
                    description = "Section retrieved successfully",
                    content = @Content(schema = @Schema(implementation = SectionDTO.class))
            ),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "401", description = "Unauthorized"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "Section not found")
    })
    @GetMapping({"/section/{id}", "/sections/{id}"})
    public ResponseEntity<ApiResponse<SectionDTO>> getSectionById(
            @Parameter(description = "The database ID of the section", required = true)
            @PathVariable Long id) {

        SectionDTO section = manualService.getSectionById(id);
        return ResponseEntity.ok(ApiResponse.ok(section));
    }
}
