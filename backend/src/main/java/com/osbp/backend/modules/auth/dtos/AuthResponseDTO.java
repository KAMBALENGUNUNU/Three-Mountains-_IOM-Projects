package com.osbp.backend.modules.auth.dtos;

/**
 * Response DTO returned after a successful login.
 *
 * @param token the signed JWT to use in subsequent {@code Authorization: Bearer} headers
 * @param email the authenticated user's email
 * @param role  the authenticated user's role (e.g., {@code ADMIN} or {@code USER})
 */
public record AuthResponseDTO(
        String token,
        String email,
        String role
) { }
