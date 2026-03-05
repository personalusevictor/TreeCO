package com.treeco.api.repository;

import com.treeco.api.model.Task;
import com.treeco.api.model.enums.Priority;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import java.util.List;
import java.util.Optional;

public interface TaskRepository extends JpaRepository<Task, Integer> {
    List<Task> findByProjectId(Integer projectId);
    Optional<Task> findByIdAndProjectId(Integer id, Integer projectId);
    List<Task> findByProjectIdOrderByDateDeadlineAsc(Integer projectId);

    @Query("SELECT t FROM Task t WHERE t.project.id = :projectId AND t.priority = :priority")
    List<Task> findByProjectIdAndPriority(Integer projectId, Priority priority);
}