package com.treeco.api.service;

import com.treeco.api.model.Project;
import com.treeco.api.model.Task;
import com.treeco.api.model.User;
import com.treeco.api.model.enums.State;
import com.treeco.api.repository.ProjectRepository;
import com.treeco.api.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.NoSuchElementException;

@Service
public class ProjectService {

    private final ProjectRepository projectRepository;
    private final UserRepository userRepository;

    public ProjectService(ProjectRepository projectRepository, UserRepository userRepository) {
        this.projectRepository = projectRepository;
        this.userRepository = userRepository;
    }

    // ── CONSULTAS ─────────────────────────────────────────────────────

    /**
     * Devuelve todos los proyectos.
     */
    public List<Project> getProjects() {
        return projectRepository.findAll();
    }

    /**
     * Busca un proyecto por ID.
     * 
     * @throws NoSuchElementException si no existe
     */
    public Project findById(Integer id) {
        return projectRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Proyecto no encontrado con id: " + id));
    }

    /**
     * Devuelve todos los proyectos de un usuario.
     * 
     * @throws NoSuchElementException si el usuario no existe
     */
    public List<Project> getProjectsByUser(Integer userId) {
        if (!userRepository.existsById(userId)) {
            throw new NoSuchElementException("Usuario no encontrado con id: " + userId);
        }
        return projectRepository.findByUserId(userId);
    }

    /**
     * Devuelve el porcentaje de progreso de un proyecto (tareas completadas /
     * total).
     */
    public int getProgress(Integer projectId) {
        return findById(projectId).getProgress();
    }

    /**
     * Devuelve las tareas de un proyecto filtradas por estado.
     */
    public List<Task> getTasksByState(Integer projectId, State state) {
        return findById(projectId).getTasksByState(state);
    }

    // ── CREAR / ACTUALIZAR / ELIMINAR ─────────────────────────────────

    /**
     * Crea un nuevo proyecto asociado a un usuario.
     * 
     * @throws NoSuchElementException si el usuario no existe
     */
    @Transactional
    public Project createProject(Integer userId, String name, String description) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new NoSuchElementException("Usuario no encontrado con id: " + userId));

        Project project = new Project(name, description);
        project.setUser(user);
        return projectRepository.save(project);
    }

    /**
     * Actualiza nombre y/o descripción de un proyecto.
     * 
     * @throws NoSuchElementException si el proyecto no existe
     */
    @Transactional
    public Project updateProject(Integer projectId, String newName, String newDescription) {
        Project project = findById(projectId);

        if (newName != null && !newName.isBlank()) {
            project.setName(newName);
        }
        if (newDescription != null) {
            project.setDescription(newDescription);
        }

        return projectRepository.save(project);
    }

    /**
     * Elimina un proyecto por ID.
     * 
     * @throws NoSuchElementException si no existe
     */
    @Transactional
    public void deleteProject(Integer projectId) {
        if (!projectRepository.existsById(projectId)) {
            throw new NoSuchElementException("Proyecto no encontrado con id: " + projectId);
        }
        projectRepository.deleteById(projectId);
    }
}