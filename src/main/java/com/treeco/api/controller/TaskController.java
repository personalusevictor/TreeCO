package com.treeco.api.controller;

import com.treeco.api.model.Project;
import com.treeco.api.model.Task;
import com.treeco.api.model.enums.Priority;
import com.treeco.api.model.enums.State;
import com.treeco.api.repository.ProjectRepository;
import com.treeco.api.repository.TaskRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.lang.NonNull;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;

@RestController
@RequestMapping("/projects/{projectId}/tasks")
public class TaskController {

    private final TaskRepository taskRepository;
    private final ProjectRepository projectRepository;

    public TaskController(TaskRepository taskRepository, ProjectRepository projectRepository) {
        this.taskRepository = taskRepository;
        this.projectRepository = projectRepository;
    }

    public record TaskRequest(String title, String description, Priority priority, LocalDateTime dateDeadline) {
    }

    public record TaskUpdateRequest(String title, String description, Priority priority, LocalDateTime dateDeadline,
            Boolean completed) {
    }

    @GetMapping
    public ResponseEntity<?> getTasks(@PathVariable @NonNull Integer projectId,
            @RequestParam(required = false) State state,
            @RequestParam(required = false) Priority priority,
            @RequestParam(required = false, defaultValue = "false") boolean orderByDate) {
        try {
            findProjectOrThrow(projectId);

            List<Task> tasks;

            if (orderByDate) {
                tasks = taskRepository.findByProjectIdOrderByDateDeadlineAsc(projectId);
            } else if (priority != null) {
                tasks = taskRepository.findByProjectId(projectId);
            } else {
                tasks = taskRepository.findByProjectId(projectId);
            }

            if (state != null) {
                tasks = tasks.stream()
                        .filter(t -> t.getState() == state)
                        .toList();
            }

            return ResponseEntity.ok(tasks);

        } catch (NoSuchElementException e) {
            return ResponseEntity
                    .status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/{taskId}")
    public ResponseEntity<?> getTask(@PathVariable @NonNull Integer projectId,
            @PathVariable @NonNull Integer taskId) {
        try {
            findProjectOrThrow(projectId);
            return ResponseEntity.ok(findTaskOrThrow(taskId, projectId));
        } catch (NoSuchElementException e) {
            return ResponseEntity
                    .status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping
    public ResponseEntity<?> createTask(@PathVariable @NonNull Integer projectId,
            @RequestBody TaskRequest request) {
        try {
            if (request.title() == null) {
                return ResponseEntity
                        .status(HttpStatus.BAD_REQUEST)
                        .body(Map.of("error", "El campo 'title' es obligatorio"));
            }

            Project project = findProjectOrThrow(projectId);

            Task task = Task.builder(request.title())
                    .description(request.description())
                    .deadline(request.dateDeadline())
                    .build();

            task.setProject(project);
            taskRepository.save(task);

            return ResponseEntity
                    .status(HttpStatus.CREATED)
                    .body(task);

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

    @PatchMapping("/{taskId}")
    public ResponseEntity<?> updateTask(@PathVariable @NonNull Integer projectId,
            @PathVariable @NonNull Integer taskId,
            @RequestBody TaskUpdateRequest request) {
        try {
            findProjectOrThrow(projectId);
            Task task = findTaskOrThrow(taskId, projectId);

            if (request.title() != null)
                task.setTitle(request.title());
            if (request.description() != null)
                task.setDescription(request.description());
            if (request.dateDeadline() != null)
                task.setDateDeadline(request.dateDeadline());
            if (request.completed() != null)
                task.setCompleted(request.completed());

            taskRepository.save(task);
            return ResponseEntity.ok(task);

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

    @DeleteMapping("/{taskId}")
    public ResponseEntity<?> deleteTask(@PathVariable @NonNull Integer projectId,
            @PathVariable @NonNull Integer taskId) {
        try {
            findProjectOrThrow(projectId);
            Task task = findTaskOrThrow(taskId, projectId);
            taskRepository.delete(task);
            return ResponseEntity.ok(Map.of("message", "Tarea eliminada correctamente"));
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

    private Task findTaskOrThrow(@NonNull Integer taskId, @NonNull Integer projectId) {
        return taskRepository.findByIdAndProjectId(taskId, projectId)
                .orElseThrow(() -> new NoSuchElementException("Tarea no encontrada"));
    }
}