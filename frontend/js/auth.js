/* ═══════════════════════════════════════════════
   TREECO — Auth Page Logic
   ═══════════════════════════════════════════════ */

	 const API_BASE = 'http://localhost:8080';

	 // ── State ────────────────────────────────────────
	 const state = {
		 mode: 'login', // 'login' | 'register'
	 };
	 
	 // ── DOM References ───────────────────────────────
	 const panelsWrapper     = document.getElementById('panels-wrapper');
	 const sliderOverlay     = document.getElementById('slider-overlay');
	 const overlayInner      = document.getElementById('overlay-inner');
	 
	 // Login form
	 const formLogin         = document.getElementById('form-login');
	 const inputLoginEmail   = document.getElementById('login-email');
	 const inputLoginPass    = document.getElementById('login-password');
	 const btnLoginSubmit    = document.getElementById('btn-login-submit');
	 const errorLoginBanner  = document.getElementById('login-error');
	 
	 // Register form
	 const formRegister      = document.getElementById('form-register');
	 const inputRegUsername  = document.getElementById('register-username');
	 const inputRegEmail     = document.getElementById('register-email');
	 const inputRegPass      = document.getElementById('register-password');
	 const btnRegSubmit      = document.getElementById('btn-register-submit');
	 const errorRegBanner    = document.getElementById('register-error');
	 
	 // Mobile
	 const mobileTabs        = document.querySelectorAll('.mobile-tab');
	 const panelLogin        = document.getElementById('panel-login');
	 const panelRegister     = document.getElementById('panel-register');
	 const mobileToggle      = document.querySelector('.mobile-toggle');
	 
	 // ── Mode Switcher ────────────────────────────────
	 function setMode(newMode, instant = false) {
		 if (newMode === state.mode) return;
		 state.mode = newMode;
	 
		 panelsWrapper.classList.remove('state-login', 'state-register');
		 panelsWrapper.classList.add(`state-${newMode}`);
	 
		 overlayInner.classList.add('fading');
		 setTimeout(() => {
			 updateOverlayContent(newMode);
			 overlayInner.classList.remove('fading');
		 }, 200);
	 
		 if (mobileToggle) {
			 mobileToggle.classList.toggle('mode-register', newMode === 'register');
		 }
		 mobileTabs.forEach(tab => {
			 tab.classList.toggle('active', tab.dataset.mode === newMode);
		 });
	 
		 // Mobile panels
		 updateMobilePanels(newMode);
	 
		 // Clear errors
		 clearErrors();
	 }
	 
	 function updateOverlayContent(mode) {
		 const overlayEyebrow = document.getElementById('overlay-eyebrow');
		 const overlayTitle   = document.getElementById('overlay-title');
		 const overlayDesc    = document.getElementById('overlay-desc');
		 const overlayIcon    = document.getElementById('overlay-icon');
		 const overlayBtn     = document.getElementById('overlay-btn');
	 
		 if (mode === 'login') {
			 // Overlay is on the RIGHT (covers register panel) → CTA to go to register
			 overlayEyebrow.textContent = '¿Primera vez?';
			 overlayTitle.textContent   = 'Empieza a crecer';
			 overlayDesc.textContent    = 'Crea una cuenta y gestiona tus proyectos con TreeCO.';
			 overlayIcon.textContent    = '🌱';
			 overlayBtn.querySelector('.btn-label').textContent = 'Crear cuenta';
			 overlayBtn.onclick         = () => setMode('register');
		 } else {
			 // Overlay is on the LEFT (covers login panel) → CTA to go to login
			 overlayEyebrow.textContent = 'Ya tienes cuenta';
			 overlayTitle.textContent   = 'Bienvenido de nuevo';
			 overlayDesc.textContent    = 'Accede a tus proyectos y tareas donde lo dejaste.';
			 overlayIcon.textContent    = '🌿';
			 overlayBtn.querySelector('.btn-label').textContent = 'Iniciar sesión';
			 overlayBtn.onclick         = () => setMode('login');
		 }
	 }
	 
	 function updateMobilePanels(mode) {
		 panelLogin.classList.toggle('mobile-active', mode === 'login');
		 panelRegister.classList.toggle('mobile-active', mode === 'register');
	 }
	 
	 // ── Input Validation ─────────────────────────────
	 const validators = {
		 required: (val) => val.trim().length > 0,
		 email: (val) => /^[\w.-]+@[\w.-]+\.[a-zA-Z]{2,}$/.test(val.trim()),
		 minLen: (n) => (val) => val.trim().length >= n,
	 };
	 
	 function validateField(input, rules) {
		 const errorEl = document.getElementById(`${input.id}-error`);
		 let valid = true;
		 let msg = '';
	 
		 for (const { check, message } of rules) {
			 if (!check(input.value)) {
				 valid = false;
				 msg = message;
				 break;
			 }
		 }
	 
		 input.classList.toggle('error', !valid);
		 if (errorEl) {
			 errorEl.textContent = msg;
			 errorEl.classList.toggle('visible', !valid);
		 }
	 
		 return valid;
	 }
	 
	 function clearErrors() {
		 document.querySelectorAll('.input-field.error').forEach(el => el.classList.remove('error'));
		 document.querySelectorAll('.field-error.visible').forEach(el => el.classList.remove('visible'));
		 document.querySelectorAll('.error-banner.visible').forEach(el => el.classList.remove('visible'));
	 }
	 
	 function showBanner(bannerEl, message) {
		 bannerEl.querySelector('.banner-text').textContent = message;
		 bannerEl.classList.add('visible');
	 }
	 
	 // ── Button Loading State ─────────────────────────
	 function setLoading(btn, loading) {
		 btn.disabled = loading;
		 btn.classList.toggle('loading', loading);
	 }
	 
	 // ── Login Handler ────────────────────────────────
	 formLogin.addEventListener('submit', async (e) => {
		 e.preventDefault();
		 clearErrors();
	 
		 const emailOk = validateField(inputLoginEmail, [
			 { check: validators.required, message: 'El email es obligatorio' },
			 { check: validators.email,    message: 'Introduce un email válido' },
		 ]);
		 const passOk = validateField(inputLoginPass, [
			 { check: validators.required, message: 'La contraseña es obligatoria' },
		 ]);
	 
		 if (!emailOk || !passOk) return;
	 
		 setLoading(btnLoginSubmit, true);
	 
		 try {
			 const res = await fetch(`${API_BASE}/auth/login`, {
				 method: 'POST',
				 headers: { 'Content-Type': 'application/json' },
				 body: JSON.stringify({
					 email:    inputLoginEmail.value.trim(),
					 password: inputLoginPass.value,
				 }),
			 });
	 
			 const data = await res.json();
	 
			 if (!res.ok) {
				 showBanner(errorLoginBanner, data.error || 'Credenciales incorrectas');
				 return;
			 }
	 
			 // ✅ Success — store user and redirect
			 sessionStorage.setItem('treeco_user', JSON.stringify(data));
			 showSuccessAndRedirect(btnLoginSubmit, '¡Bienvenido!', () => {
				 window.location.href = 'dashboard.html';
			 });
	 
		 } catch (err) {
			 showBanner(errorLoginBanner, 'No se pudo conectar al servidor');
		 } finally {
			 setLoading(btnLoginSubmit, false);
		 }
	 });
	 
	 // ── Register Handler ─────────────────────────────
	 formRegister.addEventListener('submit', async (e) => {
		 e.preventDefault();
		 clearErrors();
	 
		 const userOk = validateField(inputRegUsername, [
			 { check: validators.required,    message: 'El nombre es obligatorio' },
			 { check: validators.minLen(3),   message: 'Mínimo 3 caracteres' },
		 ]);
		 const emailOk = validateField(inputRegEmail, [
			 { check: validators.required, message: 'El email es obligatorio' },
			 { check: validators.email,    message: 'Introduce un email válido' },
		 ]);
		 const passOk = validateField(inputRegPass, [
			 { check: validators.required,  message: 'La contraseña es obligatoria' },
			 { check: validators.minLen(8), message: 'Mínimo 8 caracteres' },
		 ]);
	 
		 if (!userOk || !emailOk || !passOk) return;
	 
		 setLoading(btnRegSubmit, true);
	 
		 try {
			 const res = await fetch(`${API_BASE}/auth/register/send-code`, {
				 method: 'POST',
				 headers: { 'Content-Type': 'application/json' },
				 body: JSON.stringify({
					 username: inputRegUsername.value.trim(),
					 email:    inputRegEmail.value.trim(),
					 password: inputRegPass.value,
				 }),
			 });
	 
			 const data = await res.json();
	 
			 if (!res.ok) {
				 showBanner(errorRegBanner, data.error || 'Error al registrar usuario');
				 return;
			 }
	 
			 // ✅ Success → abrir modal de verificación de email
			 const emailToVerify = inputRegEmail.value.trim();
			 showSuccessAndRedirect(btnRegSubmit, '¡Código enviado!', () => {
				 window.openVerifyModal(emailToVerify);
			 });
	 
		 } catch (err) {
			 showBanner(errorRegBanner, 'No se pudo conectar al servidor');
		 } finally {
			 setLoading(btnRegSubmit, false);
		 }
	 });
	 
	 // ── Password Toggle ──────────────────────────────
	 document.querySelectorAll('.btn-toggle-pass').forEach(btn => {
		 btn.addEventListener('click', () => {
			 const targetId = btn.dataset.target;
			 const input    = document.getElementById(targetId);
			 const isPass   = input.type === 'password';
			 input.type     = isPass ? 'text' : 'password';
	 
			 btn.innerHTML = isPass
				 ? `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>`
				 : `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`;
		 });
	 });
	 
	 // ── Success micro-feedback ───────────────────────
	 function showSuccessAndRedirect(btn, label, callback) {
		 const originalHTML = btn.innerHTML;
		 btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg><span>${label}</span>`;
		 btn.style.background = 'linear-gradient(135deg, #2cc06e, #1da85a)';
		 setTimeout(() => {
			 callback();
			 btn.innerHTML = originalHTML;
			 btn.style.background = '';
		 }, 900);
	 }
	 
	 // ── Mobile Tabs ──────────────────────────────────
	 mobileTabs.forEach(tab => {
		 tab.addEventListener('click', () => setMode(tab.dataset.mode));
	 });
	 
	 // ── Init ─────────────────────────────────────────
	 (function init() {
		 panelsWrapper.classList.add('state-login');
		 updateOverlayContent('login');
		 updateMobilePanels('login');
		 const mobileToggle = document.querySelector('.mobile-toggle');
		 if (mobileToggle) mobileToggle.classList.remove('mode-register');
	 })();
	 
	 /* ═══════════════════════════════════════════════
   TREECO — Modals Logic
   Verificación de email + Recuperación de contraseña
   ═══════════════════════════════════════════════ */

const MODAL_API = 'http://localhost:8080';

// ── Helpers compartidos ──────────────────────────

function modalSetLoading(btn, loading) {
  btn.disabled = loading;
  btn.classList.toggle('loading', loading);
}

function modalShowError(bannerEl, msg) {
  bannerEl.querySelector('.banner-text').textContent = msg;
  bannerEl.classList.add('visible');
}

function modalClearError(bannerEl) {
  bannerEl.classList.remove('visible');
  bannerEl.querySelector('.banner-text').textContent = '';
}

function openModal(backdropEl) {
  backdropEl.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeModal(backdropEl) {
  backdropEl.classList.remove('open');
  document.body.style.overflow = '';
}

function goToStep(panelPrefix, dotPrefix, stepNumber, totalSteps) {
  for (let i = 1; i <= totalSteps; i++) {
    const panel = document.getElementById(panelPrefix + i);
    const dot   = document.getElementById(dotPrefix + i);
    if (panel) panel.classList.toggle('active', i === stepNumber);
    if (dot) {
      dot.classList.toggle('active', i === stepNumber);
      dot.classList.toggle('done',   i < stepNumber);
    }
  }
}

function initCodeInputs(containerEl) {
  const digits = Array.from(containerEl.querySelectorAll('.code-digit'));

  digits.forEach((input, idx) => {
    input.addEventListener('keydown', (e) => {
      if (!/^\d$/.test(e.key) && !['Backspace','Delete','ArrowLeft','ArrowRight','Tab'].includes(e.key)) {
        e.preventDefault();
      }
    });

    input.addEventListener('input', () => {
      const val = input.value.replace(/\D/g, '');
      input.value = val ? val[0] : '';
      input.classList.toggle('filled', !!input.value);
      if (val && idx < digits.length - 1) digits[idx + 1].focus();
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' && !input.value && idx > 0) {
        digits[idx - 1].value = '';
        digits[idx - 1].classList.remove('filled');
        digits[idx - 1].focus();
      }
    });

    input.addEventListener('paste', (e) => {
      e.preventDefault();
      const pasted = (e.clipboardData || window.clipboardData)
        .getData('text').replace(/\D/g, '').slice(0, 6);
      pasted.split('').forEach((ch, i) => {
        if (digits[i]) { digits[i].value = ch; digits[i].classList.add('filled'); }
      });
      digits[Math.min(pasted.length, digits.length - 1)].focus();
    });
  });

  containerEl.getCode = () => digits.map(function(d) { return d.value; }).join('');

  containerEl.reset = () => {
    digits.forEach(d => { d.value = ''; d.classList.remove('filled', 'error-state'); });
    if (digits[0]) digits[0].focus();
  };

  containerEl.shakeError = () => {
    digits.forEach(d => { d.classList.add('error-state'); d.value = ''; d.classList.remove('filled'); });
    setTimeout(() => digits.forEach(d => d.classList.remove('error-state')), 500);
    if (digits[0]) digits[0].focus();
  };
}

function startResendTimer(btnEl, timerEl, seconds) {
  btnEl.disabled = true;
  let remaining = seconds;
  timerEl.textContent = 'en ' + remaining + 's';
  const interval = setInterval(() => {
    remaining--;
    if (remaining <= 0) {
      clearInterval(interval);
      timerEl.textContent = '';
      btnEl.disabled = false;
    } else {
      timerEl.textContent = 'en ' + remaining + 's';
    }
  }, 1000);
  return interval;
}

function playSuccessAnimation(ringEl, callback) {
  ringEl.classList.add('animate');
  setTimeout(callback, 1800);
}

// ════════════════════════════════════════════════
// Init — esperar a que el DOM esté listo
// ════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', function() {
  initVerifyModal();
  initResetModal();
});

// ════════════════════════════════════════════════
// MODAL 1 — Verificación de email (registro)
// ════════════════════════════════════════════════

function initVerifyModal() {
  const backdrop    = document.getElementById('modal-verify-backdrop');
  const btnClose    = document.getElementById('modal-verify-close');
  const errorEl     = document.getElementById('verify-error');
  const emailLabel  = document.getElementById('verify-email-display');
  const codeInputs  = document.getElementById('verify-code-inputs');
  const btnConfirm  = document.getElementById('btn-verify-confirm');
  const btnResend   = document.getElementById('btn-verify-resend');
  const timerEl     = document.getElementById('verify-resend-timer');
  const successRing = document.getElementById('verify-success-ring');

  let currentEmail = '';
  let resendTimer  = null;

  initCodeInputs(codeInputs);

  window.openVerifyModal = function(email) {
    currentEmail = email;
    emailLabel.textContent = email;
    modalClearError(errorEl);
    goToStep('vstep-', 'vdot-', 1, 2);
    successRing.classList.remove('animate');
    if (resendTimer) clearInterval(resendTimer);
    openModal(backdrop);
    setTimeout(function() {
      codeInputs.reset();
      resendTimer = startResendTimer(btnResend, timerEl, 30);
    }, 320);
  };

  btnClose.addEventListener('click', () => closeModal(backdrop));
  backdrop.addEventListener('click', (e) => { if (e.target === backdrop) closeModal(backdrop); });

  btnConfirm.addEventListener('click', async () => {
    const code = codeInputs.getCode();
    if (code.length < 6) {
      modalShowError(errorEl, 'Introduce los 6 dígitos del código');
      codeInputs.shakeError();
      return;
    }
    modalClearError(errorEl);
    modalSetLoading(btnConfirm, true);
    try {
      const res  = await fetch(MODAL_API + '/auth/register/confirm', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: currentEmail, code }),
      });
      const data = await res.json();
      if (!res.ok) { modalShowError(errorEl, data.error || 'Código incorrecto'); codeInputs.shakeError(); return; }
      goToStep('vstep-', 'vdot-', 2, 2);
      playSuccessAnimation(successRing, () => {
        setTimeout(() => {
          closeModal(backdrop);
          const loginEmailInput = document.getElementById('login-email');
          if (loginEmailInput) loginEmailInput.value = currentEmail;
          if (typeof setMode === 'function') setMode('login');
          document.getElementById('register-username').value = '';
          document.getElementById('register-email').value    = '';
          document.getElementById('register-password').value = '';
        }, 400);
      });
    } catch { modalShowError(errorEl, 'No se pudo conectar al servidor'); }
    finally { modalSetLoading(btnConfirm, false); }
  });

  btnResend.addEventListener('click', async () => {
    modalClearError(errorEl);
    btnResend.disabled = true;
    try {
      const res  = await fetch(MODAL_API + '/auth/register/resend-code', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: currentEmail }),
      });
      const data = await res.json();
      if (!res.ok) { modalShowError(errorEl, data.error || 'Error al reenviar'); btnResend.disabled = false; return; }
      codeInputs.reset();
      if (resendTimer) clearInterval(resendTimer);
      resendTimer = startResendTimer(btnResend, timerEl, 30);
    } catch { modalShowError(errorEl, 'No se pudo conectar al servidor'); btnResend.disabled = false; }
  });
}

// ════════════════════════════════════════════════
// MODAL 2 — Recuperación de contraseña
// ════════════════════════════════════════════════

function initResetModal() {
  const backdrop     = document.getElementById('modal-reset-backdrop');
  const btnClose     = document.getElementById('modal-reset-close');
  const emailInput   = document.getElementById('reset-email');
  const btnSend      = document.getElementById('btn-reset-send');
  const error1       = document.getElementById('reset-error-1');
  const emailDisplay = document.getElementById('reset-email-display');
  const codeInputs   = document.getElementById('reset-code-inputs');
  const btnValidate  = document.getElementById('btn-reset-validate');
  const btnResend    = document.getElementById('btn-reset-resend');
  const timerEl      = document.getElementById('reset-resend-timer');
  const error2       = document.getElementById('reset-error-2');
  const newPassInput = document.getElementById('reset-new-password');
  const btnConfirm   = document.getElementById('btn-reset-confirm');
  const error3       = document.getElementById('reset-error-3');
  const strengthEl   = document.getElementById('reset-strength');
  const strengthLbl  = document.getElementById('reset-strength-label');
  const successRing  = document.getElementById('reset-success-ring');

  let currentEmail  = '';
  let validatedCode = '';
  let resendTimer   = null;

  initCodeInputs(codeInputs);

  // Enlace ¿Olvidaste tu contraseña?
  const linkForgot = document.querySelector('.link-forgot');
  if (linkForgot) {
    linkForgot.addEventListener('click', (e) => {
      e.preventDefault();
      const prefill = document.getElementById('login-email')?.value || '';
      openResetModal(prefill);
    });
  }

  function openResetModal(prefillEmail) {
    currentEmail  = '';
    validatedCode = '';
    emailInput.value = prefillEmail || '';
    emailInput.classList.remove('error');
    [error1, error2, error3].forEach(modalClearError);
    newPassInput.value = '';
    strengthEl.dataset.strength = '0';
    strengthLbl.textContent = 'Introduce una contraseña';
    goToStep('rstep-', 'rdot-', 1, 3);
    successRing.classList.remove('animate');
    openModal(backdrop);
    setTimeout(() => codeInputs.reset(), 50);
  }

  btnClose.addEventListener('click', () => closeModal(backdrop));
  backdrop.addEventListener('click', (e) => { if (e.target === backdrop) closeModal(backdrop); });

  // Step 1 — enviar email
  btnSend.addEventListener('click', async () => {
    const email = emailInput.value.trim();
    if (!email || !/^[\w.-]+@[\w.-]+\.[a-zA-Z]{2,}$/.test(email)) {
      modalShowError(error1, 'Introduce un email válido');
      emailInput.classList.add('error');
      return;
    }
    emailInput.classList.remove('error');
    modalClearError(error1);
    modalSetLoading(btnSend, true);
    try {
      await fetch(MODAL_API + '/auth/password-reset/request', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      currentEmail = email;
      emailDisplay.textContent = email;
      if (resendTimer) clearInterval(resendTimer);
      goToStep('rstep-', 'rdot-', 2, 3);
      setTimeout(() => {
        codeInputs.reset();
        resendTimer = startResendTimer(btnResend, timerEl, 30);
      }, 50);
    } catch { modalShowError(error1, 'No se pudo conectar al servidor'); }
    finally { modalSetLoading(btnSend, false); }
  });

  // Step 2 — validar código
  btnValidate.addEventListener('click', async () => {
    const code = codeInputs.getCode();
    if (code.length < 6) { modalShowError(error2, 'Introduce los 6 dígitos del código'); codeInputs.shakeError(); return; }
    modalClearError(error2);
    modalSetLoading(btnValidate, true);
    try {
      const res  = await fetch(MODAL_API + '/auth/password-reset/validate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (!res.ok) { modalShowError(error2, data.error || 'Código incorrecto'); codeInputs.shakeError(); return; }
      validatedCode = code;
      goToStep('rstep-', 'rdot-', 3, 3);
      setTimeout(() => newPassInput.focus(), 50);
    } catch { modalShowError(error2, 'No se pudo conectar al servidor'); }
    finally { modalSetLoading(btnValidate, false); }
  });

  // Reenviar código
  btnResend.addEventListener('click', async () => {
    modalClearError(error2);
    btnResend.disabled = true;
    try {
      await fetch(MODAL_API + '/auth/password-reset/request', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: currentEmail }),
      });
      codeInputs.reset();
      if (resendTimer) clearInterval(resendTimer);
      resendTimer = startResendTimer(btnResend, timerEl, 30);
    } catch { modalShowError(error2, 'No se pudo conectar al servidor'); btnResend.disabled = false; }
  });

  // Indicador de fortaleza
  newPassInput.addEventListener('input', () => {
    const val = newPassInput.value;
    let s = 0;
    if (val.length >= 8)           s++;
    if (/[A-Z]/.test(val))         s++;
    if (/[0-9]/.test(val))         s++;
    if (/[^A-Za-z0-9]/.test(val)) s++;
    strengthEl.dataset.strength = val.length ? s : '0';
    strengthLbl.textContent = val.length
      ? ['', 'Débil', 'Regular', 'Buena', 'Fuerte'][s]
      : 'Introduce una contraseña';
  });

  // Step 3 — confirmar nueva contraseña
  btnConfirm.addEventListener('click', async () => {
    const newPassword = newPassInput.value;
    if (!newPassword || newPassword.length < 8) {
      modalShowError(error3, 'La contraseña debe tener al menos 8 caracteres');
      newPassInput.classList.add('error');
      return;
    }
    newPassInput.classList.remove('error');
    modalClearError(error3);
    modalSetLoading(btnConfirm, true);
    try {
      const res  = await fetch(MODAL_API + '/auth/password-reset/confirm', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: validatedCode, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) { modalShowError(error3, data.error || 'Error al cambiar la contraseña'); return; }
      goToStep('rstep-', 'rdot-', 4, 3);
      playSuccessAnimation(successRing, () => {
        setTimeout(() => {
          closeModal(backdrop);
          const loginEmailInput = document.getElementById('login-email');
          if (loginEmailInput) loginEmailInput.value = currentEmail;
          if (typeof setMode === 'function') setMode('login');
        }, 400);
      });
    } catch { modalShowError(error3, 'No se pudo conectar al servidor'); }
    finally { modalSetLoading(btnConfirm, false); }
  });
}