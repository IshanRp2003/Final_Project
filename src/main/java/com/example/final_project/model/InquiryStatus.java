package com.example.final_project.model;

/**
 * Status of an inquiry thread.
 * PENDING - User created inquiry, waiting for agent/admin response
 * REPLIED - Agent or admin has responded
 * CLOSED - Inquiry has been resolved/closed
 */
public enum InquiryStatus {
    PENDING,
    REPLIED,
    CLOSED
}
