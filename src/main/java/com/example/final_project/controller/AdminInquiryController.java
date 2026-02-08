package com.example.final_project.controller;

import com.example.final_project.dto.*;
import com.example.final_project.model.InquiryStatus;
import com.example.final_project.service.InquiryService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Admin REST API for inquiry management.
 * Allows admins to view all inquiries, reply, close, and reassign.
 */
@RestController
@RequestMapping("/api/admin/inquiries")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminInquiryController {

    private final InquiryService inquiryService;

    /**
     * Get all inquiries, optionally filtered by status.
     */
    @GetMapping
    public ResponseEntity<List<InquiryDTO>> getAllInquiries(
            @RequestParam(required = false) InquiryStatus status) {
        return ResponseEntity.ok(inquiryService.getAllInquiries(status));
    }

    /**
     * Get all messages for a specific inquiry.
     */
    @GetMapping("/{id}/messages")
    public ResponseEntity<List<InquiryMessageDTO>> getMessages(@PathVariable Long id) {
        return ResponseEntity.ok(inquiryService.getInquiryMessagesAdmin(id));
    }

    /**
     * Reply to an inquiry.
     */
    @PostMapping("/{id}/reply")
    public ResponseEntity<InquiryMessageDTO> reply(
            @PathVariable Long id,
            @Valid @RequestBody SendMessageRequest request) {
        return ResponseEntity.ok(inquiryService.replyToInquiry(id, request, true));
    }

    /**
     * Close an inquiry.
     */
    @PostMapping("/{id}/close")
    public ResponseEntity<Void> close(@PathVariable Long id) {
        inquiryService.closeInquiry(id, true);
        return ResponseEntity.ok().build();
    }

    /**
     * Reassign an inquiry to a different agent.
     */
    @PostMapping("/{id}/reassign/{agentId}")
    public ResponseEntity<Void> reassign(
            @PathVariable Long id,
            @PathVariable Long agentId) {
        inquiryService.reassignInquiry(id, agentId);
        return ResponseEntity.ok().build();
    }
}
