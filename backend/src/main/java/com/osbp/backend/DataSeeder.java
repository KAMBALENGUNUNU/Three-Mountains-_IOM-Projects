package com.osbp.backend;

import com.osbp.backend.modules.auth.models.Role;
import com.osbp.backend.modules.auth.models.User;
import com.osbp.backend.modules.auth.repositories.UserRepository;
import com.osbp.backend.modules.ingestion.services.TikaExtractionService;
import com.osbp.backend.modules.manual.repositories.TopicRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.io.File;

/**
 * Seeds the database on startup:
 * 1. Default ADMIN user if no users exist.
 * 2. Digitize and ingest the real OSBP manual if no topics exist.
 */
@Configuration
public class DataSeeder {

    private static final Logger log = LoggerFactory.getLogger(DataSeeder.class);

    @Bean
    public CommandLineRunner seedDatabase(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            TopicRepository topicRepository,
            TikaExtractionService tikaExtractionService) {
        return args -> {
            // 1. Seed Accounts
            seedUserIfNotExists(userRepository, passwordEncoder, "admin@osbp.com", "Admin@1234", Role.ADMIN);
            seedUserIfNotExists(userRepository, passwordEncoder, "admin@eac.int", "Admin@1234", Role.ADMIN);
            seedUserIfNotExists(userRepository, passwordEncoder, "officer@osbp.com", "Officer@1234", Role.USER);
            seedUserIfNotExists(userRepository, passwordEncoder, "officer.namanga@eac.int", "Officer@1234", Role.USER);
            seedUserIfNotExists(userRepository, passwordEncoder, "trainee.mwangi@eac.int", "Trainee@1234", Role.USER);

            // 2. Seed and Digitize Manual if database has 0 topics
            if (topicRepository.count() == 0) {
                File pdfFile = findManualPdf();
                if (pdfFile != null && pdfFile.exists()) {
                    log.info("📖 Found OSBP Learner Manual PDF at '{}'. Beginning auto-ingestion...", pdfFile.getAbsolutePath());
                    try {
                        tikaExtractionService.extractAndIngest(pdfFile);
                        log.info("✅ OSBP Learner Manual successfully ingested and indexed! Total topics: {}", topicRepository.count());
                    } catch (Exception e) {
                        log.error("❌ Failed to auto-ingest manual PDF during startup: {}", e.getMessage(), e);
                    }
                } else {
                    log.warn("⚠️ OSBP manual PDF file not found. Place 'OSBP MIGRATION MODULE-v 5.4. en.pdf' in the project root to auto-ingest.");
                }
            } else {
                log.info("Manual topics already present (count={}) — skipping initial PDF ingestion.", topicRepository.count());
            }
        };
    }

    private File findManualPdf() {
        String[] candidatePaths = {
                "../OSBP MIGRATION MODULE-v 5.4. en.pdf",
                "OSBP MIGRATION MODULE-v 5.4. en.pdf",
                "c:/Users/daniel/OneDrive/Three Mountains 4 Projects/IOM/OSBP MIGRATION MODULE-v 5.4. en.pdf"
        };
        for (String path : candidatePaths) {
            File f = new File(path);
            if (f.exists() && f.isFile()) {
                return f;
            }
        }
        return null;
    }

    private void seedUserIfNotExists(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            String email,
            String rawPassword,
            Role role) {
        if (userRepository.findByEmail(email).isEmpty()) {
            User user = new User(email, passwordEncoder.encode(rawPassword), role);
            userRepository.save(user);
            log.info("✅ Seeded account: {} (Role: {})", email, role);
        }
    }
}
