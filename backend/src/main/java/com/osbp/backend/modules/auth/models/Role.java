package com.osbp.backend.modules.auth.models;

/**
 * User roles within the OSBP Field Guide system.
 */
public enum Role {
    /** Standard read-only user. */
    USER,
    /** Administrator with full access including PDF ingestion. */
    ADMIN
}
