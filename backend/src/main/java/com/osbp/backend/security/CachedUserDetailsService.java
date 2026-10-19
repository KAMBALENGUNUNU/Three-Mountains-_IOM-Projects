package com.osbp.backend.security;

import com.osbp.backend.modules.auth.repositories.UserRepository;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.context.annotation.Primary;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

/**
 * High-performance cached UserDetailsService.
 * Caches loaded UserDetails in Caffeine to avoid redundant SQL queries on every JWT request.
 */
@Service
@Primary
public class CachedUserDetailsService implements UserDetailsService {

    private final UserRepository userRepository;

    public CachedUserDetailsService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Override
    @Cacheable(value = "users", key = "#username")
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        return userRepository.findByEmail(username)
                .orElseThrow(() -> new UsernameNotFoundException("User not found with email: " + username));
    }
}
