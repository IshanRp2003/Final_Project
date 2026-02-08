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
 * Agent REST API for inquiry management.
 * Allows agents to view and respond to their assigned inquiries.
 */
@RestController
@RequestMapping("/api/agent/inquiries")
@RequiredArgsConstructor
@PreAuthorize("hasRole('AGENT')")
public class AgentInquiryController {

    private final InquiryService inquiryService;

    /**
     * Get inquiries assigned to the current agent, optionally filtered by status.
     */
    @GetMapping
    public ResponseEntity<List<InquiryDTO>> getMyAssignedInquiries(
            @RequestParam(required = false) InquiryStatus status) {
        return ResponseEntity.ok(inquiryService.getAgentInquiries(status));
    }

    /**
     * Get all messages for a specific inquiry.
     */
    @GetMapping("/{id}/messages")
    public ResponseEntity<List<InquiryMessageDTO>> getMessages(@PathVariable Long id) {
        return ResponseEntity.ok(inquiryService.getInquiryMessagesAgent(id));
    }

    /**
     * Reply to an inquiry assigned to this agent.
     */
    @PostMapping("/{id}/reply")
    public ResponseEntity<InquiryMessageDTO> reply(
            @PathVariable Long id,
            @Valid @RequestBody SendMessageRequest request) {
        return ResponseEntity.ok(inquiryService.replyToInquiry(id, request, false));
    }

    /**
     * Close an inquiry assigned to this agent.
     */
    @PostMapping("/{id}/close")
    public ResponseEntity<Void> close(@PathVariable Long id) {
        inquiryService.closeInquiry(id, false);
        return ResponseEntity.ok().build();
    }
}
