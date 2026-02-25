package com.smartiq.backend.web;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartiq.backend.config.RateLimitProperties;
import io.micrometer.core.instrument.MeterRegistry;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import java.lang.reflect.Field;
import java.lang.reflect.Method;

import static org.assertj.core.api.Assertions.assertThat;

class RateLimitFilterPropertiesTest {

    @Test
    void clampsWindowSecondsAndCounterMax() throws Exception {
        RateLimitProperties props = new RateLimitProperties(
                true,
                0,
                true,
                0,
                1,
                1,
                1,
                1,
                1
        );
        MeterRegistry meterRegistry = Mockito.mock(MeterRegistry.class);
        RateLimitFilter filter = new RateLimitFilter(props, new ObjectMapper(), meterRegistry, false);

        Field windowField = RateLimitFilter.class.getDeclaredField("windowSeconds");
        Field counterField = RateLimitFilter.class.getDeclaredField("maxCounters");
        windowField.setAccessible(true);
        counterField.setAccessible(true);

        assertThat(windowField.getInt(filter)).isEqualTo(1);
        assertThat(counterField.getInt(filter)).isEqualTo(1);
    }

    @Test
    void clampLimitRulesToMinimum() throws Exception {
        RateLimitProperties props = new RateLimitProperties(
                true,
                60,
                true,
                10,
                0,
                0,
                0,
                0,
                0
        );
        MeterRegistry meterRegistry = Mockito.mock(MeterRegistry.class);
        RateLimitFilter filter = new RateLimitFilter(props, new ObjectMapper(), meterRegistry, false);

        Method resolveLimit = RateLimitFilter.class.getDeclaredMethod("resolveLimit", String.class);
        resolveLimit.setAccessible(true);
        Object rule = resolveLimit.invoke(filter, "/api/cards/nextRandom");
        Method limitMethod = rule.getClass().getMethod("limit");

        assertThat((int) limitMethod.invoke(rule)).isEqualTo(1);
    }
}
