package com.example.final_project.service;

import com.example.final_project.dto.*;
import com.example.final_project.model.*;
import com.example.final_project.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class InquiryService {

    private final InquiryRepository inquiryRepository;
    private final InquiryMessageRepository messageRepository;
    private final UserRepository userRepository;
    private final PropertyRepository propertyRepository;
    private final AgentRepository agentRepository;
    private final SimpMessagingTemplate messagingTemplate;

    /**
     * Create a new inquiry with the first message.
     * Auto-assigns to the property's agent if one exists.
     */
    @Transactional
    public InquiryDTO createInquiry(CreateInquiryRequest request) {
        User user = getCurrentUser();
        Property property = propertyRepository.findById(request.getPropertyId())
                .orElseThrow(() -> new RuntimeException("Property not found"));

        // Create the inquiry
        Inquiry inquiry = Inquiry.builder()
                .user(user)
                .property(property)
                .assignedAgent(property.getAssignedAgent()) // Auto-assign from property
                .status(InquiryStatus.PENDING)
                .createdAt(LocalDateTime.now())
                .lastMessageAt(LocalDateTime.now())
                .build();

        inquiry = inquiryRepository.save(inquiry);

        // Create the first message
        InquiryMessage message = InquiryMessage.builder()
                .inquiry(inquiry)
                .senderId(user.getId())
                .senderRole(user.getRole())
                .text(request.getMessage())
                .createdAt(LocalDateTime.now())
                .build();

        messageRepository.save(message);

        // Send WebSocket notifications to admin and assigned agent
        sendNewInquiryNotifications(inquiry);

        log.info("User {} created inquiry {} for property {}", user.getEmail(), inquiry.getId(), property.getId());
        return toDTO(inquiry, message.getText().substring(0, Math.min(100, message.getText().length())));
    }

    /**
     * Get all inquiries for the current user.
     */
    public List<InquiryDTO> getMyInquiries() {
        User user = getCurrentUser();
        return inquiryRepository.findByUserIdOrderByLastMessageAtDesc(user.getId())
                .stream()
                .map(this::toDTOWithLastMessage)
                .collect(Collectors.toList());
    }

    /**
     * Get messages for a specific inquiry (user access).
     */
    public List<InquiryMessageDTO> getInquiryMessages(Long inquiryId) {
        User user = getCurrentUser();
        Inquiry inquiry = inquiryRepository.findByIdAndUserId(inquiryId, user.getId())
                .orElseThrow(() -> new RuntimeException("Inquiry not found or access denied"));

        // Update last read timestamp for user
        inquiry.setLastReadAtUser(LocalDateTime.now());
        inquiryRepository.save(inquiry);

        return messageRepository.findByInquiryIdOrderByCreatedAtAsc(inquiryId)
                .stream()
                .map(this::toMessageDTO)
                .collect(Collectors.toList());
    }

    /**
     * User sends a follow-up message in an inquiry.
     */
    @Transactional
    public InquiryMessageDTO sendUserMessage(Long inquiryId, SendMessageRequest request) {
        User user = getCurrentUser();
        Inquiry inquiry = inquiryRepository.findByIdAndUserId(inquiryId, user.getId())
                .orElseThrow(() -> new RuntimeException("Inquiry not found or access denied"));

        // Can only send messages to non-closed inquiries
        if (inquiry.getStatus() == InquiryStatus.CLOSED) {
            throw new RuntimeException("Cannot send messages to closed inquiries");
        }

        InquiryMessage message = InquiryMessage.builder()
                .inquiry(inquiry)
                .senderId(user.getId())
                .senderRole(user.getRole())
                .text(request.getText())
                .createdAt(LocalDateTime.now())
                .build();

        message = messageRepository.save(message);

        // Update inquiry timestamp and status back to PENDING
        inquiry.setLastMessageAt(LocalDateTime.now());
        if (inquiry.getStatus() == InquiryStatus.REPLIED) {
            inquiry.setStatus(InquiryStatus.PENDING);
        }
        inquiry.setLastReadAtUser(LocalDateTime.now());
        inquiryRepository.save(inquiry);

        // Notify admin and agent about user reply
        sendMessageNotification(inquiry, message, "user_reply");

        log.info("User {} sent follow-up message to inquiry {}", user.getEmail(), inquiryId);
        return toMessageDTO(message);
    }

    // ==================== ADMIN METHODS ====================

    /**
     * Get all inquiries (admin access).
     */
    public List<InquiryDTO> getAllInquiries(InquiryStatus status) {
        List<Inquiry> inquiries;
        if (status != null) {
            inquiries = inquiryRepository.findByStatusOrderByLastMessageAtDesc(status);
        } else {
            inquiries = inquiryRepository.findAllByOrderByLastMessageAtDesc();
        }
        return inquiries.stream()
                .map(this::toDTOWithLastMessage)
                .collect(Collectors.toList());
    }

    /**
     * Get messages for a specific inquiry (admin access).
     */
    public List<InquiryMessageDTO> getInquiryMessagesAdmin(Long inquiryId) {
        Inquiry inquiry = inquiryRepository.findById(inquiryId)
                .orElseThrow(() -> new RuntimeException("Inquiry not found"));

        // Update last read timestamp for admin
        inquiry.setLastReadAtAdmin(LocalDateTime.now());
        inquiryRepository.save(inquiry);

        return messageRepository.findByInquiryIdOrderByCreatedAtAsc(inquiryId)
                .stream()
                .map(this::toMessageDTO)
                .collect(Collectors.toList());
    }

    /**
     * Admin/Agent replies to an inquiry.
     */
    @Transactional
    public InquiryMessageDTO replyToInquiry(Long inquiryId, SendMessageRequest request, boolean isAdmin) {
        User responder = getCurrentUser();
        Inquiry inquiry = inquiryRepository.findById(inquiryId)
                .orElseThrow(() -> new RuntimeException("Inquiry not found"));

        // If not admin, check if this agent is assigned
        if (!isAdmin) {
            Agent agent = agentRepository.findByLinkedUserId(responder.getId())
                    .orElseThrow(() -> new RuntimeException("Agent profile not found"));
            if (inquiry.getAssignedAgent() == null || !inquiry.getAssignedAgent().getId().equals(agent.getId())) {
                throw new RuntimeException("You are not assigned to this inquiry");
            }
        }

        InquiryMessage message = InquiryMessage.builder()
                .inquiry(inquiry)
                .senderId(responder.getId())
                .senderRole(responder.getRole())
                .text(request.getText())
                .createdAt(LocalDateTime.now())
                .build();

        message = messageRepository.save(message);

        // Update inquiry
        inquiry.setLastMessageAt(LocalDateTime.now());
        inquiry.setStatus(InquiryStatus.REPLIED);
        inquiry.setLastReadAtAdmin(LocalDateTime.now());
        inquiryRepository.save(inquiry);

        // Notify user about the reply
        sendMessageNotification(inquiry, message, "agent_reply");

        log.info("{} replied to inquiry {}", responder.getEmail(), inquiryId);
        return toMessageDTO(message);
    }

    /**
     * Close an inquiry.
     */
    @Transactional
    public void closeInquiry(Long inquiryId, boolean isAdmin) {
        User user = getCurrentUser();
        Inquiry inquiry = inquiryRepository.findById(inquiryId)
                .orElseThrow(() -> new RuntimeException("Inquiry not found"));

        // If not admin, check if this agent is assigned
        if (!isAdmin) {
            Agent agent = agentRepository.findByLinkedUserId(user.getId())
                    .orElseThrow(() -> new RuntimeException("Agent profile not found"));
            if (inquiry.getAssignedAgent() == null || !inquiry.getAssignedAgent().getId().equals(agent.getId())) {
                throw new RuntimeException("You are not assigned to this inquiry");
            }
        }

        inquiry.setStatus(InquiryStatus.CLOSED);
        inquiryRepository.save(inquiry);

        log.info("Inquiry {} closed by {}", inquiryId, user.getEmail());
    }

    /**
     * Reassign an inquiry to a different agent (admin only).
     */
    @Transactional
    public void reassignInquiry(Long inquiryId, Long agentId) {
        Inquiry inquiry = inquiryRepository.findById(inquiryId)
                .orElseThrow(() -> new RuntimeException("Inquiry not found"));

        Agent agent = agentRepository.findById(agentId)
                .orElseThrow(() -> new RuntimeException("Agent not found"));

        inquiry.setAssignedAgent(agent);
        inquiryRepository.save(inquiry);

        // Notify the new agent
        if (agent.getLinkedUser() != null) {
            messagingTemplate.convertAndSend(
                    "/topic/agents/" + agent.getLinkedUser().getId() + "/inquiries",
                    toDTOWithLastMessage(inquiry));
        }

        log.info("Inquiry {} reassigned to agent {}", inquiryId, agentId);
    }

    // ==================== AGENT METHODS ====================

    /**
     * Get inquiries assigned to the current agent.
     */
    public List<InquiryDTO> getAgentInquiries(InquiryStatus status) {
        User user = getCurrentUser();
        Agent agent = agentRepository.findByLinkedUserId(user.getId())
                .orElseThrow(() -> new RuntimeException("Agent profile not found"));

        List<Inquiry> inquiries;
        if (status != null) {
            inquiries = inquiryRepository.findByAssignedAgentIdAndStatusOrderByLastMessageAtDesc(agent.getId(), status);
        } else {
            inquiries = inquiryRepository.findByAssignedAgentIdOrderByLastMessageAtDesc(agent.getId());
        }

        return inquiries.stream()
                .map(this::toDTOWithLastMessage)
                .collect(Collectors.toList());
    }

    /**
     * Get messages for a specific inquiry (agent access).
     */
    public List<InquiryMessageDTO> getInquiryMessagesAgent(Long inquiryId) {
        User user = getCurrentUser();
        Agent agent = agentRepository.findByLinkedUserId(user.getId())
                .orElseThrow(() -> new RuntimeException("Agent profile not found"));

        Inquiry inquiry = inquiryRepository.findByIdAndAssignedAgentId(inquiryId, agent.getId())
                .orElseThrow(() -> new RuntimeException("Inquiry not found or not assigned to you"));

        // Update last read timestamp
        inquiry.setLastReadAtAdmin(LocalDateTime.now());
        inquiryRepository.save(inquiry);

        return messageRepository.findByInquiryIdOrderByCreatedAtAsc(inquiryId)
                .stream()
                .map(this::toMessageDTO)
                .collect(Collectors.toList());
    }

    // ==================== HELPER METHODS ====================

    private User getCurrentUser() {
        Object principal = SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        String email;
        if (principal instanceof UserDetails) {
            email = ((UserDetails) principal).getUsername();
        } else {
            email = principal.toString();
        }
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));
    }

    private void sendNewInquiryNotifications(Inquiry inquiry) {
        InquiryDTO dto = toDTOWithLastMessage(inquiry);

        // Notify admin
        messagingTemplate.convertAndSend("/topic/admin/inquiries", dto);

        // Notify assigned agent if exists
        if (inquiry.getAssignedAgent() != null && inquiry.getAssignedAgent().getLinkedUser() != null) {
            messagingTemplate.convertAndSend(
                    "/topic/agents/" + inquiry.getAssignedAgent().getLinkedUser().getId() + "/inquiries",
                    dto);
        }
    }

    private void sendMessageNotification(Inquiry inquiry, InquiryMessage message, String eventType) {
        InquiryMessageDTO messageDTO = toMessageDTO(message);

        if ("user_reply".equals(eventType)) {
            // Notify admin and agent
            messagingTemplate.convertAndSend("/topic/admin/inquiries/" + inquiry.getId(), messageDTO);
            if (inquiry.getAssignedAgent() != null && inquiry.getAssignedAgent().getLinkedUser() != null) {
                messagingTemplate.convertAndSend(
                        "/topic/agents/" + inquiry.getAssignedAgent().getLinkedUser().getId() + "/inquiries/"
                                + inquiry.getId(),
                        messageDTO);
            }
        } else {
            // Notify user about agent/admin reply
            messagingTemplate.convertAndSend(
                    "/topic/users/" + inquiry.getUser().getId() + "/inquiries/" + inquiry.getId(),
                    messageDTO);
        }
    }

    private InquiryDTO toDTO(Inquiry inquiry, String lastMessagePreview) {
        return InquiryDTO.builder()
                .id(inquiry.getId())
                .userId(inquiry.getUser().getId())
                .userName(inquiry.getUser().getName())
                .propertyId(inquiry.getProperty().getId())
                .propertyTitle(inquiry.getProperty().getTitle())
                .propertyAddress(inquiry.getProperty().getAddress())
                .assignedAgentId(inquiry.getAssignedAgent() != null ? inquiry.getAssignedAgent().getId() : null)
                .assignedAgentName(inquiry.getAssignedAgent() != null ? inquiry.getAssignedAgent().getName() : null)
                .status(inquiry.getStatus())
                .lastMessagePreview(lastMessagePreview)
                .lastMessageAt(inquiry.getLastMessageAt())
                .createdAt(inquiry.getCreatedAt())
                .hasUnread(hasUnread(inquiry))
                .build();
    }

    private InquiryDTO toDTOWithLastMessage(Inquiry inquiry) {
        List<InquiryMessage> messages = messageRepository.findByInquiryIdOrderByCreatedAtAsc(inquiry.getId());
        String lastMessage = messages.isEmpty() ? "" : messages.get(messages.size() - 1).getText();
        String preview = lastMessage.length() > 100 ? lastMessage.substring(0, 100) + "..." : lastMessage;
        return toDTO(inquiry, preview);
    }

    private InquiryMessageDTO toMessageDTO(InquiryMessage message) {
        String senderName = getSenderName(message);
        return InquiryMessageDTO.builder()
                .id(message.getId())
                .senderId(message.getSenderId())
                .senderName(senderName)
                .senderRole(message.getSenderRole())
                .text(message.getText())
                .createdAt(message.getCreatedAt())
                .build();
    }

    private String getSenderName(InquiryMessage message) {
        if (message.getSenderRole() == Role.ADMIN) {
            return "Admin";
        }
        return userRepository.findById(message.getSenderId())
                .map(User::getName)
                .orElse("Unknown");
    }

    private boolean hasUnread(Inquiry inquiry) {
        // For admin view: check if there are messages after lastReadAtAdmin
        LocalDateTime lastRead = inquiry.getLastReadAtAdmin();
        return lastRead == null || inquiry.getLastMessageAt().isAfter(lastRead);
    }
}
