package com.treeco.api.service;

import com.treeco.api.model.User;
import com.treeco.api.model.VerificationToken;
import com.treeco.api.model.VerificationToken.TokenType;
import com.treeco.api.repository.UserRepository;
import com.treeco.api.repository.VerificationTokenRepository;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;

import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Servicio unificado para los dos flujos de verificación por código:
 *
 * 1. REGISTRO: los datos del usuario se guardan temporalmente en memoria
 * hasta que el código es confirmado. Solo entonces se crea la cuenta.
 *
 * 2. RESET DE CONTRASEÑA: flujo estándar con token en BD.
 */
@Service
public class TokenEmailService {

    // Hay que cambiar FROM_ADRESS por el correo una vez lo tengamos Raul (debe
    // coincidir con spring.mail.username)
    private static final String FROM_ADDRESS = "treeco.support@gmail.com";

    /**
     * Almacén temporal de registros pendientes de verificar.
     * Clave: email (lowercase). Valor: datos del registro + timestamp para
     * expiración.
     */
    private final Map<String, PendingRegistration> pendingRegistrations = new ConcurrentHashMap<>();

    private final VerificationTokenRepository tokenRepository;
    private final UserRepository userRepository;
    private final JavaMailSender mailSender;

    public TokenEmailService(VerificationTokenRepository tokenRepository,
            UserRepository userRepository,
            JavaMailSender mailSender) {
        this.tokenRepository = tokenRepository;
        this.userRepository = userRepository;
        this.mailSender = mailSender;
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
        String code = generateCode();

        // Guardamos en memoria: si ya existía un intento previo, lo sobreescribimos
        pendingRegistrations.put(emailKey, new PendingRegistration(username.trim(), email, password, code));

        // Enviar email
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom(FROM_ADDRESS);
            helper.setTo(email);
            helper.setSubject("Código de verificación - 🌿 TreeCO");

            String html = """
                    <html>
                    <head>
                    		<link rel="preconnect" href="https://fonts.googleapis.com">
                    		<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
                    		<link href="https://fonts.googleapis.com/css2?family=Cascadia+Code:ital,wght@0,200..700;1,200..700&family=Sora:wght@100..800&display=swap" rel="stylesheet">
                    </head>
                    <body style="padding:20px;font-family: "Sora", sans-serif;background: radial-gradient(ellipse 80% 60% at 20% 80%, rgba(20, 60, 35, 0.55) 0%, transparent 60%), radial-gradient(ellipse 60% 50% at 80% 20%, rgba(15, 45, 28, 0.45) 0%, transparent 60%), #050a08;">
                        <div style="max-width:500px;margin:auto;background:white;padding:30px;border-radius:8px;">

                            <h2 style="color:rgba(255, 255, 255, 0.92); font-size: 1.55rem">Tree<span style="color: #3ddc84;">CO</span></h2>

                            <p>Estimado/a %s,</p>

                            <p>Hemos recibido una solicitud para generar un nuevo código de verificación.</p>

                            <div style="font-size:28px;font-weight:bold;letter-spacing:5px;margin:20px 0;">
                                %s
                            </div>

                            <p>Este código expirará en 10 minutos.</p>

                            <p style="color:#777;">Si no solicitaste este código, puedes ignorar este mensaje.</p>

                            <br>
                            <p>Atentamente,<br>Equipo de TreeCO</p>

                        </div>
                    </body>
                    </html>
                    """
                    .formatted(username.trim(), code);

            helper.setText(html, true);

            mailSender.send(message);
        } catch (MessagingException e) {
            System.out.println(e);
        }
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
            throw new IllegalArgumentException(
                    "No hay ningún registro pendiente para este email. Vuelve a introducir tus datos.");
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
        newUser.setEmailVerified(true);
        userRepository.save(newUser);
        pendingRegistrations.remove(emailKey);

        return newUser;
    }

    /**
     * Reenvía el código de registro (genera uno nuevo, mantiene los datos del
     * usuario).
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
                pending.username(), pending.email(), pending.rawPassword(), newCode));

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(FROM_ADDRESS);
            helper.setTo(email);
            helper.setSubject("Código de verificación - 🌿 TreeCO");

            String html = """
                    <html>
                    <body style="padding:20px; font-family: "Sora", sans-serif;background: radial-gradient(ellipse 80% 60% at 20% 80%, rgba(20, 60, 35, 0.55) 0%, transparent 60%), radial-gradient(ellipse 60% 50% at 80% 20%, rgba(15, 45, 28, 0.45) 0%, transparent 60%), #050a08;">
                        <div style="max-width:500px;margin:auto;background:white;padding:30px;border-radius:8px;">

                            <h2 style="color:rgba(255, 255, 255, 0.92); font-size: 2rem">Tree<span style="color: #3ddc84;">CO</span></h2>

                            <p>Estimado/a %s,</p>

                            <p>Hemos recibido una solicitud para generar un nuevo código de verificación.</p>

                            <div style="font-size:28px;font-weight:bold;letter-spacing:5px;margin:20px 0;">
                                %s
                            </div>

                            <p>Este código expirará en 10 minutos.</p>

                            <p style="color:#777;">Si no solicitaste este código, puedes ignorar este mensaje.</p>

                            <br>
                            <p>Atentamente,<br>Equipo de TreeCO</p>

                        </div>
                    </body>
                    </html>
                    """
                    .formatted(pending.username(), newCode);

            helper.setText(html, true);

            mailSender.send(message);
        } catch (MessagingException e) {
            System.out.println(e);
        }

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

            String code = generateCode();
            VerificationToken token = new VerificationToken(code, user, TokenType.PASSWORD_RESET);
            tokenRepository.save(token);

            try {
                MimeMessage message = mailSender.createMimeMessage();
                MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
                helper.setFrom(FROM_ADDRESS);
                helper.setTo(email);
                helper.setSubject("🔑 TreeCO — Restablece tu contraseña");

                String html = """
                        <html>
                        	<body style="margin:0;padding:0;font-family: "Sora", sans-serif;background: radial-gradient(ellipse 80% 60% at 20% 80%, rgba(20, 60, 35, 0.55) 0%, transparent 60%), radial-gradient(ellipse 60% 50% at 80% 20%, rgba(15, 45, 28, 0.45) 0%, transparent 60%), #050a08;">

                        	  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0;">
                        	    <tr>
                        	      <td align="center">

                        	        <table width="500" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;padding:40px;box-shadow:0 2px 8px rgba(0,0,0,0.05);">

                        	          <tr>
                        	            <td align="center" style="padding-bottom:20px;">
                        	              <h2 style="margin:0;color:#2c7a4b;">TreeCO</h2>
                        	            </td>
                        	          </tr>

                        	          <tr>
                        	            <td style="color:#333;font-size:16px;">
                        	              Hola <strong>%s</strong>,
                        	              <br><br>
                        	              Hemos recibido una solicitud para restablecer tu contraseña.
                        	              <br><br>
                        	              Utiliza el siguiente código de verificación:
                        	            </td>
                        	          </tr>

                        	          <tr>
                        	            <td align="center" style="padding:30px 0;">
                        	              <div style="font-size:32px;font-weight:bold;letter-spacing:6px;color:#2c7a4b;">
                        	                %s
                        	              </div>
                        	            </td>
                        	          </tr>

                        	          <tr>
                        	            <td style="color:#555;font-size:14px;line-height:1.6;">
                        	              Este código es válido durante <strong>10 minutos</strong> y solo puede utilizarse una vez.
                        	              <br><br>
                        	              Si no solicitaste este cambio, puedes ignorar este mensaje.
                        	            </td>
                        	          </tr>

                        	          <tr>
                        	            <td style="padding-top:30px;color:#888;font-size:13px;">
                        	              — El equipo de TreeCO
                        	            </td>
                        	          </tr>

                        	        </table>

                        	      </td>
                        	    </tr>
                        	  </table>

                        	</body>
                        </html>"""
                        .formatted(user.getUsername(), code);

                helper.setText(html, true);

                mailSender.send(message);
            } catch (MessagingException e) {
                System.out.println(e);
            }
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
            String rawPassword, // contraseña en texto plano — se hashea al crear la cuenta
            String code,
            LocalDateTime createdAt) {
        PendingRegistration(String username, String email, String rawPassword, String code) {
            this(username, email, rawPassword, code, LocalDateTime.now());
        }

        boolean isExpired() {
            return LocalDateTime.now().isAfter(createdAt.plusMinutes(10));
        }
    }
}