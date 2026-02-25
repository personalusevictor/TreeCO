package com.taskflow.taskflow.service;

import java.util.ArrayList;
import java.util.List;
import com.taskflow.taskflow.model.*;

public class ProjectService {
    private List<Project> projects;

    public ProjectService() {
        this.projects = new ArrayList<>();
    }

    public Project createProject(String name, String description) {
        Project project = new Project(name, description);
        projects.add(project);
        return project;
    }

    public Project searchById(int id) {
        return projects.stream().filter(t -> t.getId() == id).findFirst().orElse(null);
    }

    public boolean removeProject(int id) {
        return projects.remove(searchById(id));
    }

    public List<Project> getProjects() {
        return List.copyOf(projects);
    }

    public void addTaskToProject(int projectId, Task task) {
        if (task == null)
            throw new IllegalArgumentException("El campo 'task' no puede ser null");
        searchById(projectId).addTask(task);
    }

    public void removeTaskToProject(int projectId, Task task) {
        if (task == null)
            throw new IllegalArgumentException("El campo 'task' no puede ser null");
        searchById(projectId).removeTask(task);
    }

    public List<Task> getTaskOfProject(int projectId) {
        return searchById(projectId).getTasks();
    }

    public int getProgressProject(int projectId) {
        return searchById(projectId).getProgress();
    }
}
