package com.treeco.api.controller;

import com.treeco.api.model.Project;
import com.treeco.api.model.Task;
import com.treeco.api.model.User;
import com.treeco.api.model.enums.EventType;
import com.treeco.api.model.enums.Priority;
import com.treeco.api.model.enums.State;
import com.treeco.api.repository.ProjectRepository;
import com.treeco.api.repository.TaskRepository;
import com.treeco.api.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.lang.NonNull;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;

@RestController
@RequestMapping("/projects/{projectId}/tasks")
public class TaskController {

    private final TaskRepository taskRepository;
    private final ProjectRepository projectRepository;
    private final UserRepository userRepository;

    public TaskController(TaskRepository taskRepository,
                          ProjectRepository projectRepository,
                          UserRepository userRepository) {
        this.taskRepository = taskRepository;
        this.projectRepository = projectRepository;
        this.userRepository = userRepository;
    }

    // assignedToId añadido tanto en create como en update
    public record TaskRequest(
        String title,
        String description,
        LocalDate dateDeadline,
        Integer assignedToId
    ) {}

    public record TaskUpdateRequest(
        String title,
        String description,
        LocalDate dateDeadline,
        Boolean completed,
        Integer assignedToId      // null = no cambiar, -1 = desasignar
    ) {}

    /**
     * Convierte Task a Map plano accediendo a relaciones LAZY dentro
     * de la transacción activa — sin proxies Hibernate para Jackson.
     */
    private Map<String, Object> toMap(Task t) {
        Map<String, Object> map = new HashMap<>();
        map.put("id",           t.getId());
        map.put("title",        t.getTitle());
        map.put("description",  t.getDescription());
        map.put("dateCreation", t.getDateCreation());
        map.put("dateDeadline", t.getDateDeadline());
        map.put("priority",     t.getPriority());
        map.put("completed",    t.isCompleted());
        map.put("state",        t.getState());
        map.put("type",         t.getType());
        map.put("eventType",    t.getEventType());

        if (t.getAssignedTo() != null) {
            map.put("assignedTo", Map.of(
                "id",       t.getAssignedTo().getId(),
                "username", t.getAssignedTo().getUsername(),
                "email",    t.getAssignedTo().getEmail()
            ));
        } else {
            map.put("assignedTo", null);
        }

        return map;
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
                tasks = tasks.stream().filter(t -> t.getState() == state).toList();
            }

            return ResponseEntity.ok(tasks.stream().map(this::toMap).toList());

        } catch (NoSuchElementException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/{taskId}")
    public ResponseEntity<?> getTask(@PathVariable @NonNull Integer projectId,
            @PathVariable @NonNull Integer taskId) {
        try {
            findProjectOrThrow(projectId);
            return ResponseEntity.ok(toMap(findTaskOrThrow(taskId, projectId)));
        } catch (NoSuchElementException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping
    public ResponseEntity<?> createTask(@PathVariable @NonNull Integer projectId,
            @RequestBody TaskRequest request) {
        try {
            if (request.title() == null) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(Map.of("error", "El campo 'title' es obligatorio"));
            }

            Project project = findProjectOrThrow(projectId);

            Task task = Task.builder(request.title())
                    .description(request.description())
                    .deadline(request.dateDeadline())
                    .eventType(request.dateDeadline() != null ? EventType.DEADLINE : EventType.REMINDER)
                    .build();

            task.setProject(project);

            // Asignar usuario si se especificó
            if (request.assignedToId() != null) {
                User user = userRepository.findById(request.assignedToId())
                        .orElseThrow(() -> new NoSuchElementException("Usuario no encontrado"));
                task.setAssignedTo(user);
            }

            taskRepository.save(task);
            return ResponseEntity.status(HttpStatus.CREATED).body(toMap(task));

        } catch (NoSuchElementException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", e.getMessage()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", e.getMessage()));
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
                if (task.getEventType() == EventType.REMINDER) {
                    task.setEventType(EventType.DEADLINE);
                }
            }
            if (request.completed() != null) task.setCompleted(request.completed());

            // assignedToId: null = no tocar, -1 = desasignar, >0 = asignar
            if (request.assignedToId() != null) {
                if (request.assignedToId() == -1) {
                    task.setAssignedTo(null);
                } else {
                    User user = userRepository.findById(request.assignedToId())
                            .orElseThrow(() -> new NoSuchElementException("Usuario no encontrado"));
                    task.setAssignedTo(user);
                }
            }

            taskRepository.save(task);
            return ResponseEntity.ok(toMap(task));

        } catch (NoSuchElementException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", e.getMessage()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", e.getMessage()));
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
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", e.getMessage()));
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