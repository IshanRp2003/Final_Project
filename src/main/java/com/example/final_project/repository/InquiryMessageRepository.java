package com.example.final_project.repository;

import com.example.final_project.model.InquiryMessage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * Repository for InquiryMessage entity.
 */
@Repository
public interface InquiryMessageRepository extends JpaRepository<InquiryMessage, Long> {

    /**
     * Find all messages for a specific inquiry, ordered by creation time.
     */
    List<InquiryMessage> findByInquiryIdOrderByCreatedAtAsc(Long inquiryId);
}
