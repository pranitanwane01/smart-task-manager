
const express = require("express");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors());
app.use(express.json());

// =====================================
// IN-MEMORY STORAGE
// =====================================
const users = [];
const tasks = [];

let nextUserId = 1;
let nextTaskId = 1;

// =====================================
// HELPER: FIND TASK
// =====================================
function findTask(taskId) {
  return tasks.find((task) => task.id === Number(taskId));
}

// Check whether adding a dependency creates a cycle
function createsCycle(currentId, targetId, visited = new Set()) {
  if (currentId === targetId) return true;
  if (visited.has(currentId)) return false;

  visited.add(currentId);

  const currentTask = findTask(currentId);
  if (!currentTask) return false;

  return currentTask.dependencies.some((dependencyId) =>
    createsCycle(dependencyId, targetId, visited)
  );
}

// Get incomplete dependencies for a task
function getIncompleteDependencies(task) {
  return task.dependencies
    .map((dependencyId) => findTask(dependencyId))
    .filter((dependency) => !dependency || dependency.status !== "Done");
}

// =====================================
// TEST API
// =====================================
app.get("/", (req, res) => {
  res.json({
    message: "Smart Task Manager API is running!",
  });
});

// =====================================
// USER APIs
// =====================================

// Get all users
app.get("/api/users", (req, res) => {
  res.json(users);
});

// Register user
app.post("/api/users/register", (req, res) => {
  const { name, email } = req.body;

  if (
    typeof name !== "string" ||
    !name.trim() ||
    typeof email !== "string" ||
    !email.trim()
  ) {
    return res.status(400).json({
      message: "Name and email are required.",
    });
  }

  const normalizedEmail = email.trim().toLowerCase();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    return res.status(400).json({
      message: "Please enter a valid email address.",
    });
  }

  const existingUser = users.find(
    (user) => user.email === normalizedEmail
  );

  if (existingUser) {
    return res.status(409).json({
      message: "Email is already registered.",
    });
  }

  const newUser = {
    id: nextUserId++,
    name: name.trim(),
    email: normalizedEmail,
  };

  users.push(newUser);

  return res.status(201).json({
    message: "User registered successfully.",
    user: newUser,
  });
});

// Mock login using email
app.post("/api/users/login", (req, res) => {
  const { email } = req.body;

  if (typeof email !== "string" || !email.trim()) {
    return res.status(400).json({
      message: "Email is required.",
    });
  }

  const normalizedEmail = email.trim().toLowerCase();

  const user = users.find(
    (item) => item.email === normalizedEmail
  );

  if (!user) {
    return res.status(404).json({
      message: "User not found. Please register first.",
    });
  }

  return res.json({
    message: "Login successful.",
    user,
  });
});

// =====================================
// TASK APIs
// =====================================

// Get all tasks
app.get("/api/tasks", (req, res) => {
  res.json(
    tasks.map((task) => ({
      ...task,
      blocked: getIncompleteDependencies(task).length > 0,
    }))
  );
});

// Create task
app.post("/api/tasks", (req, res) => {
  const {
    title,
    description = "",
    priority = "Medium",
    assignedTo = null,
  } = req.body;

  if (typeof title !== "string" || !title.trim()) {
    return res.status(400).json({
      message: "Task title is required.",
    });
  }

  if (typeof description !== "string") {
    return res.status(400).json({
      message: "Description must be a string.",
    });
  }

  if (!["Low", "Medium", "High"].includes(priority)) {
    return res.status(400).json({
      message: "Priority must be Low, Medium, or High.",
    });
  }

  let assignedUserId = null;

  if (assignedTo !== null) {
    assignedUserId = Number(assignedTo);

    if (
      !Number.isInteger(assignedUserId) ||
      !users.some((user) => user.id === assignedUserId)
    ) {
      return res.status(400).json({
        message: "Assigned user does not exist.",
      });
    }
  }

  const newTask = {
    id: nextTaskId++,
    title: title.trim(),
    description: description.trim(),
    priority,
    status: "Pending",
    assignedTo: assignedUserId,
    dependencies: [],
    createdAt: new Date().toISOString(),
  };

  tasks.push(newTask);

  return res.status(201).json({
    message: "Task created successfully.",
    task: {
      ...newTask,
      blocked: false,
    },
  });
});

// =====================================
// DEPENDENCY APIs
// =====================================

// Add dependency: this task depends on another task
app.post("/api/tasks/:id/dependencies", (req, res) => {
  const task = findTask(req.params.id);
  const { dependsOnTaskId } = req.body;

  if (!task) {
    return res.status(404).json({
      message: "Task not found.",
    });
  }

  if (
    dependsOnTaskId === undefined ||
    !Number.isInteger(Number(dependsOnTaskId))
  ) {
    return res.status(400).json({
      message: "A valid dependsOnTaskId is required.",
    });
  }

  const dependencyId = Number(dependsOnTaskId);
  const dependency = findTask(dependencyId);

  if (!dependency) {
    return res.status(404).json({
      message: "Dependency task not found.",
    });
  }

  if (task.id === dependencyId) {
    return res.status(400).json({
      message: "A task cannot depend on itself.",
    });
  }

  if (task.dependencies.includes(dependencyId)) {
    return res.status(409).json({
      message: "Dependency already exists.",
    });
  }

  // Prevent circular dependencies
  if (createsCycle(dependencyId, task.id)) {
    return res.status(400).json({
      message: "Circular dependencies are not allowed.",
    });
  }

  task.dependencies.push(dependencyId);

  return res.status(200).json({
    message: "Dependency added successfully.",
    task: {
      ...task,
      blocked: getIncompleteDependencies(task).length > 0,
    },
  });
});

// Get dependency information for one task
app.get("/api/tasks/:id/dependencies", (req, res) => {
  const task = findTask(req.params.id);

  if (!task) {
    return res.status(404).json({
      message: "Task not found.",
    });
  }

  const dependencies = task.dependencies.map((dependencyId) => {
    const dependency = findTask(dependencyId);

    return {
      id: dependencyId,
      title: dependency?.title ?? "Unknown task",
      status: dependency?.status ?? "Unknown",
    };
  });

  return res.json({
    taskId: task.id,
    dependencies,
    blocked: getIncompleteDependencies(task).length > 0,
  });
});

// =====================================
// UPDATE TASK
// =====================================
app.put("/api/tasks/:id", (req, res) => {
  const task = findTask(req.params.id);

  if (!task) {
    return res.status(404).json({
      message: "Task not found.",
    });
  }

  const { title, description, priority, status, assignedTo } =
    req.body;

  // Validate all fields before changing the task
  if (
    title !== undefined &&
    (typeof title !== "string" || !title.trim())
  ) {
    return res.status(400).json({
      message: "Task title cannot be empty.",
    });
  }

  if (
    description !== undefined &&
    typeof description !== "string"
  ) {
    return res.status(400).json({
      message: "Description must be a string.",
    });
  }

  if (
    priority !== undefined &&
    !["Low", "Medium", "High"].includes(priority)
  ) {
    return res.status(400).json({
      message: "Priority must be Low, Medium, or High.",
    });
  }

  if (
    status !== undefined &&
    !["Pending", "In Progress", "Done"].includes(status)
  ) {
    return res.status(400).json({
      message: "Invalid task status.",
    });
  }

  let assignedUserId = task.assignedTo;

  if (assignedTo !== undefined) {
    if (assignedTo === null) {
      assignedUserId = null;
    } else {
      assignedUserId = Number(assignedTo);

      if (
        !Number.isInteger(assignedUserId) ||
        !users.some((user) => user.id === assignedUserId)
      ) {
        return res.status(400).json({
          message: "Assigned user does not exist.",
        });
      }
    }
  }

  // Do not mark task Done while dependencies are incomplete
  if (status === "Done") {
    const incompleteDependencies =
      getIncompleteDependencies(task);

    if (incompleteDependencies.length > 0) {
      return res.status(400).json({
        message: "Task is blocked by incomplete dependencies.",
        blocked: true,
        incompleteDependencies: incompleteDependencies.map(
          (dependency) => ({
            id: dependency.id,
            title: dependency.title,
            status: dependency.status,
          })
        ),
      });
    }
  }

  if (title !== undefined) task.title = title.trim();
  if (description !== undefined) {
    task.description = description.trim();
  }
  if (priority !== undefined) task.priority = priority;
  if (status !== undefined) task.status = status;

  if (assignedTo !== undefined) {
    task.assignedTo = assignedUserId;
  }

  return res.json({
    message: "Task updated successfully.",
    task: {
      ...task,
      blocked: getIncompleteDependencies(task).length > 0,
    },
  });
});

// =====================================
// DELETE TASK
// =====================================
app.delete("/api/tasks/:id", (req, res) => {
  const taskId = Number(req.params.id);

  const taskIndex = tasks.findIndex(
    (task) => task.id === taskId
  );

  if (taskIndex === -1) {
    return res.status(404).json({
      message: "Task not found.",
    });
  }

  tasks.splice(taskIndex, 1);

  // Remove the deleted task from dependency lists
  tasks.forEach((task) => {
    task.dependencies = task.dependencies.filter(
      (dependencyId) => dependencyId !== taskId
    );
  });

  return res.json({
    message: "Task deleted successfully.",
  });
});

// =====================================
// TASKS ASSIGNED TO A USER
// =====================================
app.get("/api/users/:id/tasks", (req, res) => {
  const userId = Number(req.params.id);

  const user = users.find((item) => item.id === userId);

  if (!user) {
    return res.status(404).json({
      message: "User not found.",
    });
  }

  const userTasks = tasks
    .filter((task) => task.assignedTo === userId)
    .map((task) => ({
      ...task,
      blocked: getIncompleteDependencies(task).length > 0,
    }));

  return res.json(userTasks);
});

// =====================================
// START SERVER
// =====================================
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Smart Task Manager API listening on port ${PORT}`);
});
