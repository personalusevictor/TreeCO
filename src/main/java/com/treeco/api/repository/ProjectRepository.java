package com.treeco.api.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import com.treeco.api.model.Project;

public interface ProjectRepository extends JpaRepository<Project, Integer> {

}
