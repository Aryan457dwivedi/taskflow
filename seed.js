// Seed demo data for TaskFlow
const bcrypt = require('bcryptjs');
const path = require('path');
const Datastore = require('nedb');
const fs = require('fs');

const dbPath = path.join(__dirname, 'data');
if (!fs.existsSync(dbPath)) fs.mkdirSync(dbPath);

const db = {
  users: new Datastore({ filename: path.join(dbPath, 'users.db'), autoload: true }),
  projects: new Datastore({ filename: path.join(dbPath, 'projects.db'), autoload: true }),
  tasks: new Datastore({ filename: path.join(dbPath, 'tasks.db'), autoload: true }),
  members: new Datastore({ filename: path.join(dbPath, 'members.db'), autoload: true }),
};

const ins = (col, doc) => new Promise((res, rej) => db[col].insert(doc, (e, d) => e ? rej(e) : res(d)));
const rem = (col) => new Promise((res, rej) => db[col].remove({}, { multi: true }, (e) => e ? rej(e) : res()));

async function seed() {
  console.log('🌱 Seeding demo data...');
  // Clear
  for (const col of ['users','projects','tasks','members']) await rem(col);

  const hash = await bcrypt.hash('demo123', 12);
  const hash2 = await bcrypt.hash('member123', 12);

  const admin = await ins('users', { name: 'Alex Admin', email: 'demo@taskflow.app', password: hash, createdAt: new Date().toISOString() });
  const member1 = await ins('users', { name: 'Sam Designer', email: 'sam@taskflow.app', password: hash2, createdAt: new Date().toISOString() });
  const member2 = await ins('users', { name: 'Jordan Dev', email: 'jordan@taskflow.app', password: hash2, createdAt: new Date().toISOString() });

  // Project 1
  const p1 = await ins('projects', { name: 'Website Redesign', description: 'Complete overhaul of the company website with new design system', color: '#f59e0b', createdBy: admin._id, createdAt: new Date().toISOString() });
  await ins('members', { projectId: p1._id, userId: admin._id, role: 'admin', name: admin.name, email: admin.email, joinedAt: new Date().toISOString() });
  await ins('members', { projectId: p1._id, userId: member1._id, role: 'member', name: member1.name, email: member1.email, joinedAt: new Date().toISOString() });
  await ins('members', { projectId: p1._id, userId: member2._id, role: 'member', name: member2.name, email: member2.email, joinedAt: new Date().toISOString() });

  const pastDate = new Date(); pastDate.setDate(pastDate.getDate() - 3);

  await ins('tasks', { projectId: p1._id, title: 'Design new homepage wireframes', description: 'Create wireframes for the hero, features, and CTA sections', status: 'done', priority: 'high', assigneeId: member1._id, assigneeName: member1.name, dueDate: new Date(Date.now() - 7*86400000).toISOString().split('T')[0], createdBy: admin._id, createdByName: admin.name, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
  await ins('tasks', { projectId: p1._id, title: 'Build responsive navigation component', description: 'Mobile-first navigation with hamburger menu', status: 'in-progress', priority: 'high', assigneeId: member2._id, assigneeName: member2.name, dueDate: new Date(Date.now() + 3*86400000).toISOString().split('T')[0], createdBy: admin._id, createdByName: admin.name, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
  await ins('tasks', { projectId: p1._id, title: 'Set up CI/CD pipeline', description: 'Configure GitHub Actions for automated testing and deployment', status: 'todo', priority: 'medium', assigneeId: null, assigneeName: null, dueDate: new Date(Date.now() + 7*86400000).toISOString().split('T')[0], createdBy: admin._id, createdByName: admin.name, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
  await ins('tasks', { projectId: p1._id, title: 'Write content for About page', status: 'review', priority: 'low', assigneeId: member1._id, assigneeName: member1.name, dueDate: pastDate.toISOString().split('T')[0], createdBy: admin._id, createdByName: admin.name, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
  await ins('tasks', { projectId: p1._id, title: 'Performance audit and optimization', description: 'Achieve 90+ Lighthouse score on all pages', status: 'todo', priority: 'critical', assigneeId: member2._id, assigneeName: member2.name, dueDate: pastDate.toISOString().split('T')[0], createdBy: admin._id, createdByName: admin.name, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });

  // Project 2
  const p2 = await ins('projects', { name: 'Mobile App v2', description: 'Second version of the mobile app with enhanced features', color: '#3b82f6', createdBy: admin._id, createdAt: new Date().toISOString() });
  await ins('members', { projectId: p2._id, userId: admin._id, role: 'admin', name: admin.name, email: admin.email, joinedAt: new Date().toISOString() });
  await ins('members', { projectId: p2._id, userId: member2._id, role: 'admin', name: member2.name, email: member2.email, joinedAt: new Date().toISOString() });

  await ins('tasks', { projectId: p2._id, title: 'API integration for push notifications', status: 'in-progress', priority: 'high', assigneeId: member2._id, assigneeName: member2.name, dueDate: new Date(Date.now() + 5*86400000).toISOString().split('T')[0], createdBy: admin._id, createdByName: admin.name, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
  await ins('tasks', { projectId: p2._id, title: 'Dark mode implementation', status: 'todo', priority: 'medium', assigneeId: null, assigneeName: null, dueDate: new Date(Date.now() + 10*86400000).toISOString().split('T')[0], createdBy: admin._id, createdByName: admin.name, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
  await ins('tasks', { projectId: p2._id, title: 'App Store submission', status: 'todo', priority: 'critical', assigneeId: admin._id, assigneeName: admin.name, dueDate: new Date(Date.now() + 14*86400000).toISOString().split('T')[0], createdBy: admin._id, createdByName: admin.name, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });

  console.log('✅ Seed complete!');
  console.log('  Demo login: demo@taskflow.app / demo123');
  console.log('  Member login: sam@taskflow.app / member123');
  process.exit(0);
}

seed().catch(e => { console.error(e); process.exit(1); });
