package com.osbp.backend.modules.auth.controllers;

import com.osbp.backend.common.dtos.ApiResponse;
import com.osbp.backend.modules.auth.dtos.AuthResponseDTO;
import com.osbp.backend.modules.auth.dtos.LoginRequestDTO;
import com.osbp.backend.modules.auth.services.AuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * REST controller for authentication operations.
 */
@RestController
@RequestMapping("/api/auth")
@Tag(name = "Authentication", description = "Login and JWT token management")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    /**
     * Authenticates a user and returns a JWT bearer token.
     *
     * @param request credentials (email + password)
     * @return JWT token and user metadata wrapped in {@link ApiResponse}
     */
    @Operation(
            summary = "Login",
            description = "Validates credentials and returns a JWT bearer token. " +
                    "Include the token in subsequent requests as: Authorization: Bearer {token}"
    )
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "200",
                    description = "Login successful",
                    content = @Content(schema = @Schema(implementation = AuthResponseDTO.class))
            ),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "401",
                    description = "Invalid credentials"
            ),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "400",
                    description = "Validation error (missing/invalid fields)"
            )
    })
    @PostMapping("/login")
    public ResponseEntity<ApiResponse<AuthResponseDTO>> login(
            @Valid @RequestBody LoginRequestDTO request) {

        AuthResponseDTO response = authService.login(request);
        return ResponseEntity.ok(ApiResponse.ok("Login successful", response));
    }
}
