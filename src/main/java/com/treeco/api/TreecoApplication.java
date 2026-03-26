package com.treeco.api;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class TreecoApplication {

    public static void main(String[] args) {
        SpringApplication.run(TreecoApplication.class, args);
    }

}
