# NexusOps — Intelligent Team OS

> Real-time team management platform powered by ML, built with React, Node.js, MongoDB & Socket.IO.

🔗 **Live:** https://nexusops-gamma.vercel.app  
💻 **GitHub:** https://github.com/AtharvaVavhal/nexusops

---

## ✨ Features

### 🧠 ML-Powered
- **Naive Bayes Classifier** — predicts task priority automatically as you type the title
- **Linear Regression** — forecasts burndown velocity & estimated sprint completion date
- Both models implemented **from scratch in JavaScript** — no ML libraries

### ⚡ Real-time
- **Kanban Board** — drag & drop with live Socket.IO sync across all users
- **Collaborative Docs** — conflict-free editing using **Operational Transformation (OT)** — the same algorithm behind Google Docs

### 🔗 Visualization
- **D3.js Dependency Graph** — force-directed graph showing task relationships and blockers

### ⚙️ Automation
- **No-code Rule Engine** — if-then automation rules (e.g. auto-escalate overdue tasks to critical)

### 📊 Analytics
- Burndown chart with ideal vs actual tracking
- KPI cards: completion rate, velocity/day, anomaly detection
- Status & priority breakdowns

---

## 🛠 Tech Stack

| Layer | Tech |
|---|---|
| Frontend | React, Tailwind CSS |
| Backend | Node.js, Express |
| Database | MongoDB Atlas |
| Real-time | Socket.IO |
| ML | Naive Bayes, Linear Regression (vanilla JS) |
| Graph | D3.js |
| Frontend Deploy | Vercel |
| Backend Deploy | Railway |

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- MongoDB Atlas account

### 1. Clone the repo
```bash
git clone https://github.com/AtharvaVavhal/nexusops.git
cd nexusops/nexusops
```

### 2. Set up environment variables
Create a `.env` file in the `nexusops/` folder:
```env
MONGO_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/nexusops
JWT_SECRET=your_jwt_secret
JWT_REFRESH_SECRET=your_refresh_secret
PORT=8000
```

### 3. Install & run backend
```bash
npm install
node server.js
```

### 4. Install & run frontend
```bash
cd client
npm install
npm start
```

---

## 📁 Project Structure

```
nexusops/
├── server.js          # Combined backend (auth, tasks, docs, analytics, rules)
├── client/            # React frontend
│   └── src/
│       ├── pages/     # Dashboard, Board, Graph, Docs, Analytics, Rules
│       ├── components/
│       └── utils/     # API client, Socket.IO
└── services/          # Original microservices (reference)
    ├── auth-service/
    ├── task-service/
    ├── doc-service/
    └── analytics-service/
```

---

## 🧠 ML Implementation

### Naive Bayes Priority Prediction
Classifies task priority (low/medium/high/critical) based on keywords in the task title. Trained on a seed dataset of software development tasks.

### Linear Regression Burndown
Calculates velocity per day from completed tasks and projects estimated completion date using least squares regression on historical burndown data.

---


---

## 📄 License

MIT © [Atharva Vavhal](https://github.com/AtharvaVavhal)
