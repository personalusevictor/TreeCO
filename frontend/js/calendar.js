/* ═══════════════════════════════════════════════
   TREECO — Calendar JS  v6
   ═══════════════════════════════════════════════ */

	 const API_BASE = "http://localhost:8080";

	 const S = {
		 cur:      null,
		 sel:      null,
		 view:     "month",
		 tasks:    [],
		 projects: [],
		 projId:   "",
		 user:     null,
		 mFilter:  "all",
		 mTasks:   [],
		 pyear:    new Date().getFullYear(),
		 pmonth:   null,   // mes seleccionado en picker (pendiente de aplicar)
	 };
	 
	 let D = {};
	 
	 function initDOM() {
		 const g = id => document.getElementById(id);
		 D.grid       = g("cal-grid");
		 D.wdays      = g("cal-weekdays");
		 D.mname      = g("cal-month-name");
		 D.myear      = g("cal-year");
		 D.loading    = g("cal-loading");
		 D.prev       = g("cal-prev");
		 D.next       = g("cal-next");
		 D.btnToday   = g("btn-today");
		 D.vMonth     = g("view-month");
		 D.vWeek      = g("view-week");
		 D.projSel    = g("project-filter");
		 D.titleBtn   = g("cal-title-btn");
		 D.miniGrid   = g("mini-grid");
		 D.miniLbl    = g("mini-month-label");
		 D.miniPrev   = g("mini-prev");
		 D.miniNext   = g("mini-next");
		 D.miniLblBtn = g("mini-month-label-btn");
		 D.upList     = g("upcoming-list");
		 D.pickerBd   = g("picker-backdrop");
		 D.pickerMos  = g("picker-months");
		 D.pyInput    = g("picker-year-input");
		 D.pyPrev     = g("picker-year-prev");
		 D.pyNext     = g("picker-year-next");
		 D.pickerClose  = g("picker-close-btn");
		 D.pickerToday  = g("picker-today-btn");
		 D.pickerCancel = g("picker-cancel-btn");
		 D.pickerApply  = g("picker-apply-btn");
		 D.mOverlay   = g("day-modal-backdrop");
		 D.mDate      = g("modal-date-title");
		 D.mList      = g("modal-tasks-list");
		 D.mClose     = g("modal-close");
		 D.addBtn     = g("btn-add-task");
		 D.mStats     = g("modal-day-stats");
		 D.mFilters   = document.querySelector(".modal-filters");
		 D.search     = g("task-search");
		 D.sResults   = g("search-results");
		 D.navAvatar  = g("nav-avatar");
		 D.navName    = g("nav-name");
		 D.navRole    = g("nav-role");
		 D.toasts     = g("toast-container");
	 }
	 
	 /* ══════════════════════════════════════════════════
			INIT
	 ══════════════════════════════════════════════════ */
	 async function init() {
		 initDOM();
	 
		 const now = new Date();
		 S.cur   = new Date(now.getFullYear(), now.getMonth(), 1);
		 S.pyear = now.getFullYear();
	 
		 try {
			 const raw = sessionStorage.getItem("treeco_user");
			 if (raw) {
				 S.user = JSON.parse(raw);
				 if (D.navName)   D.navName.textContent  = S.user.username || S.user.email || "Usuario";
				 if (D.navRole)   D.navRole.textContent   = S.user.role    || "Rol";
				 if (D.navAvatar && S.user.avatarUrl) D.navAvatar.src = S.user.avatarUrl;
			 }
		 } catch(e) { console.warn("user:", e); }
	 
		 bindEvents();
		 render();
	 
		 await loadProjects();
		 await loadTasks();
		 render();
	 }
	 
	 /* ══════════════════════════════════════════════════
			API
	 ══════════════════════════════════════════════════ */
	 async function loadProjects() {
		 try {
			 const uid = S.user?.id;
			 const res = await fetch(uid ? `${API_BASE}/projects?userId=${uid}` : `${API_BASE}/projects`);
			 if (!res.ok) return;
			 S.projects = await res.json();
			 fillProjectSelect();
		 } catch(e) { console.warn("projects:", e); }
	 }
	 
	 async function loadTasks() {
		 setLoading(true);
		 S.tasks = [];
		 try {
			 const list = S.projId
				 ? S.projects.filter(p => String(p.id) === S.projId)
				 : S.projects;
			 const settled = await Promise.allSettled(
				 list.map(p => fetch(`${API_BASE}/projects/${p.id}/tasks`).then(r => r.ok ? r.json() : []))
			 );
			 settled.forEach((r, i) => {
				 if (r.status === "fulfilled") {
					 r.value.forEach(t => { t._pName = list[i].name; t._pId = list[i].id; });
					 S.tasks.push(...r.value);
				 }
			 });
		 } catch { toast("Error cargando tareas", "err"); }
		 finally { setLoading(false); }
	 }
	 
	 async function patchTask(task, patch) {
		 try {
			 const res = await fetch(`${API_BASE}/projects/${task._pId}/tasks/${task.id}`, {
				 method: "PATCH",
				 headers: { "Content-Type": "application/json" },
				 body: JSON.stringify(patch),
			 });
			 if (!res.ok) throw 0;
			 Object.assign(task, patch);
			 return true;
		 } catch { toast("No se pudo actualizar", "err"); return false; }
	 }
	 
	 /* ══════════════════════════════════════════════════
			RENDER
	 ══════════════════════════════════════════════════ */
	 function render() {
		 // renderWeek actualiza S.cur primero — mini cal debe ir después
		 S.view === "month" ? renderMonth() : renderWeek();
		 updateTitle();
		 renderMiniCal();
		 renderUpcoming();
	 }
	 
	 function updateTitle() {
		 D.mname.textContent = cap(getMonthName(S.cur));
		 D.myear.textContent = S.cur.getFullYear();
	 }
	 
	 function renderMonth() {
		 D.grid.innerHTML  = "";
		 D.grid.className  = "cal-grid";
		 D.wdays.innerHTML = "<span>Lun</span><span>Mar</span><span>Mié</span><span>Jue</span><span>Vie</span><span>Sáb</span><span>Dom</span>";
	 
		 const yr  = S.cur.getFullYear();
		 const mo  = S.cur.getMonth();
		 const dow = (new Date(yr, mo, 1).getDay() + 6) % 7;
	 
		 const heat = {};
		 S.tasks.forEach(t => {
			 const dl = parseDL(t);
			 if (dl && dl.getFullYear()===yr && dl.getMonth()===mo)
				 heat[dl.getDate()] = (heat[dl.getDate()]||0) + 1;
		 });
		 const maxH = Math.max(1, ...Object.values(heat));
	 
		 for (let i = dow-1; i >= 0; i--)
			 D.grid.appendChild(mkCell(new Date(yr,mo,-i), true, 0, 1));
		 const dim = new Date(yr,mo+1,0).getDate();
		 for (let d = 1; d <= dim; d++)
			 D.grid.appendChild(mkCell(new Date(yr,mo,d), false, heat[d]||0, maxH));
		 const total = dow + dim;
		 const cols  = Math.ceil(total/7)*7;
		 for (let i = 1; i <= cols-total; i++)
			 D.grid.appendChild(mkCell(new Date(yr,mo+1,i), true, 0, 1));
	 }
	 
	 function renderWeek() {
		 D.grid.innerHTML = "";
		 D.grid.className = "cal-grid week-view";
	 
		 const anchor = S.sel ? new Date(S.sel) : new Date();
		 const dow    = (anchor.getDay()+6)%7;
		 const mon    = new Date(anchor);
		 mon.setDate(anchor.getDate()-dow);
	 
		 const LBL = ["Lun","Mar","Mié","Jue","Vie","Sáb","Dom"];
		 D.wdays.innerHTML = "";
		 for (let i = 0; i < 7; i++) {
			 const d  = new Date(mon); d.setDate(mon.getDate()+i);
			 const iT = isSameDay(d, new Date());
			 const sp = document.createElement("span");
			 sp.style.cssText = "line-height:1.5;display:flex;flex-direction:column;align-items:center;gap:2px";
			 sp.innerHTML = `<span>${LBL[i]}</span><span style="font-family:var(--font-mono);font-size:.85rem;${iT?"color:var(--color-text-accent);font-weight:700":"color:rgba(255,255,255,.3)"}">${d.getDate()}</span>`;
			 D.wdays.appendChild(sp);
		 }
	 
		 S.cur = new Date(anchor.getFullYear(), anchor.getMonth(), 1);  // mes del día seleccionado, no del lunes
		 updateTitle();
	 
		 for (let i = 0; i < 7; i++) {
			 const d = new Date(mon); d.setDate(mon.getDate()+i);
			 const c = tasksFor(d).length;
			 D.grid.appendChild(mkCell(d, false, c, Math.max(1,c)));
		 }
	 }
	 
	 function mkCell(date, ghost, cnt, maxCnt) {
		 const tasks = tasksFor(date);
		 const isT   = isSameDay(date, new Date());
		 const isSel = isSameDay(date, S.sel);
	 
		 let hCls = "";
		 if (!ghost && cnt > 0) {
			 const r = cnt/maxCnt;
			 hCls = r>=.75?"h4":r>=.5?"h3":r>=.25?"h2":"h1";
		 }
	 
		 const cell = document.createElement("div");
		 cell.className = ["cal-day", ghost?"other-month":"", isT?"today":"", isSel?"selected":"", hCls]
			 .filter(Boolean).join(" ");
	 
		 const hdr = document.createElement("div");
		 hdr.className = "day-hdr";
		 const num = document.createElement("div");
		 num.className = "day-num";
		 num.textContent = date.getDate();
		 hdr.appendChild(num);
		 if (tasks.length) {
			 const c = document.createElement("span");
			 c.className = "day-cnt";
			 c.textContent = tasks.length;
			 hdr.appendChild(c);
		 }
		 cell.appendChild(hdr);
	 
		 const wrap = document.createElement("div");
		 wrap.className = "day-tasks";
		 const MAX = S.view==="week" ? 8 : 3;
		 tasks.slice(0,MAX).forEach(t => {
			 const st   = tState(t);
			 const cls  = st==="done"?"p-done":st==="exp"?"p-exp":"p-"+(t.priority||"MID");
			 const pill = document.createElement("div");
			 pill.className = `tpill ${cls}`;
			 pill.innerHTML = `<span class="tpill-dot"></span><span class="tpill-txt">${esc(t.title)}</span>`;
			 pill.addEventListener("click", e => { e.stopPropagation(); openModal(date); });
			 wrap.appendChild(pill);
		 });
		 if (tasks.length > MAX) {
			 const m = document.createElement("div");
			 m.className = "day-more";
			 m.textContent = `+${tasks.length-MAX} más`;
			 m.addEventListener("click", e => { e.stopPropagation(); openModal(date); });
			 wrap.appendChild(m);
		 }
		 cell.appendChild(wrap);
	 
		 cell.addEventListener("click", () => {
			 S.sel = date;
			 document.querySelectorAll(".cal-day.selected,.mini-day.selected")
				 .forEach(el => el.classList.remove("selected"));
			 cell.classList.add("selected");
			 renderMiniCal();
			 openModal(date);
		 });
	 
		 return cell;
	 }
	 
	 /* ══════════════════════════════════════════════════
			MINI CAL
	 ══════════════════════════════════════════════════ */
	 function renderMiniCal() {
		 const yr  = S.cur.getFullYear();
		 const mo  = S.cur.getMonth();
		 D.miniLbl.textContent = cap(getMonthName(S.cur)) + " " + yr;
		 D.miniGrid.innerHTML  = "";
	 
		 const dow = (new Date(yr,mo,1).getDay()+6)%7;
		 const dim = new Date(yr,mo+1,0).getDate();
	 
		 for (let i=dow-1; i>=0; i--) mkMiniDay(new Date(yr,mo,-i), true);
		 for (let d=1; d<=dim; d++)    mkMiniDay(new Date(yr,mo,d),  false);
		 const total = dow+dim;
		 for (let i=1; i<=Math.ceil(total/7)*7-total; i++) mkMiniDay(new Date(yr,mo+1,i), true);
	 }
	 
	 function mkMiniDay(date, ghost) {
		 const el = document.createElement("div");
		 el.className = ["mini-day",
			 ghost?"other-month":"",
			 isSameDay(date,new Date())?"today":"",
			 isSameDay(date,S.sel)?"selected":"",
			 tasksFor(date).length?"has-tasks":""]
			 .filter(Boolean).join(" ");
		 el.textContent = date.getDate();
		 el.addEventListener("click", () => {
			 S.sel = date;
			 S.cur = new Date(date.getFullYear(), date.getMonth(), 1);
			 render(); openModal(date);
		 });
		 D.miniGrid.appendChild(el);
	 }
	 
	 /* ══════════════════════════════════════════════════
			UPCOMING
	 ══════════════════════════════════════════════════ */
	 function renderUpcoming() {
		 const now = today();
		 const end = new Date(now); end.setDate(now.getDate()+7);
		 const list = S.tasks
			 .filter(t => {
				 if (t.completed) return false;
				 const dl = parseDL(t);
				 return dl && dl >= now && dl <= end;
			 })
			 .sort((a,b) => parseDL(a)-parseDL(b))
			 .slice(0,8);
	 
		 D.upList.innerHTML = "";
		 if (!list.length) {
			 D.upList.innerHTML = `<span class="empty-msg">Sin vencimientos esta semana 🌿</span>`;
			 return;
		 }
		 list.forEach(t => {
			 const d   = daysUntil(t);
			 const txt = d===0?"Hoy":d===1?"Mañana":`${d}d`;
			 const cls = d===0?"badge-today":d<=2?"badge-soon":"badge-normal";
			 const col = {HIGH:"rgba(255,100,100,.75)",MID:"rgba(251,191,36,.75)",LOW:"rgba(61,220,132,.75)"}[t.priority]||"rgba(251,191,36,.75)";
			 const el  = document.createElement("div");
			 el.className = "up-item";
			 el.innerHTML = `
				 <span class="up-bar" style="background:${col}"></span>
				 <div class="up-info">
					 <span class="up-title">${esc(t.title)}</span>
					 <span class="up-proj">${esc(t._pName||"")}</span>
				 </div>
				 <span class="up-badge ${cls}">${txt}</span>`;
			 el.addEventListener("click", () => {
				 const dl = parseDL(t);
				 if (!dl) return;
				 S.sel = dl; S.cur = new Date(dl.getFullYear(), dl.getMonth(), 1);
				 render(); openModal(dl);
			 });
			 D.upList.appendChild(el);
		 });
	 }
	 
	 /* ══════════════════════════════════════════════════
			MODAL DÍA
	 ══════════════════════════════════════════════════ */
	 function openModal(date) {
		 S.sel    = date;
		 S.mTasks = tasksFor(date);
		 S.mFilter = "all";
		 D.mFilters.querySelectorAll(".mf").forEach(b => b.classList.toggle("active", b.dataset.filter==="all"));
		 D.mDate.textContent = formatFull(date);
		 renderModalStats();
		 renderModalTasks();
		 D.mOverlay.classList.add("open");
	 }
	 
	 function renderModalStats() {
		 const now = today();
		 const c   = {HIGH:0,MID:0,LOW:0,done:0,exp:0};
		 S.mTasks.forEach(t => {
			 if (t.completed){c.done++;return;}
			 const dl=parseDL(t);
			 if (dl&&dl<now){c.exp++;return;}
			 c[t.priority||"MID"]++;
		 });
		 D.mStats.innerHTML = [
			 c.HIGH?`<span class="mds-chip mds-high">${c.HIGH}↑</span>`:"",
			 c.MID ?`<span class="mds-chip mds-mid">${c.MID}—</span>`:"",
			 c.LOW ?`<span class="mds-chip mds-low">${c.LOW}↓</span>`:"",
			 c.done?`<span class="mds-chip mds-done">${c.done}✓</span>`:"",
			 c.exp ?`<span class="mds-chip mds-exp">${c.exp}!</span>`:"",
		 ].join("");
	 }
	 
	 function renderModalTasks() {
		 const f = S.mFilter;
		 const list = S.mTasks.filter(t =>
			 f==="all" ? true : f==="completed" ? t.completed : !t.completed
		 );
		 D.mList.innerHTML = "";
		 if (!list.length) {
			 D.mList.innerHTML = `<div class="m-empty"><span class="m-empty-icon">📭</span>Sin tareas aquí</div>`;
			 return;
		 }
		 list.forEach(t => {
			 const st   = tState(t);
			 const tCls = st==="done"?"t-done":st==="exp"?"t-exp":"t-"+(t.priority||"MID");
			 const pt   = prioTag(t.priority, st);
			 const el   = document.createElement("div");
			 el.className = `m-task ${tCls}`;
			 el.innerHTML = `
				 <div class="m-bar"></div>
				 <div class="m-body">
					 <div class="m-title">${esc(t.title)}</div>
					 ${t.description?`<div class="m-desc">${esc(t.description)}</div>`:""}
					 <div class="m-meta">
						 <span class="m-tag ${pt.cls}">${pt.lbl}</span>
						 ${t._pName?`<span class="m-tag tag-proj">${esc(t._pName)}</span>`:""}
					 </div>
				 </div>
				 <div class="m-check">
					 <svg width="8" height="8" viewBox="0 0 10 10" fill="none">
						 <path d="M1.5 5L4 7.5L8.5 2.5" stroke="#3ddc84" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
					 </svg>
				 </div>`;
			 el.querySelector(".m-check").addEventListener("click", async e => {
				 e.stopPropagation();
				 const ok = await patchTask(t, { completed: !t.completed });
				 if (ok) {
					 toast(t.completed?"Tarea completada ✓":"Tarea reabierta","ok");
					 renderUpcoming();
					 S.view==="month"?renderMonth():renderWeek();
					 renderMiniCal();
					 renderModalStats();
					 renderModalTasks();
				 }
			 });
			 D.mList.appendChild(el);
		 });
	 }
	 
	 function closeModal() { D.mOverlay.classList.remove("open"); }
	 
	 /* ══════════════════════════════════════════════════
			PICKER
	 ══════════════════════════════════════════════════ */
	 const MES_S = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
	 const MES_F = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
	 
	 function openPicker() {
		 // Guardar estado previo para poder cancelar
		 S.pyear  = S.cur.getFullYear();
		 S.pmonth = S.cur.getMonth();
		 D.pyInput.value = S.pyear;
		 renderPickerMonths();
		 D.pickerBd.classList.add("open");
		 setTimeout(() => D.pyInput.focus(), 80);
	 }
	 
	 function closePicker() {
		 D.pickerBd.classList.remove("open");
	 }
	 
	 function applyPicker() {
		 if (S.pmonth === null) return;
		 S.cur = new Date(S.pyear, S.pmonth, 1);
		 closePicker();
		 render();
	 }
	 
	 function renderPickerMonths() {
		 D.pyInput.value = S.pyear;
		 D.pickerMos.innerHTML = "";
		 const nY = new Date().getFullYear(), nM = new Date().getMonth();
		 MES_S.forEach((m,i) => {
			 const btn = document.createElement("button");
			 btn.className   = "pm-btn";
			 btn.title       = MES_F[i];
			 btn.textContent = m;
			 // Mes de hoy real
			 if (S.pyear===nY && i===nM) btn.classList.add("is-today");
			 // Mes actualmente en el calendario (origen)
			 if (S.pyear===S.cur.getFullYear() && i===S.cur.getMonth()) btn.classList.add("is-origin");
			 // Mes seleccionado pendiente de aplicar
			 if (S.pyear===S.pyear && i===S.pmonth && S.pyear===S.pyear) {
				 if (S.pmonth === i) btn.classList.add("is-active");
			 }
			 btn.addEventListener("click", () => {
				 S.pmonth = i;
				 D.pickerMos.querySelectorAll(".pm-btn").forEach(b => b.classList.remove("is-active"));
				 btn.classList.add("is-active");
			 });
			 // Doble clic aplica directamente
			 btn.addEventListener("dblclick", applyPicker);
			 D.pickerMos.appendChild(btn);
		 });
	 }
	 
	 /* ══════════════════════════════════════════════════
			BÚSQUEDA
	 ══════════════════════════════════════════════════ */
	 function doSearch(q) {
		 if (!q || q.length<2) { D.sResults.classList.remove("open"); return; }
		 const lo   = q.toLowerCase();
		 const hits = S.tasks.filter(t =>
			 t.title.toLowerCase().includes(lo)||(t.description||"").toLowerCase().includes(lo)
		 ).slice(0,7);
	 
		 D.sResults.innerHTML = "";
		 if (!hits.length) {
			 D.sResults.innerHTML = `<div class="sr-item"><span class="sr-title" style="color:var(--color-text-muted)">Sin resultados</span></div>`;
			 D.sResults.classList.add("open"); return;
		 }
		 const PC = {HIGH:"#ff6464",MID:"#fbbf24",LOW:"#3ddc84"};
		 hits.forEach(t => {
			 const dl = parseDL(t);
			 const el = document.createElement("div");
			 el.className = "sr-item";
			 el.innerHTML = `
				 <span class="sr-dot" style="background:${PC[t.priority]||"#fbbf24"}"></span>
				 <span class="sr-title">${esc(t.title)}</span>
				 ${dl?`<span class="sr-date">${fmtShort(dl)}</span>`:""}`;
			 el.addEventListener("click", () => {
				 if (!dl) return;
				 S.sel=dl; S.cur=new Date(dl.getFullYear(),dl.getMonth(),1);
				 D.search.value=""; D.sResults.classList.remove("open");
				 render(); openModal(dl);
			 });
			 D.sResults.appendChild(el);
		 });
		 D.sResults.classList.add("open");
	 }
	 
	 /* ══════════════════════════════════════════════════
			EVENTOS
	 ══════════════════════════════════════════════════ */
	 function bindEvents() {
		 D.prev.addEventListener("click",     () => navigate(-1));
		 D.next.addEventListener("click",     () => navigate(+1));
		 D.btnToday.addEventListener("click", goToday);
		 D.miniPrev.addEventListener("click", () => navigate(-1));
		 D.miniNext.addEventListener("click", () => navigate(+1));
		 D.miniLblBtn.addEventListener("click", openPicker);
		 D.titleBtn.addEventListener("click",   openPicker);
		 D.pickerBd.addEventListener("click",   e => { if(e.target===D.pickerBd) closePicker(); });
		 D.pickerClose.addEventListener("click",  closePicker);
		 D.pickerCancel.addEventListener("click", closePicker);
		 D.pickerToday.addEventListener("click", () => {
			 const n = new Date();
			 S.pyear  = n.getFullYear();
			 S.pmonth = n.getMonth();
			 applyPicker();
		 });
		 D.pickerApply.addEventListener("click",  applyPicker);
		 // Enter en cualquier punto del picker aplica
		 D.pickerBd.addEventListener("keydown", e => {
			 if (e.key === "Enter") { e.preventDefault(); applyPicker(); }
		 });
		 D.pyPrev.addEventListener("click", () => { S.pyear--; renderPickerMonths(); });
		 D.pyNext.addEventListener("click", () => { S.pyear++; renderPickerMonths(); });
		 D.pyInput.addEventListener("input", () => {
			 const y = parseInt(D.pyInput.value, 10);
			 if (y>=2000 && y<=2099) { S.pyear=y; renderPickerMonths(); }
		 });
		 D.pyInput.addEventListener("keydown", e => {
			 if (e.key==="Enter")     { applyPicker(); }
			 if (e.key==="Escape")    { closePicker(); }
			 if (e.key==="ArrowUp")   { e.preventDefault(); S.pyear++; renderPickerMonths(); }
			 if (e.key==="ArrowDown") { e.preventDefault(); S.pyear--; renderPickerMonths(); }
		 });
		 D.vMonth.addEventListener("click", () => setView("month"));
		 D.vWeek.addEventListener("click",  () => setView("week"));
		 D.projSel.addEventListener("change", async () => {
			 S.projId = D.projSel.value;
			 await loadTasks(); render();
		 });
		 D.mClose.addEventListener("click", closeModal);
		 D.mOverlay.addEventListener("click", e => { if(e.target===D.mOverlay) closeModal(); });
		 D.addBtn.addEventListener("click", () => toast("Próximamente: crear tarea 🚀","ok"));
		 D.mFilters.addEventListener("click", e => {
			 const b = e.target.closest(".mf");
			 if (!b) return;
			 D.mFilters.querySelectorAll(".mf").forEach(x => x.classList.remove("active"));
			 b.classList.add("active");
			 S.mFilter = b.dataset.filter;
			 renderModalTasks();
		 });
		 D.search.addEventListener("input", () => doSearch(D.search.value.trim()));
		 D.search.addEventListener("blur",  () => setTimeout(() => D.sResults.classList.remove("open"), 180));
	 
		 document.addEventListener("keydown", e => {
			 const tag    = document.activeElement?.tagName?.toUpperCase();
			 const typing = tag==="INPUT"||tag==="SELECT"||tag==="TEXTAREA";
			 if (e.key==="Escape") {
				 if (D.mOverlay.classList.contains("open"))  { closeModal();  return; }
				 if (D.pickerBd.classList.contains("open"))  { closePicker(); return; }
			 }
			 if (typing) return;
			 switch(e.key) {
				 case "ArrowLeft":             navigate(-1);     break;
				 case "ArrowRight":            navigate(+1);     break;
				 case "t": case "T":           goToday();        break;
				 case "m": case "M":           setView("month"); break;
				 case "s": case "S":           setView("week");  break;
				 case "g": case "G":           openPicker();     break;
				 case "/": e.preventDefault(); D.search.focus(); break;
			 }
		 });
	 }
	 
	 /* ══════════════════════════════════════════════════
			NAVEGACIÓN
	 ══════════════════════════════════════════════════ */
	 function navigate(delta) {
		 if (S.view==="month") {
			 S.cur = new Date(S.cur.getFullYear(), S.cur.getMonth()+delta, 1);
		 } else {
			 const a = S.sel ? new Date(S.sel) : new Date();
			 a.setDate(a.getDate()+delta*7);
			 S.sel = new Date(a);
		 }
		 render();
	 }
	 
	 function goToday() {
		 const n = new Date();
		 S.cur = new Date(n.getFullYear(), n.getMonth(), 1);
		 S.sel = n;
		 if (S.view!=="month") setView("month"); else render();
	 }
	 
	 function setView(v) {
		 S.view = v;
		 D.vMonth.classList.toggle("active", v==="month");
		 D.vWeek.classList.toggle("active",  v==="week");
		 render();
	 }
	 
	 function fillProjectSelect() {
		 D.projSel.innerHTML = `<option value="">Todos los proyectos</option>`;
		 S.projects.forEach(p => {
			 const o = document.createElement("option");
			 o.value=p.id; o.textContent=p.name;
			 D.projSel.appendChild(o);
		 });
	 }
	 
	 function setLoading(on) {
		 D.loading.classList.toggle("on", on);
		 D.grid.style.opacity = on ? ".4" : "1";
	 }
	 
	 function toast(msg, type="ok") {
		 const el = document.createElement("div");
		 el.className = `toast ${type}`;
		 el.innerHTML = `<span class="toast-dot"></span>${esc(msg)}`;
		 D.toasts.appendChild(el);
		 setTimeout(() => {
			 el.classList.add("out");
			 el.addEventListener("animationend", () => el.remove(), {once:true});
		 }, 2600);
	 }
	 
	 /* ══════════════════════════════════════════════════
			UTILS
	 ══════════════════════════════════════════════════ */
	 function tasksFor(d)   { const s=dateStr(d); return S.tasks.filter(t=>{const dl=t.dateDeadline||t.dueDate; return dl&&dl.substring(0,10)===s;}); }
	 function parseDL(t)    { const s=t.dateDeadline||t.dueDate; if(!s)return null; const[y,m,d]=s.substring(0,10).split("-").map(Number); return new Date(y,m-1,d); }
	 function today()       { const d=new Date(); d.setHours(0,0,0,0); return d; }
	 function dateStr(d)    { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; }
	 function isSameDay(a,b){ return a&&b&&a.getFullYear()===b.getFullYear()&&a.getMonth()===b.getMonth()&&a.getDate()===b.getDate(); }
	 function daysUntil(t)  { const dl=parseDL(t); if(!dl)return null; return Math.round((dl-today())/86400000); }
	 function tState(t)     { if(t.completed)return"done"; const dl=parseDL(t); if(dl&&dl<today())return"exp"; return"active"; }
	 function prioTag(p,st) {
		 if(st==="done")return{lbl:"Hecha",  cls:"tag-done"};
		 if(st==="exp") return{lbl:"Vencida",cls:"tag-exp"};
		 return({HIGH:{lbl:"Alta",cls:"tag-HIGH"},MID:{lbl:"Media",cls:"tag-MID"},LOW:{lbl:"Baja",cls:"tag-LOW"}})[p]||{lbl:"Media",cls:"tag-MID"};
	 }
	 function getMonthName(d){ return d.toLocaleDateString("es-ES",{month:"long"}); }
	 function cap(s)         { return s.charAt(0).toUpperCase()+s.slice(1); }
	 function formatFull(d)  { return d.toLocaleDateString("es-ES",{weekday:"long",day:"numeric",month:"long",year:"numeric"}); }
	 function fmtShort(d)    { return d.toLocaleDateString("es-ES",{day:"numeric",month:"short",year:"numeric"}); }
	 function esc(s)         { return String(s||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }
	 
	 document.addEventListener("DOMContentLoaded", init);