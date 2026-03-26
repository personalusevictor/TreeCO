package com.treeco.api.service;

import com.treeco.api.model.Project;
import com.treeco.api.model.ProjectMember;
import com.treeco.api.model.User;
import com.treeco.api.model.enums.NotificationType;
import com.treeco.api.model.enums.ProjectRole;
import com.treeco.api.repository.ProjectMemberRepository;
import com.treeco.api.repository.ProjectRepository;
import com.treeco.api.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.NoSuchElementException;

@Service
public class ProjectMemberService {

    private final ProjectMemberRepository memberRepository;
    private final ProjectRepository       projectRepository;
    private final UserRepository          userRepository;
    private final NotificationService     notificationService;

    public ProjectMemberService(ProjectMemberRepository memberRepository,
            ProjectRepository projectRepository,
            UserRepository userRepository,
            NotificationService notificationService) {
        this.memberRepository    = memberRepository;
        this.projectRepository   = projectRepository;
        this.userRepository      = userRepository;
        this.notificationService = notificationService;
    }

    // ── CONSULTAS ─────────────────────────────────────────────────────

    public List<ProjectMember> getMembersByProject(Integer projectId) {
        findProjectOrThrow(projectId);
        return memberRepository.findByProjectIdAndActiveTrue(projectId);
    }

    public List<ProjectMember> getProjectsByUser(Integer userId) {
        findUserOrThrow(userId);
        return memberRepository.findByUserIdAndActiveTrue(userId);
    }

    public List<ProjectMember> getMembersByRole(Integer projectId, ProjectRole role) {
        findProjectOrThrow(projectId);
        return memberRepository.findByProjectIdAndRole(projectId, role);
    }

    public long countMembers(Integer projectId) {
        findProjectOrThrow(projectId);
        return memberRepository.countByProjectIdAndActiveTrue(projectId);
    }

    public boolean hasRole(Integer projectId, Integer userId, ProjectRole role) {
        return memberRepository.hasRole(projectId, userId, role);
    }

    // ── GESTIÓN DE MIEMBROS ───────────────────────────────────────────

    /** Añade el creador del proyecto como OWNER. Sin notificación (él mismo lo creó). */
    @Transactional
    public ProjectMember addOwner(Project project, User owner) {
        ProjectMember member = new ProjectMember(project, owner, ProjectRole.OWNER);
        return memberRepository.save(member);
    }

    /**
     * Invita a un usuario al proyecto con un rol dado.
     *
     * Notificaciones disparadas:
     *  - PROJECT_INVITE  → usuario invitado
     *  - MEMBER_JOINED   → resto de miembros activos
     */
    @Transactional
    public ProjectMember addMember(Integer projectId, Integer userId,
            ProjectRole role, Integer invitedByUserId) {

        if (role == ProjectRole.OWNER)
            throw new IllegalArgumentException("No se puede añadir un miembro como OWNER");

        Project project   = findProjectOrThrow(projectId);
        User    user      = findUserOrThrow(userId);
        User    invitedBy = findUserOrThrow(invitedByUserId);

        if (memberRepository.existsByProjectIdAndUserId(projectId, userId))
            throw new IllegalArgumentException("El usuario ya es miembro de este proyecto");

        ProjectMember member = new ProjectMember(project, user, role, invitedBy);
        memberRepository.save(member);

        // Al usuario invitado: "te han invitado"
        notificationService.createForProject(
            user.getId(),
            NotificationType.PROJECT_INVITE,
            "Te han invitado a un proyecto",
            invitedBy.getUsername() + " te ha invitado a \"" + project.getName()
                + "\" como " + role.name(),
            project.getId().longValue(),
            "/projects/" + project.getId()
        );

        // Al resto de miembros activos: "nuevo miembro se unió"
        memberRepository.findByProjectIdAndActiveTrue(projectId).forEach(m -> {
            if (!m.getUser().getId().equals(userId)) {
                notificationService.createForProject(
                    m.getUser().getId(),
                    NotificationType.MEMBER_JOINED,
                    "Nuevo miembro en el proyecto",
                    user.getUsername() + " se ha unido a \"" + project.getName() + "\"",
                    project.getId().longValue(),
                    "/projects/" + project.getId()
                );
            }
        });

        return member;
    }

    /**
     * Cambia el rol de un miembro existente.
     *
     * Notificación disparada:
     *  - PROJECT_UPDATE → usuario afectado
     */
    @Transactional
    public ProjectMember changeRole(Integer projectId, Integer userId, ProjectRole newRole) {
        ProjectMember member  = findMemberOrThrow(projectId, userId);
        ProjectRole   oldRole = member.getRole();
        member.changeRole(newRole);
        memberRepository.save(member);

        notificationService.createForProject(
            userId,
            NotificationType.PROJECT_UPDATE,
            "Tu rol ha cambiado",
            "Tu rol en \"" + member.getProject().getName() + "\" ha cambiado de "
                + oldRole.name() + " a " + newRole.name(),
            projectId.longValue(),
            "/projects/" + projectId
        );

        return member;
    }

    /**
     * Transfiere la propiedad del proyecto a otro miembro.
     * El antiguo OWNER pasa a ser ADMIN.
     *
     * Notificación disparada:
     *  - PROJECT_UPDATE → nuevo owner
     */
    @Transactional
    public void transferOwnership(Integer projectId, Integer currentOwnerId, Integer newOwnerId) {
        ProjectMember currentOwner = findMemberOrThrow(projectId, currentOwnerId);
        ProjectMember newOwner     = findMemberOrThrow(projectId, newOwnerId);

        if (!currentOwner.isOwner())
            throw new IllegalArgumentException("El usuario especificado no es el OWNER actual");

        String projectName = currentOwner.getProject().getName();

        currentOwner.setRole(ProjectRole.ADMIN);
        newOwner.setRole(ProjectRole.OWNER);
        memberRepository.save(currentOwner);
        memberRepository.save(newOwner);

        notificationService.createForProject(
            newOwnerId,
            NotificationType.PROJECT_UPDATE,
            "Ahora eres el propietario",
            "Se te ha transferido la propiedad del proyecto \"" + projectName + "\"",
            projectId.longValue(),
            "/projects/" + projectId
        );
    }

    /**
     * Elimina definitivamente a un miembro del proyecto.
     *
     * Notificación disparada:
     *  - PROJECT_REMOVED → usuario eliminado
     */
    @Transactional
    public void removeMember(Integer projectId, Integer userId) {
        ProjectMember member = findMemberOrThrow(projectId, userId);

        if (member.isOwner())
            throw new IllegalArgumentException("No se puede eliminar al OWNER del proyecto");

        String projectName = member.getProject().getName();
        memberRepository.delete(member);

        notificationService.create(
            userId,
            NotificationType.PROJECT_REMOVED,
            "Te han eliminado de un proyecto",
            "Ya no eres miembro del proyecto \"" + projectName + "\""
        );
    }

    // ── AUXILIARES ────────────────────────────────────────────────────

    private Project findProjectOrThrow(Integer projectId) {
        return projectRepository.findById(projectId)
                .orElseThrow(() -> new NoSuchElementException("Proyecto no encontrado con id: " + projectId));
    }

    private User findUserOrThrow(Integer userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new NoSuchElementException("Usuario no encontrado con id: " + userId));
    }

    private ProjectMember findMemberOrThrow(Integer projectId, Integer userId) {
        return memberRepository.findByProjectIdAndUserId(projectId, userId)
                .orElseThrow(() -> new NoSuchElementException(
                        "El usuario " + userId + " no es miembro del proyecto " + projectId));
    }
}