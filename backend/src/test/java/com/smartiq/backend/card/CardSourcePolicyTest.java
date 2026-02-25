package com.smartiq.backend.card;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

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

    @Test
    void normalizeSourceRejectsMissingSource() {
        assertThatThrownBy(() -> CardSourcePolicy.normalizeSource(null))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Card source is required");
        assertThatThrownBy(() -> CardSourcePolicy.normalizeSource(" "))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Card source is required");
    }
}
