package com.osbp.backend.security;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

/**
 * Security helper configuration providing UserDetailsService and PasswordEncoder beans.
 * Separated from SecurityConfig and AuthServiceImpl to prevent circular dependencies.
 */
@Configuration
public class ApplicationSecurityConfig {

    private final CachedUserDetailsService cachedUserDetailsService;

    public ApplicationSecurityConfig(CachedUserDetailsService cachedUserDetailsService) {
        this.cachedUserDetailsService = cachedUserDetailsService;
    }

    @Bean
    public UserDetailsService userDetailsService() {
        return cachedUserDetailsService;
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}
