package com.example.final_project.controller;

import com.example.final_project.dto.*;
import com.example.final_project.service.InquiryService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * User-facing REST API for inquiry management.
 * Allows users to create inquiries, view their inquiries, and send messages.
 */
@RestController
@RequestMapping("/api/inquiries")
@RequiredArgsConstructor
public class InquiryController {

    private final InquiryService inquiryService;

    /**
     * Create a new inquiry for a property.
     */
    @PostMapping
    public ResponseEntity<InquiryDTO> createInquiry(@Valid @RequestBody CreateInquiryRequest request) {
        return ResponseEntity.ok(inquiryService.createInquiry(request));
    }

    /**
     * Get all inquiries for the current user.
     */
    @GetMapping("/my")
    public ResponseEntity<List<InquiryDTO>> getMyInquiries() {
        return ResponseEntity.ok(inquiryService.getMyInquiries());
    }

    /**
     * Get all messages for a specific inquiry.
     */
    @GetMapping("/{id}/messages")
    public ResponseEntity<List<InquiryMessageDTO>> getMessages(@PathVariable Long id) {
        return ResponseEntity.ok(inquiryService.getInquiryMessages(id));
    }

    /**
     * Send a follow-up message in an inquiry.
     */
    @PostMapping("/{id}/messages")
    public ResponseEntity<InquiryMessageDTO> sendMessage(
            @PathVariable Long id,
            @Valid @RequestBody SendMessageRequest request) {
        return ResponseEntity.ok(inquiryService.sendUserMessage(id, request));
    }
}
