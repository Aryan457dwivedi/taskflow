require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { find, findOne } = require('./database');
const { auth } = require('./middleware');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));


app.use('/api/auth', require('./auth'));
app.use('/api/projects', require('./projects'));
app.use('/api/projects/:projectId/tasks', require('./tasks'));


app.get('/api/dashboard', auth, async (req, res) => {
  try {
    const memberships = await find('members', { userId: req.user._id });
    const projectIds = memberships.map(m => m.projectId);
    const projects = await find('projects', { _id: { $in: projectIds } });

    const now = new Date();
    let allTasks = [];
    for (const pid of projectIds) {
      const tasks = await find('tasks', { projectId: pid });
      allTasks = allTasks.concat(tasks);
    }

    const myTasks = allTasks.filter(t => t.assigneeId === req.user._id);
    const stats = {
      totalProjects: projects.length,
      totalTasks: allTasks.length,
      myTasks: myTasks.length,
      todo: allTasks.filter(t => t.status === 'todo').length,
      inProgress: allTasks.filter(t => t.status === 'in-progress').length,
      review: allTasks.filter(t => t.status === 'review').length,
      done: allTasks.filter(t => t.status === 'done').length,
      overdue: allTasks.filter(t => t.dueDate && t.status !== 'done' && new Date(t.dueDate) < now).length,
      myOverdue: myTasks.filter(t => t.dueDate && t.status !== 'done' && new Date(t.dueDate) < now).length,
    };

    const recentTasks = allTasks
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
      .slice(0, 10)
      .map(t => ({
        ...t,
        projectName: projects.find(p => p._id === t.projectId)?.name || 'Unknown',
        projectColor: projects.find(p => p._id === t.projectId)?.color || '#6366f1',
      }));

    const overdueList = allTasks
      .filter(t => t.dueDate && t.status !== 'done' && new Date(t.dueDate) < now)
      .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
      .slice(0, 5)
      .map(t => ({
        ...t,
        projectName: projects.find(p => p._id === t.projectId)?.name || 'Unknown',
        projectColor: projects.find(p => p._id === t.projectId)?.color || '#6366f1',
      }));

    res.json({ stats, recentTasks, overdueList, projects });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});


app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.listen(PORT, () => {
  console.log(` TaskFlow running on port ${PORT}`);
});
