# ⚡ NexusOps — Intelligent Team Operating System

> A real-time, ML-powered team OS built for modern engineering teams. Combines collaborative editing, AI-driven task prioritization, visual dependency management, and an automated rule engine — all in one platform.

---

## 🚀 Live Demo

```
Frontend:          http://localhost:3000
API Gateway:       http://localhost:8000
```

**Demo credentials:**
```
Email:    demo@nexusops.com
Password: demo123
```

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    React Frontend :3000                  │
│     Dashboard │ Kanban │ Graph │ Analytics │ Docs │ Rules│
└──────────────────────┬──────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────┐
│                  API Gateway :8000                       │
│              express-http-proxy routing                  │
└──┬──────────┬──────────┬──────────┬────────────────┬────┘
   │          │          │          │                │
┌──▼──┐  ┌───▼──┐  ┌────▼──┐  ┌───▼────┐  ┌────────▼──┐
│Auth │  │ Task │  │  Doc  │  │Analytics│  │  MongoDB  │
│:5001│  │ :5002│  │ :5003 │  │  :5004  │  │   Atlas   │
└─────┘  └──────┘  └───────┘  └─────────┘  └───────────┘
           │              │
      Socket.io       Socket.io
      (Kanban)         (OT Collab)
```

---

## ✨ Features

### 🤖 ML-Powered Priority Prediction
- **Naive Bayes Classifier** trained on task keywords
- Auto-predicts task priority when you type a title
- Keywords like "urgent", "critical", "bug" → Critical priority
- Keywords like "docs", "cleanup", "refactor" → Low priority

### 📋 Real-time Kanban Board
- Drag & drop task management with live Socket.io sync
- 4 columns: To Do → In Progress → Review → Done
- ML priority prediction on task creation
- Multi-user real-time updates

### 🔗 D3.js Dependency Graph
- Interactive force-directed graph of task dependencies
- Node size = priority, node color = status
- Drag, zoom, and filter by status
- Click nodes for detailed task info

### 📊 Analytics Dashboard
- **Burndown Chart** with linear regression forecasting
- **Anomaly Detection** — flags overdue and stuck tasks
- **Sprint Velocity** tracking
- **Team Productivity** leaderboard
- **Naive Bayes** priority distribution visualization

### ⚙️ Visual Rule Builder
- No-code automation rule engine
- Conditions: AND/OR logic with field/operator/value
- Actions: change priority, change status, notify workspace, escalate, auto-assign
- Live rule testing against real tasks

### ✍️ Collaborative Doc Editor
- **Operational Transformation (OT)** algorithm for conflict-free concurrent editing
- Real-time multi-user cursor tracking
- Markdown support with live preview
- Document version history

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Tailwind CSS, D3.js v7 |
| Routing | React Router DOM v7 |
| Real-time | Socket.io v4 |
| HTTP Client | Axios |
| Backend | Node.js + Express (microservices) |
| Database | MongoDB Atlas + Mongoose |
| Auth | JWT (access + refresh tokens) |
| ML | Custom Naive Bayes + Linear Regression |
| OT | Custom Operational Transform engine |
| Gateway | express-http-proxy |

---

## 📁 Project Structure

```
nexusops/
├── client/                          # React frontend
│   └── src/
│       ├── pages/
│       │   ├── Login.jsx            # Auth (login + register)
│       │   ├── Dashboard.jsx        # Workspace management
│       │   ├── Board.jsx            # Kanban + ML prediction
│       │   ├── GraphView.jsx        # D3 dependency graph
│       │   ├── Analytics.jsx        # Burndown + ML anomalies
│       │   ├── RuleBuilder.jsx      # Visual rule engine
│       │   └── DocEditor.jsx        # Collaborative OT editor
│       ├── context/
│       │   └── AuthContext.js       # JWT auth state
│       └── utils/
│           ├── api.js               # Axios instance + interceptors
│           └── socket.js            # Socket.io connections
│
├── gateway/                         # API Gateway (port 8000)
│   └── index.js
│
└── services/
    ├── auth-service/                # JWT auth (port 5001)
    │   ├── models/User.js
    │   └── routes/auth.js
    ├── task-service/                # Tasks + Socket.io (port 5002)
    │   ├── models/Task.js
    │   ├── models/Workspace.js
    │   ├── routes/tasks.js
    │   └── utils/graphEngine.js
    ├── doc-service/                 # OT collab editor (port 5003)
    │   ├── models/Doc.js
    │   ├── routes/docs.js
    │   └── utils/ot.js              # OT algorithm
    └── analytics-service/           # ML + Rules (port 5004)
        ├── models/Rule.js
        ├── routes/analytics.js
        ├── routes/rules.js
        ├── utils/mlEngine.js        # Naive Bayes + Linear Regression
        └── utils/ruleEngine.js      # Rule evaluation engine
```

---

## ⚡ Quick Start

### Prerequisites
- Node.js 18+
- MongoDB Atlas account (or local MongoDB)
- npm

### 1. Clone & Install

```bash
git clone <repo-url>
cd nexusops
```

Install all service dependencies:

```bash
# Gateway
cd gateway && npm install && cd ..

# Services
cd services/auth-service && npm install && cd ../..
cd services/task-service && npm install && cd ../..
cd services/doc-service && npm install && cd ../..
cd services/analytics-service && npm install && cd ../..

# Frontend
cd client && npm install && cd ..
```

### 2. Environment Variables

Create `.env` in the root `nexusops/` directory:

```env
MONGO_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/nexusops
JWT_SECRET=your_super_secret_jwt_key_here
JWT_REFRESH_SECRET=your_refresh_secret_here
PORT_AUTH=5001
PORT_TASK=5002
PORT_DOC=5003
PORT_ANALYTICS=5004
```

### 3. Start All Services

Open 6 terminal tabs and run one command in each:

```bash
# Tab 1 — Gateway
cd gateway && node index.js

# Tab 2 — Auth Service
cd services/auth-service && node index.js

# Tab 3 — Task Service
cd services/task-service && node index.js

# Tab 4 — Doc Service
cd services/doc-service && node index.js

# Tab 5 — Analytics Service
cd services/analytics-service && node index.js

# Tab 6 — Frontend
cd client && npm start
```

Or with nodemon for development:
```bash
cd services/auth-service && npx nodemon index.js
```

### 4. Open the App

```
http://localhost:3000
```

Register a new account, create a workspace, and start building!

---

## 🔌 API Reference

### Auth Service (`:5001` via gateway `/api/auth`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/register` | Register new user |
| POST | `/auth/login` | Login, returns JWT tokens |
| POST | `/auth/refresh` | Refresh access token |

### Task Service (`:5002` via gateway `/api/tasks`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/tasks/workspace/:id` | Get all tasks for workspace |
| POST | `/tasks` | Create task |
| PUT | `/tasks/:id` | Update task (status, priority, etc.) |
| DELETE | `/tasks/:id` | Delete task |
| GET/POST | `/tasks/workspace` | List / create workspaces |

### Doc Service (`:5003` via gateway `/api/docs`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/docs/workspace/:id` | List workspace docs |
| GET | `/docs/:id` | Get doc content |
| POST | `/docs` | Create new doc |
| DELETE | `/docs/:id` | Delete doc |

**Socket Events:**
```
Emit:   doc:join, doc:operation, cursor:move, doc:leave
Listen: doc:init, doc:operation, doc:ack, user:joined, user:left
```

### Analytics Service (`:5004` via gateway `/api/analytics`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/analytics/workspace/:id` | Get burndown + anomalies |
| POST | `/analytics/predict-priority` | ML priority prediction |
| GET | `/rules/:workspaceId` | List rules |
| POST | `/rules` | Create rule |
| PUT | `/rules/:id` | Update rule |
| DELETE | `/rules/:id` | Delete rule |
| POST | `/rules/evaluate` | Test rules against a task |

---

## 🤖 ML Engine

### Naive Bayes Priority Classifier

Trained on labeled keyword datasets:

```
"urgent critical blocker production down" → critical
"bug fix broken not working crash"        → high
"feature request new enhancement"         → medium
"documentation cleanup minor typo"        → low
```

Used in: task creation (auto-predict) + analytics priority distribution.

### Linear Regression Burndown Forecasting

Groups completed tasks by day, fits a linear regression model, and predicts completion date based on current velocity.

### Anomaly Detection

Flags tasks that are:
- Overdue (past due date, not done) → severity based on days overdue
- Stuck (in-progress for 3+ days without update)

---

## 🔧 Rule Engine

Rules follow an `IF conditions THEN action` DSL:

```json
{
  "name": "Escalate Stale Tasks",
  "logic": "AND",
  "conditions": [
    { "field": "status", "operator": "equals", "value": "inprogress" },
    { "field": "dueDate", "operator": "less_than", "value": "0" }
  ],
  "actions": [
    { "type": "escalate" }
  ],
  "active": true
}
```

**Available Actions:** `change_status`, `change_priority`, `notify_workspace`, `escalate`, `auto_assign`

**Available Operators:** `equals`, `not_equals`, `contains`, `greater_than`, `less_than`, `is_empty`, `is_not_empty`

---

## 🏆 Built for Hackathon

**NexusOps** was built as a full-stack hackathon project demonstrating:
- Microservices architecture with API gateway pattern
- Real-time collaboration using Socket.io
- ML from scratch (no external ML libraries)
- Conflict-free collaborative editing with OT algorithm
- Visual no-code automation builder

---

## 👤 Author

**Atharva** — Full Stack Developer

---

*Built with ⚡ in 48 hours*
