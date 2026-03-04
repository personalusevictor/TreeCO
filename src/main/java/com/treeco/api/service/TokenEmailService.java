package com.treeco.api.service;

import com.treeco.api.model.User;
import com.treeco.api.model.VerificationToken;
import com.treeco.api.model.VerificationToken.TokenType;
import com.treeco.api.repository.UserRepository;
import com.treeco.api.repository.VerificationTokenRepository;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Servicio unificado para los dos flujos de verificación por código:
 *
 *   1. REGISTRO: los datos del usuario se guardan temporalmente en memoria
 *      hasta que el código es confirmado. Solo entonces se crea la cuenta.
 *
 *   2. RESET DE CONTRASEÑA: flujo estándar con token en BD.
 */
@Service
public class TokenEmailService {

    //  Hay que cambiar FROM_ADRESS por el correo una vez lo tengamos Raul (debe coincidir con spring.mail.username)
    private static final String FROM_ADDRESS = "";

    /**
     * Almacén temporal de registros pendientes de verificar.
     * Clave: email (lowercase). Valor: datos del registro + timestamp para expiración.
     */
    private final Map<String, PendingRegistration> pendingRegistrations = new ConcurrentHashMap<>();

    private final VerificationTokenRepository tokenRepository;
    private final UserRepository              userRepository;
    private final JavaMailSender              mailSender;

    public TokenEmailService(VerificationTokenRepository tokenRepository,
                             UserRepository userRepository,
                             JavaMailSender mailSender) {
        this.tokenRepository = tokenRepository;
        this.userRepository  = userRepository;
        this.mailSender      = mailSender;
    }

    // ════════════════════════════════════════════
    // REGISTRO
    // ════════════════════════════════════════════

    /**
     * Guarda los datos del registro en memoria y envía el código de 6 dígitos.
     * La cuenta NO se crea todavía en la BD.
     */
    @Transactional
    public void sendRegistrationCode(String username, String email, String password) {
        // Validación básica (el controller ya comprobó duplicados de email)
        if (username == null || username.trim().isEmpty())
            throw new IllegalArgumentException("El nombre de usuario no puede estar vacío");
        if (password == null || password.length() < 8)
            throw new IllegalArgumentException("La contraseña debe tener al menos 8 caracteres");

        String emailKey = email.toLowerCase();
        String code     = generateCode();

        // Guardamos en memoria: si ya existía un intento previo, lo sobreescribimos
        pendingRegistrations.put(emailKey, new PendingRegistration(username.trim(), email, password, code));

        // Enviar email
        SimpleMailMessage msg = new SimpleMailMessage();
        msg.setFrom(FROM_ADDRESS);
        msg.setTo(email);
        msg.setSubject("🌿 TreeCO — Verifica tu cuenta");
        msg.setText(
            "Hola " + username.trim() + ",\n\n" +
            "Tu código de verificación para crear tu cuenta en TreeCO es:\n\n" +
            "    " + code + "\n\n" +
            "El código es válido durante 10 minutos.\n\n" +
            "Si no has solicitado esto, ignora este mensaje.\n\n" +
            "— El equipo de TreeCO"
        );
        mailSender.send(msg);
    }

    /**
     * Verifica el código de registro y, si es correcto, crea la cuenta en BD.
     *
     * @throws IllegalArgumentException si el código es incorrecto o ha expirado
     * @return el User recién creado
     */
    @Transactional
    public User confirmRegistration(String email, String code) {
        String emailKey = email.toLowerCase();
        PendingRegistration pending = pendingRegistrations.get(emailKey);

        if (pending == null) {
            throw new IllegalArgumentException("No hay ningún registro pendiente para este email. Vuelve a introducir tus datos.");
        }
        if (pending.isExpired()) {
            pendingRegistrations.remove(emailKey);
            throw new IllegalArgumentException("El código ha expirado. Solicita uno nuevo.");
        }
        if (!pending.code().equals(code)) {
            throw new IllegalArgumentException("Código incorrecto");
        }

        // Código correcto → crear la cuenta
        // Doble check por si alguien se registró con el mismo email justo entre
        // el send-code y el confirm (muy improbable, pero seguro)
        if (userRepository.findByEmailIgnoreCase(email).isPresent()) {
            pendingRegistrations.remove(emailKey);
            throw new IllegalArgumentException("El email ya está registrado");
        }

        User newUser = new User(pending.username(), pending.email(), pending.rawPassword());
        userRepository.save(newUser);
        pendingRegistrations.remove(emailKey);

        return newUser;
    }

    /**
     * Reenvía el código de registro (genera uno nuevo, mantiene los datos del usuario).
     *
     * @throws IllegalArgumentException si no hay registro pendiente para ese email
     */
    @Transactional
    public void resendRegistrationCode(String email) {
        String emailKey = email.toLowerCase();
        PendingRegistration pending = pendingRegistrations.get(emailKey);

        if (pending == null) {
            throw new IllegalArgumentException("No hay ningún registro pendiente para este email");
        }

        String newCode = generateCode();
        pendingRegistrations.put(emailKey, new PendingRegistration(
            pending.username(), pending.email(), pending.rawPassword(), newCode
        ));

        SimpleMailMessage msg = new SimpleMailMessage();
        msg.setFrom(FROM_ADDRESS);
        msg.setTo(email);
        msg.setSubject("🌿 TreeCO — Tu nuevo código de verificación");
        msg.setText(
            "Hola " + pending.username() + ",\n\n" +
            "Tu nuevo código de verificación es:\n\n" +
            "    " + newCode + "\n\n" +
            "El código es válido durante 10 minutos.\n\n" +
            "— El equipo de TreeCO"
        );
        mailSender.send(msg);
    }

    // ════════════════════════════════════════════
    // RESET DE CONTRASEÑA
    // ════════════════════════════════════════════

    /**
     * Genera un token de reset y envía el email.
     * Si el email no existe, no hace nada (sin revelar si está registrado).
     */
    @Transactional
    public void sendPasswordResetEmail(String email) {
        userRepository.findByEmailIgnoreCase(email).ifPresent(user -> {
            tokenRepository.invalidatePreviousTokens(user.getId(), TokenType.PASSWORD_RESET);

            String code  = generateCode();
            VerificationToken token = new VerificationToken(code, user, TokenType.PASSWORD_RESET);
            tokenRepository.save(token);

            SimpleMailMessage msg = new SimpleMailMessage();
            msg.setFrom(FROM_ADDRESS);
            msg.setTo(user.getEmail());
            msg.setSubject("🔑 TreeCO — Restablece tu contraseña");
            msg.setText(
                "Hola " + user.getUsername() + ",\n\n" +
                "Tu código para restablecer la contraseña es:\n\n" +
                "    " + code + "\n\n" +
                "Este código es válido durante 10 minutos y solo puede usarse una vez.\n\n" +
                "Si no has solicitado este cambio, ignora este mensaje.\n\n" +
                "— El equipo de TreeCO"
            );
            mailSender.send(msg);
        });
    }

    /**
     * Valida el código de reset sin aplicar el cambio aún.
     *
     * @throws IllegalArgumentException si el código no es válido
     */
    public void validatePasswordResetToken(String code) {
        findValidToken(code, TokenType.PASSWORD_RESET);
    }

    /**
     * Valida el código y aplica la nueva contraseña en una operación atómica.
     *
     * @throws IllegalArgumentException si el código no es válido
     */
    @Transactional
    public void resetPassword(String code, String newPassword) {
        VerificationToken token = findValidToken(code, TokenType.PASSWORD_RESET);

        User user = token.getUser();
        user.setPassword(newPassword);
        userRepository.save(user);

        token.markAsUsed();
        tokenRepository.save(token);
    }

    // ════════════════════════════════════════════
    // Helpers privados
    // ════════════════════════════════════════════

    private VerificationToken findValidToken(String code, TokenType expectedType) {
        VerificationToken token = tokenRepository.findByToken(code)
                .orElseThrow(() -> new IllegalArgumentException("Código incorrecto"));

        if (token.getType() != expectedType)
            throw new IllegalArgumentException("Código incorrecto");
        if (token.isExpired())
            throw new IllegalArgumentException("El código ha expirado. Solicita uno nuevo.");
        if (token.isUsed())
            throw new IllegalArgumentException("El código ya fue utilizado.");

        return token;
    }

    private String generateCode() {
        SecureRandom rng = new SecureRandom();
        return String.valueOf(100_000 + rng.nextInt(900_000));
    }

    // ════════════════════════════════════════════
    // Record interno: registro pendiente
    // ════════════════════════════════════════════

    /**
     * Datos temporales de un registro pendiente de verificar.
     * Expira 10 minutos después de su creación.
     */
    private record PendingRegistration(
        String username,
        String email,
        String rawPassword,   // contraseña en texto plano — se hashea al crear la cuenta
        String code,
        LocalDateTime createdAt
    ) {
        PendingRegistration(String username, String email, String rawPassword, String code) {
            this(username, email, rawPassword, code, LocalDateTime.now());
        }

        boolean isExpired() {
            return LocalDateTime.now().isAfter(createdAt.plusMinutes(10));
        }
    }
}