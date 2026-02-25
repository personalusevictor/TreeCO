package com.treeco.api.service;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

import com.treeco.api.model.*;

public class TaskService {
    private List<Task> tasks;

    public TaskService() {
        this.tasks = new ArrayList<>();
    }

    public Task createTask(String title, String description, Priority priority, LocalDate dateDeadline) {
        Task task = Task.builder(title).description(description).priority(priority).deadline(dateDeadline).build();
        tasks.add(task);
        return task;
    }

    public Task searchById(int id) {
        return tasks.stream().filter(t -> t.getId() == id).findFirst().orElse(null);
    }

    public boolean removeTask(int id) {
        return tasks.remove(searchById(id));
    }

    public void changeState(int id, boolean completed) {
        searchById(id).setCompleted(completed);
    }

    public List<Task> filterByState(State state) {
        if (state == null)
            throw new IllegalArgumentException("El campo 'state' no puede ser null");
        return tasks.stream().filter(t -> t.getState() == state).toList();
    }

    public List<Task> filterByPriority(Priority priority) {
        if (priority == null)
            throw new IllegalArgumentException("El campo 'priority' no puede ser null");
        return tasks.stream().filter(t -> t.getPriority() == priority).toList();
    }

    public List<Task> getTasks() {
        return List.copyOf(tasks);
    }

    public List<Task> orderByDate() {
        Comparator<Task> comparatorDate = (o1, o2) -> o1.getDateDeadline().compareTo(o2.getDateDeadline());
        return tasks.stream().sorted(comparatorDate).toList();
    }
}
