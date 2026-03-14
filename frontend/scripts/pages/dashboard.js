import { api, requireAuth } from "../core/api.js"
import { getUser } from "../core/session.js"

document.addEventListener("DOMContentLoaded", () => {
  requireAuth()
  loadTasks()
})

async function loadTasks() {
  const tasksListElement = document.getElementById("list-tasks")

  try {
    const currentSessionUser = getUser()
    const userId = currentSessionUser?.userId ?? currentSessionUser?.id
    const [tasks, projects] = await Promise.all([api.users.getTasks(userId), api.projects.getByUser(userId)])
    const projectsMap = createProjectsMap(projects)
    const pendingTasks = tasks.filter((task) => task.completed === false).sort(sortTasksByDeadline)

    if (pendingTasks.length === 0) {
      tasksListElement.innerHTML = `
        <section class="no-task">
          <div class="no-task-icon">✓</div>
    
          <p class="no-task-subtitle">Todo completado</p>
    
          <h2 class="no-task-title">No tienes tareas pendientes</h2>
    
          <p class="no-task-text">
            Todo está al día. Crea una nueva tarea para empezar a organizar tu trabajo
            y verla aquí ordenada por fecha de finalización.
          </p>
    
          <div class="no-task-go-tasks">
            <a href="./../../task.html" class="no-task-go-task">
              Ir a tareas
            </a>
            <a href="./../../task.html" class="no-task-create-task">
              Crear nueva tarea
            </a>
          </div>
        </section>
      `
      return
    }

    pendingTasks.forEach((task) => {
      const taskDivElement = createTaskCard(task, projectsMap)
      tasksListElement.appendChild(taskDivElement)
    })
  } catch (error) {
    console.error("Error cargando tareas:", error)

    if (tasksListElement) {
      tasksListElement.innerHTML = `<p>Error al cargar las tareas: ${error.message}</p>`
    }
  }
}

function createProjectsMap(projects) {
  const projectsMap = {}

  if (!Array.isArray(projects)) {
    return projectsMap
  }

  projects.forEach((project) => {
    if (project?.id != null) {
      projectsMap[project.id] = project.name ?? "Proyecto sin nombre"
    }
  })

  return projectsMap
}

function sortTasksByDeadline(task1, task2) {
  const task1DeadlineTime = task1?.dateDeadline ? new Date(task1.dateDeadline).getTime() : Number.MAX_SAFE_INTEGER
  const task2DeadlineTime = task2?.dateDeadline ? new Date(task2.dateDeadline).getTime() : Number.MAX_SAFE_INTEGER

  return task1DeadlineTime - task2DeadlineTime
}

function getRemainingTime(task) {
  const taskDeadlineTime = task?.dateDeadline ? new Date(task.dateDeadline).getTime() : Number.MAX_SAFE_INTEGER

  return taskDeadlineTime - Date.now()
}

function formatRemainingTime(ms) {
  if (ms === Number.MAX_SAFE_INTEGER) return "Sin fecha limite"

  const abs = Math.abs(ms)

  const minutes = Math.floor(abs / (1000 * 60))
  const hours = Math.floor(abs / (1000 * 60 * 60))
  const days = Math.ceil(abs / (1000 * 60 * 60 * 24))

  if (days > 0) {
    return ms > 0 ? `Tiempo restante: ${days}d` : `Vencida hace ${days}d`
  }

  if (hours > 0) {
    return ms > 0 ? `Tiempo restante: ${hours}h` : `Vencida hace ${hours}h`
  }

  return ms > 0 ? `Tiempo restante: ${minutes}m` : `Vencida hace ${minutes}m`
}

function createTaskCard(task, projectsMap) {
  const taskDivElement = document.createElement("Div")
  taskDivElement.classList.add("task")

  const projectName = getProjectName(task, projectsMap)
  const priorityClass = getPriorityClass(task.priority)
  const remainingTimeClass = getRemainingTimeClass(getRemainingTime(task))
  const deadlineText = formatDate(task.dateDeadline)
  const stateText = formatState(task.state)
  const remainingTime = formatRemainingTime(getRemainingTime(task))

  taskDivElement.innerHTML = `
    <div class="task-header">
      <h3 class="task-title">${task.title ?? "Sin título"}</h3>
      <span class="task-priority ${priorityClass}">
        ${task.priority ?? "SIN PRIORIDAD"}
      </span>
    </div>

    <p class="task-project-title">${projectName}</p>

    <p class="task-description">
      ${task.description ?? "Sin descripción"}
    </p>

    <div class="task-footer">
      <span class="task-state">${stateText}</span>
      <span class="task-remainingTime ${remainingTimeClass}">${remainingTime}</span>
      <span class="task-deadline">${deadlineText}</span>
    </div>
  `

  return taskDivElement
}

function getProjectName(task) {
  if (task?.projectName) {
    return task.projectName
  }

  return "Sin proyecto"
}

function getPriorityClass(priority) {
  const priorityValue = String(priority ?? "").toLowerCase()

  if (priorityValue === "high") return "priority-high"
  if (priorityValue === "mid") return "priority-mid"
  if (priorityValue === "low") return "priority-low"

  return "priority-default"
}

function getRemainingTimeClass(remainingTime) {
  if (remainingTime > 0) return "remainingTimeGood"
  if (remainingTime <= 0) return "remainingTimeBad"
}

function formatState(state) {
  if (!state) return "Sin estado"

  return state
    .toLowerCase()
    .split("_")
    .map((statePart) => statePart.charAt(0).toUpperCase() + statePart.slice(1))
    .join(" ")
}

function formatDate(dateString) {
  if (!dateString) {
    return "Sin fecha límite"
  }

  const deadlineDate = new Date(dateString)

  return deadlineDate.toLocaleDateString("es-ES")
}
