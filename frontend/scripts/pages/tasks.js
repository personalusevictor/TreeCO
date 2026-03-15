import { api, requireAuth } from "../core/api.js"
import { getUser } from "../core/session.js"

/**
 * Títulos de sección para cada categoría de la barra lateral.
 * Se usan para actualizar el encabezado visible al cambiar de categoría.
 * @type {Record<string, string>}
 */
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

/** Caché de las tareas cargadas desde la API para evitar refetch al filtrar. */
let cachedTasksList = []

/**
 * Mapa de ID de proyecto → nombre de proyecto.
 * Se construye al cargar proyectos y se reutiliza al renderizar tarjetas.
 * @type {Record<string | number, string>}
 */
let projectIdToNameMap = {}

/**
 * Estado global de los filtros activos en la página.
 * Se actualiza desde la barra lateral, los selectores y el buscador.
 */
const taskFilters = {
  search: "", // Texto de búsqueda introducido por el usuario, normalizado a minúsculas
  state: "all", // Estado seleccionado para filtrar tareas: "all" | "in_progress" | "completed" | "expired"
  priority: "all", // Prioridad seleccionada para filtrar tareas: "all" | "high" | "mid" | "low"
  project: "all", // Identificador del proyecto seleccionado o "all" si no hay filtro de proyecto
  sort: "deadline", // Criterio de ordenación activo: "deadline" | "priority" | "title" | "created"
  category: "in_progress", // Categoría actualmente activa en la barra lateral
}

// ─────────────────────────────────────────────────────────────────────────────
// INICIALIZACIÓN
// ─────────────────────────────────────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", () => {
  requireAuth()
  setupTaskPageEventListeners()
  loadTasksFromApi()
})

/**
 * Registra todos los listeners de la página:
 * - Buscador de tareas
 * - Selectores de filtro (estado, prioridad, proyecto, ordenación)
 * - Botón "Nueva tarea"
 * - Botones de la barra lateral (categorías)
 * - Delegación de eventos para editar y completar tareas
 */
function setupTaskPageEventListeners() {
  document.getElementById("searchTask")?.addEventListener("input", (inputEvent) => {
    taskFilters.search = String(inputEvent.target.value ?? "")
      .toLowerCase()
      .trim()
    applyTaskFilters()
  })

  document.getElementById("filterState")?.addEventListener("change", (changeEvent) => {
    taskFilters.state = changeEvent.target.value

    // Relaciona cada valor del selector de estado con la categoría equivalente de la barra lateral
    const categoryByStateValue = { all: "all", in_progress: "in_progress", completed: "completed", expired: "expired" }

    taskFilters.category = categoryByStateValue[taskFilters.state] ?? "all"
    updateActiveSidebarCategoryButton()
    updateTasksSectionTitle()
    applyTaskFilters()
  })

  document.getElementById("filterPriority")?.addEventListener("change", (changeEvent) => {
    taskFilters.priority = changeEvent.target.value
    applyTaskFilters()
  })

  document.getElementById("filterProject")?.addEventListener("change", (changeEvent) => {
    taskFilters.project = changeEvent.target.value
    applyTaskFilters()
  })

  document.getElementById("sortTasks")?.addEventListener("change", (changeEvent) => {
    taskFilters.sort = changeEvent.target.value
    applyTaskFilters()
  })

  document.getElementById("newTaskButton")?.addEventListener("click", () => {
    globalThis.location.href = "/tasks/create.html"
  })

  // Registra un listener en cada botón de categoría de la barra lateral
  document.querySelectorAll(".tasksSidebarLink").forEach((sidebarCategoryButton) => {
    sidebarCategoryButton.addEventListener("click", () => applySidebarCategory(sidebarCategoryButton.dataset.category ?? "all"))
  })

  // Usa delegación de eventos para manejar clicks en botones dinámicos de editar y completar
  document.addEventListener("click", async (clickEvent) => {
    const editTaskButton = clickEvent.target.closest(".editTask")
    const completeTaskButton = clickEvent.target.closest(".completeTask")

    if (editTaskButton) {
      if (!editTaskButton.dataset.id) return
      globalThis.location.href = `/tasks/edit.html?id=${encodeURIComponent(editTaskButton.dataset.id)}`
      return
    }

    if (completeTaskButton) {
      await markTaskAsComplete(completeTaskButton.dataset.id, completeTaskButton)
    }
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// CARGA DE DATOS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Carga tareas y proyectos del usuario desde la API.
 * Actualiza el caché local, el mapa de proyectos y dispara el filtrado inicial.
 * Muestra un mensaje de error en el contenedor si algo falla.
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

    if (!authenticatedUserId) throw new Error("No se pudo identificar al usuario")

    const [tasksApiResponse, projectsApiResponse] = await Promise.all([api.users.getTasks(authenticatedUserId), api.projects.getByUser(authenticatedUserId)])

    cachedTasksList = Array.isArray(tasksApiResponse) ? tasksApiResponse : []
    const userProjectsList = Array.isArray(projectsApiResponse) ? projectsApiResponse : []

    // Construye el mapa id→nombre para poder mostrar el nombre del proyecto en cada tarjeta de tarea
    projectIdToNameMap = Object.fromEntries(userProjectsList.filter((projectItem) => projectItem?.id != null).map((projectItem) => [projectItem.id, projectItem.name ?? "Proyecto sin nombre"]))

    populateProjectFilterOptions(userProjectsList)

    // Restablece los filtros principales al cargar datos nuevos desde la API
    taskFilters.category = "all"
    taskFilters.state = "all"
    const stateFilterSelectElement = document.getElementById("filterState")
    if (stateFilterSelectElement) stateFilterSelectElement.value = "all"

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

// ─────────────────────────────────────────────────────────────────────────────
// FILTRADO Y CATEGORÍAS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Aplica la categoría seleccionada desde la barra lateral.
 * Traduce la categoría a los filtros correspondientes y sincroniza los selectores del DOM.
 * @param {string} selectedSidebarCategory - Valor del atributo data-category del botón pulsado.
 */
function applySidebarCategory(selectedSidebarCategory) {
  // Reinicia los filtros dependientes antes de aplicar la nueva categoría elegida en la barra lateral
  taskFilters.category = selectedSidebarCategory
  taskFilters.state = "all"
  taskFilters.priority = "all"
  taskFilters.project = "all"

  if (["in_progress", "completed", "expired"].includes(selectedSidebarCategory)) {
    taskFilters.state = selectedSidebarCategory
  } else if (["high", "mid", "low"].includes(selectedSidebarCategory)) {
    taskFilters.priority = selectedSidebarCategory
  } else if (selectedSidebarCategory.startsWith("project:")) {
    taskFilters.project = selectedSidebarCategory.replace("project:", "")
  }

  // Refleja los nuevos valores de filtro en los selectores visibles del formulario
  const setSelectValueById = (selectElementId, selectedValue) => {
    const selectElement = document.getElementById(selectElementId)
    if (selectElement) selectElement.value = selectedValue
  }

  setSelectValueById("filterState", taskFilters.state)
  setSelectValueById("filterPriority", taskFilters.priority)
  setSelectValueById("filterProject", taskFilters.project)

  updateActiveSidebarCategoryButton()
  updateTasksSectionTitle()
  applyTaskFilters()
}

/**
 * Marca como activo el botón de la barra lateral cuya categoría coincide con el filtro actual.
 */
function updateActiveSidebarCategoryButton() {
  document.querySelectorAll(".tasksSidebarLink").forEach((sidebarCategoryButton) => {
    sidebarCategoryButton.classList.toggle("tasksSidebarLinkActive", sidebarCategoryButton.dataset.category === taskFilters.category)
  })
}

/**
 * Actualiza el título visible de la sección de tareas según la categoría activa.
 */
function updateTasksSectionTitle() {
  const tasksSectionTitleElement = document.getElementById("tasksSectionTitle")
  if (tasksSectionTitleElement) tasksSectionTitleElement.textContent = CATEGORY_SECTION_TITLES[taskFilters.category] ?? "Tareas"
}

/**
 * Filtra, ordena y renderiza las tareas del caché según el estado actual de `taskFilters`.
 * También actualiza las estadísticas mostradas en la cabecera.
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
    filteredTasksList = filteredTasksList.filter((taskItem) => normalizeTaskState(taskItem?.state) === taskFilters.state)
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

// ─────────────────────────────────────────────────────────────────────────────
// RENDERIZADO
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Renderiza la lista de tarjetas de tareas en el contenedor principal.
 * Si no hay tareas, muestra el estado vacío.
 * @param {object[]} filteredAndSortedTasksList - Lista de tareas ya filtradas y ordenadas.
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

  filteredAndSortedTasksList.forEach((taskItem) => tasksContainerElement.appendChild(buildTaskCardElement(taskItem)))
}

/**
 * Actualiza los contadores de estadísticas (en progreso, vencidas, completadas, alta prioridad)
 * basándose en la lista de tareas actualmente filtrada.
 * @param {object[]} filteredTasksList - Lista de tareas filtradas actualmente visible en pantalla.
 */
function renderTasksStatistics(filteredTasksList) {
  const statisticsByElementId = {
    statInProgress: filteredTasksList.filter((taskItem) => normalizeTaskState(taskItem?.state) === "in_progress").length,
    statExpired: filteredTasksList.filter((taskItem) => normalizeTaskState(taskItem?.state) === "expired").length,
    statWithDeadline: filteredTasksList.filter((taskItem) => !!taskItem?.completed).length,
    statHigh: filteredTasksList.filter((taskItem) => normalizeTaskPriority(taskItem?.priority) === "high").length,
  }

  for (const [statisticElementId, totalStatisticValue] of Object.entries(statisticsByElementId)) {
    const statisticElement = document.getElementById(statisticElementId)
    if (statisticElement) statisticElement.textContent = totalStatisticValue
  }
}

/**
 * Rellena el selector de proyectos con las opciones disponibles para el usuario.
 * @param {object[]} availableProjectsList - Lista de proyectos disponibles del usuario.
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

// ─────────────────────────────────────────────────────────────────────────────
// CONSTRUCCIÓN DE TARJETAS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Construye el elemento DOM de una tarjeta de tarea.
 * Incluye título, proyecto, descripción, estado, fecha límite y acciones.
 * @param {object} taskData - Objeto de tarea recibido desde la API.
 * @returns {HTMLElement} Elemento `<article>` listo para insertar en el DOM.
 */
function buildTaskCardElement(taskData) {
  // Resuelve el nombre del proyecto usando primero la propia tarea y, si no existe, el mapa de proyectos cargado en memoria
  let resolvedProjectName = taskData?.projectName ?? taskData?.project?.name

  if (!resolvedProjectName && taskData?.projectId != null) {
    resolvedProjectName = projectIdToNameMap[taskData.projectId]
  }

  resolvedProjectName ??= "Sin proyecto"

  // Convierte la fecha límite en un texto legible para mostrarlo en la tarjeta
  const formattedDeadlineText = (() => {
    if (!taskData?.dateDeadline) return "Sin fecha"
    const deadlineDateObject = new Date(taskData.dateDeadline)
    if (Number.isNaN(deadlineDateObject.getTime())) return String(taskData.dateDeadline)
    return deadlineDateObject
      .toLocaleString("es-ES", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
      .replaceAll(",", " ·")
  })()

  // Calcula la etiqueta de tiempo relativa al vencimiento, por ejemplo "Tiempo restante", "Vence en menos de 1h" o "Vencida hace..."
  const relativeDeadlineLabel = (() => {
    const normalizedTaskState = normalizeTaskState(taskData?.state)
    if (!taskData?.dateDeadline) return "Sin fecha límite"
    const deadlineDateObject = new Date(taskData.dateDeadline)
    if (Number.isNaN(deadlineDateObject.getTime())) return "Fecha inválida"

    const millisecondsUntilDeadline = deadlineDateObject.getTime() - Date.now()
    const absoluteMillisecondsDifference = Math.abs(millisecondsUntilDeadline)
    const remainingDays = Math.floor(absoluteMillisecondsDifference / (1000 * 60 * 60 * 24))
    const remainingHours = Math.floor((absoluteMillisecondsDifference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))

    if (normalizedTaskState === "completed") return "Completada"
    if (normalizedTaskState === "expired") {
      return remainingDays === 0 && remainingHours === 0 ? "Vencida hace menos de 1h" : `Vencida hace ${remainingDays}d ${remainingHours}h`
    }
    if (remainingDays === 0 && remainingHours === 0) {
      return millisecondsUntilDeadline < 0 ? "Vencida hace menos de 1h" : "Vence en menos de 1h"
    }
    return `Tiempo restante: ${remainingDays}d ${remainingHours}h`
  })()

  const normalizedTaskState = normalizeTaskState(taskData?.state)

  // Relaciona cada estado de tarea con su clase CSS correspondiente para la pastilla visual de estado
  const stateBadgeCssClass =
    {
      in_progress: "stateInProgress",
      completed: "stateCompleted",
      expired: "stateExpired",
    }[normalizedTaskState] ?? ""

  // Relaciona cada estado de tarea con la clase CSS del indicador visual de tiempo
  const timeStatusCssClass =
    {
      completed: "timeStatusCompleted",
      expired: "timeStatusExpired",
      in_progress: "timeStatusInProgress",
    }[normalizedTaskState] ?? "timeStatusNormal"

  // Relaciona cada estado interno de tarea con el texto visible que se mostrará al usuario
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
        <h3 class="taskCardTitle">${taskData?.title ?? "Sin título"}</h3>
        <p class="taskCardProject">Proyecto: ${resolvedProjectName}</p>
      </div>
    </div>
    <p class="taskCardDescription">${taskData?.description ?? "Sin descripción"}</p>
    <div class="taskCardBottom">
      <div class="taskCardMeta">
        <span class="taskCardState ${stateBadgeCssClass}">${stateLabelText}</span>
        <span class="taskCardDeadline">${formattedDeadlineText}</span>
        <span class="taskCardTimeStatus ${timeStatusCssClass}">${relativeDeadlineLabel}</span>
      </div>
      <div class="taskCardActions">
        <button data-id="${taskData?.id ?? ""}" class="editTask">Editar</button>
        ${normalizedTaskState === "completed" ? "" : `<button data-id="${taskData?.id ?? ""}" class="completeTask taskActionComplete">Completar</button>`}      </div>
    </div>
  `

  return taskCardElement
}

// ─────────────────────────────────────────────────────────────────────────────
// NORMALIZACIÓN Y ORDENACIÓN
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Normaliza el valor de prioridad de una tarea a uno de los valores canónicos.
 * @param {string} rawTaskPriorityValue - Valor original de prioridad recibido en la tarea.
 * @returns {"high" | "mid" | "low" | "unknown"}
 */
function normalizeTaskPriority(rawTaskPriorityValue) {
  const normalizedPriorityValue = String(rawTaskPriorityValue ?? "").toLowerCase()
  if (normalizedPriorityValue === "high") return "high"
  if (normalizedPriorityValue === "mid" || normalizedPriorityValue === "medium") return "mid"
  if (normalizedPriorityValue === "low") return "low"
  return "unknown"
}

/**
 * Normaliza el estado de una tarea al conjunto de valores canónicos usados en la UI.
 * @param {string} rawTaskStateValue - Valor original de estado recibido en la tarea.
 * @returns {"completed" | "in_progress" | "expired" | string}
 */
function normalizeTaskState(rawTaskStateValue) {
  const normalizedStateValue = String(rawTaskStateValue ?? "").toLowerCase()
  if (normalizedStateValue === "completed") return "completed"
  if (normalizedStateValue === "in_progress") return "in_progress"
  if (normalizedStateValue === "expired") return "expired"
  return normalizedStateValue
}

/**
 * Compara dos tareas para ordenarlas según el criterio activo.
 * Las tareas sin el campo de ordenación se mandan al final (MAX_SAFE_INTEGER).
 * @param {object} firstTaskToCompare - Primera tarea a comparar.
 * @param {object} secondTaskToCompare - Segunda tarea a comparar.
 * @param {"deadline" | "priority" | "title" | "created"} activeSortMode - Criterio de ordenación actualmente seleccionado.
 * @returns {number}
 */
function compareTasksForSort(firstTaskToCompare, secondTaskToCompare, activeSortMode) {
  const getPrioritySortWeight = (priorityValue) => ({ high: 0, mid: 1, low: 2 })[normalizeTaskPriority(priorityValue)] ?? 3
  const convertDateToTimestamp = (dateValue) => (dateValue ? new Date(dateValue).getTime() : Number.MAX_SAFE_INTEGER)

  if (activeSortMode === "priority") return getPrioritySortWeight(firstTaskToCompare?.priority) - getPrioritySortWeight(secondTaskToCompare?.priority)
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
  if (activeSortMode === "created") return convertDateToTimestamp(firstTaskToCompare?.createdAt) - convertDateToTimestamp(secondTaskToCompare?.createdAt)
  return convertDateToTimestamp(firstTaskToCompare?.dateDeadline) - convertDateToTimestamp(secondTaskToCompare?.dateDeadline)
}

// ─────────────────────────────────────────────────────────────────────────────
// ACCIONES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Marca una tarea como completada vía API tras confirmación del usuario.
 * Deshabilita el botón mientras espera y lo restaura si ocurre un error.
 * @param {string} taskId - Identificador de la tarea que se quiere completar.
 * @param {HTMLButtonElement} completeTaskButtonElement - Botón que disparó la acción de completar.
 */
async function markTaskAsComplete(taskId, completeTaskButtonElement) {
  if (!taskId) return
  if (!globalThis.confirm("¿Marcar esta tarea como completada?")) return

  const originalButtonLabel = completeTaskButtonElement?.textContent

  try {
    if (completeTaskButtonElement) {
      completeTaskButtonElement.disabled = true
      completeTaskButtonElement.textContent = "Completando..."
    }

    if (!api?.tasks?.update) throw new Error("No existe api.tasks.update(taskId, data)")
    await api.tasks.update(taskId, { state: "COMPLETED", completed: true })

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
