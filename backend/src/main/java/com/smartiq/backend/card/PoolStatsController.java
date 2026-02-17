package com.smartiq.backend.card;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/internal")
public class PoolStatsController {

    private final QuestionPoolService questionPoolService;

    public PoolStatsController(QuestionPoolService questionPoolService) {
        this.questionPoolService = questionPoolService;
    }

    @GetMapping("/pool-stats")
    public List<PoolKeyStats> poolStats() {
        return questionPoolService.getPoolStats();
    }
}