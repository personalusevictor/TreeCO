package com.treeco.api.scheduler;

import com.treeco.api.model.Task;
import com.treeco.api.model.enums.NotificationType;
import com.treeco.api.repository.TaskRepository;
import com.treeco.api.service.NotificationService;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Scheduler que revisa periódicamente tareas próximas a vencer o ya vencidas
 * y crea las notificaciones correspondientes al usuario asignado.
 *
 * Requiere @EnableScheduling en la clase principal de la aplicación.
 */
@Component
public class TaskReminderScheduler {

    private final TaskRepository      taskRepository;
    private final NotificationService notificationService;

    public TaskReminderScheduler(TaskRepository taskRepository,
            NotificationService notificationService) {
        this.taskRepository      = taskRepository;
        this.notificationService = notificationService;
    }

    /**
     * Notifica al asignado cuando su tarea vence en menos de 24 horas.
     * Se ejecuta cada hora.
     *
     * Para evitar spam, solo se dispara una vez por tarea:
     * la ventana de detección es [ahora, ahora+24h] con un margen de 1h
     * (la tarea se detecta solo la primera hora en que entra en la ventana).
     */
    @Scheduled(fixedRate = 3_600_000)
    public void notifyDueSoon() {
        LocalDateTime now        = LocalDateTime.now();
        LocalDateTime windowEnd  = now.plusHours(24);
        // Solo tareas cuya deadline cae en la siguiente hora desde el check
        // (así cada tarea solo genera UNA notificación en todo su ciclo de vida)
        LocalDateTime windowStart = now.plusHours(23);

        List<Task> dueSoon = taskRepository.findAll().stream()
            .filter(t -> !t.isCompleted()
                && t.getDateDeadline() != null
                && t.getDateDeadline().isAfter(windowStart)
                && t.getDateDeadline().isBefore(windowEnd)
                && t.getAssignedTo() != null)
            .toList();

        dueSoon.forEach(task ->
            notificationService.createForTask(
                task.getAssignedTo().getId(),
                NotificationType.TASK_DUE_SOON,
                "Tu tarea vence en menos de 24h",
                "\"" + task.getTitle() + "\" vence el "
                    + task.getDateDeadline().toLocalDate(),
                task.getProject().getId().longValue(),
                task.getId().longValue(),
                "/projects/" + task.getProject().getId() + "/tasks/" + task.getId()
            )
        );
    }

    /**
     * Notifica al asignado cuando su tarea acaba de vencer (en la última hora).
     * Se ejecuta cada hora.
     *
     * La ventana de detección es [ahora-1h, ahora] para que cada tarea
     * solo genere UNA notificación TASK_OVERDUE.
     */
    @Scheduled(fixedRate = 3_600_000)
    public void notifyOverdue() {
        LocalDateTime now      = LocalDateTime.now();
        LocalDateTime oneHourAgo = now.minusHours(1);

        List<Task> overdue = taskRepository.findAll().stream()
            .filter(t -> !t.isCompleted()
                && t.getDateDeadline() != null
                && t.getDateDeadline().isAfter(oneHourAgo)
                && t.getDateDeadline().isBefore(now)
                && t.getAssignedTo() != null)
            .toList();

        overdue.forEach(task ->
            notificationService.createForTask(
                task.getAssignedTo().getId(),
                NotificationType.TASK_OVERDUE,
                "Tarea vencida",
                "\"" + task.getTitle() + "\" venció el "
                    + task.getDateDeadline().toLocalDate()
                    + " y sigue sin completarse",
                task.getProject().getId().longValue(),
                task.getId().longValue(),
                "/projects/" + task.getProject().getId() + "/tasks/" + task.getId()
            )
        );
    }
}