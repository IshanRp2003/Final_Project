package com.example.final_project.dto;

import com.example.final_project.model.Role;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * DTO for returning individual inquiry messages.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class InquiryMessageDTO {
    private Long id;
    private Long senderId;
    private String senderName;
    private Role senderRole;
    private String text;
    private LocalDateTime createdAt;
}
