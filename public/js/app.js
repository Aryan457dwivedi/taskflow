/* ===== TASKFLOW FRONTEND APP ===== */
const API = '/api';
let token = localStorage.getItem('tf_token');
let currentUser = null;
let currentProjectId = null;
let currentProjectData = null;

/* ===== UTILS ===== */
const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

async function api(method, path, body) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (token) opts.headers['Authorization'] = `Bearer ${token}`;
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(API + path, opts);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

function toast(msg, type = 'info') {
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  const icons = { success: '✓', error: '✕', info: '◈' };
  el.innerHTML = `<span>${icons[type]}</span> ${msg}`;
  $('#toast-container').appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function isOverdue(dueDate, status) {
  return dueDate && status !== 'done' && new Date(dueDate) < new Date();
}

function initials(name = '') {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

function avatarColor(name = '') {
  const colors = ['#f59e0b', '#3b82f6', '#22c55e', '#a855f7', '#ef4444', '#06b6d4', '#f97316'];
  const i = name.charCodeAt(0) % colors.length;
  return colors[i];
}

/* ===== MODAL ===== */
let modalResolve = null;
function openModal(title, html) {
  $('#modal-title').textContent = title;
  $('#modal-body').innerHTML = html;
  $('#modal-overlay').classList.remove('hidden');
}
function closeModal() {
  $('#modal-overlay').classList.add('hidden');
  $('#modal-body').innerHTML = '';
  if (modalResolve) { modalResolve(null); modalResolve = null; }
}
$('#modal-close').onclick = closeModal;
$('#modal-overlay').onclick = (e) => { if (e.target === $('#modal-overlay')) closeModal(); };

/* ===== AUTH ===== */
$$('.auth-tab').forEach(tab => {
  tab.onclick = () => {
    $$('.auth-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    $('#login-form').classList.toggle('hidden', tab.dataset.tab !== 'login');
    $('#signup-form').classList.toggle('hidden', tab.dataset.tab !== 'signup');
  };
});

$('#login-form').onsubmit = async (e) => {
  e.preventDefault();
  const btn = e.target.querySelector('button[type=submit]');
  btn.disabled = true; btn.innerHTML = '<span class="spinner"></span>';
  try {
    const data = await api('POST', '/auth/login', {
      email: $('#login-email').value,
      password: $('#login-password').value,
    });
    token = data.token;
    localStorage.setItem('tf_token', token);
    currentUser = data.user;
    initApp();
  } catch (err) {
    const el = $('#login-error');
    el.textContent = err.message;
    el.classList.remove('hidden');
  } finally {
    btn.disabled = false; btn.innerHTML = 'Sign In <span>→</span>';
  }
};

$('#signup-form').onsubmit = async (e) => {
  e.preventDefault();
  const btn = e.target.querySelector('button[type=submit]');
  btn.disabled = true; btn.innerHTML = '<span class="spinner"></span>';
  try {
    const data = await api('POST', '/auth/signup', {
      name: $('#signup-name').value,
      email: $('#signup-email').value,
      password: $('#signup-password').value,
    });
    token = data.token;
    localStorage.setItem('tf_token', token);
    currentUser = data.user;
    initApp();
  } catch (err) {
    const el = $('#signup-error');
    el.textContent = err.message;
    el.classList.remove('hidden');
  } finally {
    btn.disabled = false; btn.innerHTML = 'Create Account <span>→</span>';
  }
};

$('#logout-btn').onclick = () => {
  token = null; currentUser = null;
  localStorage.removeItem('tf_token');
  $('#main-app').classList.add('hidden');
  $('#auth-screen').classList.remove('hidden');
};

/* ===== NAV ===== */
$$('.nav-item').forEach(item => {
  item.onclick = (e) => {
    e.preventDefault();
    const view = item.dataset.view;
    if (view === 'dashboard') showDashboard();
    else if (view === 'projects') showProjects();
    closeSidebar();
  };
});

$('#menu-toggle').onclick = () => $('#sidebar').classList.add('open');
$('#sidebar-close').onclick = closeSidebar;
function closeSidebar() { $('#sidebar').classList.remove('open'); }

function setActiveNav(view) {
  $$('.nav-item').forEach(n => n.classList.toggle('active',
    n.dataset.view === view));
}

function showView(name) {
  $$('.view').forEach(v => v.classList.add('hidden'));
  $(`#view-${name}`)?.classList.remove('hidden');
}

/* ===== INIT ===== */
async function initApp() {
  $('#auth-screen').classList.add('hidden');
  $('#main-app').classList.remove('hidden');

  const av = $('#nav-avatar');
  av.textContent = initials(currentUser.name);
  av.style.background = avatarColor(currentUser.name);
  $('#nav-name').textContent = currentUser.name;
  $('#nav-email').textContent = currentUser.email;

  await showDashboard();
  await loadProjectNav();
}

/* ===== DASHBOARD ===== */
async function showDashboard() {
  showView('dashboard');
  setActiveNav('dashboard');
  $('#page-title').textContent = 'Dashboard';
  $('#topbar-actions').innerHTML = '';

  const sg = $('#stats-grid');
  sg.innerHTML = '<div class="loading-center"><div class="spinner"></div></div>';
  $('#recent-tasks-list').innerHTML = '<div class="loading-center"><div class="spinner"></div></div>';
  $('#overdue-tasks-list').innerHTML = '';

  try {
    const data = await api('GET', '/dashboard');
    const { stats, recentTasks, overdueList } = data;

    sg.innerHTML = `
      <div class="stat-card amber" style="animation-delay:0s">
        <div class="stat-val">${stats.totalProjects}</div>
        <div class="stat-label">Projects</div>
      </div>
      <div class="stat-card blue" style="animation-delay:0.05s">
        <div class="stat-val">${stats.totalTasks}</div>
        <div class="stat-label">Total Tasks</div>
      </div>
      <div class="stat-card green" style="animation-delay:0.1s">
        <div class="stat-val">${stats.done}</div>
        <div class="stat-label">Completed</div>
      </div>
      <div class="stat-card purple" style="animation-delay:0.15s">
        <div class="stat-val">${stats.inProgress}</div>
        <div class="stat-label">In Progress</div>
      </div>
      <div class="stat-card red" style="animation-delay:0.2s">
        <div class="stat-val">${stats.overdue}</div>
        <div class="stat-label">Overdue</div>
      </div>
      <div class="stat-card" style="animation-delay:0.25s">
        <div class="stat-val">${stats.myTasks}</div>
        <div class="stat-label">My Tasks</div>
      </div>
    `;

    const rtl = $('#recent-tasks-list');
    if (!recentTasks.length) {
      rtl.innerHTML = `<div class="empty-state"><div class="empty-icon">◫</div><div class="empty-title">No tasks yet</div><div class="empty-sub">Create a project and add tasks</div></div>`;
    } else {
      rtl.innerHTML = recentTasks.map(t => `
        <div class="task-row">
          <div class="task-dot" style="background:${t.projectColor}"></div>
          <div class="task-info">
            <div class="task-title">${esc(t.title)}</div>
            <div class="task-meta">${esc(t.projectName)} · ${formatDate(t.updatedAt)}</div>
          </div>
          <span class="badge badge-${t.status}">${t.status}</span>
        </div>
      `).join('');
    }

    const otl = $('#overdue-tasks-list');
    if (!overdueList.length) {
      otl.innerHTML = `<div class="empty-state"><div class="empty-icon">✓</div><div class="empty-title">All caught up!</div><div class="empty-sub">No overdue tasks</div></div>`;
    } else {
      otl.innerHTML = overdueList.map(t => `
        <div class="task-row">
          <div class="task-dot" style="background:#ef4444"></div>
          <div class="task-info">
            <div class="task-title">${esc(t.title)}</div>
            <div class="task-meta">${esc(t.projectName)} · Due ${formatDate(t.dueDate)}</div>
          </div>
          <span class="badge badge-${t.priority}">${t.priority}</span>
        </div>
      `).join('');
    }
  } catch (e) {
    sg.innerHTML = `<div class="empty-state"><div class="empty-title">Error loading dashboard</div></div>`;
  }
}

/* ===== PROJECTS LIST ===== */
async function showProjects() {
  showView('projects');
  setActiveNav('projects');
  $('#page-title').textContent = 'Projects';
  $('#topbar-actions').innerHTML = `<button class="btn btn-primary btn-sm" onclick="openCreateProject()">+ New Project</button>`;

  const pg = $('#projects-grid');
  pg.innerHTML = '<div class="loading-center"><div class="spinner"></div> Loading projects...</div>';

  try {
    const { projects } = await api('GET', '/projects');
    renderProjectsGrid(projects);
  } catch (e) {
    pg.innerHTML = `<div class="empty-state"><div class="empty-title">Error loading projects</div></div>`;
  }
}

function renderProjectsGrid(projects) {
  const pg = $('#projects-grid');
  let html = `
    <div class="project-add-card" onclick="openCreateProject()">
      <div class="project-add-icon">+</div>
      <div style="font-family:var(--font-display);font-size:14px;font-weight:600">New Project</div>
    </div>
  `;
  if (!projects.length) {
    pg.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><div class="empty-icon">◫</div><div class="empty-title">No projects yet</div><div class="empty-sub">Create your first project to get started</div></div>` + html;
    return;
  }
  html = projects.map((p, i) => `
    <div class="project-card" onclick="showProjectDetail('${p._id}')" style="animation-delay:${i*0.04}s">
      <div style="position:absolute;top:0;left:0;right:0;height:3px;background:${p.color}"></div>
      <div class="project-card-name">${esc(p.name)}</div>
      <div class="project-card-desc">${esc(p.description || 'No description')}</div>
      <div class="project-card-stats">
        <span>◫ ${p.taskCount} tasks</span>
        <span>◉ ${p.memberCount} members</span>
        ${p.overdueTasks > 0 ? `<span style="color:var(--red)">⚠ ${p.overdueTasks} overdue</span>` : ''}
      </div>
      <div style="margin-top:12px">
        <span class="badge badge-${p.myRole}">${p.myRole}</span>
      </div>
    </div>
  `).join('') + html;
  pg.innerHTML = html;
}

async function loadProjectNav() {
  try {
    const { projects } = await api('GET', '/projects');
    const nav = $('#project-nav-list');
    nav.innerHTML = projects.map(p => `
      <div class="project-nav-item ${currentProjectId === p._id ? 'active' : ''}"
           data-id="${p._id}" onclick="showProjectDetail('${p._id}')">
        <div class="project-dot" style="background:${p.color}"></div>
        ${esc(p.name)}
      </div>
    `).join('');
  } catch (e) {}
}

/* ===== PROJECT DETAIL ===== */
async function showProjectDetail(projectId) {
  currentProjectId = projectId;
  showView('project-detail');

  // Mark active in sidebar nav
  $$('.project-nav-item').forEach(n =>
    n.classList.toggle('active', n.dataset.id === projectId));
  $$('.nav-item').forEach(n => n.classList.remove('active'));

  const header = $('#project-header-bar');
  header.innerHTML = '<div class="loading-center"><div class="spinner"></div></div>';
  $('#task-board').innerHTML = '<div class="loading-center"><div class="spinner"></div></div>';

  try {
    const data = await api('GET', `/projects/${projectId}`);
    currentProjectData = data;
    const { project, members, tasks, myRole } = data;

    $('#page-title').textContent = project.name;

    // Topbar actions
    let actions = '';
    if (myRole === 'admin') {
      actions = `
        <button class="btn btn-primary btn-sm" onclick="openCreateTask()">+ Task</button>
        <button class="btn btn-secondary btn-sm" onclick="openInviteMember()">+ Member</button>
        <button class="btn btn-secondary btn-sm" onclick="openEditProject()">Edit</button>
      `;
    }
    $('#topbar-actions').innerHTML = actions;

    // Header
    header.innerHTML = `
      <div class="project-header-dot" style="background:${project.color}"></div>
      <div>
        <div class="project-header-name">${esc(project.name)}</div>
        ${project.description ? `<div class="project-header-desc">${esc(project.description)}</div>` : ''}
      </div>
      <div style="margin-left:auto;display:flex;gap:8px;align-items:center">
        <span class="badge badge-${myRole}">${myRole}</span>
        <span style="color:var(--text3);font-size:12px">${members.length} members</span>
      </div>
    `;

    // Board
    renderBoard(tasks, members, myRole);

    // Members tab
    renderMembers(members, myRole, projectId);

    // Tabs
    $$('.ptab').forEach(t => {
      t.onclick = () => {
        $$('.ptab').forEach(x => x.classList.remove('active'));
        t.classList.add('active');
        $$('.ptab-content').forEach(c => c.classList.add('hidden'));
        $(`#ptab-${t.dataset.ptab}`).classList.remove('hidden');
      };
    });
    // Ensure board tab active
    $$('.ptab')[0].classList.add('active');
    $$('.ptab')[1].classList.remove('active');
    $('#ptab-board').classList.remove('hidden');
    $('#ptab-members').classList.add('hidden');

    closeSidebar();
  } catch (e) {
    header.innerHTML = `<div class="empty-state"><div class="empty-title">Failed to load project</div></div>`;
  }
}

/* ===== BOARD ===== */
const COLS = [
  { id: 'todo', label: 'To Do', color: '#5a5a72' },
  { id: 'in-progress', label: 'In Progress', color: '#3b82f6' },
  { id: 'review', label: 'Review', color: '#a855f7' },
  { id: 'done', label: 'Done', color: '#22c55e' },
];

function renderBoard(tasks, members, myRole) {
  const board = $('#task-board');
  board.innerHTML = COLS.map(col => {
    const colTasks = tasks.filter(t => t.status === col.id);
    return `
      <div class="board-col">
        <div class="board-col-header">
          <div class="board-col-label" style="color:${col.color}">${col.label}</div>
          <div class="board-col-count">${colTasks.length}</div>
        </div>
        <div class="board-tasks">
          ${colTasks.length ? colTasks.map(t => renderTaskCard(t)).join('') :
            `<div style="padding:20px;text-align:center;color:var(--text3);font-size:12px">Empty</div>`}
        </div>
      </div>
    `;
  }).join('');

  // Attach click handlers
  board.querySelectorAll('.task-card').forEach(card => {
    card.onclick = () => openTaskDetail(card.dataset.id);
  });
}

function renderTaskCard(t) {
  const overdue = isOverdue(t.dueDate, t.status);
  return `
    <div class="task-card" data-id="${t._id}">
      <div class="task-card-title">${esc(t.title)}</div>
      <span class="badge badge-${t.priority}" style="margin-bottom:6px">${t.priority}</span>
      <div class="task-card-footer">
        <div class="task-card-assignee">
          ${t.assigneeName
            ? `<div class="assignee-chip" style="background:${avatarColor(t.assigneeName)}">${initials(t.assigneeName)}</div> ${esc(t.assigneeName)}`
            : '<span style="color:var(--text3)">Unassigned</span>'}
        </div>
        ${t.dueDate ? `<div class="task-card-due ${overdue ? 'overdue' : ''}">${formatDate(t.dueDate)}</div>` : ''}
      </div>
    </div>
  `;
}

/* ===== TASK DETAIL ===== */
async function openTaskDetail(taskId) {
  const task = currentProjectData?.tasks.find(t => t._id === taskId);
  if (!task) return;
  const myRole = currentProjectData.myRole;
  const members = currentProjectData.members;
  const overdue = isOverdue(task.dueDate, task.status);

  const isAssignee = task.assigneeId === currentUser._id;
  const canEdit = myRole === 'admin' || isAssignee;

  let statusSelect = '';
  if (canEdit) {
    statusSelect = `
      <div class="form-group" style="margin-top:20px">
        <label>Status</label>
        <select id="td-status">
          <option value="todo" ${task.status==='todo'?'selected':''}>To Do</option>
          <option value="in-progress" ${task.status==='in-progress'?'selected':''}>In Progress</option>
          <option value="review" ${task.status==='review'?'selected':''}>Review</option>
          <option value="done" ${task.status==='done'?'selected':''}>Done</option>
        </select>
      </div>
    `;
  }

  let adminPanel = '';
  if (myRole === 'admin') {
    const memberOpts = members.map(m =>
      `<option value="${m.userId}" ${task.assigneeId===m.userId?'selected':''}>${esc(m.name)}</option>`
    ).join('');
    adminPanel = `
      <div class="task-detail-meta">
        <div class="detail-field">
          <label>Priority</label>
          <select id="td-priority">
            <option value="low" ${task.priority==='low'?'selected':''}>Low</option>
            <option value="medium" ${task.priority==='medium'?'selected':''}>Medium</option>
            <option value="high" ${task.priority==='high'?'selected':''}>High</option>
            <option value="critical" ${task.priority==='critical'?'selected':''}>Critical</option>
          </select>
        </div>
        <div class="detail-field">
          <label>Assignee</label>
          <select id="td-assignee">
            <option value="">Unassigned</option>
            ${memberOpts}
          </select>
        </div>
        <div class="detail-field">
          <label>Due Date</label>
          <input type="date" id="td-due" value="${task.dueDate || ''}" />
        </div>
      </div>
    `;
  }

  openModal(task.title, `
    <div class="task-detail-header">
      <div class="task-detail-desc">${esc(task.description || 'No description provided.')}</div>
      <div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap">
        <span class="badge badge-${task.status}">${task.status}</span>
        <span class="badge badge-${task.priority}">${task.priority}</span>
        ${overdue ? `<span class="badge" style="background:var(--red-dim);color:var(--red)">Overdue</span>` : ''}
      </div>
    </div>
    <div class="task-detail-meta" style="margin-bottom:8px">
      <div class="detail-field">
        <label>Assigned To</label>
        <div class="val">${task.assigneeName || 'Unassigned'}</div>
      </div>
      <div class="detail-field">
        <label>Due Date</label>
        <div class="val ${overdue?'':''}">
          ${task.dueDate ? `<span style="${overdue?'color:var(--red)':''}">${formatDate(task.dueDate)}</span>` : '—'}
        </div>
      </div>
      <div class="detail-field">
        <label>Created By</label>
        <div class="val">${esc(task.createdByName || '—')}</div>
      </div>
      <div class="detail-field">
        <label>Updated</label>
        <div class="val">${formatDate(task.updatedAt)}</div>
      </div>
    </div>
    ${statusSelect}
    ${adminPanel}
    ${canEdit ? `
      <div class="modal-actions">
        ${myRole === 'admin' ? `<button class="btn btn-danger btn-sm" onclick="deleteTask('${task._id}')">Delete</button>` : ''}
        <button class="btn btn-secondary btn-sm" onclick="closeModal()">Cancel</button>
        <button class="btn btn-primary btn-sm" onclick="saveTaskChanges('${task._id}')">Save Changes</button>
      </div>
    ` : ''}
  `);
}

async function saveTaskChanges(taskId) {
  const updates = {};
  const statusEl = $('#td-status');
  const priorityEl = $('#td-priority');
  const assigneeEl = $('#td-assignee');
  const dueEl = $('#td-due');

  if (statusEl) updates.status = statusEl.value;
  if (priorityEl) updates.priority = priorityEl.value;
  if (assigneeEl) updates.assigneeId = assigneeEl.value || null;
  if (dueEl) updates.dueDate = dueEl.value || null;

  try {
    await api('PUT', `/projects/${currentProjectId}/tasks/${taskId}`, updates);
    toast('Task updated', 'success');
    closeModal();
    await refreshProject();
  } catch (e) {
    toast(e.message, 'error');
  }
}

async function deleteTask(taskId) {
  if (!confirm('Delete this task?')) return;
  try {
    await api('DELETE', `/projects/${currentProjectId}/tasks/${taskId}`);
    toast('Task deleted', 'success');
    closeModal();
    await refreshProject();
  } catch (e) {
    toast(e.message, 'error');
  }
}

/* ===== CREATE TASK ===== */
function openCreateTask() {
  const members = currentProjectData?.members || [];
  const memberOpts = members.map(m =>
    `<option value="${m.userId}">${esc(m.name)}</option>`
  ).join('');

  openModal('New Task', `
    <div class="form-group">
      <label>Title *</label>
      <input id="ct-title" type="text" placeholder="Task title" />
    </div>
    <div class="form-group">
      <label>Description</label>
      <textarea id="ct-desc" placeholder="Optional description..."></textarea>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
      <div class="form-group">
        <label>Priority</label>
        <select id="ct-priority">
          <option value="low">Low</option>
          <option value="medium" selected>Medium</option>
          <option value="high">High</option>
          <option value="critical">Critical</option>
        </select>
      </div>
      <div class="form-group">
        <label>Due Date</label>
        <input type="date" id="ct-due" />
      </div>
    </div>
    <div class="form-group">
      <label>Assign To</label>
      <select id="ct-assignee">
        <option value="">Unassigned</option>
        ${memberOpts}
      </select>
    </div>
    <div id="ct-error" class="form-error hidden"></div>
    <div class="modal-actions">
      <button class="btn btn-secondary btn-sm" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary btn-sm" onclick="createTask()">Create Task</button>
    </div>
  `);
}

async function createTask() {
  const title = $('#ct-title').value.trim();
  if (!title) { $('#ct-error').textContent = 'Title required'; $('#ct-error').classList.remove('hidden'); return; }
  try {
    await api('POST', `/projects/${currentProjectId}/tasks`, {
      title,
      description: $('#ct-desc').value.trim(),
      priority: $('#ct-priority').value,
      dueDate: $('#ct-due').value || null,
      assigneeId: $('#ct-assignee').value || null,
    });
    toast('Task created!', 'success');
    closeModal();
    await refreshProject();
  } catch (e) {
    $('#ct-error').textContent = e.message;
    $('#ct-error').classList.remove('hidden');
  }
}

/* ===== CREATE PROJECT ===== */
const PROJECT_COLORS = ['#f59e0b','#3b82f6','#22c55e','#a855f7','#ef4444','#06b6d4','#f97316','#ec4899'];
let selectedColor = PROJECT_COLORS[0];

function openCreateProject() {
  selectedColor = PROJECT_COLORS[0];
  openModal('New Project', `
    <div class="form-group">
      <label>Project Name *</label>
      <input id="cp-name" type="text" placeholder="My Awesome Project" />
    </div>
    <div class="form-group">
      <label>Description</label>
      <textarea id="cp-desc" placeholder="What is this project about?"></textarea>
    </div>
    <div class="form-group">
      <label>Color</label>
      <div class="color-picker">
        ${PROJECT_COLORS.map(c => `
          <div class="color-swatch ${c===selectedColor?'selected':''}"
               style="background:${c}" data-color="${c}"
               onclick="selectColor('${c}', this)"></div>
        `).join('')}
      </div>
    </div>
    <div id="cp-error" class="form-error hidden"></div>
    <div class="modal-actions">
      <button class="btn btn-secondary btn-sm" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary btn-sm" onclick="createProject()">Create Project</button>
    </div>
  `);
}

function selectColor(color, el) {
  selectedColor = color;
  $$('.color-swatch').forEach(s => s.classList.remove('selected'));
  el.classList.add('selected');
}

async function createProject() {
  const name = $('#cp-name').value.trim();
  if (!name) { $('#cp-error').textContent = 'Name required'; $('#cp-error').classList.remove('hidden'); return; }
  try {
    const { project } = await api('POST', '/projects', {
      name,
      description: $('#cp-desc').value.trim(),
      color: selectedColor,
    });
    toast(`Project "${project.name}" created!`, 'success');
    closeModal();
    await loadProjectNav();
    await showProjectDetail(project._id);
  } catch (e) {
    $('#cp-error').textContent = e.message;
    $('#cp-error').classList.remove('hidden');
  }
}

/* ===== EDIT PROJECT ===== */
function openEditProject() {
  const { project } = currentProjectData;
  selectedColor = project.color;
  openModal('Edit Project', `
    <div class="form-group">
      <label>Project Name</label>
      <input id="ep-name" type="text" value="${esc(project.name)}" />
    </div>
    <div class="form-group">
      <label>Description</label>
      <textarea id="ep-desc">${esc(project.description || '')}</textarea>
    </div>
    <div class="form-group">
      <label>Color</label>
      <div class="color-picker">
        ${PROJECT_COLORS.map(c => `
          <div class="color-swatch ${c===selectedColor?'selected':''}"
               style="background:${c}" data-color="${c}"
               onclick="selectColor('${c}', this)"></div>
        `).join('')}
      </div>
    </div>
    <div id="ep-error" class="form-error hidden"></div>
    <div class="modal-actions">
      <button class="btn btn-danger btn-sm" onclick="deleteProject()">Delete Project</button>
      <button class="btn btn-secondary btn-sm" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary btn-sm" onclick="saveProject()">Save</button>
    </div>
  `);
}

async function saveProject() {
  try {
    await api('PUT', `/projects/${currentProjectId}`, {
      name: $('#ep-name').value.trim(),
      description: $('#ep-desc').value.trim(),
      color: selectedColor,
    });
    toast('Project updated', 'success');
    closeModal();
    await loadProjectNav();
    await showProjectDetail(currentProjectId);
  } catch (e) {
    $('#ep-error').textContent = e.message;
    $('#ep-error').classList.remove('hidden');
  }
}

async function deleteProject() {
  if (!confirm('Delete this project and all its tasks? This cannot be undone.')) return;
  try {
    await api('DELETE', `/projects/${currentProjectId}`);
    toast('Project deleted', 'info');
    closeModal();
    currentProjectId = null;
    currentProjectData = null;
    await loadProjectNav();
    await showProjects();
  } catch (e) {
    toast(e.message, 'error');
  }
}

/* ===== MEMBERS ===== */
function renderMembers(members, myRole, projectId) {
  const list = $('#members-list');
  list.innerHTML = members.map(m => {
    const isMe = m.userId === currentUser._id;
    const color = avatarColor(m.name);
    return `
      <div class="member-row">
        <div class="member-avatar" style="background:${color};color:#000">${initials(m.name)}</div>
        <div class="member-info">
          <div class="member-name">${esc(m.name)} ${isMe ? '<span style="color:var(--text3);font-size:11px">(you)</span>' : ''}</div>
          <div class="member-email">${esc(m.email)}</div>
        </div>
        <div class="member-actions">
          <span class="badge badge-${m.role}">${m.role}</span>
          ${myRole === 'admin' && !isMe ? `
            <button class="btn btn-secondary btn-sm" onclick="changeMemberRole('${m._id}','${m.role}','${esc(m.name)}')">Change Role</button>
            <button class="btn btn-danger btn-sm" onclick="removeMember('${m._id}','${esc(m.name)}')">Remove</button>
          ` : ''}
        </div>
      </div>
    `;
  }).join('');
}

function openInviteMember() {
  openModal('Invite Member', `
    <p style="color:var(--text2);font-size:13px;margin-bottom:20px">The user must already have a TaskFlow account.</p>
    <div class="form-group">
      <label>Email Address</label>
      <input id="im-email" type="email" placeholder="user@company.com" />
    </div>
    <div class="form-group">
      <label>Role</label>
      <select id="im-role">
        <option value="member">Member</option>
        <option value="admin">Admin</option>
      </select>
    </div>
    <div id="im-error" class="form-error hidden"></div>
    <div class="modal-actions">
      <button class="btn btn-secondary btn-sm" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary btn-sm" onclick="inviteMember()">Invite</button>
    </div>
  `);
}

async function inviteMember() {
  const email = $('#im-email').value.trim();
  if (!email) { $('#im-error').textContent = 'Email required'; $('#im-error').classList.remove('hidden'); return; }
  try {
    await api('POST', `/projects/${currentProjectId}/members`, {
      email,
      role: $('#im-role').value,
    });
    toast('Member invited!', 'success');
    closeModal();
    await refreshProject();
  } catch (e) {
    $('#im-error').textContent = e.message;
    $('#im-error').classList.remove('hidden');
  }
}

async function changeMemberRole(memberId, currentRole, name) {
  const newRole = currentRole === 'admin' ? 'member' : 'admin';
  if (!confirm(`Change ${name}'s role to ${newRole}?`)) return;
  try {
    await api('PUT', `/projects/${currentProjectId}/members/${memberId}`, { role: newRole });
    toast('Role updated', 'success');
    await refreshProject();
  } catch (e) {
    toast(e.message, 'error');
  }
}

async function removeMember(memberId, name) {
  if (!confirm(`Remove ${name} from this project?`)) return;
  try {
    await api('DELETE', `/projects/${currentProjectId}/members/${memberId}`);
    toast('Member removed', 'info');
    await refreshProject();
  } catch (e) {
    toast(e.message, 'error');
  }
}

/* ===== REFRESH ===== */
async function refreshProject() {
  if (!currentProjectId) return;
  await showProjectDetail(currentProjectId);
  await loadProjectNav();
}

/* ===== HELPERS ===== */
function esc(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/* ===== BOOTSTRAP ===== */
async function bootstrap() {
  if (token) {
    try {
      const data = await api('GET', '/auth/me');
      currentUser = data.user;
      initApp();
    } catch (e) {
      token = null;
      localStorage.removeItem('tf_token');
    }
  }
}

bootstrap();
