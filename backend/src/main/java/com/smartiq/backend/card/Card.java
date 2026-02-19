package com.smartiq.backend.card;

import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OrderColumn;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "cards")
public class Card {

    @Id
    @Column(length = 128)
    private String id;

    @Column(nullable = false)
    private String topic;

    @Column
    private String subtopic;

    @Column(nullable = false, length = 32)
    private String category;

    @Column(nullable = false, length = 8)
    private String language;

    @Column(nullable = false, length = 2000)
    private String question;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "card_options", joinColumns = @JoinColumn(name = "card_id"))
    @OrderColumn(name = "option_index")
    @Column(name = "option_text", nullable = false, length = 1000)
    private List<String> options = new ArrayList<>();

    @Column(name = "correct_index")
    private Integer correctIndex;

    @Column(name = "correct_flags", length = 2000)
    private String correctFlags;

    @Column(name = "correct_meta", length = 4000)
    private String correctMeta;

    @Column(nullable = false, length = 32)
    private String difficulty;

    @Column(nullable = false, length = 512)
    private String source;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getTopic() {
        return topic;
    }

    public void setTopic(String topic) {
        this.topic = topic;
    }

    public String getSubtopic() {
        return subtopic;
    }

    public void setSubtopic(String subtopic) {
        this.subtopic = subtopic;
    }

    public String getLanguage() {
        return language;
    }

    public void setLanguage(String language) {
        this.language = language;
    }

    public String getQuestion() {
        return question;
    }

    public void setQuestion(String question) {
        this.question = question;
    }

    public List<String> getOptions() {
        return options;
    }

    public void setOptions(List<String> options) {
        this.options = options;
    }

    public Integer getCorrectIndex() {
        return correctIndex;
    }

    public void setCorrectIndex(Integer correctIndex) {
        this.correctIndex = correctIndex;
    }

    public String getCorrectFlags() {
        return correctFlags;
    }

    public String getCategory() {
        return category;
    }

    public void setCategory(String category) {
        this.category = category;
    }

    public String getCorrectMeta() {
        return correctMeta;
    }

    public void setCorrectMeta(String correctMeta) {
        this.correctMeta = correctMeta;
    }

    public void setCorrectFlags(String correctFlags) {
        this.correctFlags = correctFlags;
    }

    public String getDifficulty() {
        return difficulty;
    }

    public void setDifficulty(String difficulty) {
        this.difficulty = difficulty;
    }

    public String getSource() {
        return source;
    }

    public void setSource(String source) {
        this.source = source;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }
}
