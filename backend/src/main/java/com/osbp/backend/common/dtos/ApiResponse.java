package com.osbp.backend.common.dtos;

/**
 * Generic API response wrapper used across all endpoints.
 *
 * @param <T> the type of the payload data
 */
public record ApiResponse<T>(
        boolean success,
        String message,
        T data
) {

    // ------------------------------------------------------------------ //
    //  Factory helpers
    // ------------------------------------------------------------------ //

    /** Returns a successful response with data and a default message. */
    public static <T> ApiResponse<T> ok(T data) {
        return new ApiResponse<>(true, "Success", data);
    }

    /** Returns a successful response with data and a custom message. */
    public static <T> ApiResponse<T> ok(String message, T data) {
        return new ApiResponse<>(true, message, data);
    }

    /** Returns an error response with no data payload. */
    public static <T> ApiResponse<T> error(String message) {
        return new ApiResponse<>(false, message, null);
    }
}
