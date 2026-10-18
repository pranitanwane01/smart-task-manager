# Smart Task Manager

A full-stack task management web application built with Next.js, React, Node.js, and Express. It supports multiple users, task assignment, priority and status tracking, and task dependencies.

## Features

- Register users and view all registered users
- Mock login using a registered email address
- Create, edit, and delete tasks
- Set a task title, description, priority (Low, Medium, High), and status
- Assign tasks to users
- Add task dependencies
- Prevent tasks from being marked Done while dependencies are incomplete
- Detect and reject invalid dependencies such as self-dependencies and circular dependencies
- View All Tasks, My Tasks, and Blocked Tasks
- Search tasks and filter by status and priority
- Dashboard counters for total, in-progress, completed, and blocked tasks

## Tech Stack

- **Frontend:** Next.js, React, Tailwind CSS
- **Backend:** Node.js, Express
- **Data storage:** In-memory JavaScript data structures (no permanent database)

## Project Structure

```text
smart-task-manager/
├── backend/
│   ├── server.js
│   └── package.json
├── public/
├── src/
│   └── app/
│       ├── page.js
│       ├── layout.js
│       └── globals.css
├── package.json
├── package-lock.json
└── README.md
```

## Prerequisites

- Node.js and npm installed

## Setup and Run Locally

### 1. Clone the repository

```bash
git clone https://github.com/pranitanwane01/smart-task-manager.git
cd smart-task-manager
```

### 2. Install frontend dependencies

Run from the project root:

```bash
npm install
```

### 3. Install backend dependencies

```bash
cd backend
npm install
```

### 4. Start the backend

In the backend directory, run the command configured in its `package.json`. If there is no start script, run:

```bash
node server.js
```

The backend is configured to run at `http://localhost:5001`.

### 5. Start the frontend

Open a **second terminal** at the project root and run:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser. Keep both frontend and backend terminals running while using the application.

## Test the Dependency Workflow

1. Register a user and log in using that user's email.
2. Create a prerequisite task and leave it incomplete.
3. Create another task and add a dependency on the prerequisite.
4. Try to mark the dependent task Done. The backend should reject the update while the prerequisite is incomplete.
5. Mark the prerequisite Done, then complete the dependent task.
6. Check the All Tasks, My Tasks, and Blocked Tasks views, along with search and status/priority filters.

## API

The backend exposes user and task endpoints. The main task-list endpoint is:

```text
GET http://localhost:5001/api/tasks
```

See `backend/server.js` for the full set of routes and request formats.

## Data Storage Note

This assignment intentionally uses **in-memory storage**. Users and tasks are not saved to a permanent database and will reset when the backend process restarts.

## Assignment

Prepared for the ImmverseAI Smart Task Manager assignment.
