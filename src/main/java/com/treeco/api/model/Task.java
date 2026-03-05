package com.treeco.api.model;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import javax.swing.event.DocumentEvent.EventType;
import com.treeco.api.model.enums.Priority;
import com.treeco.api.model.enums.State;
import com.treeco.api.model.enums.TaskType;
import jakarta.persistence.*;

@Entity
@Table(name = "task")
public class Task {
    // ATRIBUTOS DEL OBJETO
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private Integer id;
    @Column(nullable = false)
    private String title;
    @Column(nullable = false)
    private String description;
    @Column(nullable = false)
    private final LocalDate dateCreation;
    @Column(nullable = false)
    private LocalDate dateDeadline;
    @Column(nullable = false)
    @Enumerated(EnumType.STRING)
    private Priority priority;
    @Column(nullable = false)
    private boolean completed;
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_id", nullable = false)
    private Project project;
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assigned_to")
    private User assignedTo;
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private TaskType type = TaskType.NORMAL;
    @OneToOne(mappedBy = "task", cascade = CascadeType.ALL, orphanRemoval = true)
    private CodeTask codeTask;
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private EventType eventType;

    /* CONSTRUCTORES Y BUILDER */

    public static class Builder {

        private String title;

        // Opcionales (valores por defecto)
        private String description = "";
        private LocalDate dateDeadline = null;
        private Priority priority = Priority.MID;
        private TaskType type = TaskType.NORMAL;
        private User assignedTo = null;
        private EventType eventType;

        public Builder(String title) {
            if (title == null || title.trim().isEmpty()) {
                throw new IllegalArgumentException("El título no puede estar vacío");
            }
            this.title = title.trim();
        }

        public Builder description(String description) {
            this.description = (description == null) ? "" : description.trim();
            return this;
        }

        public Builder deadline(LocalDate dateDeadline) {
            this.dateDeadline = dateDeadline;
            return this;
        }

        public Builder priority(Priority priority) {
            this.priority = (priority == null) ? Priority.MID : priority;
            return this;
        }

        public Builder type(TaskType type) {
            this.type = (type == null) ? TaskType.NORMAL : type;
            return this;
        }

        public Builder assignedTo(User user) {
            this.assignedTo = user;
            return this;
        }

        public Builder eventType(EventType eventType) {
            this.eventType = eventType;
            return this;
        }

        public Task build() {
            return new Task(this);
        }
    }

    public static Builder builder(String title) {
        return new Builder(title);
    }

    public Task() {
        this.dateCreation = LocalDate.now();
        this.completed = false;
        this.type = TaskType.NORMAL;
    }

    private Task(Builder builder) {
        this.title = builder.title;
        this.description = builder.description;
        this.dateCreation = LocalDate.now();
        this.dateDeadline = builder.dateDeadline;
        this.priority = builder.priority;
        this.type = builder.type;
        this.assignedTo = builder.assignedTo;
        this.eventType = builder.eventType;
        this.completed = false;
    }

    /* GETTERS Y SETTERS */

    public Integer getId() {
        return id;
    }

    public String getTitle() {
        return title;
    }

    public String getDescription() {
        return description;
    }

    public LocalDate getDateCreation() {
        return dateCreation;
    }

    public Project getProject() {
        return project;
    }

    public void setTitle(String title) {
        if (title == null || title.trim().isEmpty()) {
            throw new IllegalArgumentException("El título no puede estar vacío");
        }
        this.title = title.trim();
    }

    public void setDescription(String description) {
        this.description = (description == null) ? "" : description.trim();
    }

    public void setDateDeadline(LocalDate dateDeadline) {
        this.dateDeadline = dateDeadline;
    }

    public void setPriority(Priority priority) {
        this.priority = (priority == null) ? Priority.MID : priority;
    }

    public void setCompleted(boolean completed) {
        this.completed = completed;
    }

    /**
     * Obtiene la fecha límite de la tarea
     * 
     * @return la fecha límite, o null si la tarea es un recordatorio sin fecha
     *         límite
     */

    public LocalDate getDateDeadline() {
        return dateDeadline;
    }

    public Priority getPriority() {
        return priority;
    }

    public void setProject(Project project) {
        this.project = project;
    }

    public User getAssignedTo() {
        return assignedTo;
    }

    public void setAssignedTo(User assignedTo) {
        this.assignedTo = assignedTo;
    }

    public TaskType getType() {
        return type;
    }

    public void setType(TaskType type) {
        this.type = type;
    }

    public CodeTask getCodeTask() {
        return codeTask;
    }

    public void setCodeTask(CodeTask codeTask) {
        this.codeTask = codeTask;
        if (codeTask != null) {
            codeTask.setTask(this);
        }
    }

    /* MÉTODOS DE LÓGICA */

    /**
     * Verifica si la tarea está vencida (ha pasado la fecha límite y no está
     * completada)
     * 
     * @return true si está vencida, false en caso contrario
     */

    public boolean isExpired() {
        return !completed
                && dateDeadline != null
                && LocalDate.now().isAfter(dateDeadline);
    }

    public State getState() {
        if (completed) {
            return State.COMPLETED;
        } else if (dateDeadline != null && LocalDate.now().isAfter(dateDeadline)) {
            return State.EXPIRED;
        } else {
            return State.IN_PROGRESS;
        }
    }

    /**
     * Calcula los días restantes hasta la fecha límite
     * 
     * @return número de días (negativo si ya pasó)
     */

    public long daysLeft() {
        return dateDeadline != null ? java.time.temporal.ChronoUnit.DAYS.between(LocalDate.now(), dateDeadline) : -1;
    }

    public boolean isCompleted() {
        return this.completed;
    }

    public boolean isCodeTask() {
        return type == TaskType.CODE && codeTask != null;
    }

    public boolean isAssigned() {
        return assignedTo != null;
    }

    public boolean isAssignedTo(User user) {
        return assignedTo != null && assignedTo.getId().equals(user.getId());
    }

    public void assignTo(User user) {
        this.assignedTo = user;
    }

    public void unassign() {
        this.assignedTo = null;
    }

    public boolean isDueSoon(int days) {
        if (dateDeadline == null || completed) {
            return false;
        }
        long daysRemaining = daysLeft();
        return daysRemaining >= 0 && daysRemaining <= days;
    }

    /* MÉTODOS AUXILIARES */

    @Override
    public String toString() {
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("dd/MM/yyyy");
        String deadlineStr = (dateDeadline != null) ? dateDeadline.format(formatter) : "Sin fecha";
        String expiredStr = isExpired() ? " [VENCIDA]" : "";
        String assignedStr = isAssigned() ? " (→ " + assignedTo.getUsername() + ")" : " (Sin asignar)";
        String typeStr = (type != TaskType.NORMAL) ? " [" + type + "]" : "";

        return String.format("[ID: %d] %s%s - %s - %s - Límite: %s%s%s",
                id, title, typeStr, getState(), priority, deadlineStr, expiredStr, assignedStr);
    }

    @Override
    public int hashCode() {
        final int prime = 31;
        int result = 1;
        result = prime * result + ((id == null) ? 0 : id.hashCode());
        return result;
    }

    @Override
    public boolean equals(Object obj) {
        if (this == obj)
            return true;
        if (obj == null)
            return false;
        if (getClass() != obj.getClass())
            return false;
        Task other = (Task) obj;
        if (id == null) {
            if (other.id != null)
                return false;
        } else if (!id.equals(other.id))
            return false;
        return true;
    }
}
