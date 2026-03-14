package com.treeco.api.controller;

import com.treeco.api.model.Project;
import com.treeco.api.repository.ProjectRepository;
import com.treeco.api.repository.UserRepository;
import com.treeco.api.service.ProjectMemberService;
import com.treeco.api.service.ProjectService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.lang.NonNull;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.NoSuchElementException;

@RestController
@RequestMapping("/projects")
public class ProjectController {

    private final ProjectRepository projectRepository;
    private final UserRepository userRepository;
    private final ProjectService projectService;
    private final ProjectMemberService projectMemberService;

    public ProjectController(ProjectRepository projectRepository,
                             UserRepository userRepository,
                             ProjectService projectService,
                             ProjectMemberService projectMemberService) {
        this.projectRepository = projectRepository;
        this.userRepository = userRepository;
        this.projectService = projectService;
        this.projectMemberService = projectMemberService;
    }

    public record ProjectRequest(String name, String description, Integer userId) {
    }

    public record ProjectUpdateRequest(String name, String description) {
    }

    @GetMapping
    public ResponseEntity<?> getAllProjects() {
        return ResponseEntity.ok(projectRepository.findAll());
    }

    @GetMapping(params = "userId")
    public ResponseEntity<?> getProjectsByUser(@RequestParam @NonNull Integer userId) {
        if (userRepository.findById(userId).isEmpty()) {
            return ResponseEntity
                    .status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", "Usuario no encontrado"));
        }
        return ResponseEntity.ok(projectRepository.findByUserId(userId));
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getProject(@PathVariable @NonNull Integer id) {
        try {
            return ResponseEntity.ok(findProjectOrThrow(id));
        } catch (NoSuchElementException e) {
            return ResponseEntity
                    .status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping
    public ResponseEntity<?> createProject(@RequestBody ProjectRequest request) {
        try {
            if (request.name() == null || request.userId() == null) {
                return ResponseEntity
                        .status(HttpStatus.BAD_REQUEST)
                        .body(Map.of("error", "Los campos 'name' y 'userId' son obligatorios"));
            }

            Project project = projectService.createProject(request.userId(), request.name(), request.description());

            return ResponseEntity
                    .status(HttpStatus.CREATED)
                    .body(project);

        } catch (NoSuchElementException e) {
            return ResponseEntity
                    .status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", e.getMessage()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity
                    .status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", e.getMessage()));
        }
    }

    @PatchMapping("/{id}")
    public ResponseEntity<?> updateProject(@PathVariable @NonNull Integer id,
            @RequestBody ProjectUpdateRequest request) {
        try {
            Project project = findProjectOrThrow(id);

            if (request.name() != null)
                project.setName(request.name());
            if (request.description() != null)
                project.setDescription(request.description());

            projectRepository.save(project);
            return ResponseEntity.ok(project);

        } catch (NoSuchElementException e) {
            return ResponseEntity
                    .status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", e.getMessage()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity
                    .status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", e.getMessage()));
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteProject(@PathVariable @NonNull Integer id) {
        try {
            findProjectOrThrow(id);
            projectRepository.deleteById(id);
            return ResponseEntity.ok(Map.of("message", "Proyecto eliminado correctamente"));
        } catch (NoSuchElementException e) {
            return ResponseEntity
                    .status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/{id}/progress")
    public ResponseEntity<?> getProgress(@PathVariable @NonNull Integer id) {
        try {
            Project project = findProjectOrThrow(id);
            return ResponseEntity.ok(Map.of(
                    "projectId", id,
                    "progress", project.getProgress()));
        } catch (NoSuchElementException e) {
            return ResponseEntity
                    .status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", e.getMessage()));
        }
    }

    private Project findProjectOrThrow(@NonNull Integer id) {
        return projectRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Proyecto no encontrado"));
    }
}