package com.example.final_project.repository;

import com.example.final_project.model.Agent;
import com.example.final_project.model.AgentStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AgentRepository extends JpaRepository<Agent, Long> {

    List<Agent> findByStatus(AgentStatus status);

    Optional<Agent> findByEmail(String email);

    long countByStatus(AgentStatus status);

    List<Agent> findByNameContainingIgnoreCase(String name);

    // Find agent by their linked user account
    Optional<Agent> findByLinkedUserId(Long userId);
}
