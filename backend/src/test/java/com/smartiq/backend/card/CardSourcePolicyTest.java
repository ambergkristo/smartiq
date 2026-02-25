package com.smartiq.backend.card;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class CardSourcePolicyTest {

    @Test
    void isAllowedReturnsFalseForMissingSource() {
        assertThat(CardSourcePolicy.isAllowed(null)).isFalse();
        assertThat(CardSourcePolicy.isAllowed("")).isFalse();
        assertThat(CardSourcePolicy.isAllowed("   ")).isFalse();
    }

    @Test
    void isAllowedAcceptsConfiguredAllowedSourcesCaseInsensitive() {
        assertThat(CardSourcePolicy.isAllowed("smartiq-v2")).isTrue();
        assertThat(CardSourcePolicy.isAllowed("SMARTIQ-HUMAN")).isTrue();
        assertThat(CardSourcePolicy.isAllowed("smartiq-verified")).isTrue();
    }
}
