package com.example.final_project.config;

import com.example.final_project.model.Agent;
import com.example.final_project.model.Role;
import com.example.final_project.model.User;
import com.example.final_project.repository.AgentRepository;
import com.example.final_project.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;

@Component
@RequiredArgsConstructor
@Slf4j
public class DataSeeder implements CommandLineRunner {

    private final UserRepository userRepository;
    private final AgentRepository agentRepository;
    private final PasswordEncoder passwordEncoder;

    // Agent credentials to seed
    private static final List<String[]> AGENT_DATA = List.of(
            new String[] { "Hemal", "hemalag@re.com", "hemal1234" },
            new String[] { "Ishan", "ishanag@re.com", "ishan1234" },
            new String[] { "Chanuka", "chanukaag@re.com", "chanuka1234" },
            new String[] { "Hasitha", "hasithaag@re.com", "hasitha1234" },
            new String[] { "Sanjana", "sanjanaag@re.com", "sanjana1234" },
            new String[] { "Maneesha", "maneeshaag@re.com", "maneesha1234" },
            new String[] { "Hiranya", "hiranyaag@re.com", "hiranya1234" },
            new String[] { "Kaveesha", "kaveeshaag@re.com", "kaveesha1234" },
            new String[] { "Chathurya", "chathuryaag@re.com", "chathurya1234" });

    @Override
    public void run(String... args) {
        log.info("DataSeeder: Checking for agent users...");

        for (String[] data : AGENT_DATA) {
            String name = data[0];
            String email = data[1];
            String password = data[2];

            // Check if user already exists
            Optional<User> existingUser = userRepository.findByEmail(email);
            if (existingUser.isPresent()) {
                log.info("Agent user {} already exists, skipping.", email);
                continue;
            }

            // Try to find matching Agent profile by name (case-insensitive)
            Long agentId = null;
            List<Agent> matchingAgents = agentRepository.findByNameContainingIgnoreCase(name);
            if (!matchingAgents.isEmpty()) {
                agentId = matchingAgents.get(0).getId();
                log.info("Linked agent user {} to Agent profile ID: {}", email, agentId);
            }

            // Create the user
            User user = User.builder()
                    .name(name)
                    .email(email)
                    .password(passwordEncoder.encode(password))
                    .role(Role.AGENT)
                    .agentId(agentId)
                    .enabled(true)
                    .build();

            userRepository.save(user);
            log.info("Created agent user: {} ({})", name, email);
        }

        log.info("DataSeeder: Agent seeding complete.");
    }
}
