package com.treeco.api.controller;

import com.treeco.api.model.User;
import com.treeco.api.repository.UserRepository;
import com.treeco.api.service.TokenEmailService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/auth")
public class AuthController {

    private final UserRepository    userRepository;
    private final TokenEmailService tokenEmailService;

    public AuthController(UserRepository userRepository,
                          TokenEmailService tokenEmailService) {
        this.userRepository    = userRepository;
        this.tokenEmailService = tokenEmailService;
    }

    // ── DTOs ────────────────────────────────────
    public record SendRegisterCodeRequest(String username, String email, String password) {}
    public record ConfirmRegisterRequest(String email, String code) {}
    public record LoginRequest(String email, String password) {}
    public record PasswordResetRequestBody(String email) {}
    public record ValidateResetTokenBody(String code) {}
    public record ConfirmResetBody(String code, String newPassword) {}

    // ════════════════════════════════════════════
    // REGISTRO — paso 1: enviar código
    // ════════════════════════════════════════════

    /**
     * POST /auth/register/send-code
     * Valida los datos, guarda un "pending registration" en el servicio
     * y envía el código de 6 dígitos al email.
     * La cuenta NO se crea todavía.
     */
    @PostMapping("/register/send-code")
    public ResponseEntity<?> sendRegisterCode(@RequestBody SendRegisterCodeRequest request) {
        try {
            if (request.username() == null || request.email() == null || request.password() == null) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(Map.of("error", "Todos los campos son obligatorios"));
            }
            if (userRepository.findByEmailIgnoreCase(request.email()).isPresent()) {
                return ResponseEntity.status(HttpStatus.CONFLICT)
                        .body(Map.of("error", "El email ya está registrado"));
            }

            tokenEmailService.sendRegistrationCode(
                request.username().trim(),
                request.email().trim(),
                request.password()
            );

            return ResponseEntity.ok(Map.of(
                "message", "Código enviado. Revisa tu email."
            ));

        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Error al enviar el código"));
        }
    }

    // ════════════════════════════════════════════
    // REGISTRO — paso 2: confirmar código y crear cuenta
    // ════════════════════════════════════════════

    /**
     * POST /auth/register/confirm
     * Body: { "email": "...", "code": "123456" }
     * Verifica el código y, si es correcto, crea la cuenta definitivamente.
     */
    @PostMapping("/register/confirm")
    public ResponseEntity<?> confirmRegister(@RequestBody ConfirmRegisterRequest request) {
        if (request.email() == null || request.code() == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", "Email y código son obligatorios"));
        }
        try {
            User newUser = tokenEmailService.confirmRegistration(
                request.email().trim(),
                request.code().trim()
            );

            return ResponseEntity.status(HttpStatus.CREATED).body(Map.of(
                "message",  "Cuenta creada correctamente",
                "userId",   newUser.getId(),
                "username", newUser.getUsername(),
                "email",    newUser.getEmail()
            ));

        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Error al crear la cuenta"));
        }
    }

    // ════════════════════════════════════════════
    // REENVIAR código de registro
    // ════════════════════════════════════════════

    /**
     * POST /auth/register/resend-code
     * Body: { "email": "..." }
     */
    @PostMapping("/register/resend-code")
    public ResponseEntity<?> resendRegisterCode(@RequestBody Map<String, String> body) {
        String email = body.get("email");
        if (email == null || email.isBlank()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", "El email es obligatorio"));
        }
        try {
            tokenEmailService.resendRegistrationCode(email.trim());
            return ResponseEntity.ok(Map.of("message", "Código reenviado"));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Error al reenviar el código"));
        }
    }

    // ════════════════════════════════════════════
    // LOGIN
    // ════════════════════════════════════════════

    /**
     * POST /auth/login
     */
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest request) {
        try {
            if (request.email() == null || request.password() == null) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(Map.of("error", "Email y contraseña son obligatorios"));
            }

            Optional<User> userOpt = userRepository.findByEmailIgnoreCase(request.email());

            if (userOpt.isEmpty() || !userOpt.get().checkPassword(request.password())) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("error", "Credenciales incorrectas"));
            }

            User user = userOpt.get();
            return ResponseEntity.ok(Map.of(
                "message",  "Login correcto",
                "userId",   user.getId(),
                "username", user.getUsername(),
                "email",    user.getEmail()
            ));

        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Error inesperado"));
        }
    }

    // ════════════════════════════════════════════
    // RECUPERAR CONTRASEÑA
    // ════════════════════════════════════════════

    /**
     * POST /auth/password-reset/request
     * Siempre devuelve 200 (no revela si el email existe).
     */
    @PostMapping("/password-reset/request")
    public ResponseEntity<?> requestPasswordReset(@RequestBody PasswordResetRequestBody body) {
        if (body.email() == null || body.email().isBlank()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", "El email es obligatorio"));
        }
        try {
            tokenEmailService.sendPasswordResetEmail(body.email().trim());
        } catch (Exception ignored) {}

        return ResponseEntity.ok(Map.of(
            "message", "Si ese email está registrado, recibirás un código en breve"
        ));
    }

    /**
     * POST /auth/password-reset/validate
     * Body: { "code": "123456" }
     */
    @PostMapping("/password-reset/validate")
    public ResponseEntity<?> validateResetToken(@RequestBody ValidateResetTokenBody body) {
        if (body.code() == null || body.code().isBlank()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", "El código es obligatorio"));
        }
        try {
            tokenEmailService.validatePasswordResetToken(body.code().trim());
            return ResponseEntity.ok(Map.of("valid", true));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * POST /auth/password-reset/confirm
     * Body: { "code": "123456", "newPassword": "..." }
     */
    @PostMapping("/password-reset/confirm")
    public ResponseEntity<?> confirmPasswordReset(@RequestBody ConfirmResetBody body) {
        if (body.code() == null || body.code().isBlank()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", "El código es obligatorio"));
        }
        if (body.newPassword() == null || body.newPassword().length() < 8) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", "La contraseña debe tener al menos 8 caracteres"));
        }
        try {
            tokenEmailService.resetPassword(body.code().trim(), body.newPassword());
            return ResponseEntity.ok(Map.of("message", "Contraseña actualizada correctamente"));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", e.getMessage()));
        }
    }
}