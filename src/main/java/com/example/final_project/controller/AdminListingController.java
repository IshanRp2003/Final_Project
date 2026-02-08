package com.example.final_project.controller;

import com.example.final_project.model.Property;
import com.example.final_project.service.PropertyService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class AdminListingController {

    private final PropertyService propertyService;

    // Keep both endpoints to avoid frontend route mismatches.
    @GetMapping({"/listings/pending", "/pending"})
    public ResponseEntity<List<Property>> getPendingListings() {
        return ResponseEntity.ok(propertyService.getPendingProperties());
    }

    @PutMapping("/listings/{id}/approve")
    public ResponseEntity<?> approveListing(@PathVariable Long id, @RequestBody(required = false) Map<String, String> body) {
        try {
            String message = "Your listing has been approved by admin.";
            if (body != null && body.get("message") != null && !body.get("message").isBlank()) {
                message = body.get("message").trim();
            }
            Property property = propertyService.approveProperty(id, message);
            return ResponseEntity.ok(Map.of("success", true, "message", "Listing approved.", "property", property));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", e.getMessage()));
        }
    }

    @PutMapping("/listings/{id}/reject")
    public ResponseEntity<?> rejectListing(@PathVariable Long id, @RequestBody(required = false) Map<String, String> body) {
        try {
            String reason = "No reason provided";
            if (body != null) {
                reason = body.getOrDefault("message", body.getOrDefault("reason", reason));
            }
            Property property = propertyService.rejectProperty(id, reason);
            return ResponseEntity.ok(Map.of("success", true, "message", "Listing rejected.", "property", property));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", e.getMessage()));
        }
    }
}
