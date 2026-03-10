// dashboard.js

// Constante con el usuario registrado
const user = JSON.parse(localStorage.getItem("treeco_user"))

// Comprueba que no estes en dashnboard sin iniciar sesion
if (!user) {
  globalThis.location.href = "../index.html"
}

// Guarda el nombre del usuario registrado en el id "username"
const username = document.getElementById("username")
if (username) {
  username.textContent = user.username
}

// Hace que los elemntos con el id "logout" cierren la sesion del usuario
const logout = document.getElementById("logout")
logout.addEventListener("click", () => {
  localStorage.removeItem("treeco_user")
  globalThis.location.href = "../index.html"
})

// Cambia la clase de los enlaces del nav
const listaEnlaces = document.getElementsByClassName("enlace")

for (const enlace of listaEnlaces) {
  enlace.addEventListener("click", () => {
    for (const e of listaEnlaces) {
      e.classList.remove("enlace-activo")
    }
    enlace.classList.add("enlace-activo")
  })
}

// Task pendientes

