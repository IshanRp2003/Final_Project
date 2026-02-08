package com.example.final_project.service;

import com.example.final_project.model.UserNotification;
import com.example.final_project.repository.UserNotificationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.List;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

@Service
@RequiredArgsConstructor
public class NotificationService {

    private static final long SSE_TIMEOUT_MS = 30L * 60L * 1000L; // 30 minutes

    private final UserNotificationRepository userNotificationRepository;

    private final ConcurrentHashMap<String, CopyOnWriteArrayList<SseEmitter>> emittersByEmail = new ConcurrentHashMap<>();

    public List<UserNotification> getCurrentUserNotifications() {
        String email = getCurrentUserEmail();
        return userNotificationRepository.findTop50ByRecipientEmailOrderByCreatedAtDesc(email);
    }

    public UserNotification markAsReadForCurrentUser(Long notificationId) {
        String email = getCurrentUserEmail();
        UserNotification notification = userNotificationRepository.findByIdAndRecipientEmail(notificationId, email)
                .orElseThrow(() -> new RuntimeException("Notification not found"));
        notification.setRead(true);
        return userNotificationRepository.save(notification);
    }

    public SseEmitter subscribe(String email) {
        SseEmitter emitter = new SseEmitter(SSE_TIMEOUT_MS);
        emittersByEmail.computeIfAbsent(email, key -> new CopyOnWriteArrayList<>()).add(emitter);

        emitter.onCompletion(() -> removeEmitter(email, emitter));
        emitter.onTimeout(() -> removeEmitter(email, emitter));
        emitter.onError(e -> removeEmitter(email, emitter));

        try {
            emitter.send(SseEmitter.event().name("connected").data("subscribed"));
        } catch (IOException e) {
            removeEmitter(email, emitter);
        }

        return emitter;
    }

    public void publishListingDecision(String recipientEmail, Long propertyId, String message, String statusLabel) {
        if (recipientEmail == null || recipientEmail.isBlank()) {
            return;
        }

        UserNotification notification = userNotificationRepository.save(
                UserNotification.builder()
                        .recipientEmail(recipientEmail)
                        .title("Listing " + statusLabel)
                        .message(message)
                        .propertyId(propertyId)
                        .isRead(false)
                        .build());

        List<SseEmitter> emitters = emittersByEmail.get(recipientEmail);
        if (emitters == null || emitters.isEmpty()) {
            return;
        }

        for (SseEmitter emitter : emitters) {
            try {
                emitter.send(SseEmitter.event().name("notification").data(notification));
            } catch (IOException e) {
                removeEmitter(recipientEmail, emitter);
            }
        }
    }

    private String getCurrentUserEmail() {
        Object principal = SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        if (principal instanceof UserDetails) {
            return ((UserDetails) principal).getUsername();
        }
        return principal.toString();
    }

    private void removeEmitter(String email, SseEmitter emitter) {
        List<SseEmitter> emitters = emittersByEmail.get(email);
        if (emitters == null) {
            return;
        }
        emitters.remove(emitter);
        if (emitters.isEmpty()) {
            emittersByEmail.remove(email);
        }
    }
}
