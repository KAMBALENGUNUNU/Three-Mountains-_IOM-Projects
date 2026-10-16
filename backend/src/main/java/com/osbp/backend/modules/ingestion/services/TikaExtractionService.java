package com.osbp.backend.modules.ingestion.services;

import org.springframework.web.multipart.MultipartFile;

/**
 * Service interface for ingesting a PDF manual via Apache Tika.
 */
public interface TikaExtractionService {

    /**
     * Accepts an uploaded PDF file, extracts its text using Apache Tika,
     * parses it into the Topic → SubTopic → Section hierarchy, persists all
     * entities to the database, and triggers a Lucene index rebuild.
     *
     * @param file the uploaded PDF file
     * @throws Exception if Tika extraction or database persistence fails
     */
    void extractAndIngest(MultipartFile file) throws Exception;

    /**
     * Ingests a PDF from a java.io.File.
     */
    void extractAndIngest(java.io.File file) throws Exception;

    /**
     * Ingests a PDF from an InputStream.
     */
    void extractAndIngest(java.io.InputStream stream, String sourceName) throws Exception;
}
