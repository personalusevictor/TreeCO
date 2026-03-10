package com.treeco.api.repository;

import com.treeco.api.model.ProjectMember;
import com.treeco.api.model.enums.ProjectRole;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ProjectMemberRepository extends JpaRepository<ProjectMember, Long> {

    /**
     * Todos los miembros activos de un proyecto
     */
    List<ProjectMember> findByProjectIdAndActiveTrue(Integer projectId);

    /**
     * Todos los proyectos en los que participa un usuario (activos)
     */
    List<ProjectMember> findByUserIdAndActiveTrue(Integer userId);

    /**
     * Busca la relación concreta entre un usuario y un proyecto
     */
    Optional<ProjectMember> findByProjectIdAndUserId(Integer projectId, Integer userId);

    /**
     * Comprueba si un usuario ya es miembro de un proyecto
     */
    boolean existsByProjectIdAndUserId(Integer projectId, Integer userId);

    /**
     * Busca miembros de un proyecto por rol
     */
    List<ProjectMember> findByProjectIdAndRole(Integer projectId, ProjectRole role);

    /**
     * Cuenta los miembros activos de un proyecto
     */
    long countByProjectIdAndActiveTrue(Integer projectId);

    /**
     * Busca el OWNER de un proyecto
     */
    @Query("SELECT pm FROM ProjectMember pm WHERE pm.project.id = :projectId AND pm.role = 'OWNER'")
    Optional<ProjectMember> findOwnerByProjectId(@Param("projectId") Integer projectId);

    /**
     * Verifica si un usuario tiene un rol concreto en un proyecto
     */
    @Query("SELECT COUNT(pm) > 0 FROM ProjectMember pm " +
           "WHERE pm.project.id = :projectId AND pm.user.id = :userId " +
           "AND pm.role = :role AND pm.active = true")
    boolean hasRole(@Param("projectId") Integer projectId,
                    @Param("userId") Integer userId,
                    @Param("role") ProjectRole role);
}