package com.osbp.backend.modules.auth.repositories;

import com.osbp.backend.modules.auth.models.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

/**
 * Repository for {@link User} entities.
 */
@Repository
public interface UserRepository extends JpaRepository<User, UUID> {

    /**
     * Finds a user by their email address.
     *
     * @param email the user's email
     * @return an {@link Optional} containing the user if found
     */
    Optional<User> findByEmail(String email);
}
