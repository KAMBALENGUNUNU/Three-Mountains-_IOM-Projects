package com.osbp.backend.modules.auth.services;

import com.osbp.backend.modules.auth.dtos.AuthResponseDTO;
import com.osbp.backend.modules.auth.dtos.LoginRequestDTO;

/**
 * Service interface for authentication operations.
 */
public interface AuthService {

    /**
     * Validates the provided credentials and returns a JWT if they are correct.
     *
     * @param request the login request containing email and password
     * @return an {@link AuthResponseDTO} with the JWT token and user metadata
     * @throws org.springframework.security.core.AuthenticationException if credentials are invalid
     */
    AuthResponseDTO login(LoginRequestDTO request);
}
