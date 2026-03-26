/* ══════════════════════════════════════════════════════════════
   TREECO — header-component.js  v14
   ══════════════════════════════════════════════════════════════
   TUNING:
     SHOW_Y        — px from top that reveals header  (default 72)
     HIDE_DELAY_MS — ms before header hides           (default 300)
   ══════════════════════════════════════════════════════════════ */

	 class AppHeader extends HTMLElement {

		static NAV = [
			{ href: "./dashboard.html", label: "Dashboard",  kbd: "Alt+1",
				icon: `<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>` },
			{ href: "./projects.html",  label: "Proyectos",  kbd: "Alt+2",
				icon: `<path d="M3 7a2 2 0 0 1 2-2h3.5l2 2H19a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>` },
			{ href: "./tasks.html",     label: "Tareas",     kbd: "Alt+3",
				icon: `<path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>` },
			{ href: "./calendar.html",  label: "Calendario", kbd: "Alt+4",
				icon: `<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>` },
		]
	
		connectedCallback() {
			/* ── Nav: pure CSS active state, zero JS needed for positioning ── */
			const navItems = AppHeader.NAV.map((item, i) => `
				<a class="hn-link" href="${item.href}" data-tip="${item.label}" data-kbd="${item.kbd}">
					<svg class="hn-icon" viewBox="0 0 24 24" fill="none"
						stroke="currentColor" stroke-width="1.8"
						stroke-linecap="round" stroke-linejoin="round"
						aria-hidden="true">${item.icon}</svg>
					<span class="hn-label">${item.label}</span>
				</a>`).join("")
	
			const mobileItems = AppHeader.NAV.map(item => `
				<li>
					<a href="${item.href}">
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
							stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"
							aria-hidden="true">${item.icon}</svg>
						<span>${item.label}</span>
					</a>
				</li>`).join("")
	
			this.innerHTML = `
				<div id="appHeader">
					<div class="h-island">
						<div class="h-shimmer-clip" aria-hidden="true"><div class="h-shimmer"></div></div>
						<div class="h-island-content">
	
						<a class="h-logo" href="./dashboard.html" aria-label="TreeCO">
							<img src="./assets/img/favicon/TreeCO.svg" alt="" width="20" height="20" draggable="false"/>
							<span class="h-logo-name">Tree<span>CO</span></span>
						</a>
	
						<div class="h-div" aria-hidden="true"></div>
	
						<nav class="hn" aria-label="Navegación principal">
							${navItems}
						</nav>
	
						<div class="h-div" aria-hidden="true"></div>
	
						<div class="h-right">

							<!-- ── Notification Bell ── -->
							<button class="h-notif-btn" id="hNotifBtn"
								aria-haspopup="true" aria-expanded="false"
								aria-label="Notificaciones">
								<svg class="h-notif-icon" viewBox="0 0 24 24" fill="none"
									stroke="currentColor" stroke-width="1.8"
									stroke-linecap="round" stroke-linejoin="round"
									aria-hidden="true">
									<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
									<path d="M13.73 21a2 2 0 0 1-3.46 0"/>
								</svg>
								<span class="h-notif-badge" id="hNotifBadge" aria-hidden="true"></span>
							</button>

							<!-- ── Notification Panel ── -->
							<div class="h-notif-panel" id="hNotifPanel" role="dialog"
								aria-label="Notificaciones" aria-hidden="true">
								<div class="h-notif-head">
									<span class="h-notif-title">Notificaciones</span>
									<div class="h-notif-actions">
										<button class="h-notif-action-btn" id="hNotifMarkAll" title="Marcar todas como leídas">
											<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="13" height="13" aria-hidden="true"><path d="M20 6 9 17l-5-5"/><path d="m4 12 4 4"/></svg>
										</button>
										<button class="h-notif-action-btn h-notif-clear-btn" id="hNotifClearRead" title="Eliminar leídas">
											<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="13" height="13" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg>
										</button>
									</div>
								</div>
								<div class="h-notif-list" id="hNotifList">
									<div class="h-notif-loading" id="hNotifLoading">
										<div class="h-notif-spinner"></div>
									</div>
								</div>
								<div class="h-notif-foot" id="hNotifFoot" style="display:none">
									<span class="h-notif-foot-txt" id="hNotifFootTxt"></span>
								</div>
							</div>

							<button class="h-chip" id="hChip"
								aria-haspopup="true" aria-expanded="false"
								aria-label="Menú de usuario">
								<div class="h-avatar" aria-hidden="true">
									<svg viewBox="0 0 24 24" fill="currentColor">
										<circle cx="12" cy="8" r="3.5"/>
										<path d="M5 20c0-3.866 3.134-7 7-7s7 3.134 7 7"/>
									</svg>
									<div class="h-avatar-dot"></div>
								</div>
								<span class="h-username" id="hUsername">Usuario</span>
								<svg class="h-caret" viewBox="0 0 24 24" fill="none"
									stroke="currentColor" stroke-width="2.2"
									stroke-linecap="round" stroke-linejoin="round"
									aria-hidden="true">
									<polyline points="6 9 12 15 18 9"/>
								</svg>
							</button>
	
							<div class="h-dropdown" id="hDropdown" role="menu" aria-hidden="true">
								<div class="h-dd-header">
									<div class="h-dd-av" aria-hidden="true">
										<svg viewBox="0 0 24 24" fill="currentColor">
											<circle cx="12" cy="8" r="3.5"/>
											<path d="M5 20c0-3.866 3.134-7 7-7s7 3.134 7 7"/>
										</svg>
									</div>
									<div class="h-dd-info">
										<span class="h-dd-name" id="hDdName">Usuario</span>
										<span class="h-dd-role">Miembro activo</span>
									</div>
								</div>
								<ul class="h-dd-list">
									<li>
										<button class="h-dd-item" id="hOpenProfile" role="menuitem">
											<div class="h-dd-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></div>
											<span class="h-dd-label">Ver perfil<span class="h-dd-sub">Editar información</span></span>
											<kbd class="h-dd-kbd">P</kbd>
										</button>
									</li>
									<li>
										<button class="h-dd-item" role="menuitem">
											<div class="h-dd-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/></svg></div>
											<span class="h-dd-label">Preferencias<span class="h-dd-sub">Tema e idioma</span></span>
										</button>
									</li>
									<li><div class="h-dd-divider" role="separator"></div></li>
									<li class="h-logout-li" id="hLogoutLi">
										<button class="h-dd-item h-dd-logout" id="hLogoutTrigger" role="menuitem">
											<div class="h-dd-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg></div>
											<span class="h-dd-label">Cerrar sesión<span class="h-dd-sub">Salir de tu cuenta</span></span>
										</button>
										<div class="h-logout-bar" id="hLogoutBar" aria-hidden="true">
											<span class="h-logout-txt">¿Salir de <strong>TreeCO</strong>?</span>
											<button class="h-logout-yes" id="hLogoutYes">
												<svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>Sí
											</button>
											<button class="h-logout-no" id="hLogoutNo" aria-label="Cancelar">
												<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
											</button>
										</div>
									</li>
								</ul>
							</div>
	
							<button class="h-burger" id="hBurger" aria-label="Abrir menú" aria-expanded="false">
								<span></span><span></span><span></span>
							</button>
						</div>
						</div><!-- /.h-island-content -->
					</div>
				</div>
	
				<div class="h-mobile-nav" id="hMobileNav" aria-hidden="true">
					<ul class="h-mobile-links">${mobileItems}</ul>
					<div class="h-mobile-footer">
						<span class="h-mobile-username" id="hMobileUser"></span>
						<button class="h-mobile-logout" id="hMobileLogout">
							<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="13" height="13" aria-hidden="true"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
							Salir
						</button>
					</div>
				</div>
			`
	
			this._header = this.querySelector("#appHeader")

			// Fire entry animation on first load
			const _h = this._header
			if (_h) {
				_h.classList.add("h-showing")
				setTimeout(() => _h.classList.remove("h-showing"), 900)
			}

			this._initSession()
			this._setActive()
			this._initHoverReveal()
			this._initChip()
			this._initLogout()
			this._initBurger()
			this._initProfile()
			this._initNotifications()
			this._initShortcuts()
		}
	
		/* ── Session ─────────────────────────────────────────────── */
		_initSession() {
			const raw = localStorage.getItem("treeco_user")
			if (!raw) { location.replace("index.html"); return }
			let user
			try { user = JSON.parse(raw) } catch {
				localStorage.removeItem("treeco_user"); location.replace("index.html"); return
			}
			const name = user?.username ?? ""
			;["hUsername","hDdName","hMobileUser"].forEach(id => {
				const el = this.querySelector(`#${id}`)
				if (el) el.textContent = name
			})
			this._username = name
			this._doLogout = () => { localStorage.removeItem("treeco_user"); location.replace("index.html") }
			this.querySelector("#hMobileLogout")?.addEventListener("click", this._doLogout)
		}
	
		/* ── Active link — pure CSS, just add class ──────────────── */
		_setActive() {
			const page = location.pathname.split("/").pop() || "dashboard.html"
			this.querySelectorAll(".hn-link, .h-mobile-links a").forEach(a => {
				a.classList.toggle("active", a.getAttribute("href")?.endsWith(page) ?? false)
			})
		}
	
		/* ── Hover reveal ────────────────────────────────────────── */
		_initHoverReveal() {
			const header = this._header
			if (!header) return

			// On touch devices: header is always static — no hide/show logic at all
			if ("ontouchstart" in window || navigator.maxTouchPoints > 0) return
	
			// ╔══════════════════════════════════════════════════════╗
			// ║  TUNING                                              ║
			const SHOW_Y        = 40   // px from top to reveal
			const HIDE_DELAY_MS = 300   // ms before hiding
			// ╚══════════════════════════════════════════════════════╝
	
			// Hover hint — line + label pill
			const hint = document.createElement("div")
			hint.className = "h-hover-hint"
			document.body.appendChild(hint)
			this._hoverHint = hint

			// Label pill below the line
			const label = document.createElement("div")
			label.className = "h-hover-label"
			label.innerHTML = `
				<span class="h-hover-label-dot"></span>
				<span class="h-hover-label-text"><span>TreeCO</span> — menú</span>
				<span class="h-hover-label-chevron">
					<svg width="10" height="10" viewBox="0 0 12 12" fill="none">
						<path d="M2 4l4 4 4-4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
					</svg>
				</span>`
			document.body.appendChild(label)
			this._hoverLabel = label
	
			let hidden = false, timer = null, hintTimer = null
	
			// Returns true when the header should stay visible no matter what:
			// • a header-owned panel is open (dropdown / mobile nav / profile)
			// • focus is inside an interactive element outside the header
			//   (date pickers, selects, inputs, custom popovers…)
			const isOpen = () => {
				if (
					this.querySelector("#hChip")?.getAttribute("aria-expanded") === "true" ||
					this.querySelector("#hMobileNav")?.classList.contains("open") ||
					!!document.querySelector(".h-profile-panel.open")
				) return true

				// Keep header visible when any interactive element on the page has focus
				// (catches date-picker inputs, selects, custom popover triggers, etc.)
				const focused = document.activeElement
				if (focused && focused !== document.body) {
					const tag = focused.tagName
					if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA" || tag === "BUTTON") return true
					// Custom components with role="dialog", "listbox", "combobox"…
					const role = focused.getAttribute("role") ?? ""
					if (role === "dialog" || role === "listbox" || role === "combobox" || role === "option") return true
				}

				// Keep visible when any popover/dialog/listbox is open anywhere on the page
				// (covers third-party date pickers that render outside the header)
				if (
					document.querySelector('[aria-expanded="true"]:not(#hChip)') ||
					document.querySelector('[role="dialog"]:not(.h-profile-panel):not([aria-hidden="true"])') ||
					document.querySelector('[role="listbox"]:not([aria-hidden="true"])') ||
					document.querySelector('[role="combobox"][aria-expanded="true"]')
				) return true

				return false
			}
	
			let showAnimTimer = null
	
			// Trigger a one-shot pulse on the hint line
			const pulseHint = (cls) => {
				hint.classList.remove("h-hint-release", "h-hint-absorb")
				void hint.offsetWidth // reflow to restart animation
				hint.classList.add(cls)
				setTimeout(() => hint.classList.remove(cls), 600)
			}
	
			const show = () => {
				clearTimeout(timer)
				clearTimeout(hintTimer)
				clearTimeout(showAnimTimer)
				if (!hidden) return
				hidden = false
	
				// Hint line pulses outward as if releasing the header
				pulseHint("h-hint-release")
				hint.classList.remove("h-hint-visible")
				label.classList.remove("h-hint-visible")
				label.classList.add("h-hint-hiding")
				setTimeout(() => label.classList.remove("h-hint-hiding"), 260)
	
				// Remove exit states, add entry animation
				header.classList.remove("h-hidden", "h-hiding")
				header.classList.add("h-showing")
	
				// Retrigger shimmer
				const shimmer = this.querySelector(".h-shimmer")
				if (shimmer) {
					shimmer.style.animation = "none"
					shimmer.offsetWidth
					shimmer.style.animation = ""
				}
	
				showAnimTimer = setTimeout(() => header.classList.remove("h-showing"), 700)
			}
	
			const scheduleHide = () => {
				clearTimeout(timer)
				timer = setTimeout(() => {
					if (isOpen()) return
					hidden = true
	
					header.classList.remove("h-showing")
					header.classList.add("h-hiding")
	
					setTimeout(() => {
						header.classList.remove("h-hiding")
						header.classList.add("h-hidden")
						// Hint line pulses inward as if absorbing the header
						pulseHint("h-hint-absorb")
						hintTimer = setTimeout(() => {
						hint.classList.add("h-hint-visible")
						label.classList.remove("h-hint-hiding")
						label.classList.add("h-hint-visible")
					}, 200)
					}, 460) // match islandExit duration
				}, HIDE_DELAY_MS)
			}
	
			document.addEventListener("mousemove", (e) => {
				if (isOpen()) { clearTimeout(timer); show(); return }
				e.clientY <= SHOW_Y ? show() : (!hidden && scheduleHide())
			}, { passive: true })
	
			header.addEventListener("mouseenter", () => { clearTimeout(timer); show() })
			header.addEventListener("mouseleave", (e) => {
				if (e.clientY > SHOW_Y && !isOpen()) scheduleHide()
			})

			// Keep header visible whenever the user focuses any interactive element
			// (date pickers, selects, custom dropdowns, etc.)
			document.addEventListener("focusin", () => {
				if (isOpen()) { clearTimeout(timer); if (hidden) show() }
			}, { passive: true })

			document.addEventListener("focusout", () => {
				// Small delay so focus can move to a related element (e.g. picker day cells)
				setTimeout(() => {
					if (!isOpen() && !hidden) scheduleHide()
				}, 150)
			}, { passive: true })

			// Watch for dynamically added picker portals / aria attribute changes
			const _mo = new MutationObserver(() => {
				if (isOpen()) { clearTimeout(timer); if (hidden) show() }
			})
			_mo.observe(document.body, {
				childList: true,
				subtree: false,
				attributeFilter: ["aria-expanded", "aria-hidden"]
			})
			this._revealObserver = _mo
		}
	
		/* ── Chip — click anchored ───────────────────────────────── */
		_initChip() {
			const chip = this.querySelector("#hChip")
			const dd   = this.querySelector("#hDropdown")
			if (!chip || !dd) return
	
			let open = false
			const openFn  = () => {
				open = true
				chip.setAttribute("aria-expanded","true")
				chip.classList.add("open")
				dd.setAttribute("aria-hidden","false")
				dd.classList.add("open")
				this._closeNotif?.()   // close notification panel if open
			}
			const closeFn = () => { open = false; chip.setAttribute("aria-expanded","false"); chip.classList.remove("open"); dd.setAttribute("aria-hidden","true");  dd.classList.remove("open") }
	
			chip.addEventListener("click", (e) => { e.stopPropagation(); open ? closeFn() : openFn() })
			dd.addEventListener("click", (e) => e.stopPropagation())
			document.addEventListener("click", () => { if (open) closeFn() })
			document.addEventListener("keydown", (e) => { if (e.key === "Escape" && open) { closeFn(); chip.focus() } })
			chip.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open ? closeFn() : openFn() } })
	
			this._closeChip = closeFn
		}
	
		/* ── Logout ──────────────────────────────────────────────── */
		_initLogout() {
			const trigger = this.querySelector("#hLogoutTrigger")
			const bar     = this.querySelector("#hLogoutBar")
			const yes     = this.querySelector("#hLogoutYes")
			const no      = this.querySelector("#hLogoutNo")
			const li      = this.querySelector("#hLogoutLi")
			if (!trigger || !bar || !li) return
			let t = null
			const showBar = () => { clearTimeout(t); li.classList.add("confirming"); bar.classList.add("visible"); bar.setAttribute("aria-hidden","false"); yes?.focus(); t = setTimeout(hideBar, 6000) }
			const hideBar = () => { clearTimeout(t); li.classList.remove("confirming"); bar.classList.remove("visible"); bar.setAttribute("aria-hidden","true") }
			trigger.addEventListener("click", showBar)
			yes?.addEventListener("click", () => { hideBar(); setTimeout(() => this._doLogout?.(), 120) })
			no?.addEventListener("click",  () => { hideBar(); trigger.focus() })
			bar?.addEventListener("keydown", (e) => { if (e.key === "Escape") { hideBar(); trigger.focus() } })
		}
	
		/* ── Burger ──────────────────────────────────────────────── */
		_initBurger() {
			const btn = this.querySelector("#hBurger")
			const nav = this.querySelector("#hMobileNav")
			if (!btn || !nav) return
			const close = () => { nav.classList.remove("open"); btn.classList.remove("open"); btn.setAttribute("aria-expanded","false"); nav.setAttribute("aria-hidden","true") }
			btn.addEventListener("click", () => { const o = nav.classList.toggle("open"); btn.classList.toggle("open",o); btn.setAttribute("aria-expanded",String(o)); nav.setAttribute("aria-hidden",String(!o)) })
			document.addEventListener("keydown", (e) => { if (e.key === "Escape") close() })
			nav.querySelectorAll("a").forEach(a => a.addEventListener("click", close))
		}
	
		/* ── Profile panel ───────────────────────────────────────── */
		_initProfile() {
			const overlay = document.createElement("div")
			overlay.className = "h-profile-overlay"
			overlay.setAttribute("aria-hidden","true")
	
			const panel = document.createElement("div")
			panel.className = "h-profile-panel"
			panel.setAttribute("role","dialog")
			panel.setAttribute("aria-modal","true")
			panel.setAttribute("tabindex","-1")
			panel.innerHTML = `
				<div class="h-pp-head">
					<button class="h-pp-close" id="hPpClose" aria-label="Cerrar">
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
					</button>
				</div>
				<div class="h-pp-hero">
					<div class="h-pp-avatar">
						<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="12" cy="8" r="3.5"/><path d="M5 20c0-3.866 3.134-7 7-7s7 3.134 7 7"/></svg>
						<div class="h-pp-online" aria-hidden="true"></div>
					</div>
					<div class="h-pp-name" id="hPpName">Usuario</div>
					<div class="h-pp-badge"><div class="h-pp-badge-dot" aria-hidden="true"></div>Activo</div>
				</div>
				<div class="h-pp-stats">
					<div class="h-pp-stat"><span class="h-pp-stat-v">12</span><span class="h-pp-stat-l">Proyectos</span></div>
					<div class="h-pp-stat"><span class="h-pp-stat-v">48</span><span class="h-pp-stat-l">Tareas</span></div>
					<div class="h-pp-stat"><span class="h-pp-stat-v">3</span><span class="h-pp-stat-l">Equipos</span></div>
				</div>
				<div class="h-pp-body">
					<div class="h-pp-section">
						<ul class="h-pp-list">
							<li><button class="h-pp-btn"><div class="h-pp-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></div><span class="h-pp-label">Editar perfil<span class="h-pp-desc">Nombre y foto</span></span><svg class="h-pp-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><polyline points="9 18 15 12 9 6"/></svg></button></li>
							<li><button class="h-pp-btn"><div class="h-pp-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg></div><span class="h-pp-label">Seguridad<span class="h-pp-desc">Contraseña y acceso</span></span><svg class="h-pp-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><polyline points="9 18 15 12 9 6"/></svg></button></li>
							<li><button class="h-pp-btn"><div class="h-pp-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/></svg></div><span class="h-pp-label">Preferencias<span class="h-pp-desc">Tema, idioma</span></span><svg class="h-pp-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><polyline points="9 18 15 12 9 6"/></svg></button></li>
						</ul>
					</div>
				</div>
				<div class="h-pp-foot">
					<button class="h-pp-logout-btn" id="hPpLogout">
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" width="14" height="14" aria-hidden="true"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
						Cerrar sesión
					</button>
				</div>`
	
			document.body.appendChild(overlay)
			document.body.appendChild(panel)
	
			let lastFocus = null
			const open = () => {
				this._closeChip?.(); lastFocus = document.activeElement
				panel.querySelector("#hPpName").textContent = this._username ?? "Usuario"
				overlay.classList.remove("closing"); panel.classList.remove("closing")
				overlay.classList.add("open");       panel.classList.add("open")
				overlay.setAttribute("aria-hidden","false")
				setTimeout(() => panel.focus(), 50)
			}
			const close = () => {
				overlay.classList.remove("open"); panel.classList.remove("open")
				overlay.classList.add("closing"); panel.classList.add("closing")
				const done = () => { overlay.classList.remove("closing"); panel.classList.remove("closing"); overlay.setAttribute("aria-hidden","true"); lastFocus?.focus() }
				panel.addEventListener("animationend", done, { once: true })
				setTimeout(done, 300)
			}
			panel.addEventListener("keydown", (e) => {
				if (e.key === "Escape") { close(); return }
				if (e.key !== "Tab") return
				const els = [...panel.querySelectorAll("button,[href],[tabindex]")].filter(x => !x.disabled)
				const first = els[0], last = els[els.length-1]
				if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
				else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
			})
			this.querySelector("#hOpenProfile")?.addEventListener("click", open)
			panel.querySelector("#hPpClose")?.addEventListener("click", close)
			overlay.addEventListener("click", close)
			panel.querySelector("#hPpLogout")?.addEventListener("click", () => { close(); setTimeout(() => this._doLogout?.(), 260) })
			this._openProfile = open; this._profilePanel = panel; this._profileOverlay = overlay
		}
	
		/* ── Notifications ───────────────────────────────────────── */
		_initNotifications() {
			const btn    = this.querySelector("#hNotifBtn")
			const panel  = this.querySelector("#hNotifPanel")
			const badge  = this.querySelector("#hNotifBadge")
			const list   = this.querySelector("#hNotifList")
			const loading = this.querySelector("#hNotifLoading")
			const foot   = this.querySelector("#hNotifFoot")
			const footTxt = this.querySelector("#hNotifFootTxt")
			const markAllBtn   = this.querySelector("#hNotifMarkAll")
			const clearReadBtn = this.querySelector("#hNotifClearRead")
			if (!btn || !panel) return

			// ── API helpers (mirrors notificationsApi in api.js) ──
			const BASE = "http://localhost:8080"
			const uid  = () => {
				try {
					const u = JSON.parse(localStorage.getItem("treeco_user") ?? "{}")
					return u?.userId ?? u?.id ?? null
				} catch { return null }
			}
			const apiFetch = (path, opts = {}) =>
				fetch(`${BASE}${path}`, { headers: { "Content-Type": "application/json" }, ...opts })
					.then(r => r.json()).catch(() => null)

			const apiGet    = path             => apiFetch(path)
			const apiPatch  = (path, body)     => apiFetch(path, { method: "PATCH",  body: body !== undefined ? JSON.stringify(body) : undefined })
			const apiDelete = path             => apiFetch(path, { method: "DELETE" })

			// ── State ─────────────────────────────────────────────
			let open = false
			let notifications = []
			let pollTimer = null
			const POLL_INTERVAL = 60_000  // 1 min

			// ── Badge ─────────────────────────────────────────────
			const setBadge = (count) => {
				if (count > 0) {
					badge.textContent = count > 99 ? "99+" : String(count)
					badge.classList.add("visible")
					btn.classList.add("has-notif")
				} else {
					badge.classList.remove("visible")
					btn.classList.remove("has-notif")
				}
			}

			// ── Icon type map ─────────────────────────────────────
			const NOTIF_META = {
				TASK_ASSIGNED:   { color: "#3ddc84", icon: `<path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>` },
				TASK_COMPLETED:  { color: "#3ddc84", icon: `<polyline points="20 6 9 17 4 12"/>` },
				TASK_DEADLINE:   { color: "#f59e0b", icon: `<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>` },
				TASK_OVERDUE:    { color: "#ef4444", icon: `<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>` },
				PROJECT_CREATED: { color: "#6366f1", icon: `<path d="M3 7a2 2 0 0 1 2-2h3.5l2 2H19a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>` },
				PROJECT_UPDATED: { color: "#6366f1", icon: `<path d="M3 7a2 2 0 0 1 2-2h3.5l2 2H19a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="m14 10-4 4"/><path d="m14 14-4-4"/>` },
				MEMBER_ADDED:    { color: "#06b6d4", icon: `<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/>` },
				MEMBER_REMOVED:  { color: "#ef4444", icon: `<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="22" y1="11" x2="16" y2="11"/>` },
				SYSTEM:          { color: "rgba(255,255,255,.45)", icon: `<circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/>` },
			}
			const getMeta = type => NOTIF_META[type] ?? NOTIF_META["SYSTEM"]

			// ── Relative time ─────────────────────────────────────
			const relativeTime = (iso) => {
				const diff = Date.now() - new Date(iso).getTime()
				const m = Math.floor(diff / 60000)
				if (m < 1)  return "ahora"
				if (m < 60) return `hace ${m}m`
				const h = Math.floor(m / 60)
				if (h < 24) return `hace ${h}h`
				const d = Math.floor(h / 24)
				if (d < 7)  return `hace ${d}d`
				return new Date(iso).toLocaleDateString("es-ES", { day:"2-digit", month:"short" })
			}

			// ── Render list ───────────────────────────────────────
			const renderList = () => {
				loading?.remove()

				// Unread count footer
				const unread = notifications.filter(n => !n.read).length
				if (unread > 0) {
					foot.style.display = "flex"
					footTxt.textContent = `${unread} sin leer`
				} else {
					foot.style.display = "none"
				}

				// Clear and rebuild
				list.innerHTML = ""

				if (notifications.length === 0) {
					list.innerHTML = `
						<div class="h-notif-empty">
							<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" width="32" height="32" aria-hidden="true"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
							<span>Sin notificaciones</span>
						</div>`
					return
				}

				notifications.forEach(n => {
					const meta = getMeta(n.type)
					const item = document.createElement("div")
					item.className = `h-notif-item${n.read ? " read" : ""}`
					item.dataset.id = n.id
					item.innerHTML = `
						<div class="h-notif-item-icon" style="--nc:${meta.color}">
							<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${meta.icon}</svg>
						</div>
						<div class="h-notif-item-body">
							<div class="h-notif-item-title">${n.title}</div>
							<div class="h-notif-item-msg">${n.message}</div>
							<div class="h-notif-item-time">${relativeTime(n.createdAt)}</div>
						</div>
						<div class="h-notif-item-actions">
							${!n.read ? `<button class="h-ni-read-btn" data-id="${n.id}" title="Marcar leída" aria-label="Marcar como leída">
								<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" width="10" height="10"><polyline points="20 6 9 17 4 12"/></svg>
							</button>` : ""}
							<button class="h-ni-del-btn" data-id="${n.id}" title="Eliminar" aria-label="Eliminar notificación">
								<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" width="10" height="10"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
							</button>
						</div>
						${n.actionUrl ? `<a class="h-notif-item-link" href="${n.actionUrl}" tabindex="-1" aria-hidden="true"></a>` : ""}
					`
					// Mark as read on click (if unread and has actionUrl)
					if (!n.read) {
						item.addEventListener("click", async (e) => {
							if (e.target.closest(".h-ni-read-btn, .h-ni-del-btn")) return
							await doMarkRead(n.id)
							if (n.actionUrl) location.href = n.actionUrl
						})
					}
					list.appendChild(item)
				})

				// Read buttons
				list.querySelectorAll(".h-ni-read-btn").forEach(b => {
					b.addEventListener("click", async (e) => {
						e.stopPropagation()
						await doMarkRead(Number(b.dataset.id))
					})
				})
				// Delete buttons
				list.querySelectorAll(".h-ni-del-btn").forEach(b => {
					b.addEventListener("click", async (e) => {
						e.stopPropagation()
						await doDelete(Number(b.dataset.id))
					})
				})
			}

			// ── API actions ───────────────────────────────────────
			const doMarkRead = async (id) => {
				const userId = uid(); if (!userId) return
				await apiPatch(`/api/users/${userId}/notifications/${id}/read`)
				const n = notifications.find(x => x.id === id)
				if (n) { n.read = true; n.readAt = new Date().toISOString() }
				renderList()
				setBadge(notifications.filter(x => !x.read).length)
			}

			const doDelete = async (id) => {
				const userId = uid(); if (!userId) return
				const item = list.querySelector(`[data-id="${id}"]`)
				item?.classList.add("h-notif-item-removing")
				await new Promise(r => setTimeout(r, 250))
				await apiDelete(`/api/users/${userId}/notifications/${id}`)
				notifications = notifications.filter(x => x.id !== id)
				renderList()
				setBadge(notifications.filter(x => !x.read).length)
			}

			const doMarkAll = async () => {
				const userId = uid(); if (!userId) return
				markAllBtn.disabled = true
				await apiPatch(`/api/users/${userId}/notifications/read-all`)
				notifications.forEach(n => { n.read = true })
				renderList(); setBadge(0)
				markAllBtn.disabled = false
			}

			const doClearRead = async () => {
				const userId = uid(); if (!userId) return
				clearReadBtn.disabled = true
				await apiDelete(`/api/users/${userId}/notifications/read`)
				notifications = notifications.filter(n => !n.read)
				renderList(); setBadge(notifications.filter(n => !n.read).length)
				clearReadBtn.disabled = false
			}

			// ── Fetch notifications ───────────────────────────────
			const fetchNotifications = async () => {
				const userId = uid(); if (!userId) return
				const data = await apiGet(`/api/users/${userId}/notifications`)
				if (Array.isArray(data)) {
					notifications = data
					setBadge(notifications.filter(n => !n.read).length)
					if (open) renderList()
				}
			}

			// Poll badge count silently (cheap endpoint)
			const pollCount = async () => {
				const userId = uid(); if (!userId) return
				const data = await apiGet(`/api/users/${userId}/notifications/count`)
				if (data?.unread !== undefined) setBadge(data.unread)
			}

			// ── Open / close ──────────────────────────────────────

			// Grab the original _closeChip BEFORE we overwrite it below,
			// so openPanel can close the user dropdown without triggering
			// the patched version that would immediately close this panel.
			const closeChipOnly = () => this._origCloseChip?.()

			const openPanel = async () => {
				open = true
				btn.setAttribute("aria-expanded", "true")
				btn.classList.add("open")
				panel.setAttribute("aria-hidden", "false")
				panel.classList.add("open")
				closeChipOnly()   // close user dropdown WITHOUT closing this panel

				// Show loading state then fetch
				list.innerHTML = `<div class="h-notif-loading"><div class="h-notif-spinner"></div></div>`
				await fetchNotifications()
				renderList()
			}

			const closePanel = () => {
				open = false
				btn.setAttribute("aria-expanded", "false")
				btn.classList.remove("open")
				panel.setAttribute("aria-hidden", "true")
				panel.classList.remove("open")
			}

			// ── Event wiring ──────────────────────────────────────
			btn.addEventListener("click", (e) => {
				e.stopPropagation()
				open ? closePanel() : openPanel()
			})
			panel.addEventListener("click", (e) => e.stopPropagation())
			document.addEventListener("click", () => { if (open) closePanel() })
			document.addEventListener("keydown", (e) => { if (e.key === "Escape" && open) { closePanel(); btn.focus() } })
			markAllBtn?.addEventListener("click", doMarkAll)
			clearReadBtn?.addEventListener("click", doClearRead)

			// Expose closePanel so other panels can close this one
			this._closeNotif = closePanel

			// Save original _closeChip, then patch it to also close this panel.
			// openPanel uses closeChipOnly (captured above) to avoid the loop.
			this._origCloseChip = this._closeChip
			this._closeChip = () => { this._origCloseChip?.(); closePanel() }

			// ── Initial count poll + recurring poll ───────────────
			pollCount()
			pollTimer = setInterval(pollCount, POLL_INTERVAL)
			this._notifPollTimer = pollTimer
		}

		/* ── Shortcuts ───────────────────────────────────────────── */
		_initShortcuts() {
			document.addEventListener("keydown", (e) => {
				if (e.altKey && !e.metaKey && !e.ctrlKey) {
					const idx = parseInt(e.key, 10) - 1
					if (idx >= 0 && idx < AppHeader.NAV.length) { e.preventDefault(); location.href = AppHeader.NAV[idx].href }
				}
				if ((e.key === "p" || e.key === "P") && !e.ctrlKey && !e.metaKey && !e.altKey) {
					const tag = document.activeElement?.tagName ?? ""
					if (tag !== "INPUT" && tag !== "TEXTAREA" && tag !== "SELECT") this._openProfile?.()
				}
			})
		}
	
		disconnectedCallback() {
			this._profilePanel?.remove()
			this._profileOverlay?.remove()
			this._hoverHint?.remove()
			this._hoverLabel?.remove()
			this._revealObserver?.disconnect()
			if (this._notifPollTimer) clearInterval(this._notifPollTimer)
		}
	}
	
	customElements.define("header-component", AppHeader)