package com.smartiq.backend.web;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(properties = {
        "smartiq.import.enabled=false",
        "smartiq.pool.enabled=false",
        "smartiq.session.enabled=false",
        "spring.datasource.url=jdbc:h2:mem:smartiq_correlation_test;MODE=PostgreSQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.username=sa",
        "spring.datasource.password="
})
@AutoConfigureMockMvc
class CorrelationIdFilterTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void generatesCorrelationIdWhenMissing() throws Exception {
        mockMvc.perform(get("/health"))
                .andExpect(status().isOk())
                .andExpect(header().exists(CorrelationIdFilter.HEADER_NAME));
    }

    @Test
    void echoesIncomingCorrelationId() throws Exception {
        mockMvc.perform(get("/health").header(CorrelationIdFilter.HEADER_NAME, "cid-test-123"))
                .andExpect(status().isOk())
                .andExpect(header().string(CorrelationIdFilter.HEADER_NAME, "cid-test-123"));
    }
}
