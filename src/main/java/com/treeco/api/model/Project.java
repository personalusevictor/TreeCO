package com.treeco.api.model;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

import jakarta.persistence.*;

@Entity
@Table(name = "project")
public class Project {
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private Integer id;
    @Column(nullable = false)
    private String name;
    @Column(nullable = false)
    private String description;
    @Column(nullable = false)
    private final LocalDate creationDate;
    @ManyToOne
    @JoinColumn(name = "usuario_id", nullable = false)
    private User user;
    @OneToMany(mappedBy = "project", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Task> tasks;

    public Project(String name, String description) {
        setName(name);
        setDescription(description);
        this.creationDate = LocalDate.now();
        this.tasks = new ArrayList<>();

    }

    public Project(String name) {
        this(name, null);
    }

    public boolean addTask(Task task) {
        if (task == null) {
            throw new IllegalArgumentException("El campo 'task' no puede ser null");
        }

        return this.tasks.add(task);
    }

    public void addTask(Task task, int index) {
        if (task == null) {
            throw new IllegalArgumentException("El campo 'task' no puede ser null");
        }

        this.tasks.add(index, task);
    }

    public boolean removeTask(Task task) {
        if (task == null) {
            throw new IllegalArgumentException("El campo 'task' no puede ser null");
        }

        return this.tasks.remove(task);
    }

    public Task removeTask(int index) {
        return this.tasks.remove(index);
    }

    public List<Task> getTasksByState(State state) {
        if (state == null) {
            throw new IllegalArgumentException("El campo 'state' no puede estar vacio");
        }

        return this.tasks.stream().filter(t -> t.getState() == state).toList();
    }

    public List<Task> getInProgressTasks() {
        return getTasksByState(State.IN_PROGRESS);
    }

    public List<Task> getCompletedTasks() {
        return getTasksByState(State.COMPLETED);
    }

    public List<Task> getExpiredTasks() {
        return getTasksByState(State.EXPIRED);
    }

    public int getProgress() {
        if (this.tasks.isEmpty()) {
            return 0;
        }

        return (getCompletedTasks().size() * 100) / this.tasks.size();
    }

    public int getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        if (name == null || name.trim().isEmpty()) {
            throw new IllegalArgumentException("El campo 'name' no puede ser nulo o vacío");
        }
        this.name = name.trim();
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public LocalDate getCreationDate() {
        return creationDate;
    }

    public User getUser() {
        return user;
    }

    public List<Task> getTasks() {
        return List.copyOf(this.tasks);
    }

    @Override
    public String toString() {
        if (description == null) {
            return String.format("id: %d%n Name: %s%n Tasks: %s%n",
                    this.id, this.name, String.join("- ", tasks.toString()));
        } else {
            return String.format("id: %d%n Name: %s%n Description: %s%n Tasks: %s%n",
                    this.id, this.name, this.description, String.join("- ", tasks.toString()));
        }
    }

    @Override
    public int hashCode() {
        final int prime = 31;
        int result = 1;
        result = prime * result + id;
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
        Project other = (Project) obj;
        if (id != other.id)
            return false;
        return true;
    }

}