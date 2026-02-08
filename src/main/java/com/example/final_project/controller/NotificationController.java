package com.example.final_project.controller;

import com.example.final_project.model.UserNotification;
import com.example.final_project.service.JwtService;
import com.example.final_project.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class NotificationController {

    private final NotificationService notificationService;
    private final JwtService jwtService;
    private final UserDetailsService userDetailsService;

    @GetMapping
    @PreAuthorize("hasAnyRole('USER','AGENT','SELLER','ADMIN')")
    public ResponseEntity<List<UserNotification>> getMyNotifications() {
        return ResponseEntity.ok(notificationService.getCurrentUserNotifications());
    }

    @PutMapping("/{id}/read")
    @PreAuthorize("hasAnyRole('USER','AGENT','SELLER','ADMIN')")
    public ResponseEntity<?> markAsRead(@PathVariable Long id) {
        UserNotification updated = notificationService.markAsReadForCurrentUser(id);
        return ResponseEntity.ok(Map.of("success", true, "notification", updated));
    }

    @GetMapping("/stream")
    public SseEmitter stream(@RequestParam("token") String token) {
        String email;
        try {
            email = jwtService.extractUsername(token);
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid token");
        }
        if (email == null || email.isBlank()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid token");
        }

        UserDetails userDetails = userDetailsService.loadUserByUsername(email);
        if (!jwtService.isTokenValid(token, userDetails)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Token expired or invalid");
        }

        return notificationService.subscribe(email);
    }
}
