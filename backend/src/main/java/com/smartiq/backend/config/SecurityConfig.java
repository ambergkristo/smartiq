package com.smartiq.backend.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
public class SecurityConfig {

    @Bean
    SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        return http
                .csrf(csrf -> csrf.disable())
                .cors(Customizer.withDefaults())
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                        .requestMatchers("/health", "/version").permitAll()
                        .requestMatchers("/api/auth", "/api/auth/**").permitAll()
                        .requestMatchers("/api/me", "/api/me/**").permitAll()
                        .requestMatchers("/api/onboarding", "/api/onboarding/**").permitAll()
                        .requestMatchers("/api/billing", "/api/billing/**").permitAll()
                        .requestMatchers("/api/topics").permitAll()
                        .requestMatchers("/api/cards/nextRandom", "/api/cards/next", "/api/cards/random").permitAll()
                        .requestMatchers("/api/game/**").permitAll()
                        .requestMatchers("/api/rooms/**").permitAll()
                        .requestMatchers("/ws/rooms/**").permitAll()
                        .requestMatchers("/actuator/**").permitAll()
                        .requestMatchers("/internal/**", "/api/admin/**").permitAll()
                        .anyRequest().denyAll())
                .httpBasic(httpBasic -> httpBasic.disable())
                .formLogin(form -> form.disable())
                .build();
    }
}
