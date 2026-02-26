package com.treeco.api.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import com.treeco.api.model.Task;

public interface TaskRepository extends JpaRepository<Task, Integer> {

}
