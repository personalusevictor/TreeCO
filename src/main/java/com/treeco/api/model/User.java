package com.treeco.api.model;

import java.util.ArrayList;
import java.util.List;
import org.mindrot.jbcrypt.BCrypt;
import jakarta.persistence.*;

/**
 * Clase que representa un usuario del sistema TreeCO
 */
@Entity
@Table(name = "users")
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;
    @Column(nullable = false)
    private String username;
    @Column(unique = true, nullable = false)
    private String email;
    @Column(nullable = false)
    private String hashPassword;
    @OneToMany(mappedBy = "users", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Project> projects;

    /* CONSTRUCTOR */

    public User(String username, String email, String password) {
        setUsername(username);
        setEmail(email);
        setPassword(password);
        this.projects = new ArrayList<>();
    }

    /* GETTERS Y SETTERS */

    public Integer getId() {
        return id;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        if (username == null || username.trim().isEmpty()) {
            throw new IllegalArgumentException("El campo 'username' no puede ser nulo o vacío");
        }
        this.username = username.trim();
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        if (email == null || email.trim().isEmpty()) {
            throw new IllegalArgumentException("El campo 'email' no puede ser nulo o vacío");
        } else if (!email.matches("^[\\w.-]+@[\\w.-]+\\.[a-zA-Z]{2,}$")) {
            throw new IllegalArgumentException("Formato de 'email' mal introducido");
        }
        this.email = email.trim();
    }

    public String getHashPassword() {
        return hashPassword;
    }

    public void setPassword(String password) {
        if (password == null || password.trim().isEmpty()) {
            throw new IllegalArgumentException("El campo 'password' no puede ser nulo o vacío");
        } else if (password.length() < 8) {
            throw new IllegalArgumentException("Mínimo 8 caracteres");
        }

        this.hashPassword = BCrypt.hashpw(password, BCrypt.gensalt(6));
    }

    /**
     * Obtiene una copia inmutable de la lista de proyectos
     * 
     * @return Lista de proyectos del usuario
     */
    public List<Project> getProjects() {
        return List.copyOf(this.projects);
    }

    /* MÉTODOS DE LÓGICA */

    /**
     * Verifica si la contraseña proporcionada coincide con el hash almacenado
     * 
     * @param password Contraseña a verificar
     * @return true si la contraseña es correcta, false en caso contrario
     */
    public boolean checkPassword(String password) {
        if (password == null) {
            return false;
        }
        return BCrypt.checkpw(password, this.hashPassword);
    }

    /**
     * Añade un proyecto a la lista de proyectos del usuario
     * 
     * @param project Proyecto a añadir
     * @return true si se añadió correctamente
     */
    public boolean addProject(Project project) {
        if (project == null) {
            throw new IllegalArgumentException("El proyecto no puede ser nulo");
        }
        return this.projects.add(project);
    }

    /**
     * Elimina un proyecto de la lista
     * 
     * @param project Proyecto a eliminar
     * @return true si se eliminó correctamente
     */
    public boolean removeProject(Project project) {
        return this.projects.remove(project);
    }

    /**
     * Elimina un proyecto por su índice
     * 
     * @param index Índice del proyecto
     * @return El proyecto eliminado
     */
    public Project removeProject(int index) {
        return this.projects.remove(index);
    }

    /**
     * Obtiene un proyecto por su id
     * 
     * @param projectid id del proyecto
     * @return El proyecto encontrado o null si no existe
     */
    public Project getProjectByid(int projectid) {
        return this.projects.stream()
                .filter(p -> p.getId() == projectid)
                .findFirst()
                .orElse(null);
    }

    /**
     * Obtiene todas las tareas de todos los proyectos del usuario
     * 
     * @return Lista con todas las tareas
     */
    public List<Task> getAllTasks() {
        return this.projects.stream()
                .flatMap(p -> p.getTasks().stream())
                .toList();
    }

    /**
     * Obtiene el progreso global de todos los proyectos
     * 
     * @return Porcentaje de progreso promedio (0-100)
     */
    public double getGlobalProgress() {
        if (this.projects.isEmpty()) {
            return 0;
        }

        double sum = this.projects.stream()
                .mapToDouble(Project::getProgress)
                .sum();

        return sum / this.projects.size();
    }

    /* MÉTODOS AUXILIARES */
    @Override
    public String toString() {
        return String.format("id: %d | Username: %s | Email: %s | Projects: %d",
                this.id, this.username, this.email, this.projects.size());
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
        User other = (User) obj;
        if (id != other.id)
            return false;
        return true;
    }

}