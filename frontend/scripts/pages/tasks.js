import { api, requireAuth } from "../core/api.js"
import { getUser } from "../core/session.js"

const CATEGORY_SECTION_TITLES = {
  all: "Todas las tareas",
  in_progress: "En progreso",
  completed: "Completadas",
  expired: "Vencidas",
  high: "Alta prioridad",
  mid: "Media prioridad",
  low: "Baja prioridad",
  with_deadline: "Con fecha límite",
  without_deadline: "Sin fecha",
}

let cachedTasksList = []
let cachedProjectsList = []
let projectIdToNameMap = {}

const taskFilters = {
  search: "",
  state: "all",
  priority: "all",
  project: "all",
  sort: "deadline",
  category: "all",
}

document.addEventListener("DOMContentLoaded", () => {
  requireAuth()
  setupTaskPageEventListeners()
  loadTasksFromApi()
})

/**
 * Registra todos los listeners de la página:
 * filtros, sidebar, modal y acciones delegadas sobre las tarjetas.
 */
function setupTaskPageEventListeners() {
  document.getElementById("searchTask")?.addEventListener("input", handleSearchInputChange)
  document.getElementById("filterState")?.addEventListener("change", handleStateFilterChange)
  document.getElementById("filterPriority")?.addEventListener("change", handlePriorityFilterChange)
  document.getElementById("filterProject")?.addEventListener("change", handleProjectFilterChange)
  document.getElementById("sortTasks")?.addEventListener("change", handleSortChange)
  document.getElementById("newTaskButton")?.addEventListener("click", openCreateTaskModal)

  document.querySelectorAll(".tasksSidebarLink").forEach((sidebarCategoryButton) => {
    sidebarCategoryButton.addEventListener("click", () => {
      applySidebarCategory(sidebarCategoryButton.dataset.category ?? "all")
    })
  })

  document.getElementById("closeTaskModalButton")?.addEventListener("click", closeTaskModal)
  document.getElementById("cancelTaskModalButton")?.addEventListener("click", closeTaskModal)
  document.getElementById("taskModalOverlay")?.addEventListener("click", closeTaskModal)

  document.getElementById("taskForm")?.addEventListener("submit", async (submitEvent) => {
    submitEvent.preventDefault()
    await saveTaskFromModal()
  })

  document.addEventListener("click", handleDelegatedTaskPageClick)
}

/**
 * Actualiza el texto de búsqueda y reaplica el filtrado.
 */
function handleSearchInputChange(inputEvent) {
  taskFilters.search = String(inputEvent.target.value ?? "")
    .toLowerCase()
    .trim()

  applyTaskFilters()
}

/**
 * Sincroniza el filtro de estado con la categoría de la sidebar y repinta la vista.
 */
function handleStateFilterChange(changeEvent) {
  taskFilters.state = changeEvent.target.value

  const categoryByStateValue = {
    all: "all",
    in_progress: "in_progress",
    completed: "completed",
    expired: "expired",
  }

  taskFilters.category = categoryByStateValue[taskFilters.state] ?? "all"

  updateActiveSidebarCategoryButton()
  updateTasksSectionTitle()
  applyTaskFilters()
}

/**
 * Actualiza el filtro de prioridad y reaplica el filtrado.
 */
function handlePriorityFilterChange(changeEvent) {
  taskFilters.priority = changeEvent.target.value
  applyTaskFilters()
}

/**
 * Actualiza el filtro de proyecto y reaplica el filtrado.
 */
function handleProjectFilterChange(changeEvent) {
  taskFilters.project = changeEvent.target.value
  applyTaskFilters()
}

/**
 * Actualiza el criterio de ordenación y reaplica el filtrado.
 */
function handleSortChange(changeEvent) {
  taskFilters.sort = changeEvent.target.value
  applyTaskFilters()
}

/**
 * Gestiona por delegación los clicks sobre editar, completar, borrar y crear desde el estado vacío.
 */
async function handleDelegatedTaskPageClick(clickEvent) {
  const editTaskButton = clickEvent.target.closest(".editTask")
  const completeTaskButton = clickEvent.target.closest(".completeTask")
  const deleteTaskButton = clickEvent.target.closest(".deleteTask")
  const createTaskEmptyStateButton = clickEvent.target.closest(".noTaskCreateTask")

  if (createTaskEmptyStateButton) {
    clickEvent.preventDefault()
    openCreateTaskModal()
    return
  }

  if (editTaskButton) {
    const taskId = editTaskButton.dataset.id
    if (!taskId) return
    openEditTaskModal(taskId)
    return
  }

  if (completeTaskButton) {
    await markTaskAsComplete(completeTaskButton.dataset.id, completeTaskButton)
    return
  }

  if (deleteTaskButton) {
    await deleteTask(deleteTaskButton.dataset.id, deleteTaskButton)
  }
}

/**
 * Carga tareas y proyectos del usuario autenticado, actualiza cachés y renderiza la vista inicial.
 */
async function loadTasksFromApi() {
  const tasksContainerElement = document.getElementById("tasksContainer")
  const tasksCountTextElement = document.getElementById("tasksCount")

  if (!tasksContainerElement) return

  tasksContainerElement.innerHTML = ""
  if (tasksCountTextElement) tasksCountTextElement.textContent = "0 tareas"

  try {
    const authenticatedUser = getUser()
    const authenticatedUserId = authenticatedUser?.userId ?? authenticatedUser?.id

    if (!authenticatedUserId) {
      throw new Error("No se pudo identificar al usuario")
    }

    const [tasksApiResponse, projectsApiResponse] = await Promise.all([api.users.getTasks(authenticatedUserId), api.projects.getByUser(authenticatedUserId)])

    cachedTasksList = Array.isArray(tasksApiResponse) ? tasksApiResponse : []
    cachedProjectsList = Array.isArray(projectsApiResponse) ? projectsApiResponse : []

    projectIdToNameMap = Object.fromEntries(cachedProjectsList.filter((projectItem) => projectItem?.id != null).map((projectItem) => [projectItem.id, projectItem.name ?? "Proyecto sin nombre"]))

    populateProjectFilterOptions(cachedProjectsList)
    fillTaskProjectSelect()

    taskFilters.search = ""
    taskFilters.state = "all"
    taskFilters.priority = "all"
    taskFilters.project = "all"
    taskFilters.sort = "deadline"
    taskFilters.category = "all"

    syncFiltersToDom()
    updateActiveSidebarCategoryButton()
    updateTasksSectionTitle()
    applyTaskFilters()
  } catch (error) {
    console.error("Error cargando tareas:", error)
    tasksContainerElement.innerHTML = `
      <p class="errorState">Error al cargar las tareas: ${error?.message ?? "Error desconocido"}</p>
    `
  }
}

/**
 * Aplica una categoría de la sidebar reseteando filtros incompatibles y sincronizando el DOM.
 */
function applySidebarCategory(selectedSidebarCategory) {
  taskFilters.category = selectedSidebarCategory
  taskFilters.state = "all"
  taskFilters.priority = "all"
  taskFilters.project = "all"

  if (["in_progress", "completed", "expired"].includes(selectedSidebarCategory)) {
    taskFilters.state = selectedSidebarCategory
  } else if (["high", "mid", "low"].includes(selectedSidebarCategory)) {
    taskFilters.priority = selectedSidebarCategory
  } else if (selectedSidebarCategory === "with_deadline" || selectedSidebarCategory === "without_deadline") {
    // La propia categoría ya controla este filtrado
  } else if (selectedSidebarCategory.startsWith("project:")) {
    taskFilters.project = selectedSidebarCategory.replace("project:", "")
  }

  syncFiltersToDom()
  updateActiveSidebarCategoryButton()
  updateTasksSectionTitle()
  applyTaskFilters()
}

/**
 * Refleja en los selectores y buscador los valores actuales guardados en taskFilters.
 */
function syncFiltersToDom() {
  const searchInputElement = document.getElementById("searchTask")
  const stateFilterSelectElement = document.getElementById("filterState")
  const priorityFilterSelectElement = document.getElementById("filterPriority")
  const projectFilterSelectElement = document.getElementById("filterProject")
  const sortTasksSelectElement = document.getElementById("sortTasks")

  if (searchInputElement) searchInputElement.value = taskFilters.search
  if (stateFilterSelectElement) stateFilterSelectElement.value = taskFilters.state
  if (priorityFilterSelectElement) priorityFilterSelectElement.value = taskFilters.priority
  if (projectFilterSelectElement) projectFilterSelectElement.value = taskFilters.project
  if (sortTasksSelectElement) sortTasksSelectElement.value = taskFilters.sort
}

/**
 * Marca visualmente como activa la categoría actual de la sidebar.
 */
function updateActiveSidebarCategoryButton() {
  document.querySelectorAll(".tasksSidebarLink").forEach((sidebarCategoryButton) => {
    sidebarCategoryButton.classList.toggle("tasksSidebarLinkActive", sidebarCategoryButton.dataset.category === taskFilters.category)
  })
}

/**
 * Actualiza el título visible del bloque principal según la categoría seleccionada.
 */
function updateTasksSectionTitle() {
  const tasksSectionTitleElement = document.getElementById("tasksSectionTitle")
  if (tasksSectionTitleElement) {
    tasksSectionTitleElement.textContent = CATEGORY_SECTION_TITLES[taskFilters.category] ?? "Tareas"
  }
}

/**
 * Filtra, ordena y renderiza la lista de tareas según el estado actual de taskFilters.
 */
function applyTaskFilters() {
  let filteredTasksList = [...cachedTasksList]

  if (taskFilters.search) {
    filteredTasksList = filteredTasksList.filter((taskItem) =>
      String(taskItem?.title ?? "")
        .toLowerCase()
        .trim()
        .includes(taskFilters.search),
    )
  }

  if (taskFilters.category === "with_deadline") {
    filteredTasksList = filteredTasksList.filter((taskItem) => !!taskItem?.dateDeadline)
  } else if (taskFilters.category === "without_deadline") {
    filteredTasksList = filteredTasksList.filter((taskItem) => !taskItem?.dateDeadline)
  }

  if (taskFilters.state !== "all") {
    filteredTasksList = filteredTasksList.filter((taskItem) => normalizeTaskState(taskItem) === taskFilters.state)
  }

  if (taskFilters.priority !== "all") {
    filteredTasksList = filteredTasksList.filter((taskItem) => normalizeTaskPriority(taskItem?.priority) === taskFilters.priority)
  }

  if (taskFilters.project !== "all") {
    filteredTasksList = filteredTasksList.filter((taskItem) => String(taskItem?.projectId ?? "") === taskFilters.project)
  }

  filteredTasksList.sort((firstTask, secondTask) => compareTasksForSort(firstTask, secondTask, taskFilters.sort))

  renderTasksStatistics(filteredTasksList)
  renderFilteredTasksList(filteredTasksList)
}

/**
 * Renderiza la lista final de tareas o el estado vacío si no hay resultados.
 */
function renderFilteredTasksList(filteredAndSortedTasksList) {
  const tasksContainerElement = document.getElementById("tasksContainer")
  const tasksCountElement = document.getElementById("tasksCount")

  if (!tasksContainerElement) return

  tasksContainerElement.innerHTML = ""

  if (!filteredAndSortedTasksList.length) {
    if (tasksCountElement) tasksCountElement.textContent = "0 tareas"

    tasksContainerElement.innerHTML = `
      <div class="noTask">
        <div class="noTaskIcon">✓</div>
        <p class="noTaskSubtitle">Todo completado</p>
        <h2 class="noTaskTitle">No tienes tareas</h2>
        <p class="noTaskText">
          Todo está al día. Crea una nueva tarea para empezar a organizar tu trabajo
          y verla aquí ordenada por fecha de finalización.
        </p>
        <div class="noTaskGoTasks">
          <a href="tasks.html" class="noTaskGoTask">Recargar</a>
          <a href="#" class="noTaskCreateTask">Crear nueva tarea</a>
        </div>
      </div>
    `
    return
  }

  if (tasksCountElement) {
    tasksCountElement.textContent = `${filteredAndSortedTasksList.length} ${filteredAndSortedTasksList.length === 1 ? "tarea" : "tareas"}`
  }

  filteredAndSortedTasksList.forEach((taskItem) => {
    tasksContainerElement.appendChild(buildTaskCardElement(taskItem))
  })
}

/**
 * Actualiza los contadores de la cabecera usando únicamente la lista filtrada actual.
 */
function renderTasksStatistics(filteredTasksList) {
  const statisticsByElementId = {
    statInProgress: filteredTasksList.filter((taskItem) => normalizeTaskState(taskItem) === "in_progress").length,
    statExpired: filteredTasksList.filter((taskItem) => normalizeTaskState(taskItem) === "expired").length,
    statWithDeadline: filteredTasksList.filter((taskItem) => !!taskItem?.dateDeadline).length,
    statHigh: filteredTasksList.filter((taskItem) => normalizeTaskPriority(taskItem?.priority) === "high").length,
  }

  for (const [statisticElementId, totalStatisticValue] of Object.entries(statisticsByElementId)) {
    const statisticElement = document.getElementById(statisticElementId)
    if (statisticElement) statisticElement.textContent = totalStatisticValue
  }
}

/**
 * Rellena el selector de filtro por proyecto con los proyectos disponibles del usuario.
 */
function populateProjectFilterOptions(availableProjectsList) {
  const projectFilterSelectElement = document.getElementById("filterProject")
  if (!projectFilterSelectElement) return

  projectFilterSelectElement.innerHTML = `<option value="all">Proyecto</option>`

  availableProjectsList.forEach((projectItem) => {
    const projectOptionElement = document.createElement("option")
    projectOptionElement.value = String(projectItem.id)
    projectOptionElement.textContent = projectItem.name ?? "Proyecto sin nombre"
    projectFilterSelectElement.appendChild(projectOptionElement)
  })
}

/**
 * Construye el HTML de una tarjeta de tarea con metadatos, estado y acciones disponibles.
 */
function buildTaskCardElement(taskData) {
  const normalizedTaskState = normalizeTaskState(taskData)
  const resolvedProjectName = resolveTaskProjectName(taskData)
  const formattedDeadlineText = formatTaskDeadline(taskData?.dateDeadline)
  const relativeDeadlineLabel = getRelativeDeadlineLabel(taskData)

  const stateBadgeCssClass =
    {
      in_progress: "stateInProgress",
      completed: "stateCompleted",
      expired: "stateExpired",
    }[normalizedTaskState] ?? ""

  const timeStatusCssClass =
    {
      completed: "timeStatusCompleted",
      expired: "timeStatusExpired",
      in_progress: "timeStatusInProgress",
    }[normalizedTaskState] ?? "timeStatusNormal"

  const stateLabelText =
    {
      completed: "Completada",
      in_progress: "En progreso",
      expired: "Vencida",
    }[normalizedTaskState] ?? "Sin estado"

  const taskCardElement = document.createElement("article")
  taskCardElement.classList.add("taskCard")

  if (normalizedTaskState === "in_progress") taskCardElement.classList.add("taskCardInProgress")
  if (normalizedTaskState === "completed") taskCardElement.classList.add("taskCardCompleted")
  if (normalizedTaskState === "expired") taskCardElement.classList.add("taskCardExpired")

  taskCardElement.innerHTML = `
    <div class="taskCardTop">
      <div>
        <h3 class="taskCardTitle">${escapeHtml(taskData?.title ?? "Sin título")}</h3>
        <p class="taskCardProject">Proyecto: ${escapeHtml(resolvedProjectName)}</p>
      </div>
    </div>

    <p class="taskCardDescription">${escapeHtml(taskData?.description ?? "Sin descripción")}</p>

    <div class="taskCardBottom">
      <div class="taskCardMeta">
        <span class="taskCardState ${stateBadgeCssClass}">${stateLabelText}</span>
        <span class="taskCardDeadline">${escapeHtml(formattedDeadlineText)}</span>
        <span class="taskCardTimeStatus ${timeStatusCssClass}">${escapeHtml(relativeDeadlineLabel)}</span>
      </div>

      <div class="taskCardActions">
        <button data-id="${taskData?.id ?? ""}" class="editTask">Editar</button>
        ${normalizedTaskState === "completed" ? "" : `<button data-id="${taskData?.id ?? ""}" class="completeTask taskActionComplete">Completar</button>`}
        <button data-id="${taskData?.id ?? ""}" class="deleteTask taskActionDelete">Borrar</button>
      </div>
    </div>
  `

  return taskCardElement
}

/**
 * Obtiene el nombre de proyecto más fiable posible a partir de la tarea o del mapa en memoria.
 */
function resolveTaskProjectName(taskData) {
  let resolvedProjectName = taskData?.projectName ?? taskData?.project?.name

  if (!resolvedProjectName && taskData?.projectId != null) {
    resolvedProjectName = projectIdToNameMap[taskData.projectId]
  }

  return resolvedProjectName ?? "Sin proyecto"
}

/**
 * Convierte la fecha límite a un texto legible para la tarjeta.
 */
function formatTaskDeadline(rawDeadlineValue) {
  if (!rawDeadlineValue) return "Sin fecha"

  const deadlineDateObject = new Date(rawDeadlineValue)
  if (Number.isNaN(deadlineDateObject.getTime())) return String(rawDeadlineValue)

  return deadlineDateObject
    .toLocaleString("es-ES", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
    .replaceAll(",", " ·")
}

/**
 * Genera la etiqueta relativa de vencimiento en función del estado y la fecha límite.
 */
function getRelativeDeadlineLabel(taskData) {
  const normalizedTaskState = normalizeTaskState(taskData)

  if (!taskData?.dateDeadline) return "Sin fecha límite"
  if (normalizedTaskState === "completed") return "Completada"

  const deadlineDateObject = new Date(taskData.dateDeadline)
  if (Number.isNaN(deadlineDateObject.getTime())) return "Fecha inválida"

  const millisecondsUntilDeadline = deadlineDateObject.getTime() - Date.now()
  const absoluteMillisecondsDifference = Math.abs(millisecondsUntilDeadline)
  const remainingDays = Math.floor(absoluteMillisecondsDifference / (1000 * 60 * 60 * 24))
  const remainingHours = Math.floor((absoluteMillisecondsDifference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))

  if (normalizedTaskState === "expired") {
    return remainingDays === 0 && remainingHours === 0 ? "Vencida hace menos de 1h" : `Vencida hace ${remainingDays}d ${remainingHours}h`
  }

  if (remainingDays === 0 && remainingHours === 0) {
    return millisecondsUntilDeadline < 0 ? "Vencida hace menos de 1h" : "Vence en menos de 1h"
  }

  return `Tiempo restante: ${remainingDays}d ${remainingHours}h`
}

/**
 * Escapa texto para evitar inyectar HTML al renderizar contenido procedente de la API.
 */
function escapeHtml(rawValue) {
  return String(rawValue).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;")
}

/**
 * Normaliza el valor de prioridad a high, mid, low o unknown.
 */
function normalizeTaskPriority(rawTaskPriorityValue) {
  const normalizedPriorityValue = String(rawTaskPriorityValue ?? "")
    .toLowerCase()
    .trim()

  if (normalizedPriorityValue === "high") return "high"
  if (normalizedPriorityValue === "mid" || normalizedPriorityValue === "medium") return "mid"
  if (normalizedPriorityValue === "low") return "low"

  return "unknown"
}

/**
 * Normaliza el estado de una tarea usando state, completed y la fecha límite para detectar vencidas.
 */
function normalizeTaskState(rawTaskValue) {
  if (rawTaskValue && typeof rawTaskValue === "object") {
    if (rawTaskValue.completed === true) return "completed"

    const normalizedObjectState = String(rawTaskValue.state ?? "")
      .toLowerCase()
      .trim()

    if (normalizedObjectState === "completed") return "completed"
    if (normalizedObjectState === "expired") return "expired"

    if (rawTaskValue?.dateDeadline) {
      const deadlineTimestamp = new Date(rawTaskValue.dateDeadline).getTime()
      if (!Number.isNaN(deadlineTimestamp) && deadlineTimestamp < Date.now()) return "expired"
    }

    if (normalizedObjectState === "in_progress") return "in_progress"
    return "in_progress"
  }

  const normalizedStateValue = String(rawTaskValue ?? "")
    .toLowerCase()
    .trim()

  if (normalizedStateValue === "completed") return "completed"
  if (normalizedStateValue === "in_progress") return "in_progress"
  if (normalizedStateValue === "expired") return "expired"

  return normalizedStateValue
}

/**
 * Compara dos tareas según el criterio de ordenación activo.
 */
function compareTasksForSort(firstTaskToCompare, secondTaskToCompare, activeSortMode) {
  const getPrioritySortWeight = (priorityValue) => ({ high: 0, mid: 1, low: 2 })[normalizeTaskPriority(priorityValue)] ?? 3

  const convertDateToTimestamp = (dateValue) => {
    if (!dateValue) return Number.MAX_SAFE_INTEGER
    const timestamp = new Date(dateValue).getTime()
    return Number.isNaN(timestamp) ? Number.MAX_SAFE_INTEGER : timestamp
  }

  if (activeSortMode === "priority") {
    return getPrioritySortWeight(firstTaskToCompare?.priority) - getPrioritySortWeight(secondTaskToCompare?.priority)
  }

  if (activeSortMode === "title") {
    return String(firstTaskToCompare?.title ?? "")
      .toLowerCase()
      .trim()
      .localeCompare(
        String(secondTaskToCompare?.title ?? "")
          .toLowerCase()
          .trim(),
        "es",
      )
  }

  if (activeSortMode === "created") {
    return convertDateToTimestamp(firstTaskToCompare?.createdAt) - convertDateToTimestamp(secondTaskToCompare?.createdAt)
  }

  return convertDateToTimestamp(firstTaskToCompare?.dateDeadline) - convertDateToTimestamp(secondTaskToCompare?.dateDeadline)
}

/**
 * Abre el modal en modo creación dejando el formulario vacío y listo para insertar una nueva tarea.
 */
function openCreateTaskModal() {
  resetTaskForm()
  fillTaskProjectSelect()

  const modalTitleElement = document.getElementById("taskModalTitle")
  const saveTaskButtonElement = document.getElementById("saveTaskButton")

  if (modalTitleElement) modalTitleElement.textContent = "Nueva tarea"
  if (saveTaskButtonElement) saveTaskButtonElement.textContent = "Crear tarea"

  openTaskModal()
}

/**
 * Abre el modal en modo edición cargando en el formulario los datos de la tarea seleccionada.
 */
function openEditTaskModal(taskId) {
  const taskToEdit = findTaskById(taskId)

  if (!taskToEdit) {
    alert("No se encontró la tarea")
    return
  }

  resetTaskForm()
  fillTaskProjectSelect()

  const modalTitleElement = document.getElementById("taskModalTitle")
  const saveTaskButtonElement = document.getElementById("saveTaskButton")
  const taskIdInputElement = document.getElementById("taskId")
  const taskProjectIdInputElement = document.getElementById("taskProjectId")
  const taskTitleInputElement = document.getElementById("taskTitle")
  const taskDescriptionInputElement = document.getElementById("taskDescription")
  const taskPrioritySelectElement = document.getElementById("taskPriority")
  const taskDeadlineInputElement = document.getElementById("taskDeadline")
  const taskProjectSelectElement = document.getElementById("taskProjectSelect")

  if (modalTitleElement) modalTitleElement.textContent = "Editar tarea"
  if (saveTaskButtonElement) saveTaskButtonElement.textContent = "Guardar cambios"
  if (taskIdInputElement) taskIdInputElement.value = taskToEdit.id ?? ""
  if (taskProjectIdInputElement) taskProjectIdInputElement.value = taskToEdit.projectId ?? ""
  if (taskTitleInputElement) taskTitleInputElement.value = taskToEdit.title ?? ""
  if (taskDescriptionInputElement) taskDescriptionInputElement.value = taskToEdit.description ?? ""
  if (taskPrioritySelectElement) taskPrioritySelectElement.value = taskToEdit.priority ?? "MID"
  if (taskDeadlineInputElement) taskDeadlineInputElement.value = formatDateTimeLocalValue(taskToEdit.dateDeadline)
  if (taskProjectSelectElement) taskProjectSelectElement.value = String(taskToEdit.projectId ?? "")

  openTaskModal()
}

/**
 * Muestra el modal y bloquea visualmente el fondo de la página.
 */
function openTaskModal() {
  const taskModalElement = document.getElementById("taskModal")
  taskModalElement?.classList.remove("taskModalHidden")
  document.body.classList.add("modalOpen")
}

/**
 * Oculta el modal y restaura el estado visual normal de la página.
 */
function closeTaskModal() {
  const taskModalElement = document.getElementById("taskModal")
  taskModalElement?.classList.add("taskModalHidden")
  document.body.classList.remove("modalOpen")
}

/**
 * Limpia completamente el formulario del modal y resetea sus campos ocultos.
 */
function resetTaskForm() {
  const taskFormElement = document.getElementById("taskForm")
  const taskIdInputElement = document.getElementById("taskId")
  const taskProjectIdInputElement = document.getElementById("taskProjectId")
  const taskTitleInputElement = document.getElementById("taskTitle")
  const taskDescriptionInputElement = document.getElementById("taskDescription")
  const taskPrioritySelectElement = document.getElementById("taskPriority")
  const taskDeadlineInputElement = document.getElementById("taskDeadline")

  taskFormElement?.reset()

  if (taskIdInputElement) taskIdInputElement.value = ""
  if (taskProjectIdInputElement) taskProjectIdInputElement.value = ""
  if (taskTitleInputElement) taskTitleInputElement.value = ""
  if (taskDescriptionInputElement) taskDescriptionInputElement.value = ""
  if (taskPrioritySelectElement) taskPrioritySelectElement.value = "MID"
  if (taskDeadlineInputElement) taskDeadlineInputElement.value = ""
}

/**
 * Rellena el selector de proyectos del modal con la lista de proyectos cargada en memoria.
 */
function fillTaskProjectSelect() {
  const taskProjectSelectElement = document.getElementById("taskProjectSelect")
  if (!taskProjectSelectElement) return

  taskProjectSelectElement.innerHTML = `<option value="">Selecciona un proyecto</option>`

  cachedProjectsList.forEach((projectItem) => {
    const projectOptionElement = document.createElement("option")
    projectOptionElement.value = String(projectItem.id)
    projectOptionElement.textContent = projectItem.name ?? "Proyecto sin nombre"
    taskProjectSelectElement.appendChild(projectOptionElement)
  })
}

/**
 * Convierte una fecha de la API al formato que necesita un input datetime-local.
 */
function formatDateTimeLocalValue(rawDateValue) {
  if (!rawDateValue) return ""

  const dateObject = new Date(rawDateValue)
  if (Number.isNaN(dateObject.getTime())) return ""

  const year = dateObject.getFullYear()
  const month = String(dateObject.getMonth() + 1).padStart(2, "0")
  const day = String(dateObject.getDate()).padStart(2, "0")
  const hours = String(dateObject.getHours()).padStart(2, "0")
  const minutes = String(dateObject.getMinutes()).padStart(2, "0")

  return `${year}-${month}-${day}T${hours}:${minutes}`
}

/**
 * Guarda la tarea del modal creando o actualizando según exista o no taskId.
 */
async function saveTaskFromModal() {
  const taskId = document.getElementById("taskId")?.value?.trim()
  const originalProjectId = document.getElementById("taskProjectId")?.value?.trim()
  const selectedProjectId = document.getElementById("taskProjectSelect")?.value?.trim()
  const title = document.getElementById("taskTitle")?.value?.trim()
  const description = document.getElementById("taskDescription")?.value?.trim() || null
  const rawDateDeadline = document.getElementById("taskDeadline")?.value
  const dateDeadline = rawDateDeadline ? `${rawDateDeadline}:00` : null
  const saveTaskButtonElement = document.getElementById("saveTaskButton")

  if (!title) {
    alert("El título es obligatorio")
    return
  }

  if (!selectedProjectId) {
    alert("Debes seleccionar un proyecto")
    return
  }

  const originalButtonLabel = saveTaskButtonElement?.textContent

  try {
    if (saveTaskButtonElement) {
      saveTaskButtonElement.disabled = true
      saveTaskButtonElement.textContent = taskId ? "Guardando..." : "Creando..."
    }

    if (taskId) {
      const taskToEdit = findTaskById(taskId)

      if (!taskToEdit) {
        throw new Error("No se encontró la tarea a editar")
      }

      await api.tasks.update(originalProjectId || selectedProjectId, taskId, {
        title,
        description,
        dateDeadline,
        completed: !!taskToEdit.completed,
      })
    } else {
      await api.tasks.create(selectedProjectId, {
        title,
        description,
        dateDeadline,
      })
    }

    closeTaskModal()
    await loadTasksFromApi()
  } catch (error) {
    console.error("Error guardando tarea:", error)
    console.error("Status:", error?.status)
    console.error("Respuesta backend:", error?.data)

    alert(`No se pudo guardar la tarea: ${error?.message ?? "Error desconocido"}`)
  } finally {
    if (saveTaskButtonElement) {
      saveTaskButtonElement.disabled = false
      saveTaskButtonElement.textContent = originalButtonLabel ?? "Guardar"
    }
  }
}

/**
 * Busca una tarea concreta en el caché local usando su id.
 */
function findTaskById(taskId) {
  return cachedTasksList.find((taskItem) => String(taskItem?.id) === String(taskId))
}

/**
 * Marca una tarea como completada reutilizando los datos actuales para cumplir la firma de update.
 */
async function markTaskAsComplete(taskId, completeTaskButtonElement) {
  if (!taskId) return
  if (!globalThis.confirm("¿Marcar esta tarea como completada?")) return

  const taskToComplete = findTaskById(taskId)

  if (!taskToComplete) {
    alert("No se encontró la tarea")
    return
  }

  if (!taskToComplete.projectId) {
    alert("La tarea no tiene proyecto asociado")
    return
  }

  const originalButtonLabel = completeTaskButtonElement?.textContent

  try {
    if (completeTaskButtonElement) {
      completeTaskButtonElement.disabled = true
      completeTaskButtonElement.textContent = "Completando..."
    }

    await api.tasks.update(taskToComplete.projectId, taskToComplete.id, {
      title: taskToComplete.title,
      description: taskToComplete.description,
      priority: taskToComplete.priority,
      dateDeadline: taskToComplete.dateDeadline,
      completed: true,
    })

    await loadTasksFromApi()
  } catch (error) {
    console.error("Error completando tarea:", error)
    alert(`No se pudo completar la tarea: ${error?.message ?? "Error desconocido"}`)

    if (completeTaskButtonElement) {
      completeTaskButtonElement.disabled = false
      completeTaskButtonElement.textContent = originalButtonLabel ?? "Completar"
    }
  }
}

/**
 * Elimina una tarea tras confirmación del usuario y recarga la lista al terminar.
 */
async function deleteTask(taskId, deleteTaskButtonElement) {
  if (!taskId) return
  if (!globalThis.confirm("¿Seguro que quieres borrar esta tarea?")) return

  const taskToDelete = findTaskById(taskId)

  if (!taskToDelete) {
    alert("No se encontró la tarea")
    return
  }

  if (!taskToDelete.projectId) {
    alert("La tarea no tiene proyecto asociado")
    return
  }

  const originalButtonLabel = deleteTaskButtonElement?.textContent

  try {
    if (deleteTaskButtonElement) {
      deleteTaskButtonElement.disabled = true
      deleteTaskButtonElement.textContent = "Borrando..."
    }

    await api.tasks.delete(taskToDelete.projectId, taskToDelete.id)
    await loadTasksFromApi()
  } catch (error) {
    console.error("Error borrando tarea:", error)
    alert(`No se pudo borrar la tarea: ${error?.message ?? "Error desconocido"}`)

    if (deleteTaskButtonElement) {
      deleteTaskButtonElement.disabled = false
      deleteTaskButtonElement.textContent = originalButtonLabel ?? "Borrar"
    }
  }
}
