package com.smartiq.backend.player;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/player-profiles")
public class PlayerProfileController {

    private final PlayerProfileService playerProfileService;

    public PlayerProfileController(PlayerProfileService playerProfileService) {
        this.playerProfileService = playerProfileService;
    }

    @GetMapping("/{guestToken}")
    public PlayerProfileResponse getProfile(@PathVariable String guestToken) {
        return playerProfileService.getProfile(guestToken);
    }

    @PutMapping("/{guestToken}")
    public PlayerProfileResponse upsertProfile(@PathVariable String guestToken,
                                               @RequestBody(required = false) PlayerProfileUpsertRequest request) {
        return playerProfileService.upsertProfile(
                guestToken,
                request == null ? null : request.profile()
        );
    }
}
