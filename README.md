
# 🌱 TreeCO

<div align="center">

![status](https://img.shields.io/badge/status-active-success?style=for-the-badge)
![backend](https://img.shields.io/badge/backend-Spring_Boot_3-6DB33F?style=for-the-badge&logo=springboot)
![frontend](https://img.shields.io/badge/frontend-JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![database](https://img.shields.io/badge/database-PostgreSQL-4169E1?style=for-the-badge&logo=postgresql)
![deploy](https://img.shields.io/badge/deploy-Render_+_Vercel-000000?style=for-the-badge&logo=vercel)
![license](https://img.shields.io/badge/license-MIT-blue?style=for-the-badge)

</div>

> Aplicación full-stack para gestión de tareas y productividad, desarrollada como proyecto profesional orientado a DAW / portfolio.

---

## 📌 Descripción

**TreeCO** es una aplicación web que permite organizar tareas y proyectos de forma eficiente mediante una interfaz moderna y una API robusta.

El proyecto sigue una arquitectura desacoplada:
- Backend REST con Spring Boot
- Frontend en JavaScript puro
- Base de datos PostgreSQL
- Deploy en la nube

## 🚀 Features

- 🔐 Autenticación con JWT
- 📧 Verificación por email
- 📋 CRUD de tareas
- 📁 Gestión por proyectos
- ⏱️ Cálculo de tiempo restante
- 🎯 Filtros dinámicos
- 🎨 UI moderna (glassmorphism)

---

## 🏗️ Arquitectura

```
Frontend (Vercel)
   ↓
Backend API (Spring Boot - Render)
   ↓
PostgreSQL
```

---

## ⚙️ Instalación

### Backend

```bash
cd backend
./mvnw spring-boot:run
```

### Variables de entorno

```
DB_URL=
DB_USER=
DB_PASS=
MAIL_USER=
MAIL_PASS=
```

---

## 📸 Screenshots

### Calendario
![Calendario](https://i.imgur.com/KvT8SQ4.png)

### Tareas
![Tareas](https://i.imgur.com/KPT9Skq.png)
![Tareas](https://i.imgur.com/Pxst5Ji.png)

### Proyectos
![Proyectos](https://i.imgur.com/sRq8rmv.png)

### Auth
![Auth](https://i.imgur.com/IoOh4zO.png)

---

## 🛠️ Stack

Backend:
- Java 21
- Spring Boot
- Hibernate
- PostgreSQL

Frontend:
- HTML
- CSS
- JS

---

## 👨‍💻 Autor

Raúl – Victor
