package com.example.final_project;

import com.example.final_project.model.Property;
import com.example.final_project.model.PropertyStatus;
import com.example.final_project.model.UserNotification;
import com.example.final_project.repository.PropertyMediaRepository;
import com.example.final_project.repository.PropertyRepository;
import com.example.final_project.repository.UserNotificationRepository;
import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.web.context.WebApplicationContext;

import java.nio.charset.StandardCharsets;
import java.util.List;

import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.containsString;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.setup.MockMvcBuilders.webAppContextSetup;

@SpringBootTest
@ActiveProfiles("test")
class ListingWorkflowIntegrationTest {

    private MockMvc mockMvc;

    @Autowired
    private WebApplicationContext webApplicationContext;

    @Autowired
    private PropertyRepository propertyRepository;

    @Autowired
    private PropertyMediaRepository propertyMediaRepository;

    @Autowired
    private UserNotificationRepository userNotificationRepository;

    @BeforeEach
    void setUp() {
        mockMvc = webAppContextSetup(webApplicationContext)
                .apply(springSecurity())
                .build();
        userNotificationRepository.deleteAll();
        propertyMediaRepository.deleteAll();
        propertyRepository.deleteAll();
    }

    @Test
    void submitWithDriveLink_setsPending_andAppearsInAdminPending() throws Exception {
        String driveLink = "https://drive.google.com/drive/folders/abc123xyz";
        long propertyId = submitListingWithDriveLink("buyer1@example.com", "Test Pending Listing", driveLink);

        mockMvc.perform(get("/api/admin/listings/pending")
                        .with(user("admin@example.com").roles("ADMIN")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[*].id", hasItem((int) propertyId)))
                .andExpect(jsonPath("$[*].status", hasItem("PENDING")))
                .andExpect(jsonPath("$[*].driveLink", hasItem(driveLink)));
    }

    @Test
    void approve_createsNotificationRow_forListingOwner() throws Exception {
        String ownerEmail = "buyer2@example.com";
        long propertyId = submitListingWithDriveLink(
                ownerEmail,
                "Approval Flow Listing",
                "https://drive.google.com/file/d/1abcDEFxyz/view");
        String adminMessage = "Approved after verification.";

        mockMvc.perform(put("/api/admin/listings/{id}/approve", propertyId)
                        .with(user("admin@example.com").roles("ADMIN"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"message\":\"" + adminMessage + "\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        Property updated = propertyRepository.findById(propertyId).orElseThrow();
        assertEquals(PropertyStatus.AVAILABLE, updated.getStatus());
        assertEquals(adminMessage, updated.getAdminDecisionMessage());

        List<UserNotification> notifications =
                userNotificationRepository.findTop50ByRecipientEmailOrderByCreatedAtDesc(ownerEmail);
        assertFalse(notifications.isEmpty());
        assertEquals(adminMessage, notifications.get(0).getMessage());
    }

    @Test
    void reject_createsNotificationRow_forListingOwner() throws Exception {
        String ownerEmail = "buyer3@example.com";
        long propertyId = submitListingWithDriveLink(
                ownerEmail,
                "Rejection Flow Listing",
                "https://drive.google.com/drive/folders/rejectFolder123");
        String adminMessage = "Rejected due to incomplete details.";

        mockMvc.perform(put("/api/admin/listings/{id}/reject", propertyId)
                        .with(user("admin@example.com").roles("ADMIN"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"message\":\"" + adminMessage + "\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        Property updated = propertyRepository.findById(propertyId).orElseThrow();
        assertEquals(PropertyStatus.REJECTED, updated.getStatus());
        assertEquals(adminMessage, updated.getRejectionReason());
        assertEquals(adminMessage, updated.getAdminDecisionMessage());

        List<UserNotification> notifications =
                userNotificationRepository.findTop50ByRecipientEmailOrderByCreatedAtDesc(ownerEmail);
        assertFalse(notifications.isEmpty());
        assertEquals(adminMessage, notifications.get(0).getMessage());
    }

    @Test
    void submit_withInvalidDriveLink_returnsBadRequest() throws Exception {
        mockMvc.perform(multipart("/api/properties/submit")
                        .param("title", "Invalid Link Listing")
                        .param("description", "Invalid link path")
                        .param("address", "456 Other Street")
                        .param("price", "9000000")
                        .param("type", "HOUSE")
                        .param("bedrooms", "2")
                        .param("bathrooms", "1")
                        .param("areaSqFt", "1200")
                        .param("ownerName", "Bad Link Owner")
                        .param("ownerPhone", "0722222222")
                        .param("ownerEmail", "buyer4@example.com")
                        .param("driveLink", "https://example.com/not-drive")
                        .with(user("buyer4@example.com").roles("USER")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value(containsString("Invalid Google Drive link")));
    }

    @Test
    void submit_withImagesAndNoDriveLink_stillAccepted() throws Exception {
        MockMultipartFile image = new MockMultipartFile(
                "images",
                "house.jpg",
                "image/jpeg",
                "fake-image-content".getBytes(StandardCharsets.UTF_8));

        mockMvc.perform(multipart("/api/properties/submit")
                        .file(image)
                        .param("title", "Image Only Listing")
                        .param("description", "3 bed family house")
                        .param("address", "123 Main Street")
                        .param("price", "15000000")
                        .param("type", "HOUSE")
                        .param("bedrooms", "3")
                        .param("bathrooms", "2")
                        .param("areaSqFt", "1850")
                        .param("ownerName", "Test Owner")
                        .param("ownerPhone", "0711111111")
                        .param("ownerEmail", "buyer5@example.com")
                        .param("amenities", "Parking", "Garden")
                        .with(user("buyer5@example.com").roles("USER")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    private long submitListingWithDriveLink(String ownerEmail, String title, String driveLink) throws Exception {
        MvcResult submitResult = mockMvc.perform(multipart("/api/properties/submit")
                        .param("title", title)
                        .param("description", "3 bed family house")
                        .param("address", "123 Main Street")
                        .param("price", "15000000")
                        .param("type", "HOUSE")
                        .param("bedrooms", "3")
                        .param("bathrooms", "2")
                        .param("areaSqFt", "1850")
                        .param("ownerName", "Test Owner")
                        .param("ownerPhone", "0711111111")
                        .param("ownerEmail", ownerEmail)
                        .param("driveLink", driveLink)
                        .param("amenities", "Parking", "Garden")
                        .with(user(ownerEmail).roles("USER")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andReturn();

        Number propertyId = JsonPath.read(submitResult.getResponse().getContentAsString(), "$.propertyId");
        assertTrue(propertyId.longValue() > 0);
        return propertyId.longValue();
    }
}
