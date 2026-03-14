// scripts/pages/projects.js
// ═══════════════════════════════════════════
//  Config
// ═══════════════════════════════════════════

const API_BASE = "http://localhost:8080"
const KEY_SESSION = "treeco_user"

// ═══════════════════════════════════════════
//  Sesión
// ═══════════════════════════════════════════

function getUser() {
  try {
    const raw = localStorage.getItem(KEY_SESSION)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function requireAuth() {
  if (!getUser()) location.replace("index.html")
}

// ═══════════════════════════════════════════
//  Estado local
// ═══════════════════════════════════════════

let projects = []
let currentProjectId = null
let editingProjectId = null
let editingTaskId = null
let currentTasks = []
let activeFilter = "all"

// ═══════════════════════════════════════════
//  API — helpers
// ═══════════════════════════════════════════

async function apiFetch(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...options.headers },
    ...options,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || `Error ${res.status}`)
  return data
}

async function apiGetProjects(userId) {
  return apiFetch(`/projects?userId=${userId}`)
}

async function apiCreateProject(userId, name, description) {
  return apiFetch("/projects", {
    method: "POST",
    body: JSON.stringify({ userId, name, description }),
  })
}

async function apiUpdateProject(id, name, description) {
  return apiFetch(`/projects/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ name, description }),
  })
}

async function apiDeleteProject(id) {
  return apiFetch(`/projects/${id}`, { method: "DELETE" })
}

async function apiGetTasks(projectId) {
  return apiFetch(`/projects/${projectId}/tasks`)
}

async function apiCreateTask(projectId, { title, description, priority, dateDeadline }) {
  return apiFetch(`/projects/${projectId}/tasks`, {
    method: "POST",
    body: JSON.stringify({ title, description, priority, dateDeadline: dateDeadline || null }),
  })
}

async function apiUpdateTask(projectId, taskId, fields) {
  return apiFetch(`/projects/${projectId}/tasks/${taskId}`, {
    method: "PATCH",
    body: JSON.stringify(fields),
  })
}

async function apiDeleteTask(projectId, taskId) {
  return apiFetch(`/projects/${projectId}/tasks/${taskId}`, { method: "DELETE" })
}

// ═══════════════════════════════════════════
//  Lógica de estado de tarea
// ═══════════════════════════════════════════

function getTaskState(task) {
  if (task.completed) return "COMPLETED"
  if (task.dateDeadline && new Date() > new Date(task.dateDeadline + "T23:59:59")) return "EXPIRED"
  return "IN_PROGRESS"
}

function calcProgress(tasks) {
  if (!tasks.length) return { progress: 0, completed: 0, inProgress: 0, expired: 0 }
  let completed = 0, expired = 0
  tasks.forEach((t) => {
    const s = getTaskState(t)
    if (s === "COMPLETED") completed++
    else if (s === "EXPIRED") expired++
  })
  return {
    progress: Math.round((completed * 100) / tasks.length),
    completed,
    inProgress: tasks.length - completed - expired,
    expired,
  }
}

// ═══════════════════════════════════════════
//  UI helpers
// ═══════════════════════════════════════════

function setLoading(el, loading) {
  if (loading) {
    el.disabled = true
    el.dataset.original = el.textContent
    el.textContent = "…"
  } else {
    el.disabled = false
    el.textContent = el.dataset.original || ""
  }
}

function showError(id, msg) {
  const el = document.getElementById(id)
  el.textContent = msg
  el.style.display = "block"
}

function hideError(id) {
  document.getElementById(id).style.display = "none"
}

function closeModal(id) {
  document.getElementById(id).style.display = "none"
}

function formatDate(dateStr) {
  if (!dateStr) return "—"
  const d = new Date(dateStr + "T00:00:00")
  return d.toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" })
}

function escapeHtml(str) {
  const div = document.createElement("div")
  div.appendChild(document.createTextNode(str || ""))
  return div.innerHTML
}

// ═══════════════════════════════════════════
//  Renderizado — Sidebar
// ═══════════════════════════════════════════

function renderSidebar() {
  const list = document.getElementById("projects-list")
  list.innerHTML = ""

  if (!projects.length) {
    list.innerHTML = `
      <div class="sidebar-empty">
        <span class="sidebar-empty-icon">⚐</span>
        Todavía no tienes proyectos.<br>Crea el primero.
      </div>`
    return
  }

  projects.forEach((project) => {
    const tasks = project._tasks || []
    const { progress } = calcProgress(tasks)
    const item = document.createElement("div")
    item.className = "project-item" + (project.id === currentProjectId ? " active" : "")
    item.dataset.id = project.id
    item.innerHTML = `
      <div class="project-item-name">${escapeHtml(project.name)}</div>
      <div class="project-item-meta">
        <span class="project-item-tasks">${tasks.length} tarea${tasks.length !== 1 ? "s" : ""}</span>
        <div class="project-item-progress">
          <div class="project-item-progress-fill" style="width:${progress}%"></div>
        </div>
      </div>`
    item.addEventListener("click", () => selectProject(project.id))
    list.appendChild(item)
  })
}

// ═══════════════════════════════════════════
//  Renderizado — Panel detalle
// ═══════════════════════════════════════════

async function selectProject(id) {
  currentProjectId = id
  activeFilter = "all"

  const project = projects.find((p) => p.id === id)
  if (!project) return

  document.querySelectorAll(".project-item").forEach((el) => {
    el.classList.toggle("active", Number(el.dataset.id) === id)
  })

  document.getElementById("empty-state").style.display = "none"
  document.getElementById("detail-content").style.display = "flex"

  document.getElementById("detail-title").textContent = project.name
  document.getElementById("detail-description").textContent = project.description || "Sin descripción."
  document.getElementById("detail-date").textContent = formatDate(project.creationDate)

  document.querySelectorAll(".filter-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.filter === "all")
  })

  showTasksLoading()
  try {
    currentTasks = await apiGetTasks(id)
    project._tasks = currentTasks
  } catch {
    currentTasks = []
  }

  renderProgress()
  renderTasks()
  renderSidebar()
}

function showTasksLoading() {
  document.getElementById("tasks-list").innerHTML =
    `<div class="tasks-empty" style="opacity:0.5;">Cargando tareas…</div>`
}

function renderProgress() {
  const { progress, completed, inProgress, expired } = calcProgress(currentTasks)
  document.getElementById("progress-value").textContent = `${progress}%`
  document.getElementById("progress-fill").style.width = `${progress}%`
  document.getElementById("stat-completed").textContent = completed
  document.getElementById("stat-inprogress").textContent = inProgress
  document.getElementById("stat-expired").textContent = expired
}

function renderTasks() {
  const tasksList = document.getElementById("tasks-list")
  tasksList.innerHTML = ""

  let tasks = [...currentTasks]
  if (activeFilter !== "all") {
    tasks = tasks.filter((t) => getTaskState(t) === activeFilter)
  }

  if (!tasks.length) {
    tasksList.innerHTML = `<div class="tasks-empty">No hay tareas${activeFilter !== "all" ? " con este filtro" : ""}. ¡Añade la primera!</div>`
    return
  }

  const order = { IN_PROGRESS: 0, EXPIRED: 1, COMPLETED: 2 }
  tasks.sort((a, b) => order[getTaskState(a)] - order[getTaskState(b)])

  const priorityLabel = { HIGH: "Alta", MID: "Media", LOW: "Baja" }
  const stateLabel = { COMPLETED: "Completada", IN_PROGRESS: "En progreso", EXPIRED: "Vencida" }

  tasks.forEach((task) => {
    const state = getTaskState(task)
    const item = document.createElement("div")
    item.className = `task-item state-${state}`
    item.dataset.id = task.id

    const deadlineBadge = task.dateDeadline
      ? `<span class="badge badge-deadline">⏱ ${formatDate(task.dateDeadline)}</span>`
      : ""

    item.innerHTML = `
      <button class="task-check ${task.completed ? "checked" : ""}" data-task-id="${task.id}" title="Marcar como completada">
        ${task.completed ? "✓" : ""}
      </button>
      <div class="task-content">
        <div class="task-title">${escapeHtml(task.title)}</div>
        ${task.description ? `<div class="task-desc">${escapeHtml(task.description)}</div>` : ""}
      </div>
      <div class="task-badges">
        ${deadlineBadge}
        <span class="badge badge-priority-${task.priority}">${priorityLabel[task.priority] || task.priority}</span>
        <span class="badge badge-state-${state}">${stateLabel[state]}</span>
      </div>
      <div class="task-actions">
        <button class="task-btn task-btn-edit" data-task-id="${task.id}" title="Editar">✎</button>
        <button class="task-btn task-btn-delete" data-task-id="${task.id}" title="Eliminar">⊘</button>
      </div>`

    item.querySelector(".task-check").addEventListener("click", (e) => {
      e.stopPropagation()
      handleToggleTask(task)
    })
    item.querySelector(".task-btn-edit").addEventListener("click", (e) => {
      e.stopPropagation()
      openEditTask(task)
    })
    item.querySelector(".task-btn-delete").addEventListener("click", (e) => {
      e.stopPropagation()
      handleDeleteTask(task.id)
    })

    tasksList.appendChild(item)
  })
}

// ═══════════════════════════════════════════
//  Handlers — Proyectos
// ═══════════════════════════════════════════

function openNewProject() {
  editingProjectId = null
  document.getElementById("modal-project-title").textContent = "Nuevo proyecto"
  document.getElementById("project-name-input").value = ""
  document.getElementById("project-desc-input").value = ""
  hideError("project-form-error")
  document.getElementById("modal-project").style.display = "flex"
  setTimeout(() => document.getElementById("project-name-input").focus(), 50)
}

function openEditProject() {
  const project = projects.find((p) => p.id === currentProjectId)
  if (!project) return
  editingProjectId = currentProjectId
  document.getElementById("modal-project-title").textContent = "Editar proyecto"
  document.getElementById("project-name-input").value = project.name
  document.getElementById("project-desc-input").value = project.description || ""
  hideError("project-form-error")
  document.getElementById("modal-project").style.display = "flex"
  setTimeout(() => document.getElementById("project-name-input").focus(), 50)
}

async function handleSaveProject() {
  const name = document.getElementById("project-name-input").value.trim()
  const description = document.getElementById("project-desc-input").value.trim()
  const btn = document.getElementById("modal-project-save")

  if (!name) {
    showError("project-form-error", "El nombre del proyecto es obligatorio.")
    return
  }

  hideError("project-form-error")
  setLoading(btn, true)

  try {
    const user = getUser()
    if (editingProjectId) {
      const updated = await apiUpdateProject(editingProjectId, name, description)
      const idx = projects.findIndex((p) => p.id === editingProjectId)
      if (idx >= 0) projects[idx] = { ...projects[idx], ...updated }
      closeModal("modal-project")
      const project = projects.find((p) => p.id === editingProjectId)
      document.getElementById("detail-title").textContent = project.name
      document.getElementById("detail-description").textContent = project.description || "Sin descripción."
      renderSidebar()
    } else {
      const created = await apiCreateProject(user.userId, name, description)
      created._tasks = []
      projects.push(created)
      currentProjectId = created.id
      closeModal("modal-project")
      renderSidebar()
      await selectProject(created.id)
    }
  } catch (err) {
    showError("project-form-error", err.message || "No se pudo guardar el proyecto.")
  } finally {
    setLoading(btn, false)
  }
}

async function handleDeleteProject() {
  const btn = document.getElementById("modal-confirm-ok")
  setLoading(btn, true)
  try {
    await apiDeleteProject(currentProjectId)
    projects = projects.filter((p) => p.id !== currentProjectId)
    currentProjectId = null
    currentTasks = []
    closeModal("modal-confirm")
    renderSidebar()
    document.getElementById("empty-state").style.display = "flex"
    document.getElementById("detail-content").style.display = "none"
  } catch (err) {
    closeModal("modal-confirm")
    alert("Error al eliminar: " + err.message)
  } finally {
    setLoading(btn, false)
  }
}

// ═══════════════════════════════════════════
//  Handlers — Tareas
// ═══════════════════════════════════════════

function openNewTask() {
  editingTaskId = null
  document.getElementById("modal-task-title").textContent = "Nueva tarea"
  document.getElementById("task-title-input").value = ""
  document.getElementById("task-desc-input").value = ""
  document.getElementById("task-priority-input").value = "MID"
  document.getElementById("task-deadline-input").value = ""
  hideError("task-form-error")
  document.getElementById("modal-task").style.display = "flex"
  setTimeout(() => document.getElementById("task-title-input").focus(), 50)
}

function openEditTask(task) {
  editingTaskId = task.id
  document.getElementById("modal-task-title").textContent = "Editar tarea"
  document.getElementById("task-title-input").value = task.title
  document.getElementById("task-desc-input").value = task.description || ""
  document.getElementById("task-priority-input").value = task.priority || "MID"
  document.getElementById("task-deadline-input").value = task.dateDeadline || ""
  hideError("task-form-error")
  document.getElementById("modal-task").style.display = "flex"
  setTimeout(() => document.getElementById("task-title-input").focus(), 50)
}

async function handleSaveTask() {
  const title = document.getElementById("task-title-input").value.trim()
  const description = document.getElementById("task-desc-input").value.trim()
  const priority = document.getElementById("task-priority-input").value
  const dateDeadline = document.getElementById("task-deadline-input").value || null
  const btn = document.getElementById("modal-task-save")

  if (!title) {
    showError("task-form-error", "El título de la tarea es obligatorio.")
    return
  }

  hideError("task-form-error")
  setLoading(btn, true)

  try {
    if (editingTaskId) {
      const updated = await apiUpdateTask(currentProjectId, editingTaskId, {
        title, description, priority, dateDeadline,
      })
      const idx = currentTasks.findIndex((t) => t.id === editingTaskId)
      if (idx >= 0) currentTasks[idx] = updated
    } else {
      const created = await apiCreateTask(currentProjectId, { title, description, priority, dateDeadline })
      currentTasks.push(created)
    }

    const project = projects.find((p) => p.id === currentProjectId)
    if (project) project._tasks = currentTasks

    closeModal("modal-task")
    renderProgress()
    renderTasks()
    renderSidebar()
  } catch (err) {
    showError("task-form-error", err.message || "No se pudo guardar la tarea.")
  } finally {
    setLoading(btn, false)
  }
}

async function handleToggleTask(task) {
  // Optimistic update
  task.completed = !task.completed
  renderTasks()
  renderProgress()

  try {
    const updated = await apiUpdateTask(currentProjectId, task.id, { completed: task.completed })
    const idx = currentTasks.findIndex((t) => t.id === task.id)
    if (idx >= 0) currentTasks[idx] = { ...currentTasks[idx], ...updated }
    const project = projects.find((p) => p.id === currentProjectId)
    if (project) project._tasks = currentTasks
    renderSidebar()
  } catch {
    // Revertir si falla
    task.completed = !task.completed
    renderTasks()
    renderProgress()
  }
}

async function handleDeleteTask(taskId) {
  if (!confirm("¿Eliminar esta tarea?")) return
  try {
    await apiDeleteTask(currentProjectId, taskId)
    currentTasks = currentTasks.filter((t) => t.id !== taskId)
    const project = projects.find((p) => p.id === currentProjectId)
    if (project) project._tasks = currentTasks
    renderTasks()
    renderProgress()
    renderSidebar()
  } catch (err) {
    alert("Error al eliminar la tarea: " + err.message)
  }
}

// ═══════════════════════════════════════════
//  Init
// ═══════════════════════════════════════════

document.addEventListener("DOMContentLoaded", async () => {
  requireAuth()
  const user = getUser()
  if (!user) return

  try {
    const raw = await apiGetProjects(user.userId)
    projects = Array.isArray(raw) ? raw.map((p) => ({ ...p, _tasks: [] })) : []
  } catch {
    projects = []
  }
  renderSidebar()

  document.getElementById("btn-new-project").addEventListener("click", openNewProject)
  document.getElementById("btn-new-project-empty").addEventListener("click", openNewProject)
  document.getElementById("btn-edit-project").addEventListener("click", openEditProject)
  document.getElementById("btn-delete-project").addEventListener("click", () => {
    document.getElementById("modal-confirm").style.display = "flex"
  })

  document.getElementById("modal-project-save").addEventListener("click", handleSaveProject)
  document.getElementById("modal-project-cancel").addEventListener("click", () => closeModal("modal-project"))
  document.getElementById("modal-project-close").addEventListener("click", () => closeModal("modal-project"))

  document.getElementById("btn-add-task").addEventListener("click", openNewTask)
  document.getElementById("modal-task-save").addEventListener("click", handleSaveTask)
  document.getElementById("modal-task-cancel").addEventListener("click", () => closeModal("modal-task"))
  document.getElementById("modal-task-close").addEventListener("click", () => closeModal("modal-task"))

  document.getElementById("modal-confirm-ok").addEventListener("click", handleDeleteProject)
  document.getElementById("modal-confirm-cancel").addEventListener("click", () => closeModal("modal-confirm"))
  document.getElementById("modal-confirm-close").addEventListener("click", () => closeModal("modal-confirm"))

  ;["modal-project", "modal-task", "modal-confirm"].forEach((id) => {
    document.getElementById(id).addEventListener("click", (e) => {
      if (e.target.id === id) closeModal(id)
    })
  })

  document.querySelectorAll(".filter-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      activeFilter = btn.dataset.filter
      document.querySelectorAll(".filter-btn").forEach((b) => b.classList.remove("active"))
      btn.classList.add("active")
      renderTasks()
    })
  })

  document.getElementById("project-name-input").addEventListener("keydown", (e) => {
    if (e.key === "Enter") handleSaveProject()
  })
  document.getElementById("task-title-input").addEventListener("keydown", (e) => {
    if (e.key === "Enter") handleSaveTask()
  })
})