/* ================================================================
   ESTADO GLOBAL
================================================================ */
const API = '';

let D = {
  presidentes: [], oradores: [], lectores: [], grupos: [],
  bosquejos: {},
  discursos: [],  // discursos especiales sin numero
  _presIds: [], _oradIds: [], _lectIds: [], _grupIds: [],
  schedule: [], setupDone: false, cursorDate: null,
  lectCola: [],  // cola de lectores con swap
  counters: { pres:0, orad:0, lect:0, hosp:0 }
};

let currentUser = null;

/* ================================================================
   API FETCH
================================================================ */
async function apiFetch(url, options = {}) {
  const res = await fetch(API + url, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options
  });
  if (!res.ok) throw await res.json();
  return res.json();
}

/* ================================================================
   AUTH
================================================================ */
async function checkAuth() {
  try {
    const res = await fetch(`${API}/auth/me`, { credentials: 'include' });
    ocultarCarga();
    if (!res.ok) { mostrarLogin(); return; }
    const user = await res.json();
    mostrarUsuario(user);
    await cargar();
  } catch(e) { ocultarCarga(); mostrarLogin(); }
}

function ocultarCarga() {
  const p = document.getElementById('loadingScreen');
  if (!p) return;
  p.style.opacity = '0';
  setTimeout(() => p.style.display = 'none', 500);
}

function mostrarLogin() {
  const authBar     = document.getElementById('authBar');
  const mainContent = document.getElementById('mainContent');
  if (authBar)     authBar.style.display     = 'none';
  if (mainContent) mainContent.style.display = 'none';
  let login = document.getElementById('loginScreen');
  if (!login) {
    login = document.createElement('div');
    login.id = 'loginScreen';
    login.innerHTML = `
      <div style="position:fixed;inset:0;background:#f7f8fa;display:flex;align-items:center;justify-content:center;z-index:999">
        <div style="background:#fff;border:1px solid #e2e4e9;border-radius:16px;padding:48px 40px;text-align:center;max-width:380px;width:90%;box-shadow:0 8px 32px rgba(0,0,0,.08)">
          <img src="/logo.png" style="width:110px;height:110px;margin:0 auto 20px;display:block;border-radius:20px">
          <div style="font-size:24px;font-weight:800;color:#1a2744;letter-spacing:1px;margin-bottom:6px">KingdomSched</div>
          <div style="font-size:13px;color:#6b7280;margin-bottom:36px">programa de Reuniones</div>
          <a href="/auth/google" style="display:flex;align-items:center;justify-content:center;gap:10px;background:#1a2744;color:#fff;text-decoration:none;padding:13px 20px;border-radius:8px;font-size:14px;font-weight:700">
            <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#fff" d="M44.5 20H24v8.5h11.8C34.7 33.9 29.8 37 24 37c-7.2 0-13-5.8-13-13s5.8-13 13-13c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 5.1 29.6 3 24 3 12.4 3 3 12.4 3 24s9.4 21 21 21c10.5 0 20-7.6 20-21 0-1.4-.1-2.7-.5-4z"/></svg>
            Iniciar sesion con Google
          </a>
          <p style="font-size:11px;color:#9ca3af;margin-top:24px">Solo usuarios autorizados</p>
        </div>
      </div>`;
    document.body.appendChild(login);
  }
  login.style.display = 'block';
}

function mostrarUsuario(user) {
  currentUser = user;
  const login = document.getElementById('loginScreen');
  if (login) login.style.display = 'none';
  document.getElementById('authBar').style.display     = 'flex';
  document.getElementById('mainContent').style.display = 'block';
  document.getElementById('userName').textContent      = user.nombre;
  const foto = document.getElementById('userFoto');
  if (user.foto) { foto.src = user.foto; foto.style.display = 'block'; }
}

async function logout() {
  await fetch('/auth/logout', { credentials: 'include' });
  mostrarLogin();
}

/* ================================================================
   NOTIFICACIONES
================================================================ */
function mostrarNotif(msg, tipo = 'info') {
  const el = document.createElement('div');
  el.textContent = msg;
  el.style.cssText = `position:fixed;bottom:24px;right:24px;z-index:9999;
    padding:12px 20px;border-radius:8px;font-size:13px;font-weight:600;
    color:#fff;box-shadow:0 4px 16px rgba(0,0,0,.15);
    background:${tipo==='error'?'#991b1b':tipo==='ok'?'#1a6b3a':'#1a2744'};`;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3000);
}

/* ================================================================
   CARGAR DATOS
================================================================ */
async function cargar() {
  try {
    const [participantes, grupos, schedule, bosquejos, discursosData] = await Promise.all([
      apiFetch('/api/participantes'),
      apiFetch('/api/grupos'),
      apiFetch('/api/schedule'),
      apiFetch('/api/bosquejos'),
      apiFetch('/api/discursos').catch(()=>[])
    ]);
    D._presIds = participantes.filter(p => p.tipo === 'presidente');
    D._oradIds = participantes.filter(p => p.tipo === 'orador');
    D._lectIds = participantes.filter(p => p.tipo === 'lector');
    D._grupIds = grupos;
    D.presidentes = D._presIds.map(p => p.nombre);
    D.oradores    = D._oradIds.map(p => p.nombre);
    D.lectores    = D._lectIds.map(p => p.nombre);
    D.grupos      = D._grupIds.map(g => g.nombre);
    D.bosquejos   = Object.fromEntries(bosquejos.map(b => [String(b.id), b.tema]));
    D.discursos   = discursosData || [];
    D.schedule    = schedule.map(r => ({ ...r, bosquejo: r.bosquejoId ? String(r.bosquejoId) : '', tema: r.tema || '' }));
    D.setupDone   = D.schedule.length > 0;
    if (D.schedule.length > 0) {
      const last = new Date(D.schedule[D.schedule.length-1].fecha + 'T00:00:00');
      last.setDate(last.getDate() + 7);
      D.cursorDate = last.toISOString().slice(0,10);
    }
    init();
  } catch(e) { console.error('Error cargando datos:', e); }
}

async function guardarSchedule() {
  try {
    const rows = D.schedule.map((r, i) => ({
      fecha: r.fecha, presidente: r.presidente||null, orador: r.orador||null,
      oradorZoom: r.oradorZoom||false, bosquejoId: r.bosquejo?Number(r.bosquejo):null,
      tema: r.tema||null, lector: r.lector||null, hospitalidad: r.hospitalidad||null,
      eventType: r.eventType||null, orden: i
    }));
    await apiFetch('/api/schedule/bulk', { method:'POST', body: JSON.stringify({ rows }) });
  } catch(e) { console.error('Error guardando schedule:', e); }
}

/* ================================================================
   UTIL
================================================================ */
function esc(s) {
  return (s||'').toString().replace(/[&<>"']/g, c =>
    ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function soloNombre(s) { return (s||'').toString().split(' ')[0]; }
function fmtFecha(iso) {
  const d = new Date(iso+'T00:00:00');
  const M = ['ENERO','FEBRERO','MARZO','ABRIL','MAYO','JUNIO','JULIO','AGOSTO','SEPTIEMBRE','OCTUBRE','NOVIEMBRE','DICIEMBRE'];
  return `${String(d.getDate()).padStart(2,'0')}<br>${M[d.getMonth()]}`;
}
function fmtFechaPlano(iso) {
  const d = new Date(iso+'T00:00:00');
  const M = ['ENE','FEB','MAR','ABR','MAY','JUN','JUL','AGO','SEP','OCT','NOV','DIC'];
  return `${String(d.getDate()).padStart(2,'0')} ${M[d.getMonth()]}`;
}
function guionHtml() { return '<span class="muted-cell">----</span>'; }

/* ================================================================
   NAV SIDEBAR
================================================================ */
const hamburgerBtn = document.getElementById('hamburgerBtn');
const sidebar      = document.getElementById('sidebar');
const navBackdrop  = document.getElementById('navBackdrop');
const mainContent  = document.getElementById('mainContent');
let sidebarOpen    = false;

function abrirSidebar() {
  sidebarOpen = true;
  hamburgerBtn.classList.add('open'); sidebar.classList.add('open');
  navBackdrop.classList.add('open'); mainContent.classList.add('pushed');
}
function cerrarSidebar() {
  sidebarOpen = false;
  hamburgerBtn.classList.remove('open'); sidebar.classList.remove('open');
  navBackdrop.classList.remove('open'); mainContent.classList.remove('pushed');
  cerrarTodosSubmenus();
}
function toggleSidebar() { sidebarOpen ? cerrarSidebar() : abrirSidebar(); }
hamburgerBtn.addEventListener('click', toggleSidebar);
navBackdrop.addEventListener('click', cerrarSidebar);

function cerrarTodosSubmenus() {
  document.querySelectorAll('.nav-item.has-sub').forEach(i => i.classList.remove('sub-open'));
}
document.querySelectorAll('.nav-item.has-sub').forEach(item => {
  item.addEventListener('click', e => {
    if (e.target.closest('.nav-sub')) return;
    const wasOpen = item.classList.contains('sub-open');
    cerrarTodosSubmenus();
    if (!wasOpen) item.classList.add('sub-open');
    activarPanel('participantes');
    e.stopPropagation();
  });
});
document.querySelectorAll('.nav-sub-item').forEach(subItem => {
  subItem.addEventListener('click', e => {
    const sub = subItem.dataset.sub;
    document.querySelectorAll('.nav-sub-item').forEach(s => s.classList.remove('active'));
    subItem.classList.add('active');
    document.querySelectorAll('.subtab-btn').forEach(b => b.classList.toggle('active', b.dataset.sub === sub));
    document.querySelectorAll('.subpanel').forEach(p => p.classList.toggle('active', p.id === 'sub-'+sub));
    if (window.innerWidth < 768) cerrarSidebar();
    e.stopPropagation();
  });
});
document.querySelectorAll('.nav-item:not(.has-sub)').forEach(item => {
  item.addEventListener('click', () => { cerrarTodosSubmenus(); activarPanel(item.dataset.panel); });
});
async function activarPanel(panelId) {
  document.querySelectorAll('.nav-item:not(.has-sub)').forEach(n => n.classList.toggle('active', n.dataset.panel === panelId));
  document.querySelectorAll('.nav-item.has-sub').forEach(n => n.classList.toggle('active', panelId === 'participantes'));
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  document.getElementById('panel-'+panelId).classList.add('active');
  if (window.innerWidth < 768) cerrarSidebar();

  // al volver a inicio recargar participantes y grupos por si hubo cambios
  if (panelId === 'inicio' && D.setupDone) {
    try {
      const [participantes, grupos] = await Promise.all([
        apiFetch('/api/participantes'),
        apiFetch('/api/grupos')
      ]);
      D._presIds = participantes.filter(p => p.tipo === 'presidente');
      D._oradIds = participantes.filter(p => p.tipo === 'orador');
      D._lectIds = participantes.filter(p => p.tipo === 'lector');
      D._grupIds = grupos;
      D.presidentes = D._presIds.map(p => p.nombre);
      D.oradores    = D._oradIds.map(p => p.nombre);
      D.lectores    = D._lectIds.map(p => p.nombre);
      D.grupos      = D._grupIds.map(g => g.nombre);
    } catch(e) { console.error(e); }
  }
}

/* SUBTABS */
document.querySelectorAll('.subtab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const sub = btn.dataset.sub;
    document.querySelectorAll('.subtab-btn').forEach(b => b.classList.toggle('active', b.dataset.sub === sub));
    document.querySelectorAll('.subpanel').forEach(p => p.classList.toggle('active', p.id === 'sub-'+sub));
  });
});

/* ================================================================
   PARTICIPANTES
================================================================ */
const CHIP_EL = { presidentes:'chipsPres', oradores:'chipsOrad', lectores:'chipsLect' };
const TIPO_MAP = { presidentes:'presidente', oradores:'orador', lectores:'lector' };
const IDS_MAP  = { presidentes:'_presIds',  oradores:'_oradIds', lectores:'_lectIds' };

function renderChips(listName) {
  const el = document.getElementById(CHIP_EL[listName]);
  el.innerHTML = `
    <div class="notion-add-row" style="margin-bottom:10px" onclick="document.getElementById('inp-notion-${listName}').focus()">
      <span style="font-size:16px;color:var(--navy);font-weight:700">+</span>
      <input class="notion-add-input" id="inp-notion-${listName}"
        placeholder="Escribir nombre y presionar Enter..."
        onkeydown="if(event.key==='Enter')agregarItemNotion('${listName}',this)">
      <button class="btn btn-primary btn-sm" onclick="agregarItemNotion('${listName}',document.getElementById('inp-notion-${listName}'))">Agregar</button>
    </div>
    <div class="notion-list" id="notion-list-${listName}">
    ${D[listName].map((nombre, i) => `
      <div class="notion-item" draggable="true"
        data-idx="${i}" data-list="${listName}"
        ondragstart="onDragStart(event)"
        ondragover="onDragOver(event)"
        ondragleave="onDragLeave(event)"
        ondrop="onDrop(event,'${listName}')"
        ondragend="onDragEnd(event)">
        <span class="notion-num" style="cursor:grab">&#8597;</span>
        <span class="notion-num">${i+1}</span>
        <input class="notion-name" value="${esc(nombre)}"
          onchange="editarParticipante('${listName}',${i},this.value)"
          onkeydown="if(event.key==='Enter')this.blur()">
        <div class="notion-actions">
          <button class="notion-btn del" onclick="quitarItem('${listName}',${i})">Eliminar</button>
        </div>
      </div>`).join('')}
    </div>`;
}

let dragSrcIdx = null;

function onDragStart(e) {
  dragSrcIdx = Number(e.currentTarget.dataset.idx);
  e.currentTarget.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
}
function onDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  e.currentTarget.classList.add('drag-over');
}
function onDragLeave(e) {
  e.currentTarget.classList.remove('drag-over');
}
function onDragEnd(e) {
  e.currentTarget.classList.remove('dragging');
  document.querySelectorAll('.notion-item').forEach(el => el.classList.remove('drag-over'));
}
let pendingReorder = {};

function onDrop(e, listName) {
  e.preventDefault();
  e.currentTarget.classList.remove('drag-over');
  const targetIdx = Number(e.currentTarget.dataset.idx);
  if (dragSrcIdx === null || dragSrcIdx === targetIdx) return;

  const ids    = D[IDS_MAP[listName]];
  const item   = D[listName].splice(dragSrcIdx, 1)[0];
  const idItem = ids.splice(dragSrcIdx, 1)[0];
  D[listName].splice(targetIdx, 0, item);
  ids.splice(targetIdx, 0, idItem);

  pendingReorder[listName] = true;
  renderChips(listName);
  dragSrcIdx = null;

  // mostrar btn de actualizar
  mostrarBtnActualizar(listName);
}

function mostrarBtnActualizar(listName) {
  const fab = document.getElementById('fabActualizar');
  if (fab) fab.classList.add('visible');
}

async function aplicarReorder() {
  const listas = Object.keys(pendingReorder);
  for (const listName of listas) {
    const ids = D[IDS_MAP[listName]];
    try {
      await apiFetch('/api/participantes/reorder', {
        method: 'PATCH',
        body: JSON.stringify({ items: ids.map((p, i) => ({ id: p.id, orden: i })) })
      });
      delete pendingReorder[listName];
    } catch(e) { mostrarNotif('Error al guardar orden', 'error'); return; }
  }
  const fab = document.getElementById('fabActualizar');
  if (fab) fab.classList.remove('visible');
  mostrarNotif('Orden guardado', 'ok');
  if (D.setupDone) renderTabla();
}

async function editarParticipante(listName, i, nuevoNombre) {
  const nombre = nuevoNombre.trim();
  if (!nombre) { renderChips(listName); return; }
  const ids  = D[IDS_MAP[listName]];
  const item = ids[i];
  if (!item) return;
  // verificar duplicado
  const existe = D[listName].find((n, j) => j!==i && n.toLowerCase()===nombre.toLowerCase());
  if (existe) { mostrarNotif(`"${existe}" ya esta en la lista`, 'error'); renderChips(listName); return; }
  try {
    const p = await apiFetch(`/api/participantes/${item.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ nombre })
    });
    D[listName][i]  = p.nombre;
    ids[i].nombre   = p.nombre;
    mostrarNotif('Nombre actualizado', 'ok');
  } catch(e) { mostrarNotif('Error al editar', 'error'); renderChips(listName); }
}

function agregarItemNotion(listName, input) {
  const v = input.value.trim();
  if (!v) return;
  input.value = '';
  agregarItem(listName, null, v);
}

async function agregarItem(listName, inputId, valorDirecto = null) {
  const inp = inputId ? document.getElementById(inputId) : null;
  const v   = valorDirecto || (inp ? inp.value.trim() : '');
  if (!v) return;
  const existe = D[listName].find(n => n.toLowerCase() === v.toLowerCase());
  if (existe) { mostrarNotif(`"${existe}" ya esta en la lista`, 'error'); inp.value=''; return; }
  try {
    const p = await apiFetch('/api/participantes', {
      method:'POST', body: JSON.stringify({ nombre:v, tipo:TIPO_MAP[listName], orden:D[listName].length })
    });
    D[listName].push(p.nombre);
    D[IDS_MAP[listName]].push(p);
    renderChips(listName);
    mostrarNotif(p.nombre + ' agregado', 'ok');
  } catch(e) { mostrarNotif(e.error || 'Error al agregar', 'error'); }
}

async function quitarItem(listName, i) {
  const ids    = D[IDS_MAP[listName]];
  const item   = ids[i];
  const nombre = D[listName][i];
  if (!item) { mostrarNotif('No se pudo encontrar el elemento', 'error'); return; }

  // mostrar confirmacion en div en lugar de confirm()
  const confirmDiv = document.createElement('div');
  confirmDiv.style.cssText = `position:fixed;inset:0;background:rgba(0,0,0,.4);
    display:flex;align-items:center;justify-content:center;z-index:9999;padding:16px`;
  confirmDiv.innerHTML = `
    <div style="background:#fff;border-radius:10px;padding:28px;max-width:340px;width:100%;box-shadow:0 8px 32px rgba(0,0,0,.18);text-align:center">
      <div style="font-size:22px;margin-bottom:10px">&#x26A0;</div>
      <div style="font-size:15px;font-weight:700;color:#1a2744;margin-bottom:6px">Eliminar participante</div>
      <div style="font-size:13px;color:#6b7280;margin-bottom:20px">
        Esta seguro que desea eliminar a <b>${esc(nombre)}</b> de la lista?<br>
        <span style="font-size:11px;color:#9ca3af">Esta accion no se puede deshacer.</span>
      </div>
      <div style="display:flex;gap:10px;justify-content:center">
        <button id="confirmCancelBtn" class="btn btn-secondary">Cancelar</button>
        <button id="confirmDeleteBtn" class="btn btn-danger">Eliminar</button>
      </div>
    </div>`;
  document.body.appendChild(confirmDiv);

  document.getElementById('confirmCancelBtn').addEventListener('click', () => {
    document.body.removeChild(confirmDiv);
  });
  document.getElementById('confirmDeleteBtn').addEventListener('click', async () => {
    document.body.removeChild(confirmDiv);
    try {
      await apiFetch(`/api/participantes/${item.id}`, { method:'DELETE' });
      D[listName].splice(i, 1);
      ids.splice(i, 1);
      renderChips(listName);
      mostrarNotif(`${nombre} eliminado`, 'ok');
    } catch(e) { mostrarNotif('Error al eliminar', 'error'); }
  });
}

// listeners de inputs viejos eliminados

/* ================================================================
   BOSQUEJOS
================================================================ */
document.getElementById('searchBosq').addEventListener('input', renderBosquejos);

function renderBosquejos() {
  const q    = document.getElementById('searchBosq').value.trim().toLowerCase();
  const nums = Object.keys(D.bosquejos).sort((a,b) => Number(a)-Number(b));
  const list = nums.filter(n => !q || n.includes(q) || D.bosquejos[n].toLowerCase().includes(q));
  document.getElementById('bosqCount').textContent = `(${nums.length} registrados)`;
  document.getElementById('bosqListBody').innerHTML = list.length===0
    ? `<tr><td colspan="3" style="padding:14px;text-align:center;color:var(--muted)">${nums.length===0?'Sin bosquejos.':'Sin resultados.'}</td></tr>`
    : list.map(n => `<tr>
        <td style="text-align:center"><b>${n}</b></td>
        <td>${currentUser?.rol==='admin'
          ? `<input type="text" value="${esc(D.bosquejos[n])}" style="width:100%;border:none;background:transparent;font-size:13px;font-family:inherit" onchange="editarBosquejo('${n}',this.value)">`
          : `<span style="font-size:13px">${esc(D.bosquejos[n])}</span>`}</td>
        <td style="text-align:center">${currentUser?.rol==='admin'
          ? `<button class="del-btn" onclick="eliminarBosquejo('${n}')">x</button>`
          : ''}</td>
      </tr>`).join('');
}

async function editarBosquejo(num, tema) {
  try {
    await apiFetch(`/api/bosquejos/${num}`, { method:'PATCH', body: JSON.stringify({ tema }) });
    D.bosquejos[num] = tema;
    mostrarNotif('Bosquejo actualizado', 'ok');
  } catch(e) { mostrarNotif('Error al editar', 'error'); }
}

async function eliminarBosquejo(num) {
  if (!confirm(`Eliminar el bosquejo N ${num}?`)) return;
  try {
    await apiFetch(`/api/bosquejos/${num}`, { method:'DELETE' });
    delete D.bosquejos[num];
    renderBosquejos();
    mostrarNotif('Bosquejo eliminado', 'ok');
  } catch(e) { mostrarNotif('Error al eliminar', 'error'); }
}

/* ================================================================
   GRUPOS
================================================================ */
function renderGrupos() {
  document.getElementById('gruposList').innerHTML = D._grupIds.map((g, i) => `
    <div class="grupo-row">
      <span class="grupo-label">Grupo ${i+1}:</span>
      <input type="text" value="${esc(g.nombre)}" style="width:180px" onchange="editarGrupo('${g.id}',${i},this.value)">
      <button class="del-btn" onclick="eliminarGrupo('${g.id}',${i})">x</button>
    </div>`).join('');
  renderGrupoInicio();
}

function renderGrupoInicio() {
  const sel = document.getElementById('grupoInicio');
  if (!sel) return;
  const actual = D.counters.hosp % D.grupos.length;
  sel.innerHTML = D.grupos.map((g, i) =>
    `<option value="${i}" ${i === actual ? 'selected' : ''}>${g}</option>`
  ).join('');
}

function cambiarGrupoInicio(idx) {
  D.counters.hosp = Number(idx);
  recalcularHospitalidad();
  guardarSchedule();
  renderTabla();
  mostrarNotif('Rotacion iniciada desde ' + D.grupos[idx], 'ok');
}

async function editarGrupo(id, i, valor) {
  if (!valor) return;
  try {
    await apiFetch(`/api/grupos/${id}`, { method:'PATCH', body: JSON.stringify({ nombre: valor }) });
    D._grupIds[i].nombre = valor; D.grupos[i] = valor;
    mostrarNotif('Grupo actualizado', 'ok');
  } catch(e) { mostrarNotif('Error al editar', 'error'); }
}

async function eliminarGrupo(id, i) {
  if (D.grupos.length<=1) { mostrarNotif('Debe haber al menos un grupo', 'error'); return; }
  if (!confirm('Eliminar este grupo?')) return;
  try {
    await apiFetch(`/api/grupos/${id}`, { method:'DELETE' });
    D._grupIds.splice(i,1); D.grupos.splice(i,1);
    renderGrupos(); mostrarNotif('Grupo eliminado', 'ok');
  } catch(e) { mostrarNotif('Error al eliminar', 'error'); }
}

document.getElementById('btnAddGrupo').addEventListener('click', async () => {
  const inp = document.getElementById('inpNuevoGrupo');
  const v   = inp.value.trim();
  if (!v) return;
  try {
    const g = await apiFetch('/api/grupos', { method:'POST', body: JSON.stringify({ nombre:v, orden:D.grupos.length }) });
    D._grupIds.push(g); D.grupos.push(g.nombre);
    inp.value=''; renderGrupos(); mostrarNotif('Grupo agregado', 'ok');
  } catch(e) { mostrarNotif('Error al agregar', 'error'); }
});
document.getElementById('inpNuevoGrupo').addEventListener('keydown', e => {
  if (e.key==='Enter') document.getElementById('btnAddGrupo').click();
});

/* ================================================================
   SETUP INICIAL
================================================================ */
document.getElementById('btnComenzar').addEventListener('click', () => {
  const day = document.getElementById('meetingDaySel').value;
  const dt  = document.getElementById('startDateInp').value;
  if (day==='') { mostrarNotif('Selecciona el dia de reunion', 'error'); return; }
  if (!dt)      { mostrarNotif('Selecciona la primera fecha', 'error'); return; }
  if (!D.presidentes.length || !D.oradores.length) {
    mostrarNotif('Agrega al menos un Presidente y un Orador primero', 'error'); return;
  }
  let d = new Date(dt+'T00:00:00');
  const tgt = Number(day);
  while (d.getDay() !== tgt) d.setDate(d.getDate()+1);
  D.setupDone=true; D.schedule=[]; D.counters={pres:0,orad:0,lect:0,hosp:0}; D.lectCola=[];
  D.cursorDate = d.toISOString().slice(0,10);
  // guardar config en BD
  apiFetch('/api/config', { method:'POST', body: JSON.stringify({ meetingDay: Number(day) }) }).catch(e => console.error(e));
  agregarSemanas(1); mostrarUI();
});
document.getElementById('btnReconfig')?.addEventListener('click', () => {
  document.getElementById('setupCard').style.display = 'block';
});
document.getElementById('btnAdd1').addEventListener('click', () => agregarSemanas(1));
document.getElementById('btnAdd4').addEventListener('click', () => agregarSemanas(4));
document.getElementById('btnNuevoPrograma')?.addEventListener('click', () => {
  const div = document.createElement('div');
  div.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;z-index:9999;padding:16px';
  div.innerHTML = `
    <div style="background:#fff;border-radius:10px;padding:28px;max-width:360px;width:100%;box-shadow:0 8px 32px rgba(0,0,0,.18)">
      <div style="font-size:15px;font-weight:800;color:#1a2744;margin-bottom:6px">Nuevo programa</div>
      <div style="font-size:12px;color:#6b7280;margin-bottom:16px">Elige la fecha de inicio del siguiente programa.</div>
      <input type="date" id="newProgramaDate" style="width:100%;margin-bottom:16px;padding:8px 10px;border:1px solid #e2e4e9;border-radius:8px;font-size:13px">
      <div style="display:flex;gap:10px;justify-content:flex-end">
        <button class="btn btn-secondary" onclick="this.closest('div').parentElement.parentElement.remove()">Cancelar</button>
        <button class="btn btn-primary" onclick="iniciarNuevoPrograma(document.getElementById('newProgramaDate').value, this.closest('div').parentElement.parentElement)">Comenzar</button>
      </div>
    </div>`;
  document.body.appendChild(div);
});

function iniciarNuevoPrograma(fecha, div) {
  if (!fecha) { mostrarNotif('Selecciona una fecha', 'error'); return; }
  if (!D.meetingDay && D.meetingDay !== 0) { mostrarNotif('No hay dia de reunion configurado', 'error'); return; }
  let d = new Date(fecha + 'T00:00:00');
  while (d.getDay() !== D.meetingDay) d.setDate(d.getDate() + 1);
  D.cursorDate = d.toISOString().slice(0, 10);
  D.setupDone  = true;
  document.body.removeChild(div);
  agregarSemanas(1);
  mostrarUI();
  mostrarNotif('Nuevo programa iniciado', 'ok');
}
document.getElementById('btnClear').addEventListener('click', () => {
  const div = document.createElement('div');
  div.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;z-index:9999;padding:16px';
  div.innerHTML = `
    <div style="background:#fff;border-radius:10px;padding:28px;max-width:360px;width:100%;box-shadow:0 8px 32px rgba(0,0,0,.18);text-align:center">
      <div style="font-size:28px;margin-bottom:10px">&#9888;</div>
      <div style="font-size:16px;font-weight:800;color:#991b1b;margin-bottom:8px">Limpiar programa</div>
      <div style="font-size:13px;color:#6b7280;margin-bottom:6px">Esta a punto de eliminar <b>todo la programa generada</b>.</div>
      <div style="font-size:12px;color:#9ca3af;margin-bottom:24px">Los participantes, bosquejos y grupos se conservan.</div>
      <div style="display:flex;gap:10px;justify-content:center">
        <button id="clearCancelBtn" class="btn btn-secondary">Cancelar</button>
        <button id="clearConfirmBtn" class="btn btn-danger">Si, limpiar todo</button>
      </div>
    </div>`;
  document.body.appendChild(div);
  document.getElementById('clearCancelBtn').addEventListener('click', () => document.body.removeChild(div));
  document.getElementById('clearConfirmBtn').addEventListener('click', async () => {
    document.body.removeChild(div);
    D.schedule=[]; D.setupDone=false; D.cursorDate=null; D.counters={pres:0,orad:0,lect:0,hosp:0}; D.lectCola=[];
    await guardarSchedule(); mostrarUI(); renderTabla();
    mostrarNotif('programa eliminada', 'ok');
  });
});

function mostrarUI() {
  const on = D.setupDone;
  document.getElementById('setupCard').style.display      = on?'none':'block';
  document.getElementById('scheduleActions').style.display = on?'flex':'none';
  document.getElementById('scheduleCard').style.display    = on?'block':'none';
  document.getElementById('printBtnsCard').style.display   = on?'block':'none';
}

/* ================================================================
   ALGORITMO
================================================================ */
function construirFila(iso) {
  const c = D.counters;
  const pres=D.presidentes, orad=D.oradores, lect=D.lectores;

  let orador = '';
  if (orad.length) { orador = orad[c.orad % orad.length]; c.orad++; }

  let presidente = '';
  if (pres.length) {
    let found='', sl=1;
    for (let i=0; i<pres.length; i++) {
      const cand = pres[(c.pres+i) % pres.length];
      if (cand !== orador) { found=cand; sl=i+1; break; }
    }
    if (!found) { found=pres[c.pres % pres.length]; sl=1; }
    presidente=found; c.pres+=sl;
  }

  let lector = '----';
  if (lect.length) {
    let found='', sl=1;
    for (let i=0; i<lect.length; i++) {
      const cand = lect[(c.lect+i) % lect.length];
      if (cand!==orador && cand!==presidente) { found=cand; sl=i+1; break; }
    }
    if (!found) { found=lect[c.lect % lect.length]; sl=1; }
    lector=found; c.lect+=sl;
  }

  let hospitalidad = '----';
  if (orador && !D.presidentes.includes(orador)) {
    hospitalidad = D.grupos[c.hosp % D.grupos.length] || '----';
    c.hosp++;
  }

  return { fecha:iso, presidente, orador, oradorZoom:false,
           bosquejo:'', tema:'', lector, hospitalidad, eventType:null };
}

async function agregarSemanas(n) {
  if (!D.setupDone) { mostrarNotif('Completa primero la configuracion inicial', 'error'); return; }
  for (let i=0; i<n; i++) {
    D.schedule.push(construirFila(D.cursorDate));
    const next = new Date(D.cursorDate+'T00:00:00');
    next.setDate(next.getDate()+7);
    D.cursorDate = next.toISOString().slice(0,10);
  }
  asignarLectores();
  await guardarSchedule(); renderTabla();
}

function recalcularHospitalidad() {
  let hospIdx=0;
  D.schedule.forEach(row => {
    const isEvt = row.eventType==='asamblea' || row.eventType==='conmemoracion';
    const isCir = row.eventType==='circuito';
    if (isEvt||isCir) { row.hospitalidad='----'; return; }
    if (!row.orador || D.presidentes.includes(row.orador) || row.oradorZoom) {
      row.hospitalidad='----';
    } else {
      row.hospitalidad = D.grupos[hospIdx % D.grupos.length] || '----';
      hospIdx++;
    }
  });
  D.counters.hosp = hospIdx;
}

function aplicarEvento(idx, tipo) {
  const row = D.schedule[idx];
  if (tipo==='asamblea' || tipo==='conmemoracion') {
    row.presidente=''; row.orador=''; row.oradorZoom=false;
    row.bosquejo=''; row.lector='----'; row.hospitalidad='----';
    row.tema = tipo==='asamblea'?'ASAMBLEA':'CONMEMORACION';
    row.eventType=tipo;
  } else if (tipo==='circuito') {
    row.bosquejo=''; row.tema=''; row.lector='----'; row.hospitalidad='----';
    row.eventType='circuito';
  } else {
    const fresh=construirFila(row.fecha); fresh.fecha=row.fecha; D.schedule[idx]=fresh;
  }
  recalcularHospitalidad();
  guardarSchedule(); cerrarModal(); renderTabla();
}

/* ================================================================
   RENDER TABLA
================================================================ */
function renderTabla() {
  const tbody = document.getElementById('scheduleBody');
  tbody.innerHTML = D.schedule.map((row, idx) => {
    const cls=idx%2===0?'rowA':'rowB';
    const isEvt=row.eventType==='asamblea'||row.eventType==='conmemoracion';
    const isCir=row.eventType==='circuito';
    const g=guionHtml();
    const orLabel = row.orador
      ? `${esc(row.orador)}${row.oradorZoom?'<span class="tag-zoom"><b>(Zoom)</b></span>':''}`
      : g;
    const oradorClass = row.oradorZoom ? 'cellbtn orador zoom-active' : 'cellbtn orador';
    return `<tr class="${cls}">
      <td><button class="cellbtn fecha" onclick="abrirModalFecha(${idx})">${fmtFecha(row.fecha)}</button></td>
      ${isEvt?`<td><div class="cell-static">${g}</div></td>`:`<td><button class="cellbtn" onclick="abrirModalPersona(${idx},'presidente')">${row.presidente?esc(soloNombre(row.presidente)):g}</button></td>`}
      ${isEvt?`<td><div class="cell-static">${g}</div></td>`:`<td>
        <button class="${oradorClass}"
          onclick="clickOrador(${idx},event)"
          oncontextmenu="event.preventDefault();toggleZoom(${idx})"
          ontouchstart="iniciarLongPress(${idx},event)"
          ontouchend="cancelarLongPress(event)"
          ontouchmove="cancelarLongPress(event)"
          title="Click para editar — Click derecho o mantener para marcar Zoom">
          ${orLabel}
        </button>
      </td>`}
      ${(isEvt||isCir)?`<td><div class="cell-static">${g}</div></td>`:`<td><button class="cellbtn" onclick="abrirModalBosquejo(${idx})">${row.bosquejo?'N\u00b0'+esc(row.bosquejo):g}</button></td>`}
      ${isEvt?`<td><div class="cell-static cellbtn tema" style="font-weight:700">${esc(row.tema)}</div></td>`:isCir?`<td><div class="cell-static">${g}</div></td>`:`<td><button class="cellbtn tema" onclick="abrirModalBosquejo(${idx})">${row.tema?esc(row.tema):g}</button></td>`}
      ${(isEvt||isCir)?`<td><div class="cell-static">${g}</div></td>`:`<td><button class="cellbtn" onclick="abrirModalLector(${idx})">${row.lector&&row.lector!=='----'?esc(soloNombre(row.lector)):g}</button></td>`}
      ${(isEvt||isCir)?`<td><div class="cell-static">${g}</div></td>`:`<td><button class="cellbtn" onclick="abrirModalGrupoInicio(${idx})">${row.hospitalidad&&row.hospitalidad!=='----'?esc(row.hospitalidad):g}</button></td>`}
      <td class="del-col-td" style="width:60px;background:transparent;border:none;padding:4px 6px;vertical-align:middle">
        <div style="display:flex;gap:5px;align-items:center;justify-content:center">
          <button title="Evento especial" onclick="abrirModalEvento(${idx})"
            style="background:#f1f5ff;border:1px solid #c7d2fe;border-radius:6px;padding:5px 7px;font-size:11px;font-weight:700;cursor:pointer;color:#1a2744;white-space:nowrap">
            EVT
          </button>
          <button title="Eliminar semana" onclick="eliminarFila(${idx})"
            style="background:#fff0f0;border:1px solid #fca5a5;border-radius:6px;padding:5px 7px;font-size:13px;cursor:pointer;color:#991b1b;line-height:1">
            &#x2715;
          </button>
        </div>
      </td>
    </tr>`;
  }).join('');
}

function eliminarFila(idx) {
  const row = D.schedule[idx];
  const fecha = fmtFechaPlano(row.fecha);
  const div = document.createElement('div');
  div.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;z-index:9999;padding:16px';
  div.innerHTML = `
    <div style="background:#fff;border-radius:10px;padding:28px;max-width:340px;width:100%;box-shadow:0 8px 32px rgba(0,0,0,.18);text-align:center">
      <div style="font-size:26px;margin-bottom:10px">&#128465;</div>
      <div style="font-size:15px;font-weight:800;color:#1a2744;margin-bottom:6px">Eliminar semana</div>
      <div style="font-size:13px;color:#6b7280;margin-bottom:20px">
        Esta seguro que desea eliminar la semana del <b>${fecha}</b>?
      </div>
      <div style="display:flex;gap:10px;justify-content:center">
        <button id="delFilaCancel" class="btn btn-secondary">Cancelar</button>
        <button id="delFilaConfirm" class="btn btn-danger">Eliminar</button>
      </div>
    </div>`;
  document.body.appendChild(div);
  document.getElementById('delFilaCancel').addEventListener('click', () => document.body.removeChild(div));
  document.getElementById('delFilaConfirm').addEventListener('click', () => {
    document.body.removeChild(div);
    D.schedule.splice(idx, 1);
    guardarSchedule(); renderTabla();
    mostrarNotif('Semana eliminada', 'ok');
  });
}

/* ================================================================
   MODALES
================================================================ */
function abrirModal(titulo, html) {
  document.getElementById('modalTitle').textContent = titulo;
  document.getElementById('modalBody').innerHTML    = html;
  document.getElementById('modalOverlay').classList.add('open');
}
function cerrarModal() { document.getElementById('modalOverlay').classList.remove('open'); }
document.getElementById('modalCloseBtn').addEventListener('click', cerrarModal);
document.getElementById('modalOverlay').addEventListener('click', e => { if (e.target.id==='modalOverlay') cerrarModal(); });

function abrirModalFecha(idx) {
  abrirModal('Cambiar fecha', `<div style="padding:14px">
    <input type="date" id="modalDateInp" value="${D.schedule[idx].fecha}" style="width:100%;margin-bottom:12px">
    <button class="btn btn-primary" style="width:100%" onclick="setFecha(${idx})">Guardar</button>
  </div>`);
}
function setFecha(idx) {
  const v = document.getElementById('modalDateInp').value;
  if (v) { D.schedule[idx].fecha=v; guardarSchedule(); renderTabla(); }
  cerrarModal();
}

function abrirModalPersona(idx, campo) {
  const cur  = D.schedule[idx][campo];
  const list = campo==='presidente' ? D.presidentes : [];
  const opts = list.length
    ? list.map(n => {
        const nSafe = n.replace(/'/g,"\\'");
        return `<div class="modal-opt${cur===n?' active-opt':''}" onclick="setPersona(${idx},'${campo}','${nSafe}')">
          ${cur===n?'&#10003; ':''}${esc(n)}</div>`;
      }).join('')
    : `<p style="padding:12px;color:var(--muted);font-size:13px">No hay nombres registrados.</p>`;
  abrirModal('Seleccionar presidente', opts);
}
function setPersona(idx, campo, nombre) {
  D.schedule[idx][campo] = nombre;

  if (campo === 'presidente') {
    // si coincide con lector, cambiar lector
    if (nombre === D.schedule[idx].lector) {
      const otro = D.lectores.find(n => n!==nombre && n!==D.schedule[idx].orador);
      D.schedule[idx].lector = otro || '----';
    }
    // reordenar presidentes en todas las filas usando idx como ancla
    recalcularPresidentes(idx, nombre);
  }

  guardarSchedule(); cerrarModal(); renderTabla();
}

function recalcularPresidentes(anclaIdx, nombreAncla) {
  const pres = D.presidentes;
  if (!pres.length) return;

  // encontrar posicion del nombre ancla en la lista
  const posAncla = pres.indexOf(nombreAncla);
  if (posAncla === -1) return;

  // contar cuantas filas con presidente valido hay antes de anclaIdx
  let antesCount = 0;
  for (let i = 0; i < anclaIdx; i++) {
    const row = D.schedule[i];
    const isEvt = row.eventType==='asamblea'||row.eventType==='conmemoracion';
    if (!isEvt && row.presidente) antesCount++;
  }

  // calcular offset para que en anclaIdx salga posAncla
  const offset = ((posAncla - antesCount) % pres.length + pres.length) % pres.length;

  // recalcular todos los presidentes
  let presIdx = offset;
  for (let i = 0; i < D.schedule.length; i++) {
    const row = D.schedule[i];
    const isEvt = row.eventType==='asamblea'||row.eventType==='conmemoracion';
    const isCir = row.eventType==='circuito';
    if (isEvt || isCir) continue;
    if (i === anclaIdx) { presIdx++; continue; } // la ancla ya tiene el nombre correcto
    // buscar presidente que no coincida con orador
    let found = '', sl = 1;
    for (let j = 0; j < pres.length; j++) {
      const cand = pres[(presIdx + j) % pres.length];
      if (cand !== row.orador) { found = cand; sl = j+1; break; }
    }
    if (!found) { found = pres[presIdx % pres.length]; sl = 1; }
    row.presidente = found;
    presIdx += sl;
    // ajustar lector si coincide con el nuevo presidente
    if (row.lector === found) {
      const otro = D.lectores.find(n => n!==found && n!==row.orador);
      row.lector = otro || '----';
    }
  }
  D.counters.pres = presIdx;
}

function abrirModalOrador(idx) {
  const row=D.schedule[idx];
  const disponibles=D.oradores.filter(n=>n!==row.presidente&&n!==row.lector);
  const conflicto  =D.oradores.filter(n=>n===row.presidente||n===row.lector);
  const renderOpt=(n,warn=false)=>{
    const nSafe=n.replace(/'/g,"\\'");
    return `<div class="modal-opt${row.orador===n?' active-opt':''}" style="${warn?'opacity:.45;pointer-events:none;':''}" onclick="setOrador(${idx},'${nSafe}')">
      ${row.orador===n?'&#10003; ':''}${esc(n)}
      ${warn?'<span style="font-size:10px;color:#991b1b"> (conflicto esta semana)</span>':''}
    </div>`;
  };
  const opts=D.oradores.length
    ? disponibles.map(n=>renderOpt(n)).join('')+(conflicto.length
        ?`<div style="padding:6px 14px;font-size:11px;color:var(--muted);border-top:1px solid var(--border)">No disponibles:</div>`
          +conflicto.map(n=>renderOpt(n,true)).join(''):'')
    :`<p style="padding:12px;color:var(--muted);font-size:13px">Agrega oradores en Participantes.</p>`;
  abrirModal('Seleccionar orador', opts);
}
function setOrador(idx, nombre) {
  const row=D.schedule[idx];
  row.orador=nombre;
  if (row.presidente===nombre) { const otro=D.presidentes.find(n=>n!==nombre); if(otro) row.presidente=otro; }
  if (row.lector===nombre||row.lector===row.presidente) {
    const otro=D.lectores.find(n=>n!==nombre&&n!==row.presidente);
    row.lector=otro||'----';
  }
  recalcularHospitalidad();
  guardarSchedule(); cerrarModal(); renderTabla();
}

function abrirModalLector(idx) {
  const row=D.schedule[idx];
  const opts=D.lectores.length
    ? D.lectores.map(n=>{
        const ocupado=n===row.presidente||n===row.orador;
        const nSafe=n.replace(/'/g,"\\'");
        return `<div class="modal-opt${row.lector===n?' active-opt':''}" onclick="setLector(${idx},'${nSafe}')">
          ${row.lector===n?'&#10003; ':''}${esc(n)}
          ${ocupado?'<span style="color:var(--muted);font-size:10px"> (asignado esta semana)</span>':''}
        </div>`;
      }).join('')
    :`<p style="padding:12px;color:var(--muted);font-size:13px">Agrega lectores en Participantes.</p>`;
  abrirModal('Seleccionar lector',`
    <div class="modal-opt" style="font-weight:700;color:var(--teal);border-bottom:2px solid var(--border)" onclick="autoLector(${idx})">Asignar automaticamente</div>
    ${opts}`);
}
function autoLector(idx) {
  const row=D.schedule[idx];
  const found=D.lectores.find(n=>n!==row.presidente&&n!==row.orador);
  row.lector=found||'----';
  guardarSchedule(); cerrarModal(); renderTabla();
}
function setLector(idx, nombre) {
  D.schedule[idx].lector = nombre;
  recalcularLectores(idx, nombre);
  guardarSchedule(); cerrarModal(); renderTabla();
}

async function recargarBosquejos() {
  try {
    const bosquejos = await apiFetch('/api/bosquejos');
    D.bosquejos = Object.fromEntries(bosquejos.map(b => [String(b.id), b.tema]));
    renderBosquejos();
  } catch(e) {}
}

function abrirModalBosquejo(idx) {
  recargarBosquejos();
  abrirModal('Seleccionar', `
    <div style="display:flex;border-bottom:2px solid var(--border)">
      <button id="tabBosq" onclick="switchBosqTab('bosq',${idx})"
        style="flex:1;padding:10px;border:none;background:none;font-weight:700;color:var(--navy);border-bottom:2px solid var(--navy);margin-bottom:-2px;cursor:pointer;font-family:inherit;font-size:13px">
        Bosquejos
      </button>
      <button id="tabEsp" onclick="switchBosqTab('esp',${idx})"
        style="flex:1;padding:10px;border:none;background:none;font-weight:600;color:var(--muted);cursor:pointer;font-family:inherit;font-size:13px">
        Discursos Especiales
      </button>
    </div>
    <div id="bosqTabContent"></div>
  `);
  switchBosqTab('bosq', idx);
}

function switchBosqTab(tab, idx) {
  const btnB = document.getElementById('tabBosq');
  const btnE = document.getElementById('tabEsp');
  const cont = document.getElementById('bosqTabContent');
  if (!btnB || !btnE || !cont) return;

  if (tab === 'bosq') {
    btnB.style.color = 'var(--navy)'; btnB.style.borderBottom = '2px solid var(--navy)'; btnB.style.marginBottom = '-2px';
    btnE.style.color = 'var(--muted)'; btnE.style.borderBottom = 'none';
    cont.innerHTML = `
      <input type="text" class="modal-search" id="bosqSearchMdl"
        placeholder="Buscar por numero o tema..."
        oninput="renderBosqModal(${idx})">
      <div id="bosqMdlList"></div>`;
    renderBosqModal(idx);
  } else {
    btnE.style.color = 'var(--navy)'; btnE.style.borderBottom = '2px solid var(--navy)'; btnE.style.marginBottom = '-2px';
    btnB.style.color = 'var(--muted)'; btnB.style.borderBottom = 'none';
    const q = '';
    cont.innerHTML = `
      <input type="text" class="modal-search" id="espSearchMdl"
        placeholder="Buscar discurso especial..."
        oninput="renderEspModal(${idx})">
      <div id="espMdlList"></div>`;
    renderEspModal(idx);
  }
}

function renderEspModal(idx) {
  const q   = (document.getElementById('espSearchMdl')?.value||'').trim().toLowerCase();
  const el  = document.getElementById('espMdlList');
  if (!el) return;
  const fil = D.discursos.filter(d => !q || d.tema.toLowerCase().includes(q));
  el.innerHTML = fil.length === 0
    ? `<p style="padding:12px;color:var(--muted);font-size:13px">${D.discursos.length===0?'Sin discursos especiales. El admin puede agregarlos desde el panel.':'Sin resultados.'}</p>`
    : fil.map(d => `
        <div class="modal-opt" onclick="setDiscursoEspecial(${idx},'${d.id}','${d.tema.replace(/'/g,"\'")}')">
          ${esc(d.tema)}
        </div>`).join('');
}

function setDiscursoEspecial(idx, id, tema) {
  D.schedule[idx].bosquejo    = '';
  D.schedule[idx].tema        = tema;
  D.schedule[idx].discursoId  = id;
  guardarSchedule(); cerrarModal(); renderTabla();
}
function renderBosqModal(idx) {
  const q   =(document.getElementById('bosqSearchMdl')?.value||'').trim().toLowerCase();
  const nums=Object.keys(D.bosquejos).sort((a,b)=>Number(a)-Number(b));
  const fil =nums.filter(n=>!q||n.includes(q)||D.bosquejos[n].toLowerCase().includes(q));
  const el  =document.getElementById('bosqMdlList');
  if (!el) return;
  const usados=D.schedule.map((r,i)=>i!==idx?r.bosquejo:null).filter(Boolean);
  el.innerHTML=fil.length===0
    ?`<p style="padding:12px;color:var(--muted);font-size:13px">Sin resultados.</p>`
    :fil.map(n=>{
        const yaUsado=usados.includes(n);
        return `<div class="modal-opt${D.schedule[idx].bosquejo===n?' active-opt':''}"
          style="${yaUsado?'opacity:.45;pointer-events:none;':''}"
          onclick="setBosquejo(${idx},'${n}')">
          <b>N\u00b0${n}</b> &mdash; ${esc(D.bosquejos[n])}
          ${yaUsado?'<span style="font-size:10px;color:#991b1b"> (ya asignado)</span>':''}
        </div>`;
      }).join('');
}
function setBosquejo(idx, num) {
  D.schedule[idx].bosquejo=num; D.schedule[idx].tema=D.bosquejos[num]||'';
  guardarSchedule(); cerrarModal(); renderTabla();
}

function abrirModalEvento(idx) {
  const cur=D.schedule[idx].eventType;
  const ops=[[null,'Normal (sin evento especial)'],['asamblea','Asamblea de circuito o regional'],['conmemoracion','Conmemoracion'],['circuito','Discurso especial de circuito']];
  abrirModal('Tipo de semana', ops.map(([val,label])=>
    `<div class="modal-opt${cur===val?' active-opt':''}" onclick="aplicarEvento(${idx},${val===null?'null':"'"+val+"'"})">
      ${cur===val?'&#10003; ':''}${label}</div>`).join(''));
}

/* ================================================================
   EXPORTAR
================================================================ */
document.getElementById('btnPdf').addEventListener('click', exportarPDF);
document.getElementById('btnWord').addEventListener('click', exportarWord);

function generarFilasHTML() {
  return D.schedule.map((row,idx)=>{
    const bg=idx%2===0?'#cfe2f3':'#f4cccc';
    const isEvt=row.eventType==='asamblea'||row.eventType==='conmemoracion';
    const isCir=row.eventType==='circuito';
    const g='----';
    const ora=row.orador?row.orador+(row.oradorZoom?' (Zoom)':''):g;
    const td=(c,ex='')=>`<td style="background:${bg};padding:7px 5px;text-align:center;vertical-align:middle;border:2px solid #fff;font-family:Arial;font-size:9pt;${ex}">${c}</td>`;
    const tdOra=c=>`<td style="background:${bg};padding:7px 5px;text-align:center;vertical-align:middle;border:2px solid #fff;font-family:Arial;font-size:9pt;color:#0099cc;font-weight:bold;">${c}</td>`;
    return `<tr>
      ${td('<b>'+fmtFechaPlano(row.fecha)+'</b>')}
      ${td(isEvt?g:esc(soloNombre(row.presidente))||g)}
      ${tdOra(isEvt?g:esc(ora))}
      ${td((isEvt||isCir)?g:(row.bosquejo?'N\u00b0'+esc(row.bosquejo):g))}
      ${td(isEvt?'<b>'+esc(row.tema)+'</b>':(isCir?g:esc(row.tema)),'text-align:left;padding-left:8px;')}
      ${td((isEvt||isCir)?g:esc(soloNombre(row.lector)))}
      ${td((isEvt||isCir)?g:esc(row.hospitalidad))}
    </tr>`;
  }).join('');
}

function exportarPDF() {
  if (!D.schedule.length) { mostrarNotif('No hay programa generada', 'error'); return; }
  const contenido=document.createElement('div');
  contenido.innerHTML=`
  <table style="border-collapse:collapse;width:100%;table-layout:fixed;font-family:Arial;font-size:7.5pt;">
    <colgroup><col style="width:10%"><col style="width:10%"><col style="width:11%"><col style="width:6%"><col style="width:32%"><col style="width:9%"><col style="width:10%"></colgroup>
    <thead><tr>
      <th style="background:#1a2744;color:#fff;padding:10px 5px;text-align:center;border:2px solid #fff;font-size:9.5pt;">FECHA</th>
      <th style="background:#1a2744;color:#fff;padding:10px 5px;text-align:center;border:2px solid #fff;font-size:9.5pt;">PRESI-<br>DENTE</th>
      <th style="background:#1a2744;color:#0099cc;padding:10px 5px;text-align:center;border:2px solid #fff;font-size:9.5pt;">ORADOR</th>
      <th style="background:#1a2744;color:#fff;padding:10px 5px;text-align:center;border:2px solid #fff;font-size:9.5pt;">Bosq.</th>
      <th style="background:#1a2744;color:#fff;padding:10px 5px;text-align:center;border:2px solid #fff;font-size:9.5pt;">TEMA</th>
      <th style="background:#1a2744;color:#fff;padding:10px 5px;text-align:center;border:2px solid #fff;font-size:9.5pt;">LECTOR</th>
      <th style="background:#1a2744;color:#fff;padding:10px 5px;text-align:center;border:2px solid #fff;font-size:9.5pt;">HOSPI-<br>TALIDAD</th>
    </tr></thead>
    <tbody>${generarFilasHTML()}</tbody>
  </table>`;
  html2pdf().set({
    margin:[0.5,0.5], filename:'programa.pdf',
    image:{type:'jpeg',quality:0.98},
    html2canvas:{scale:2,useCORS:true,scrollY:0},
    jsPDF:{unit:'cm',format:'a4',orientation:'portrait'},
    pagebreak:{mode:'avoid-all'}
  }).from(contenido).save();
}

function exportarWord() {
  if (!D.schedule.length) { mostrarNotif('No hay programa generada', 'error'); return; }
  // descargar desde el backend como .docx real
  const a = document.createElement('a');
  a.href = '/api/export/word';
  a.download = 'programa.docx';
  document.body.appendChild(a); a.click();
  document.body.removeChild(a);
  return;
}

/* ================================================================
   INIT
================================================================ */
function init() {
  renderChips('presidentes'); renderChips('oradores'); renderChips('lectores');
  renderBosquejos(); renderGrupos(); mostrarUI();
  if (D.setupDone) renderTabla();
}

document.addEventListener('DOMContentLoaded', () => checkAuth());
function abrirModalGrupoInicio(idx) {
  const row = D.schedule[idx];
  const opts = D.grupos.map((g, i) =>
    `<div class="modal-opt${row.hospitalidad===g?' active-opt':''}" onclick="setGrupoInicio(${idx}, ${i})">
      ${row.hospitalidad===g?'&#10003; ':''}${esc(g)}
    </div>`
  ).join('');
  abrirModal('Seleccionar grupo para esta semana', opts);
}

function setGrupoInicio(idx, grupoIdx) {
  // recalcular TODAS las filas con el grupo elegido como ancla en idx
  // primero calcular cuantas filas con hospitalidad hay antes de idx
  let antesCount = 0;
  for (let i = 0; i < idx; i++) {
    const row = D.schedule[i];
    const isEvt = row.eventType==='asamblea'||row.eventType==='conmemoracion';
    const isCir = row.eventType==='circuito';
    if (isEvt||isCir) continue;
    if (row.orador && !D.presidentes.includes(row.orador) && !row.oradorZoom) antesCount++;
  }

  // el offset de inicio es: grupoIdx - antesCount (en modulo)
  const offset = ((grupoIdx - antesCount) % D.grupos.length + D.grupos.length) % D.grupos.length;

  // recalcular todas las filas desde el inicio con ese offset
  let hospIdx = offset;
  for (let i = 0; i < D.schedule.length; i++) {
    const row = D.schedule[i];
    const isEvt = row.eventType==='asamblea'||row.eventType==='conmemoracion';
    const isCir = row.eventType==='circuito';
    if (isEvt||isCir) { row.hospitalidad='----'; continue; }
    if (!row.orador || D.presidentes.includes(row.orador) || row.oradorZoom) {
      row.hospitalidad='----';
    } else {
      row.hospitalidad = D.grupos[hospIdx % D.grupos.length];
      hospIdx++;
    }
  }
  D.counters.hosp = hospIdx;
  guardarSchedule(); cerrarModal(); renderTabla();
  mostrarNotif('Rotacion actualizada desde ' + D.grupos[grupoIdx], 'ok');
}

/* ── ZOOM RAPIDO ─────────────────────────────────── */
function toggleZoom(idx) {
  const row = D.schedule[idx];
  if (!row.orador) { mostrarNotif('Primero selecciona un orador', 'error'); return; }
  row.oradorZoom = !row.oradorZoom;
  recalcularHospitalidad();
  // pequeño delay para evitar conflicto con el click en movil
  setTimeout(() => {
    guardarSchedule();
    renderTabla();
    mostrarNotif(row.oradorZoom ? row.orador + ' — Zoom activado' : row.orador + ' — Zoom removido', 'ok');
  }, 50);
}

let longPressTimer = null;
let longPressFired  = false;

function iniciarLongPress(idx, e) {
  longPressFired = false;
  longPressTimer = setTimeout(() => {
    longPressFired = true;
    toggleZoom(idx);
    
  }, 500);
}
function cancelarLongPress(e) {
  if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; }
}
let tapTimer   = null;
let lastTapTime = {};
let lastTapIdx  = null;
function clickOrador(idx, e) {
  if (longPressFired) { longPressFired = false; e.preventDefault(); return; }
  const ahora   = Date.now();
  const esMobile = window.matchMedia('(pointer:coarse)').matches;
  if (esMobile) {
    if (lastTapIdx === idx && (ahora - (lastTapTime[idx]||0)) < 350) {
      clearTimeout(tapTimer);
      lastTapTime[idx] = 0; lastTapIdx = null;
      if (D.schedule[idx].oradorZoom) toggleZoom(idx);
      return;
    }
    lastTapTime[idx] = ahora; lastTapIdx = idx;
    clearTimeout(tapTimer);
    tapTimer = setTimeout(() => abrirModalOrador(idx), 320);
  } else {
    abrirModalOrador(idx);
  }
}

/* ── TABS BOSQUEJOS ──────────────────────────────── */
document.querySelectorAll('[data-bosqtab]').forEach(btn => {
  btn.addEventListener('click', () => {
    const tab = btn.dataset.bosqtab;
    document.querySelectorAll('[data-bosqtab]').forEach(b => b.classList.toggle('active', b.dataset.bosqtab === tab));
    document.querySelectorAll('#panel-bosquejos .subpanel').forEach(p => p.classList.toggle('active', p.id === 'bosqtab-'+tab));
    if (tab === 'especiales') renderDiscursosLista();
  });
});

function renderDiscursosLista() {
  const tbody = document.getElementById('discursosListBody');
  if (!tbody) return;
  tbody.innerHTML = D.discursos.length === 0
    ? '<tr><td style="padding:12px;text-align:center;color:var(--muted)">Sin discursos especiales. El administrador puede agregarlos desde el panel de control.</td></tr>'
    : D.discursos.map(d => `<tr><td style="padding:8px 10px">${esc(d.tema)}</td></tr>`).join('');
}

// refrescar bosquejos y discursos cada 5 minutos
setInterval(async () => {
  try {
    const [bosquejos, discursos] = await Promise.all([
      apiFetch('/api/bosquejos'),
      apiFetch('/api/discursos').catch(()=>[])
    ]);
    D.bosquejos = Object.fromEntries(bosquejos.map(b => [String(b.id), b.tema]));
    D.discursos = discursos || [];
    renderBosquejos();
  } catch(e) {}
}, 5 * 60 * 1000);

function recalcularLectores(anclaIdx, nombreAncla) {
  const lect = D.lectores;
  if (!lect.length) return;

  const posAncla = lect.indexOf(nombreAncla);
  if (posAncla === -1) return;

  // contar cuantos lectores validos hay antes de anclaIdx
  let antesCount = 0;
  for (let i = 0; i < anclaIdx; i++) {
    const row = D.schedule[i];
    const isEvt = row.eventType==='asamblea'||row.eventType==='conmemoracion';
    const isCir = row.eventType==='circuito';
    if (!isEvt && !isCir && row.lector && row.lector !== '----') antesCount++;
  }

  // calcular offset para que anclaIdx tenga posAncla
  const offset = ((posAncla - antesCount) % lect.length + lect.length) % lect.length;

  let lectIdx = offset;
  for (let i = 0; i < D.schedule.length; i++) {
    const row = D.schedule[i];
    const isEvt = row.eventType==='asamblea'||row.eventType==='conmemoracion';
    const isCir = row.eventType==='circuito';
    if (isEvt || isCir) { row.lector = '----'; continue; }

    if (i === anclaIdx) {
      // esta fila ya tiene el nombre correcto, solo avanzar contador
      lectIdx++;
      continue;
    }

    // buscar lector que no coincida con presidente ni orador
    let found = '', sl = 1;
    for (let j = 0; j < lect.length; j++) {
      const cand = lect[(lectIdx + j) % lect.length];
      if (cand !== row.presidente && cand !== row.orador) { found = cand; sl = j+1; break; }
    }
    if (!found) { found = lect[lectIdx % lect.length]; sl = 1; }
    row.lector = found;
    lectIdx += sl;
  }
  D.counters.lect = lectIdx;
}

function asignarLectores() {
  const lect = D.lectores;
  if (!lect.length) return;

  // cola circular de lectores disponibles
  let cola = [...lect]; // copia del orden
  let offset = D.counters.lect % lect.length;
  // rotar cola segun offset actual
  cola = [...cola.slice(offset), ...cola.slice(0, offset)];

  let pendientes = []; // lectores que no pudieron ir en su turno

  for (let i = 0; i < D.schedule.length; i++) {
    const row = D.schedule[i];
    const isEvt = row.eventType==='asamblea'||row.eventType==='conmemoracion';
    const isCir = row.eventType==='circuito';
    if (isEvt || isCir) { row.lector = '----'; continue; }

    // intentar asignar el primero de la cola
    let asignado = false;
    for (let j = 0; j < cola.length; j++) {
      const cand = cola[j];
      if (cand !== row.presidente && cand !== row.orador) {
        row.lector = cand;
        cola.splice(j, 1); // quitar de cola
        // si habia pendientes, agregarlos de vuelta al frente
        if (pendientes.length) {
          cola = [...pendientes, ...cola];
          pendientes = [];
        }
        cola.push(cand); // al final de la cola circular
        asignado = true;
        break;
      } else {
        // mover a pendientes
        pendientes.push(cola.splice(j, 1)[0]);
        j--;
      }
    }
    if (!asignado) row.lector = '----';
  }

  D.counters.lect = offset;
}
