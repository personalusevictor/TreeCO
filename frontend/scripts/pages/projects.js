/* ═══════════════════════════════════════════════
   TREECO — projects.js  v2
   scripts/pages/projects.js
   ═══════════════════════════════════════════════ */

	 const API_BASE = "http://localhost:8080"

	 const state = {
		 user:            null,
		 projects:        [],
		 currentProject:  null,
		 currentRole:     null,   // rol del usuario actual en el proyecto seleccionado
		 tasks:           [],
		 members:         [],
		 taskFilter:      "all",
		 taskSearch:      "",
		 taskSort:        "none",
		 editingProjectId: null,
		 editingTaskId:    null,
		 confirmCb:        null,
	 }
	 
	 /* ── Paleta ──────────────────────────────────── */
	 const PROJ_COLORS   = ["#3ddc84","#4d9fff","#f5a623","#ff6b6b","#bf7fff","#00d4ff","#ff9f7f","#6ee7b7"]
	 const AVATAR_COLORS = ["#3ddc84","#4d9fff","#f5a623","#ff6b6b","#bf7fff","#00d4ff","#ff9f7f"]
	 const projColor   = p   => PROJ_COLORS[Math.abs(p.id||0) % PROJ_COLORS.length]
	 const avatarColor = id  => AVATAR_COLORS[Math.abs(id||0) % AVATAR_COLORS.length]
	 
	 /* ── Utils ───────────────────────────────────── */
	 function esc(s) {
		 return String(s||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")
	 }
	 function fmtDate(s) {
		 if (!s) return "—"
		 const [y,m,d] = s.substring(0,10).split("-")
		 return `${d}/${m}/${y}`
	 }
	 function today0() { const d=new Date(); d.setHours(0,0,0,0); return d }
	 function taskState(t) {
		 if (t.completed) return "done"
		 if (t.dateDeadline && new Date(t.dateDeadline.substring(0,10)+"T00:00:00") < today0()) return "exp"
		 return "active"
	 }
	 function daysUntil(s) {
		 if (!s) return null
		 return Math.round((new Date(s.substring(0,10)+"T00:00:00") - today0()) / 86400000)
	 }
	 
	 /* ── HTTP ────────────────────────────────────── */
	 async function api(method, path, body) {
		 const opts = { method, headers: {"Content-Type":"application/json"} }
		 if (body) opts.body = JSON.stringify(body)
		 const r = await fetch(API_BASE + path, opts)
		 const data = await r.json()
		 if (!r.ok) throw new Error(data.error || "Error del servidor")
		 return data
	 }
	 const GET    = p     => api("GET",   p)
	 const POST   = (p,b) => api("POST",  p, b)
	 const PATCH  = (p,b) => api("PATCH", p, b)
	 const DELETE = p     => api("DELETE",p)
	 
	 /* ── Toast ───────────────────────────────────── */
	 function toast(msg, type="ok") {
		 const el = document.createElement("div")
		 el.className = `toast ${type}`
		 el.innerHTML = `<span class="toast-dot"></span>${esc(msg)}`
		 document.getElementById("toast-container").appendChild(el)
		 setTimeout(() => {
			 el.classList.add("out")
			 el.addEventListener("animationend", () => el.remove(), {once:true})
		 }, 2800)
	 }
	 
	 /* ── Modales ─────────────────────────────────── */
	 const openModal  = id => document.getElementById(id).classList.add("open")
	 const closeModal = id => document.getElementById(id).classList.remove("open")
	 
	 function showConfirm(name, warn, cb) {
		 document.getElementById("confirm-text").innerHTML =
			 `¿Seguro que quieres eliminar <span class="confirm-name">${esc(name)}</span>?`
		 document.getElementById("confirm-warn").textContent = warn || ""
		 state.confirmCb = cb
		 openModal("modal-confirm")
	 }
	 
	 /* ── Auth ────────────────────────────────────── */
	 function loadUser() {
		 try {
			 const raw = localStorage.getItem("treeco_user")
			 if (!raw) { location.replace("index.html"); return false }
			 state.user = JSON.parse(raw)
			 return true
		 } catch { location.replace("index.html"); return false }
	 }
	 
	 /* ════════════════════════════════════════════════
			PROYECTOS
	 ════════════════════════════════════════════════ */
	 async function loadProjects() {
		 const list = document.getElementById("project-list")
		 list.innerHTML = `<div class="sidebar-loading"><div class="spinner"></div></div>`
		 try {
			 const uid = state.user?.userId || state.user?.id
			 if (!uid) { location.replace("index.html"); return }
			 state.projects = await GET(`/projects?userId=${uid}`)
			 renderSidebar()
		 } catch(e) {
			 list.innerHTML = `<p class="empty-sidebar-msg">Error cargando proyectos</p>`
			 toast(e.message, "err")
		 }
	 }
	 
	 function filteredSidebarProjects() {
		 const q = document.getElementById("sidebar-search")?.value?.toLowerCase() || ""
		 return q ? state.projects.filter(p => p.name.toLowerCase().includes(q)) : state.projects
	 }
	 
	 function renderSidebar() {
		 const list = document.getElementById("project-list")
		 const footer = document.getElementById("proj-count-footer")
		 const visible = filteredSidebarProjects()
		 footer.textContent = `${state.projects.length} proyecto${state.projects.length!==1?"s":""}`
	 
		 if (!state.projects.length) {
			 list.innerHTML = `<p class="empty-sidebar-msg">Sin proyectos aún.<br>Crea uno con el botón +</p>`
			 return
		 }
		 if (!visible.length) {
			 list.innerHTML = `<p class="empty-sidebar-msg">Sin resultados</p>`
			 return
		 }
	 
		 list.innerHTML = ""
		 visible.forEach(p => {
			 const col      = projColor(p)
			 const isActive = state.currentProject?.id === p.id
			 const el       = document.createElement("div")
			 el.className   = `proj-item${isActive?" active":""}`
			 el.dataset.id  = p.id
			 const showActions = isActive && state.currentRole === "OWNER"
			 el.innerHTML   = `
				 <span class="proj-item-dot" style="background:${col};color:${col}"></span>
				 <div class="proj-item-body">
					 <div class="proj-item-name">${esc(p.name)}</div>
					 <div class="proj-item-sub">${p.progress??0}% completado</div>
				 </div>
				 <div class="proj-item-actions" style="${showActions?'':'display:none'}">
					 <button class="btn-row-action" data-action="rename" title="Renombrar">
						 <svg width="10" height="10" viewBox="0 0 14 14" fill="none">
							 <path d="M9.5 2.5L11.5 4.5L5 11H3V9L9.5 2.5Z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/>
						 </svg>
					 </button>
					 <button class="btn-row-action del" data-action="delete" title="Eliminar">
						 <svg width="10" height="10" viewBox="0 0 14 14" fill="none">
							 <path d="M2 4h10M5 4V2.5a.5.5 0 01.5-.5h3a.5.5 0 01.5.5V4M3 4l.8 7.2A1 1 0 004.8 12h4.4a1 1 0 001-.8L11 4" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>
						 </svg>
					 </button>
				 </div>`
			 el.addEventListener("click", e => {
				 if (e.target.closest("[data-action]")) return
				 selectProject(p)
			 })
			 el.querySelectorAll("[data-action]").forEach(btn => {
				 btn.addEventListener("click", e => {
					 e.stopPropagation()
					 if (btn.dataset.action === "rename") openProjectModal(p)
					 if (btn.dataset.action === "delete") handleDeleteProject(p)
				 })
			 })
			 list.appendChild(el)
		 })
	 }
	 
	 async function selectProject(p) {
		 state.currentProject = p
		 state.currentRole    = null
		 document.getElementById("proj-empty").style.display  = "none"
		 document.getElementById("proj-detail").style.display = "block"
		 renderProjectHeader(p)
		 document.querySelectorAll(".proj-item").forEach(el =>
			 el.classList.toggle("active", Number(el.dataset.id) === p.id))
		 await Promise.all([loadTasks(), loadMembers()])
		 applyPermissions()
		 initInvitePanel()  // re-init con miembros ya cargados
		 renderCalendarTab()
	 }
	 
	 function renderProjectHeader(p) {
		 document.getElementById("detail-dot").style.background = projColor(p)
		 document.getElementById("detail-name").textContent     = p.name
		 document.getElementById("detail-desc").textContent     = p.description || "Sin descripción"
	 }
	 
	 /**
		* Muestra u oculta controles según el rol del usuario en el proyecto actual.
		* OWNER  → todo visible (renombrar, eliminar, invitar, quitar miembros)
		* ADMIN  → puede invitar y quitar miembros, pero NO renombrar ni eliminar proyecto
		* MEMBER → solo lectura, sin ningún control de gestión
		*/
	 function applyPermissions() {
		 const role    = state.currentRole || "MEMBER"
		 const isOwner = role === "OWNER"
		 const isAdmin = role === "OWNER" || role === "ADMIN"
	 
		 // Renombrar y eliminar proyecto — solo OWNER
		 const btnRename = document.getElementById("btn-rename-proj")
		 const btnDelete = document.getElementById("btn-delete-proj")
		 if (btnRename) btnRename.style.display = isOwner ? "" : "none"
		 if (btnDelete) btnDelete.style.display = isOwner ? "" : "none"
	 
		 // Panel de invitar — OWNER y ADMIN
		 const invitePanel = document.querySelector(".invite-panel")
		 if (invitePanel) invitePanel.style.display = isAdmin ? "" : "none"
	 
		 // Los botones del sidebar se gestionan en renderSidebar con state.currentRole
	 }
	 
	 function updateProgress() {
		 const total   = state.tasks.length
		 const done    = state.tasks.filter(t => t.completed).length
		 const expired = state.tasks.filter(t => taskState(t) === "exp").length
		 const active  = total - done - expired
		 const pct     = total ? Math.round(done/total*100) : 0
	 
		 document.getElementById("detail-progress").style.width = pct+"%"
		 document.getElementById("detail-pct").textContent      = pct+"%"
	 
		 document.getElementById("progress-breakdown").innerHTML = `
			 <div class="pb-item"><span class="pb-dot" style="background:#6ee7b7"></span>${done} completadas</div>
			 <div class="pb-item"><span class="pb-dot" style="background:#60a5fa"></span>${active} en curso</div>
			 ${expired ? `<div class="pb-item"><span class="pb-dot" style="background:#fb923c"></span>${expired} vencidas</div>` : ""}
		 `
	 
		 // Stats en el header
		 document.getElementById("proj-header-stats").innerHTML = `
			 <div class="stat-block">
				 <div class="stat-value">${total}</div>
				 <div class="stat-label">Tareas</div>
			 </div>
			 <div class="stat-divider"></div>
			 <div class="stat-block">
				 <div class="stat-value" style="color:var(--color-text-accent)">${pct}%</div>
				 <div class="stat-label">Progreso</div>
			 </div>
			 <div class="stat-divider"></div>
			 <div class="stat-block">
				 <div class="stat-value">${state.members.length}</div>
				 <div class="stat-label">Miembros</div>
			 </div>
		 `
	 
		 if (state.currentProject) {
			 state.currentProject.progress = pct
			 const idx = state.projects.findIndex(x => x.id === state.currentProject.id)
			 if (idx > -1) state.projects[idx].progress = pct
			 renderSidebar()
			 document.querySelectorAll(".proj-item").forEach(el =>
				 el.classList.toggle("active", Number(el.dataset.id) === state.currentProject.id))
		 }
	 }
	 
	 /* ── Crear / Editar proyecto ── */
	 function openProjectModal(p) {
		 state.editingProjectId = p ? p.id : null
		 document.getElementById("modal-proj-eyebrow").textContent = p ? "Renombrar" : "Nuevo proyecto"
		 document.getElementById("modal-proj-title").textContent   = p ? "¿Cómo lo renombramos?" : "¿Cómo se llama?"
		 document.getElementById("proj-input-name").value          = p?.name || ""
		 document.getElementById("proj-input-desc").value          = p?.description || ""
		 openModal("modal-project")
		 setTimeout(() => document.getElementById("proj-input-name").focus(), 80)
	 }
	 
	 document.getElementById("btn-save-project").addEventListener("click", async () => {
		 const name = document.getElementById("proj-input-name").value.trim()
		 const desc = document.getElementById("proj-input-desc").value.trim()
		 if (!name) { toast("El nombre es obligatorio", "err"); return }
		 try {
			 if (state.editingProjectId) {
				 const uid     = state.user?.userId || state.user?.id
				 const updated = await PATCH(`/projects/${state.editingProjectId}`,
					 {name, description:desc, requestingUserId: uid})
				 const idx = state.projects.findIndex(p => p.id === state.editingProjectId)
				 if (idx > -1) state.projects[idx] = {...state.projects[idx], ...updated}
				 if (state.currentProject?.id === state.editingProjectId) {
					 state.currentProject = {...state.currentProject, ...updated}
					 renderProjectHeader(state.currentProject)
				 }
				 toast("Proyecto renombrado ✓")
			 } else {
				 const uid     = state.user?.userId || state.user?.id
				 const created = await POST("/projects", {name, description:desc, userId:uid})
				 state.projects.unshift(created)
				 toast("Proyecto creado ✓")
			 }
			 renderSidebar()
			 closeModal("modal-project")
		 } catch(e) { toast(e.message,"err") }
	 })
	 
	 function handleDeleteProject(p) {
		 showConfirm(p.name, "Se eliminarán todas sus tareas y miembros.", async () => {
			 try {
				 const uid = state.user?.userId || state.user?.id
				 await DELETE(`/projects/${p.id}?requestingUserId=${uid}`)
				 state.projects = state.projects.filter(x => x.id !== p.id)
				 if (state.currentProject?.id === p.id) {
					 state.currentProject = null
					 document.getElementById("proj-detail").style.display = "none"
					 document.getElementById("proj-empty").style.display  = "flex"
				 }
				 renderSidebar()
				 toast("Proyecto eliminado")
			 } catch(e) { toast(e.message,"err") }
		 })
	 }
	 
	 /* ════════════════════════════════════════════════
			TAREAS
	 ════════════════════════════════════════════════ */
	 async function loadTasks() {
		 const board = document.getElementById("kanban-board")
		 board.innerHTML = `<div style="grid-column:1/-1;display:flex;justify-content:center;padding:40px"><div class="spinner"></div></div>`
		 try {
			 state.tasks = await GET(`/projects/${state.currentProject.id}/tasks`)
			 document.getElementById("tc-tasks").textContent = state.tasks.length
			 renderKanban()
			 updateProgress()
		 } catch(e) {
			 board.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:32px;color:rgba(255,255,255,0.2)">Error: ${esc(e.message)}</div>`
		 }
	 }
	 
	 function getVisibleTasks() {
		 let tasks = [...state.tasks]
		 // Filtro por estado
		 if (state.taskFilter !== "all") {
			 tasks = tasks.filter(t => {
				 const s = taskState(t)
				 if (state.taskFilter === "COMPLETED")   return s === "done"
				 if (state.taskFilter === "EXPIRED")     return s === "exp"
				 if (state.taskFilter === "IN_PROGRESS") return s === "active"
				 return true
			 })
		 }
		 // Búsqueda
		 if (state.taskSearch) {
			 const q = state.taskSearch.toLowerCase()
			 tasks = tasks.filter(t =>
				 t.title?.toLowerCase().includes(q) ||
				 t.description?.toLowerCase().includes(q))
		 }
		 // Ordenar
		 if (state.taskSort === "priority") {
			 const order = {HIGH:0, MID:1, LOW:2}
			 tasks.sort((a,b) => (order[a.priority]??1) - (order[b.priority]??1))
		 } else if (state.taskSort === "deadline") {
			 tasks.sort((a,b) => {
				 if (!a.dateDeadline) return 1
				 if (!b.dateDeadline) return -1
				 return a.dateDeadline.localeCompare(b.dateDeadline)
			 })
		 } else if (state.taskSort === "name") {
			 tasks.sort((a,b) => a.title.localeCompare(b.title))
		 }
		 return tasks
	 }
	 
	 function renderKanban() {
		 const cols = {
			 active: {label:"En curso",    dot:"#60a5fa", tasks:[]},
			 exp:    {label:"Vencidas",    dot:"#fb923c", tasks:[]},
			 done:   {label:"Completadas", dot:"#3ddc84", tasks:[]},
		 }
		 getVisibleTasks().forEach(t => cols[taskState(t)].tasks.push(t))
	 
		 const board = document.getElementById("kanban-board")
		 board.innerHTML = ""
	 
		 Object.entries(cols).forEach(([key, col]) => {
			 const colEl = document.createElement("div")
			 colEl.className = "kanban-col"
			 colEl.innerHTML = `
				 <div class="kanban-col-head">
					 <div class="kanban-col-label">
						 <span class="col-status-dot" style="background:${col.dot}"></span>
						 ${col.label}
					 </div>
					 <span class="kanban-col-count">${col.tasks.length}</span>
				 </div>
				 <div class="kanban-cards" id="col-${key}"></div>
				 <button class="col-add-btn" data-col="${key}">
					 <svg width="9" height="9" viewBox="0 0 10 10" fill="none">
						 <path d="M5 1V9M1 5H9" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
					 </svg>
					 Añadir tarea
				 </button>`
			 colEl.querySelector(".col-add-btn").addEventListener("click", () => openTaskModal(null))
			 board.appendChild(colEl)
	 
			 const cards = document.getElementById(`col-${key}`)
			 if (!col.tasks.length) {
				 cards.innerHTML = `<div class="col-empty">Sin tareas</div>`
			 } else {
				 col.tasks.forEach((t,i) => {
					 const card = buildTaskCard(t)
					 card.style.animationDelay = `${i*30}ms`
					 cards.appendChild(card)
				 })
			 }
		 })
	 }
	 
	 function buildTaskCard(t) {
		 const st      = taskState(t)
		 const prioKey = st==="done" ? "done" : st==="exp" ? "exp" : (t.priority||"MID")
		 const prioLbl = st==="done" ? "Hecha" : st==="exp" ? "Vencida"
			 : {HIGH:"Alta",MID:"Media",LOW:"Baja"}[t.priority] || "Media"
	 
		 // Fecha límite
		 let dlHtml = ""
		 if (t.dateDeadline) {
			 const days = daysUntil(t.dateDeadline)
			 let cls = ""
			 if (!t.completed && days !== null) {
				 if (days < 0) cls="expired"
				 else if (days <= 3) cls="soon"
			 }
			 dlHtml = `<span class="task-deadline ${cls}">${days!==null&&days<0?"⚠":"📅"} ${fmtDate(t.dateDeadline)}</span>`
		 }
	 
		 // Assignee
		 let assigneeHtml = ""
		 if (t.assignedTo) {
			 const initials = (t.assignedTo.username||"?").substring(0,2).toUpperCase()
			 const col      = avatarColor(t.assignedTo.id||0)
			 const myId     = state.user?.userId || state.user?.id
			 const isMe     = t.assignedTo.id === myId
			 assigneeHtml = `
				 <div class="task-assignee-wrap" title="Asignado a ${esc(t.assignedTo.username)}">
					 <span class="task-assignee-bubble" style="background:${col}">${initials}</span>
					 <span class="task-assignee-name">${isMe ? "Yo" : esc(t.assignedTo.username)}</span>
				 </div>`
		 }
	 
		 const card = document.createElement("div")
		 card.className = `task-card${t.completed?" completed":""}`
		 card.innerHTML = `
			 <div class="task-card-top">
				 <div class="task-card-title">${esc(t.title)}</div>
				 <div class="task-card-btns">
					 <button class="task-card-btn" data-action="edit" title="Editar">
						 <svg width="10" height="10" viewBox="0 0 14 14" fill="none">
							 <path d="M9.5 2.5L11.5 4.5L5 11H3V9L9.5 2.5Z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/>
						 </svg>
					 </button>
					 <button class="task-card-btn" data-action="toggle" title="${t.completed?"Reabrir":"Completar"}">
						 <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
							 ${t.completed
								 ? `<path d="M10 3L5 9L2 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>`
								 : `<path d="M2 6h8M7 3l3 3-3 3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>`}
						 </svg>
					 </button>
					 <button class="task-card-btn del" data-action="delete" title="Eliminar">
						 <svg width="10" height="10" viewBox="0 0 14 14" fill="none">
							 <path d="M2 4h10M5 4V2.5a.5.5 0 01.5-.5h3a.5.5 0 01.5.5V4M3 4l.8 7.2A1 1 0 004.8 12h4.4a1 1 0 001-.8L11 4" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>
						 </svg>
					 </button>
				 </div>
			 </div>
			 ${t.description ? `<div class="task-card-desc">${esc(t.description)}</div>` : ""}
			 <div class="task-card-footer">
				 <div class="task-card-meta">
					 <span class="prio-chip prio-${prioKey}">${prioLbl}</span>
					 ${dlHtml}
				 </div>
				 ${assigneeHtml}
			 </div>`
	 
		 card.querySelector("[data-action='edit']").addEventListener("click",   e => { e.stopPropagation(); openTaskModal(t) })
		 card.querySelector("[data-action='toggle']").addEventListener("click", e => { e.stopPropagation(); toggleTask(t) })
		 card.querySelector("[data-action='delete']").addEventListener("click", e => { e.stopPropagation(); handleDeleteTask(t) })
		 return card
	 }
	 
	 /* ── Modal tarea ── */
	 function openTaskModal(t) {
		 state.editingTaskId = t ? t.id : null
		 document.getElementById("modal-task-eyebrow").textContent = t ? "Editar tarea" : "Nueva tarea"
		 document.getElementById("modal-task-title").textContent   = t ? "Modificar detalles" : "Detalles de la tarea"
		 document.getElementById("task-input-title").value         = t?.title || ""
		 document.getElementById("task-input-desc").value          = t?.description || ""
		 document.getElementById("task-input-priority").value      = t?.priority || "MID"
		 document.getElementById("task-input-deadline").value      = t?.dateDeadline?.substring(0,10) || ""
	 
		 // Llenar select de asignados con miembros del proyecto
		 const sel = document.getElementById("task-input-assignee")
		 sel.innerHTML = `<option value="">Sin asignar</option>`
		 state.members.forEach(m => {
			 const uid   = m.user?.id
			 const uname = m.user?.username || `Usuario #${uid}`
			 const opt   = document.createElement("option")
			 opt.value   = uid
			 opt.textContent = uname
			 if (t?.assignedTo?.id === uid) opt.selected = true
			 sel.appendChild(opt)
		 })
	 
		 openModal("modal-task")
		 setTimeout(() => document.getElementById("task-input-title").focus(), 80)
	 }
	 
	 document.getElementById("btn-save-task").addEventListener("click", async () => {
		 const title      = document.getElementById("task-input-title").value.trim()
		 const desc       = document.getElementById("task-input-desc").value.trim()
		 const priority   = document.getElementById("task-input-priority").value
		 const deadline   = document.getElementById("task-input-deadline").value || null
		 const assigneeEl = document.getElementById("task-input-assignee")
		 const assignedToId = assigneeEl?.value ? parseInt(assigneeEl.value) : null
	 
		 if (!title) { toast("El título es obligatorio","err"); return }
	 
		 try {
			 if (state.editingTaskId) {
				 // -1 = desasignar explícitamente si se seleccionó "Sin asignar"
				 const assignId = assigneeEl?.value === "" ? -1 : assignedToId
				 const updated = await PATCH(`/projects/${state.currentProject.id}/tasks/${state.editingTaskId}`,
					 {title, description:desc, priority, dateDeadline:deadline, assignedToId: assignId})
				 const idx = state.tasks.findIndex(t => t.id === state.editingTaskId)
				 if (idx > -1) state.tasks[idx] = updated
				 toast("Tarea actualizada ✓")
			 } else {
				 const created = await POST(`/projects/${state.currentProject.id}/tasks`,
					 {title, description:desc, priority, dateDeadline:deadline, assignedToId})
				 state.tasks.unshift(created)
				 document.getElementById("tc-tasks").textContent = state.tasks.length
				 toast("Tarea creada ✓")
			 }
			 closeModal("modal-task")
			 renderKanban()
			 updateProgress()
			 renderCalendarTab()
		 } catch(e) { toast(e.message,"err") }
	 })
	 
	 async function toggleTask(t) {
		 try {
			 const updated = await PATCH(`/projects/${state.currentProject.id}/tasks/${t.id}`, {completed:!t.completed})
			 const idx = state.tasks.findIndex(x => x.id === t.id)
			 if (idx > -1) state.tasks[idx] = updated
			 renderKanban()
			 updateProgress()
			 renderCalendarTab()
			 toast(updated.completed ? "Completada ✓" : "Reabierta", updated.completed ? "ok" : "info")
		 } catch(e) { toast(e.message,"err") }
	 }
	 
	 function handleDeleteTask(t) {
		 showConfirm(t.title, "", async () => {
			 try {
				 await DELETE(`/projects/${state.currentProject.id}/tasks/${t.id}`)
				 state.tasks = state.tasks.filter(x => x.id !== t.id)
				 document.getElementById("tc-tasks").textContent = state.tasks.length
				 renderKanban()
				 updateProgress()
				 renderCalendarTab()
				 toast("Tarea eliminada")
			 } catch(e) { toast(e.message,"err") }
		 })
	 }
	 
	 /* ════════════════════════════════════════════════
			MIEMBROS
	 ════════════════════════════════════════════════ */
	 async function loadMembers() {
		 const grid = document.getElementById("members-grid")
		 grid.innerHTML = `<div style="display:flex;justify-content:center;padding:28px"><div class="spinner"></div></div>`
		 try {
			 state.members = await GET(`/projects/${state.currentProject.id}/members`)
			 document.getElementById("tc-members").textContent = state.members.length
	 
			 // Detectar rol del usuario actual en este proyecto
			 const myId = state.user?.userId || state.user?.id
			 const me   = state.members.find(m => (m.user?.id || m.userId) === myId)
			 state.currentRole = me?.role || "MEMBER"
	 
			 renderMembers()
			 // Actualizar el stat de miembros en el header ahora que tenemos el dato real
			 updateProgress()
		 } catch(e) {
			 grid.innerHTML = `<p class="members-empty">Error cargando miembros</p>`
			 toast(e.message,"err")
		 }
	 }
	 
	 function renderMembers() {
		 const grid = document.getElementById("members-grid")
		 grid.innerHTML = ""
		 if (!state.members.length) {
			 grid.innerHTML = `<p class="members-empty">Sin miembros aún — invita a alguien →</p>`
			 return
		 }
		 state.members.forEach((m, i) => {
			 const uid     = m.user?.id || 0
			 const uname   = m.user?.username || m.user?.email || `Usuario #${uid}`
			 const col     = avatarColor(uid)
			 const initials = uname.substring(0,2).toUpperCase()
			 const isMe    = uid === (state.user?.userId || state.user?.id)
			 const isOwner = m.role === "OWNER"
	 
			 const row = document.createElement("div")
			 row.className = "member-row"
			 row.style.animationDelay = `${i*40}ms`
			 row.innerHTML = `
				 <div class="member-avatar" style="background:${col}">${initials}</div>
				 <div class="member-info">
					 <div class="member-name">${esc(uname)}${isMe?` <span style="color:var(--color-text-accent);font-size:0.65rem">(tú)</span>`:""}</div>
					 <div class="member-sub">ID #${uid}</div>
				 </div>
				 <span class="member-role-badge role-${m.role}">${m.role}</span>
				 ${!isOwner && !isMe ? `
					 <button class="btn-row-action del" data-uid="${uid}" title="Quitar miembro" style="margin-left:4px">
						 <svg width="9" height="9" viewBox="0 0 12 12" fill="none">
							 <path d="M1.5 1.5L10.5 10.5M10.5 1.5L1.5 10.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
						 </svg>
					 </button>` : ""}
			 `
			 const rmBtn = row.querySelector("[data-uid]")
			 if (rmBtn) {
				 rmBtn.addEventListener("click", () => {
					 showConfirm(uname, "", async () => {
						 try {
							 await DELETE(`/projects/${state.currentProject.id}/members/${uid}`)
							 state.members = state.members.filter(x => (x.user?.id||x.userId) !== uid)
							 document.getElementById("tc-members").textContent = state.members.length
							 renderMembers()
							 updateProgress()
							 toast("Miembro eliminado")
						 } catch(e) { toast(e.message,"err") }
					 })
				 })
			 }
			 grid.appendChild(row)
		 })
	 }
	 
	 /* ════════════════════════════════════════════════
			INVITAR MIEMBROS — búsqueda por nombre/email
	 ════════════════════════════════════════════════ */
	 let inviteDebounce  = null
	 let inviteSelected  = null  // { id, username, email }
	 
	 function initInvitePanel() {
		 const searchInput = document.getElementById("invite-search")
		 const results     = document.getElementById("invite-results")
		 const spinner     = document.getElementById("invite-spinner")
		 const selectedBox = document.getElementById("invite-selected")
		 const selectedUser= document.getElementById("invite-selected-user")
	 
		 if (!searchInput) return
	 
		 searchInput.addEventListener("input", () => {
			 const q = searchInput.value.trim()
			 clearTimeout(inviteDebounce)
	 
			 // Reset selección si el usuario escribe de nuevo
			 if (inviteSelected) {
				 inviteSelected = null
				 selectedBox.style.display = "none"
			 }
	 
			 if (q.length < 2) {
				 results.style.display = "none"
				 results.innerHTML = ""
				 spinner.style.display = "none"
				 return
			 }
	 
			 spinner.style.display = "flex"
			 results.style.display = "none"
	 
			 inviteDebounce = setTimeout(async () => {
				 try {
					 const users = await GET(`/api/users/search?q=${encodeURIComponent(q)}`)
					 spinner.style.display = "none"
					 renderSearchResults(users, results, selectedBox, selectedUser, searchInput)
				 } catch(e) {
					 spinner.style.display = "none"
					 results.innerHTML = `<div class="invite-no-results">Error buscando usuarios</div>`
					 results.style.display = "block"
				 }
			 }, 320)
		 })
	 
		 // Cerrar resultados al click fuera
		 document.addEventListener("click", e => {
			 if (!e.target.closest(".invite-panel")) {
				 results.style.display = "none"
			 }
		 })
	 }
	 
	 function renderSearchResults(users, resultsEl, selectedBox, selectedUser, searchInput) {
		 const memberIds = new Set(state.members.map(m => m.user?.id))
		 const myId      = state.user?.userId || state.user?.id
	 
		 // Filtrar: no mostrar al usuario actual ni a quienes ya son miembros
		 const filtered = users.filter(u => u.id !== myId)
	 
		 resultsEl.innerHTML = ""
	 
		 if (!filtered.length) {
			 resultsEl.innerHTML = `<div class="invite-no-results">Sin resultados para esa búsqueda</div>`
			 resultsEl.style.display = "block"
			 return
		 }
	 
		 filtered.forEach(u => {
			 const alreadyMember = memberIds.has(u.id)
			 const col     = avatarColor(u.id)
			 const initials = u.username.substring(0,2).toUpperCase()
	 
			 const item = document.createElement("div")
			 item.className = `invite-result-item${alreadyMember?" already-member":""}`
			 item.innerHTML = `
				 <div class="invite-result-avatar" style="background:${col}">${initials}</div>
				 <div class="invite-result-info">
					 <div class="invite-result-name">${esc(u.username)}</div>
					 <div class="invite-result-email">${esc(u.email)}</div>
				 </div>
				 ${alreadyMember ? `<span class="invite-result-badge">Ya miembro</span>` : ""}`
	 
			 if (!alreadyMember) {
				 item.addEventListener("click", () => {
					 inviteSelected = u
					 resultsEl.style.display = "none"
					 searchInput.value = u.username
	 
					 // Mostrar preview del usuario seleccionado
					 selectedUser.innerHTML = `
						 <div class="invite-result-avatar" style="background:${col};width:28px;height:28px;font-size:0.65rem">${initials}</div>
						 <div class="invite-result-info">
							 <div class="invite-result-name">${esc(u.username)}</div>
							 <div class="invite-result-email">${esc(u.email)}</div>
						 </div>`
					 selectedBox.style.display = "flex"
				 })
			 }
			 resultsEl.appendChild(item)
		 })
	 
		 resultsEl.style.display = "block"
	 }
	 
	 document.getElementById("btn-add-member").addEventListener("click", async () => {
		 if (!inviteSelected) {
			 toast("Selecciona un usuario de los resultados", "err")
			 return
		 }
		 const role            = document.getElementById("input-member-role").value
		 const invitedByUserId = state.user?.userId || state.user?.id
		 try {
			 const member = await POST(`/projects/${state.currentProject.id}/members`,
				 {userId: inviteSelected.id, role, invitedByUserId})
			 state.members.push(member)
			 document.getElementById("tc-members").textContent = state.members.length
			 renderMembers()
			 updateProgress()
			 // Reset panel
			 document.getElementById("invite-search").value     = ""
			 document.getElementById("invite-selected").style.display = "none"
			 document.getElementById("invite-results").style.display  = "none"
			 inviteSelected = null
			 toast(`${member.user?.username || "Usuario"} invitado ✓`)
		 } catch(e) { toast(e.message,"err") }
	 })
	 
	 /* ════════════════════════════════════════════════
			TAB CALENDARIO
	 ════════════════════════════════════════════════ */
	 function renderCalendarTab() {
		 const btn = document.getElementById("btn-go-calendar")
		 if (btn) btn.onclick = () => location.href = `calendar.html?projectId=${state.currentProject.id}`
	 
		 const container = document.getElementById("cal-redirect-upcoming")
		 if (!container) return
	 
		 const myId = state.user?.userId || state.user?.id
	 
		 // Solo tareas sin asignar o asignadas al usuario actual
		 const myTasks = state.tasks.filter(t => {
			 if (!t.assignedTo) return true
			 return Number(t.assignedTo.id) === Number(myId)
		 })
	 
		 const upcoming = myTasks
			 .filter(t => !t.completed && t.dateDeadline)
			 .map(t => ({...t, _d: daysUntil(t.dateDeadline)}))
			 .filter(t => t._d !== null && t._d >= 0)
			 .sort((a,b) => a._d - b._d)
			 .slice(0, 6)
	 
		 const expired = myTasks.filter(t =>
			 !t.completed && t.dateDeadline && daysUntil(t.dateDeadline) < 0)
	 
		 if (!upcoming.length && !expired.length) {
			 container.innerHTML = `<p class="upcoming-empty">Sin fechas límite próximas para ti</p>`
			 return
		 }
	 
		 let html = `<p class="upcoming-title">Mis próximas fechas límite</p><div class="upcoming-list">`
	 
		 if (expired.length) {
			 html += `<div class="upcoming-row">
				 <span class="up-side" style="background:var(--color-error)"></span>
				 <div class="up-info"><span class="up-name">${expired.length} tarea${expired.length>1?"s":""} vencida${expired.length>1?"s":""}</span></div>
				 <span class="up-badge badge-urgent">Vencidas</span>
			 </div>`
		 }
	 
		 upcoming.forEach(t => {
			 const cls = t._d===0?"badge-today":t._d<=2?"badge-urgent":t._d<=7?"badge-soon":"badge-normal"
			 const lbl = t._d===0?"Hoy":t._d===1?"Mañana":`${t._d}d`
			 const bar = t.priority==="HIGH"?"#ff8888":t.priority==="LOW"?"#6ee7b7":"#fbbf24"
			 html += `<div class="upcoming-row" data-tid="${t.id}">
				 <span class="up-side" style="background:${bar}"></span>
				 <div class="up-info">
					 <span class="up-name">${esc(t.title)}</span>
					 <span class="up-date">${fmtDate(t.dateDeadline)}</span>
				 </div>
				 <span class="up-badge ${cls}">${lbl}</span>
			 </div>`
		 })
	 
		 html += `</div>`
		 container.innerHTML = html
		 container.querySelectorAll("[data-tid]").forEach(el => {
			 el.addEventListener("click", () => {
				 const t = state.tasks.find(x => x.id === parseInt(el.dataset.tid))
				 if (t) openTaskModal(t)
			 })
		 })
	 }
	 
	 /* ════════════════════════════════════════════════
			EVENTOS
	 ════════════════════════════════════════════════ */
	 function bindEvents() {
		 // Sidebar
		 document.getElementById("btn-new-project").addEventListener("click",   () => openProjectModal(null))
		 document.getElementById("btn-empty-create").addEventListener("click",  () => openProjectModal(null))
		 document.getElementById("sidebar-search").addEventListener("input",    () => renderSidebar())
	 
		 // Cabecera proyecto
		 document.getElementById("btn-rename-proj").addEventListener("click", () => {
			 if (state.currentProject) openProjectModal(state.currentProject)
		 })
		 document.getElementById("btn-delete-proj").addEventListener("click", () => {
			 if (state.currentProject) handleDeleteProject(state.currentProject)
		 })
	 
		 // Controles de tareas
		 document.getElementById("btn-add-task").addEventListener("click", () => openTaskModal(null))
		 document.getElementById("task-search").addEventListener("input", e => {
			 state.taskSearch = e.target.value.trim()
			 renderKanban()
		 })
		 document.getElementById("task-sort").addEventListener("change", e => {
			 state.taskSort = e.target.value
			 renderKanban()
		 })
		 document.querySelectorAll("#tasks-filters .filter-chip").forEach(btn => {
			 btn.addEventListener("click", () => {
				 document.querySelectorAll("#tasks-filters .filter-chip").forEach(b => b.classList.remove("active"))
				 btn.classList.add("active")
				 state.taskFilter = btn.dataset.filter
				 renderKanban()
			 })
		 })
	 
		 // Tabs
		 document.querySelectorAll(".tab-pill").forEach(btn => {
			 btn.addEventListener("click", () => {
				 document.querySelectorAll(".tab-pill").forEach(b => b.classList.remove("active"))
				 document.querySelectorAll(".tab-pane").forEach(p => p.classList.remove("active"))
				 btn.classList.add("active")
				 document.getElementById("tab-" + btn.dataset.tab).classList.add("active")
			 })
		 })
	 
		 // Modales — cierre
		 document.getElementById("modal-proj-close").addEventListener("click",     () => closeModal("modal-project"))
		 document.getElementById("modal-proj-cancel").addEventListener("click",    () => closeModal("modal-project"))
		 document.getElementById("modal-task-close").addEventListener("click",     () => closeModal("modal-task"))
		 document.getElementById("modal-task-cancel").addEventListener("click",    () => closeModal("modal-task"))
		 document.getElementById("modal-confirm-close").addEventListener("click",  () => closeModal("modal-confirm"))
		 document.getElementById("modal-confirm-cancel").addEventListener("click", () => closeModal("modal-confirm"))
		 document.getElementById("btn-confirm-delete").addEventListener("click", () => {
			 if (state.confirmCb) { state.confirmCb(); state.confirmCb = null }
			 closeModal("modal-confirm")
		 })
		 document.querySelectorAll(".modal-overlay").forEach(ov =>
			 ov.addEventListener("click", e => { if (e.target === ov) closeModal(ov.id) }))
		 document.addEventListener("keydown", e => {
			 if (e.key === "Escape") ["modal-project","modal-task","modal-confirm"].forEach(closeModal)
		 })
	 }
	 
	 /* ── Init ────────────────────────────────────── */
	 document.addEventListener("DOMContentLoaded", async () => {
		 if (!loadUser()) return
		 bindEvents()
		 initInvitePanel()
		 await loadProjects()
	 })