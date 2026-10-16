package com.osbp.backend.modules.auth.dtos;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

/**
 * Request DTO for {@code POST /api/auth/login}.
 *
 * @param email    the user's email address
 * @param password the user's raw (plaintext) password
 */
public record LoginRequestDTO(
        @NotBlank(message = "Email must not be blank")
        @Email(message = "Must be a valid email address")
        String email,

        @NotBlank(message = "Password must not be blank")
        String password
) { }
