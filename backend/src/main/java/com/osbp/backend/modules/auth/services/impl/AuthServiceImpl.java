package com.osbp.backend.modules.auth.services.impl;

import com.osbp.backend.modules.auth.dtos.AuthResponseDTO;
import com.osbp.backend.modules.auth.dtos.LoginRequestDTO;
import com.osbp.backend.modules.auth.models.User;
import com.osbp.backend.modules.auth.repositories.UserRepository;
import com.osbp.backend.modules.auth.services.AuthService;
import com.osbp.backend.security.JwtUtil;
import org.springframework.context.annotation.Lazy;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

/**
 * Implementation of {@link AuthService}.
 */
@Service
public class AuthServiceImpl implements AuthService {

    private final AuthenticationManager authenticationManager;
    private final UserRepository userRepository;
    private final JwtUtil jwtUtil;

    public AuthServiceImpl(
            @Lazy AuthenticationManager authenticationManager,
            UserRepository userRepository,
            JwtUtil jwtUtil) {
        this.authenticationManager = authenticationManager;
        this.userRepository = userRepository;
        this.jwtUtil = jwtUtil;
    }

    // ------------------------------------------------------------------ //
    //  AuthService
    // ------------------------------------------------------------------ //

    /**
     * Authenticates the user via Spring Security's {@link AuthenticationManager}
     * and issues a JWT on success.
     *
     * @throws org.springframework.security.core.AuthenticationException on bad credentials
     */
    @Override
    public AuthResponseDTO login(LoginRequestDTO request) {
        // Delegate credential verification to Spring Security (BCrypt comparison)
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.email(), request.password())
        );

        // At this point authentication succeeded — load the full entity
        User user = userRepository.findByEmail(request.email())
                .orElseThrow(() -> new UsernameNotFoundException("User not found: " + request.email()));

        String token = jwtUtil.generateToken(user);

        return new AuthResponseDTO(token, user.getEmail(), user.getRole().name());
    }
}
