package com.treeco.api.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import com.treeco.api.model.User;

public interface UserRepository extends JpaRepository<User, Integer> {
    
}
