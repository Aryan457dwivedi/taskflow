# ◈ TaskFlow — Team Task Manager

A full-stack team task manager with role-based access control, kanban board, and real-time dashboard.

**Live Demo:** `https://taskflowx.up.railway.app/`  
**Demo Login:** `demo@taskflow.app` / `demo123`  
**Member Login:** `sam@taskflow.app` / `member123`

---

https://drive.google.com/drive/folders/1g49jWHpo4WdtZPSKoqLwD952euGs33FA?usp=drive_link

## Features

### Authentication
- JWT-based signup/login
- Secure bcrypt password hashing
- Persistent sessions via localStorage
- Auto-login on page refresh

### Project Management
- Create projects with custom colors
- Invite members by email (must be registered)
- Role-based access: **Admin** and **Member**
- Edit and delete projects (Admin only)

### Task Management
- Kanban board: **To Do → In Progress → Review → Done**
- Task priority: Low / Medium / High / Critical
- Assign tasks to team members
- Due dates with overdue highlighting
- Admins: Create, edit, delete, assign tasks
- Members: Update status of their own assigned tasks

### Dashboard
- Total projects, tasks, completion count
- Overdue tasks count
- Recent activity feed
- Top overdue tasks list

### Role-Based Access Control
| Action | Admin | Member |
|--------|-------|--------|
| Create tasks | ✅ | ❌ |
| Delete tasks | ✅ | ❌ |
| Assign tasks | ✅ | ❌ |
| Update own task status | ✅ | ✅ |
| Invite members | ✅ | ❌ |
| Remove members | ✅ | ❌ |
| Edit project | ✅ | ❌ |
| Delete project | ✅ | ❌ |

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Runtime | Node.js |
| Framework | Express.js |
| Database | NeDB (embedded, file-based) |
| Auth | JWT + bcryptjs |
| Frontend | Vanilla JS + CSS (SPA) |
| Deployment | Railway |

---

## API Reference

### Auth
```
POST /api/auth/signup      { name, email, password }
POST /api/auth/login       { email, password }
GET  /api/auth/me          → current user
```

### Dashboard
```
GET  /api/dashboard        → stats, recent tasks, overdue
```

### Projects
```
GET    /api/projects
POST   /api/projects       { name, description, color }
GET    /api/projects/:id
PUT    /api/projects/:id   { name, description, color }
DELETE /api/projects/:id
```

### Members
```
POST   /api/projects/:id/members          { email, role }
PUT    /api/projects/:id/members/:mid     { role }
DELETE /api/projects/:id/members/:mid
```

### Tasks
```
GET    /api/projects/:id/tasks            ?status=&priority=&assigneeId=
POST   /api/projects/:id/tasks            { title, description, priority, dueDate, assigneeId }
PUT    /api/projects/:id/tasks/:tid       { status, priority, assigneeId, dueDate, title, description }
DELETE /api/projects/:id/tasks/:tid
```

---

## Local Setup

```bash
# Clone and install
git clone https://github.com/you/taskflow
cd taskflow
npm install

# Configure
cp .env.example .env
# Edit .env with your JWT_SECRET

# Seed demo data (optional)
node seed.js

# Start
npm start
# → http://localhost:3000
```

---

## Deploy to Railway

### Method 1: GitHub (Recommended)
1. Push this repo to GitHub
2. Go to [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub repo**
3. Select your repo
4. Add environment variables:
   - `JWT_SECRET` = any long random string (e.g., generate with `openssl rand -hex 32`)
   - `PORT` = 3000 (Railway sets this automatically)
5. Deploy! Railway auto-detects Node.js

### Method 2: Railway CLI
```bash
npm install -g @railway/cli
railway login
railway init
railway up
```

### Environment Variables on Railway
```
JWT_SECRET=your_super_secret_key_here
NODE_ENV=production
```

> **Note:** NeDB stores data in flat files. On Railway, data persists as long as the deployment volume is attached. For production, consider upgrading to PostgreSQL using Railway's database plugin.

---

## Project Structure

```
taskflow/
├── src/
│   ├── server.js       # Express app + dashboard endpoint
│   ├── database.js     # NeDB setup + promisified helpers
│   ├── middleware.js    # JWT auth + role checks
│   ├── auth.js         # Auth routes (signup/login/me)
│   ├── projects.js     # Project + member routes
│   └── tasks.js        # Task CRUD routes
├── public/
│   ├── index.html      # SPA shell
│   ├── css/style.css   # Dark industrial theme
│   └── js/app.js       # Frontend SPA logic
├── data/               # NeDB database files (gitignored)
├── seed.js             # Demo data seeder
├── railway.toml        # Railway deployment config
└── package.json
```

---

## Screenshots

> Dashboard with stats cards, recent activity, and overdue tasks  
> Kanban board with drag-and-drop columns  
> Project detail with member management  
> Role-based task creation modal  

---

## License

MIT
