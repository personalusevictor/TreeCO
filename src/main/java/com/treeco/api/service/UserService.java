package com.treeco.api.service;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import com.treeco.api.model.User;

public class UserService {
    private List<User> users;
    private User actualUser;

    public UserService() {
        this.users = new ArrayList<>();
        this.actualUser = null;
    }

    public boolean registerUser(String username, String email, String password) {
        if (searchByEmail(email) != null)
            throw new IllegalArgumentException("Ese email ya esta registrado");
        return users.add(new User(username, email, password));
    }

    public boolean authenticate(String email, String password) {
        User user = searchByEmail(email);

        if (user == null) {
            return false;
        } else if (!user.checkPassword(password)) {
            return false;
        } else {
            actualUser = user;
            return true;
        }
    }

    public void logOut() {
        actualUser = null;
    }

    public Optional<User> getActualUser() {
        return Optional.ofNullable(actualUser);
    }

    public User searchByEmail(String email) {
        return users.stream().filter(t -> t.getEmail().equalsIgnoreCase(email)).findFirst().orElse(null);
    }

    public List<User> getUsers() {
        return List.copyOf(users);
    }

}
