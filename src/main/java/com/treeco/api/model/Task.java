package com.treeco.api.model;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;

public class Task {

    // ATRIBUTOS ESTÁTICOS
    private static int countTask = 0;

    // ATRIBUTOS DEL OBJETO
    private final int ID;
    private String title;
    private String description;
    private final LocalDate dateCreation;
    private LocalDate dateDeadline;
    private Priority priority;
    private boolean completed;

    /* CONSTRUCTORES Y BUILDER */

    public static class Builder {

        // Opcionales (valores por defecto)
        private String title;
        private String description = "";
        private LocalDate dateDeadline = null;
        private Priority priority = Priority.MID;

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

        public Task build() {
            return new Task(this);
        }
    }

    public static Builder builder(String title) {
        return new Builder(title);
    }

    private Task(Builder builder) {
        this.ID = ++countTask;

        this.title = builder.title;
        this.description = builder.description;
        this.dateCreation = LocalDate.now();
        this.dateDeadline = builder.dateDeadline;
        this.priority = builder.priority;

        this.completed = false;
    }

    /* GETTERS Y SETTERS */

    public int getId() {
        return ID;
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

    public State getState() {
        if (completed) {
            return State.COMPLETED;
        } else if (dateDeadline != null && LocalDate.now().isAfter(dateDeadline)) {
            return State.EXPIRED;
        } else {
            return State.IN_PROGRESS;
        }
    }

    public Priority getPriority() {
        return priority;
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

    /**
     * Calcula los días restantes hasta la fecha límite
     * 
     * @return número de días (negativo si ya pasó)
     */

    public long daysLeft() {
        return dateDeadline != null ? java.time.temporal.ChronoUnit.DAYS.between(LocalDate.now(), dateDeadline) : -1;
    }

    /* MÉTODOS AUXILIARES */
    public static void resetCounter() {
        countTask = 0;
    }

    @Override
    public String toString() {
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("dd/MM/yyyy");
        String deadlineStr = (dateDeadline != null) ? dateDeadline.format(formatter) : "Sin fecha";
        String expired = isExpired() ? " [VENCIDA]" : "";

        return String.format("[ID: %d] %s - %s - %s - Límite: %s%s",
                ID, title, getState(), priority, deadlineStr, expired);
    }

    @Override
    public int hashCode() {
        final int prime = 31;
        int result = 1;
        result = prime * result + ID;
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
        if (ID != other.ID)
            return false;
        return true;
    }

}
