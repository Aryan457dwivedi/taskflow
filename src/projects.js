const router = require('express').Router();
const { find, findOne, insert, update, remove } = require('./database');
const { auth, projectAdmin } = require('./middleware');

// GET /api/projects — list projects the current user is a member of
router.get('/', auth, async (req, res) => {
  try {
    const memberships = await find('members', { userId: req.user._id });
    const projectIds = memberships.map(m => m.projectId);
    const projects = await find('projects', { _id: { $in: projectIds } });

    // Enrich with member count, task count, user role
    const enriched = await Promise.all(projects.map(async p => {
      const members = await find('members', { projectId: p._id });
      const tasks = await find('tasks', { projectId: p._id });
      const myRole = memberships.find(m => m.projectId === p._id)?.role;
      const overdue = tasks.filter(t =>
        t.dueDate && t.status !== 'done' && new Date(t.dueDate) < new Date()
      ).length;
      return { ...p, memberCount: members.length, taskCount: tasks.length, myRole, overdueTasks: overdue };
    }));

    res.json({ projects: enriched });
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/projects — create project (creator becomes admin)
router.post('/', auth, async (req, res) => {
  try {
    const { name, description, color } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Project name required' });

    const project = await insert('projects', {
      name: name.trim(),
      description: description?.trim() || '',
      color: color || '#6366f1',
      createdBy: req.user._id,
      createdAt: new Date().toISOString(),
    });

    await insert('members', {
      projectId: project._id,
      userId: req.user._id,
      role: 'admin',
      name: req.user.name,
      email: req.user.email,
      joinedAt: new Date().toISOString(),
    });

    res.status(201).json({ project });
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/projects/:projectId
router.get('/:projectId', auth, async (req, res) => {
  try {
    const { projectId } = req.params;
    const membership = await findOne('members', { projectId, userId: req.user._id });
    if (!membership) return res.status(403).json({ error: 'Not a member of this project' });

    const project = await findOne('projects', { _id: projectId });
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const members = await find('members', { projectId });
    const tasks = await find('tasks', { projectId });

    res.json({ project, members, tasks, myRole: membership.role });
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/projects/:projectId — update project (admin only)
router.put('/:projectId', auth, projectAdmin, async (req, res) => {
  try {
    const { name, description, color } = req.body;
    const updates = {};
    if (name) updates.name = name.trim();
    if (description !== undefined) updates.description = description.trim();
    if (color) updates.color = color;
    updates.updatedAt = new Date().toISOString();

    await update('projects', { _id: req.params.projectId }, { $set: updates });
    const project = await findOne('projects', { _id: req.params.projectId });
    res.json({ project });
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/projects/:projectId (admin only)
router.delete('/:projectId', auth, projectAdmin, async (req, res) => {
  try {
    const { projectId } = req.params;
    await remove('projects', { _id: projectId });
    await remove('members', { projectId }, { multi: true });
    await remove('tasks', { projectId }, { multi: true });
    res.json({ message: 'Project deleted' });
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/projects/:projectId/members — invite member (admin only)
router.post('/:projectId/members', auth, projectAdmin, async (req, res) => {
  try {
    const { email, role } = req.body;
    if (!email) return res.status(400).json({ error: 'Email required' });

    const targetUser = await findOne('users', { email: email.toLowerCase().trim() });
    if (!targetUser) return res.status(404).json({ error: 'User not found. They must sign up first.' });

    const existing = await findOne('members', { projectId: req.params.projectId, userId: targetUser._id });
    if (existing) return res.status(409).json({ error: 'User is already a member' });

    const member = await insert('members', {
      projectId: req.params.projectId,
      userId: targetUser._id,
      role: role === 'admin' ? 'admin' : 'member',
      name: targetUser.name,
      email: targetUser.email,
      joinedAt: new Date().toISOString(),
    });

    res.status(201).json({ member });
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/projects/:projectId/members/:memberId — change role (admin only)
router.put('/:projectId/members/:memberId', auth, projectAdmin, async (req, res) => {
  try {
    const { role } = req.body;
    if (!['admin', 'member'].includes(role))
      return res.status(400).json({ error: 'Role must be admin or member' });

    await update('members', { _id: req.params.memberId, projectId: req.params.projectId },
      { $set: { role } });
    res.json({ message: 'Role updated' });
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/projects/:projectId/members/:memberId (admin only)
router.delete('/:projectId/members/:memberId', auth, projectAdmin, async (req, res) => {
  try {
    await remove('members', { _id: req.params.memberId, projectId: req.params.projectId });
    // Unassign tasks
    await update('tasks', { projectId: req.params.projectId, assigneeId: req.params.memberId },
      { $set: { assigneeId: null, assigneeName: null } }, { multi: true });
    res.json({ message: 'Member removed' });
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
