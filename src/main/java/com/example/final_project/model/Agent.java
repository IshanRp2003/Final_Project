package com.example.final_project.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "agents")
public class Agent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(unique = true)
    private String email;

    private String phone;

    @Column(length = 500)
    private String profileImageUrl;

    private String title; // e.g., "Senior Property Consultant"

    @Column(length = 1000)
    private String bio;

    private String qualifications; // e.g., "RERA Certified, Real Estate License"

    private String degree; // e.g., "MBA in Real Estate Management"

    private Integer experience; // Years of experience

    private String specialization; // e.g., "Luxury Properties", "Commercial"

    private String location; // Sri Lanka district e.g., "Colombo", "Kandy"

    @Builder.Default
    private Integer propertiesSold = 0;

    @Builder.Default
    private Double rating = 5.0; // 1-5 rating

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private AgentStatus status = AgentStatus.ACTIVE;

    // Link to the User account for this agent (for login/authentication)
    @ManyToOne(fetch = jakarta.persistence.FetchType.LAZY)
    @JoinColumn(name = "linked_user_id")
    private User linkedUser;

    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
