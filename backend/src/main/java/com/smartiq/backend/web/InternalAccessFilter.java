package com.smartiq.backend.web;

import com.smartiq.backend.config.InternalAccessProperties;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.context.annotation.Profile;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;
import java.util.Objects;

@Component
@Profile("prod")
public class InternalAccessFilter extends OncePerRequestFilter {

    private final InternalAccessProperties properties;

    public InternalAccessFilter(InternalAccessProperties properties) {
        this.properties = properties;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        if (!properties.enabled() || !requiresProtection(request.getRequestURI())) {
            filterChain.doFilter(request, response);
            return;
        }

        String expectedKey = properties.apiKey();
        String headerName = properties.apiKeyHeader();
        String providedKey = request.getHeader(headerName);

        if (expectedKey == null || expectedKey.isBlank()) {
            writeError(response, HttpServletResponse.SC_SERVICE_UNAVAILABLE, "Internal access key not configured.");
            return;
        }

        if (!Objects.equals(expectedKey, providedKey)) {
            writeError(response, HttpServletResponse.SC_UNAUTHORIZED, "Unauthorized.");
            return;
        }

        filterChain.doFilter(request, response);
    }

    private boolean requiresProtection(String requestUri) {
        if (requestUri == null) {
            return false;
        }
        if (requestUri.startsWith("/internal/") || requestUri.startsWith("/api/admin/")) {
            return true;
        }

        if (!requestUri.startsWith("/actuator/")) {
            return false;
        }

        List<String> protectedPaths = properties.protectedActuatorPaths();
        if (protectedPaths == null) {
            return false;
        }

        return protectedPaths.stream().anyMatch(requestUri::startsWith);
    }

    private void writeError(HttpServletResponse response, int status, String message) throws IOException {
        response.setStatus(status);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.getWriter().write("{\"error\":\"" + message + "\"}");
    }
}
