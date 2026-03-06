package com.smartiq.backend.tenant;

public record AuthCompleteResponse(
        RuntimeAuthContextResponse runtimeAuth,
        MeResponse me
) {
}
