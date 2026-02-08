package com.example.final_project.repository;

import com.example.final_project.model.Inquiry;
import com.example.final_project.model.InquiryStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface InquiryRepository extends JpaRepository<Inquiry, Long> {

    // Find inquiries for a specific property
    List<Inquiry> findByPropertyId(Long propertyId);

    // Find all inquiries for a user
    List<Inquiry> findByUserIdOrderByLastMessageAtDesc(Long userId);

    // Find inquiries by status (for admin inbox)
    List<Inquiry> findByStatusOrderByLastMessageAtDesc(InquiryStatus status);

    // Find all inquiries for admin, ordered by last message
    List<Inquiry> findAllByOrderByLastMessageAtDesc();

    // Find inquiries assigned to a specific agent
    List<Inquiry> findByAssignedAgentIdOrderByLastMessageAtDesc(Long agentId);

    // Find inquiries assigned to an agent with a specific status
    List<Inquiry> findByAssignedAgentIdAndStatusOrderByLastMessageAtDesc(Long agentId, InquiryStatus status);

    // Check if user owns this inquiry
    @Query("SELECT i FROM Inquiry i WHERE i.id = :inquiryId AND i.user.id = :userId")
    Optional<Inquiry> findByIdAndUserId(@Param("inquiryId") Long inquiryId, @Param("userId") Long userId);

    // Check if agent is assigned to this inquiry
    @Query("SELECT i FROM Inquiry i WHERE i.id = :inquiryId AND i.assignedAgent.id = :agentId")
    Optional<Inquiry> findByIdAndAssignedAgentId(@Param("inquiryId") Long inquiryId, @Param("agentId") Long agentId);

    // Count unread inquiries for user (where there are messages after
    // lastReadAtUser)
    @Query("SELECT COUNT(i) FROM Inquiry i WHERE i.user.id = :userId AND i.lastMessageAt > COALESCE(i.lastReadAtUser, i.createdAt)")
    Long countUnreadForUser(@Param("userId") Long userId);

    // Count pending inquiries for admin dashboard
    Long countByStatus(InquiryStatus status);
}
