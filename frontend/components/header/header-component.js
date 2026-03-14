class AppHeader extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
      <header>
        <a class="logo" href="./dashboard.html">
          <img src="./assets/img/favicon/TreeCO.svg" alt="TreeCO logo" class="logo-img" width="40" height="40" draggable="false" />
          <span class="logo-name">Tree<span>CO</span></span>
        </a>

        <nav class="navegator">
          <a class="link" href="./dashboard.html"><span class="icono">⬡</span> Dashboard</a>
          <a class="link" href="./projects.html"><span class="icono">⚐</span> Proyectos</a>
          <a class="link" href="./tasks.html"><span class="icono">✓</span> Tareas</a>
          <a class="link" href="./calendar.html"><span class="icono">◷</span> Calendario</a>
        </nav>

        <div class="user">
          <div class="user-logo">
            <svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" fill="#000000">
              <path d="m 8 1 c -1.65625 0 -3 1.34375 -3 3 s 1.34375 3 3 3 s 3 -1.34375 3 -3 s -1.34375 -3 -3 -3 z m -1.5 7 c -2.492188 0 -4.5 2.007812 -4.5 4.5 v 0.5 c 0 1.109375 0.890625 2 2 2 h 8 c 1.109375 0 2 -0.890625 2 -2 v -0.5 c 0 -2.492188 -2.007812 -4.5 -4.5 -4.5 z m 0 0" fill="#ffff" />
            </svg>
          </div>
          <div class="username">
            <h2 id="username">Username</h2>
            <button id="logout">Cerrar sesión</button>
          </div>
        </div>
      </header>
    `

    this._initSession()
    this._setActiveLink()
  }

  _initSession() {
    const KEY_SESSION = "treeco_user"
    const sesionRaw = localStorage.getItem(KEY_SESSION)

    if (!sesionRaw) {
      location.replace("index.html")
      return
    }

    let usuario
    try {
      usuario = JSON.parse(sesionRaw)
    } catch {
      localStorage.removeItem(KEY_SESSION)
      location.replace("index.html")
      return
    }

    const display = this.querySelector("#username")
    if (display && usuario?.username) {
      display.textContent = usuario.username
    }

    const btnLogout = this.querySelector("#logout")
    if (btnLogout) {
      btnLogout.addEventListener("click", (e) => {
        e.preventDefault()
        localStorage.removeItem(KEY_SESSION)
        location.replace("index.html")
      })
    }
  }

  _setActiveLink() {
    const currentPath = globalThis.location.pathname
    const navLinks = this.querySelectorAll("nav.navegator a")
    navLinks.forEach((link) => {
      link.classList.remove("link-active")
      if (link.getAttribute("href").endsWith(currentPath.split("/").pop())) {
        link.classList.add("link-active")
      }
    })
  }
}

customElements.define("header-component", AppHeader)