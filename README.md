# 🚀 TreeCO – Gestor Profesional de Proyectos y Tareas

**TreeCO** es una aplicación de escritorio desarrollada en **Java** que permite a los usuarios organizar su flujo de trabajo mediante la gestión de proyectos y tareas. Este proyecto ha sido desarrollado como parte del aprendizaje en el primer año de **DAW (Desarrollo de Aplicaciones Web)**, enfocándose en la aplicación de la Programación Orientada a Objetos (POO) y el diseño de interfaces modernas.

---

## 🎯 Objetivos del Proyecto

El objetivo principal es demostrar solidez en los fundamentos de desarrollo de software, incluyendo:

- **Arquitectura en capas:** Separación clara entre Modelo, Vista, Controlador y Servicios.
- **Interfaz Gráfica (GUI):** Implementación con **JavaFX**.
- **Gestión de Datos:** Persistencia de información mediante archivos (Serialización/JSON).
- **Lógica de Negocio:** Control de estados, prioridades, fechas límite y cálculo de progreso.

---

## ✨ Funcionalidades Principales

### 👤 Gestión de Usuarios

- Sistema de **Login y Registro**.
- Espacio de trabajo personalizado (cada usuario gestiona sus propios proyectos).

### 📂 Gestión de Proyectos

- Creación, edición y eliminación de proyectos.
- **Cálculo automático de progreso** basado en las tareas completadas.
- Visualización de estadísticas rápidas por proyecto.

### 📝 Gestión de Tareas

- Atributos detallados: Título, descripción, prioridad (Baja, Media, Alta) y estado (Pendiente, En Progreso, Completada).
- **Control de fechas:** Fecha de creación y fecha límite.
- **Alertas visuales:** Identificación automática de tareas vencidas.
- Filtros avanzados por estado y prioridad.

---

## 🛠️ Stack Tecnológico

- **Lenguaje:** Java 17
- **Interfaz Gráfica:** JavaFX
- **Persistencia:** Gestión de archivos (File I/O)
- **Entorno de Desarrollo:** VS Code / Cursor
- **Arquitectura:** Modelo-Vista-Controlador (MVC)

---

## 🏗️ Estructura del Proyecto

```text
src/
├── model/       # Clases de dominio (Usuario, Proyecto, Tarea, Enums)
├── service/     # Lógica de negocio y gestión de datos
├── controller/  # Controladores de la interfaz JavaFX
├── view/        # Archivos FXML y estilos CSS
└── Main.java    # Punto de entrada de la aplicación
```
