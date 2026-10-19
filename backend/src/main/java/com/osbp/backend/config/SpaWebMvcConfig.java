package com.osbp.backend.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.Resource;
import org.springframework.lang.NonNull;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;
import org.springframework.web.servlet.resource.PathResourceResolver;

import java.io.IOException;

/**
 * Configures Spring MVC to serve static Angular frontend assets and
 * forwards all non-API SPA routes to /index.html.
 */
@Configuration
public class SpaWebMvcConfig implements WebMvcConfigurer {

    @Override
    public void addResourceHandlers(@NonNull ResourceHandlerRegistry registry) {
        // Hashed bundles, styles, fonts and static assets are cached for 1 year immutable
        registry.addResourceHandler("/*.js", "/*.css", "/assets/**", "/favicon.ico")
                .addResourceLocations("classpath:/static/")
                .setCacheControl(org.springframework.http.CacheControl.maxAge(365, java.util.concurrent.TimeUnit.DAYS).cachePublic().immutable());

        // index.html must not be aggressively cached so clients immediately receive updated bundle hashes
        registry.addResourceHandler("/index.html")
                .addResourceLocations("classpath:/static/index.html")
                .setCacheControl(org.springframework.http.CacheControl.noCache());

        registry.addResourceHandler("/**")
                .addResourceLocations("classpath:/static/")
                .resourceChain(true)
                .addResolver(new PathResourceResolver() {
                    @Override
                    protected Resource getResource(@NonNull String resourcePath, @NonNull Resource location) throws IOException {
                        Resource requestedResource = location.createRelative(resourcePath);

                        // If physical file exists (js, css, png, svg, fonts, etc.), serve it
                        if (requestedResource.exists() && requestedResource.isReadable()) {
                            return requestedResource;
                        }

                        // Do NOT forward API routes or Swagger docs to index.html
                        if (resourcePath.startsWith("api")
                                || resourcePath.startsWith("swagger-ui")
                                || resourcePath.startsWith("api-docs")
                                || resourcePath.startsWith("v3/api-docs")) {
                            return null;
                        }

                        // Otherwise, forward all client SPA routes (e.g., /, /search, /p/123) to Angular's index.html
                        return new ClassPathResource("/static/index.html");
                    }
                });
    }
}
