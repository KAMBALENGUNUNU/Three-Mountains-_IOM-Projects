package com.osbp.backend.modules.search.controllers;

import com.osbp.backend.common.dtos.ApiResponse;
import com.osbp.backend.modules.search.dtos.SearchResultDTO;
import com.osbp.backend.modules.search.services.LuceneSearchService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * REST controller for full-text search operations.
 */
@RestController
@RequestMapping("/api/search")
@Tag(name = "Search", description = "Full-text fuzzy search over the OSBP Field Guide manual with occurrence counts")
@SecurityRequirement(name = "bearerAuth")
public class SearchController {

    private final LuceneSearchService luceneSearchService;

    public SearchController(LuceneSearchService luceneSearchService) {
        this.luceneSearchService = luceneSearchService;
    }

    /**
     * Searches the manual index using exact and fuzzy matching, returning total occurrences
     * (matching PDF Ctrl+F) and matching sections.
     *
     * @param query the search query string
     * @param limit maximum number of sections to return (default: 50, null for all)
     * @return {@link SearchResultDTO} with total occurrences, section counts, and ranked hits
     */
    @Operation(
            summary = "Search the manual",
            description = "Performs full-text search across all section titles and content. " +
                    "Returns total occurrences across the manual (matching PDF Ctrl+F) and matching sections with excerpts."
    )
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "200",
                    description = "Search results returned",
                    content = @Content(schema = @Schema(implementation = SearchResultDTO.class))
            ),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "401", description = "Unauthorized"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "500", description = "Search engine error")
    })
    @GetMapping
    public ResponseEntity<ApiResponse<SearchResultDTO>> search(
            @Parameter(description = "Search query (supports phrases, natural language, typos)", required = true)
            @RequestParam("q") String query,
            @Parameter(description = "Max sections to return (optional, defaults to 50)")
            @RequestParam(value = "limit", required = false) Integer limit) throws Exception {

        SearchResultDTO results = luceneSearchService.searchDetailed(query, limit);
        String message = (results.matchingSectionsCount() == 0)
                ? "No results found for: " + query
                : String.format("Found %d occurrence(s) across %d section(s)",
                results.totalOccurrences(), results.matchingSectionsCount());

        return ResponseEntity.ok(ApiResponse.ok(message, results));
    }
}
