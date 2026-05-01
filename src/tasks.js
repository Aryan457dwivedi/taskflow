const router = require('express').Router({ mergeParams: true });
const { find, findOne, insert, update, remove } = require('./database');
const { auth } = require('./middleware');

// Middleware: verify project membership
const isMember = async (req, res, next) => {
  const projectId = req.params.projectId;
  const membership = await findOne('members', { projectId, userId: req.user._id });
  if (!membership) return res.status(403).json({ error: 'Not a member of this project' });
  req.membership = membership;
  next();
};

const STATUSES = ['todo', 'in-progress', 'review', 'done'];
const PRIORITIES = ['low', 'medium', 'high', 'critical'];

// GET /api/projects/:projectId/tasks
router.get('/', auth, isMember, async (req, res) => {
  try {
    const { status, priority, assigneeId } = req.query;
    const query = { projectId: req.params.projectId };
    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (assigneeId) query.assigneeId = assigneeId;

    const tasks = await find('tasks', query);
    tasks.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json({ tasks });
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/projects/:projectId/tasks (admin only)
router.post('/', auth, isMember, async (req, res) => {
  try {
    if (req.membership.role !== 'admin')
      return res.status(403).json({ error: 'Only admins can create tasks' });

    const { title, description, assigneeId, priority, dueDate, tags } = req.body;
    if (!title?.trim()) return res.status(400).json({ error: 'Task title required' });

    let assigneeName = null;
    if (assigneeId) {
      const m = await findOne('members', { projectId: req.params.projectId, userId: assigneeId });
      if (!m) return res.status(400).json({ error: 'Assignee is not a project member' });
      assigneeName = m.name;
    }

    const task = await insert('tasks', {
      projectId: req.params.projectId,
      title: title.trim(),
      description: description?.trim() || '',
      status: 'todo',
      priority: PRIORITIES.includes(priority) ? priority : 'medium',
      assigneeId: assigneeId || null,
      assigneeName,
      dueDate: dueDate || null,
      tags: tags || [],
      createdBy: req.user._id,
      createdByName: req.user.name,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    res.status(201).json({ task });
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/projects/:projectId/tasks/:taskId
router.put('/:taskId', auth, isMember, async (req, res) => {
  try {
    const task = await findOne('tasks', { _id: req.params.taskId, projectId: req.params.projectId });
    if (!task) return res.status(404).json({ error: 'Task not found' });

    const isAdmin = req.membership.role === 'admin';
    const isAssignee = task.assigneeId === req.user._id;

    if (!isAdmin && !isAssignee)
      return res.status(403).json({ error: 'Only admins or the assignee can update this task' });

    const allowed = isAdmin
      ? ['title', 'description', 'assigneeId', 'priority', 'dueDate', 'tags', 'status']
      : ['status']; // members can only update status of their own tasks

    const updates = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }

    if (updates.status && !STATUSES.includes(updates.status))
      return res.status(400).json({ error: 'Invalid status' });

    if (updates.assigneeId) {
      const m = await findOne('members', { projectId: req.params.projectId, userId: updates.assigneeId });
      if (!m) return res.status(400).json({ error: 'Assignee is not a project member' });
      updates.assigneeName = m.name;
    }

    updates.updatedAt = new Date().toISOString();
    await update('tasks', { _id: req.params.taskId }, { $set: updates });
    const updated = await findOne('tasks', { _id: req.params.taskId });
    res.json({ task: updated });
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/projects/:projectId/tasks/:taskId (admin only)
router.delete('/:taskId', auth, isMember, async (req, res) => {
  try {
    if (req.membership.role !== 'admin')
      return res.status(403).json({ error: 'Only admins can delete tasks' });

    const n = await remove('tasks', { _id: req.params.taskId, projectId: req.params.projectId });
    if (!n) return res.status(404).json({ error: 'Task not found' });
    res.json({ message: 'Task deleted' });
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/dashboard — summary across all user's projects
router.get('/dashboard', auth, async (req, res) => {
  // This is handled in server.js directly
});

module.exports = router;
