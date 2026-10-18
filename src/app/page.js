
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";

const PRIORITIES = ["Low", "Medium", "High"];
const STATUSES = ["To Do", "In Progress", "Done"];

export default function Home() {
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("Medium");
  const [assignedTo, setAssignedTo] = useState("");

  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [loginEmail, setLoginEmail] = useState("");

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [priorityFilter, setPriorityFilter] = useState("All");
  const [taskView, setTaskView] = useState("All");
  const [editingId, setEditingId] = useState(null);
  const [dependencyTaskId, setDependencyTaskId] = useState("");
  const [dependencyForTaskId, setDependencyForTaskId] = useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const request = useCallback(async (path, options = {}) => {
    const response = await fetch(`${API}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.message || "Something went wrong.");
    }

    return data;
  }, []);

  // Load initial data and show loading/error states.
  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [tasksData, usersData] = await Promise.all([
        request("/api/tasks"),
        request("/api/users"),
      ]);

      setTasks(Array.isArray(tasksData) ? tasksData : []);
      setUsers(Array.isArray(usersData) ? usersData : []);
    } catch (err) {
      setError(
        `${err.message} Check that the backend service is running and NEXT_PUBLIC_API_URL is configured correctly.`
      );
    } finally {
      setLoading(false);
    }
  }, [request]);

  // Refresh data in the background so changes made by another user/browser
  // become visible without a manual page reload.
  const refreshData = useCallback(async () => {
    try {
      const [tasksData, usersData] = await Promise.all([
        request("/api/tasks"),
        request("/api/users"),
      ]);

      setTasks(Array.isArray(tasksData) ? tasksData : []);
      setUsers(Array.isArray(usersData) ? usersData : []);
    } catch {
      // Ignore temporary background polling failures to avoid interrupting the UI.
    }
  }, [request]);

  useEffect(() => {
    loadData();

    const pollingId = setInterval(() => {
      refreshData();
    }, 5000);

    return () => clearInterval(pollingId);
  }, [loadData, refreshData]);

  async function handleRegister(e) {
    e.preventDefault();
    setError("");
    setNotice("");

    try {
      const data = await request("/api/users/register", {
        method: "POST",
        body: JSON.stringify({
          name: newUserName.trim(),
          email: newUserEmail.trim(),
        }),
      });

      setCurrentUser(data.user);
      setNewUserName("");
      setNewUserEmail("");
      setNotice(data.message || "Registration successful.");
      await loadData();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleLogin(e) {
    e.preventDefault();
    setError("");
    setNotice("");

    try {
      const data = await request("/api/users/login", {
        method: "POST",
        body: JSON.stringify({ email: loginEmail.trim() }),
      });

      setCurrentUser(data.user);
      setLoginEmail("");
      setNotice(data.message || "Login successful.");
    } catch (err) {
      setError(err.message);
    }
  }

  function resetForm() {
    setTitle("");
    setDescription("");
    setPriority("Medium");
    setAssignedTo("");
    setEditingId(null);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setNotice("");

    if (!title.trim()) {
      setError("Task title is required.");
      return;
    }

    const payload = {
      title: title.trim(),
      description: description.trim(),
      priority,
      assignedTo: assignedTo ? Number(assignedTo) : null,
    };

    try {
      if (editingId !== null) {
        await request(`/api/tasks/${editingId}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });

        setNotice("Task updated successfully.");
      } else {
        await request("/api/tasks", {
          method: "POST",
          body: JSON.stringify(payload),
        });

        setNotice("Task created successfully.");
      }

      resetForm();
      await loadData();
    } catch (err) {
      setError(err.message);
    }
  }

  function editTask(task) {
    setEditingId(task.id);
    setTitle(task.title || "");
    setDescription(task.description || "");
    setPriority(task.priority || "Medium");
    setAssignedTo(
      task.assignedTo == null ? "" : String(task.assignedTo)
    );

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function changeStatus(task, status) {
    setError("");
    setNotice("");

    try {
      await request(`/api/tasks/${task.id}`, {
        method: "PUT",
        body: JSON.stringify({ status }),
      });

      setNotice("Task status updated.");
      await loadData();
    } catch (err) {
      setError(err.message);
      await loadData();
    }
  }

  async function deleteTask(task) {
    if (!window.confirm(`Delete "${task.title}"?`)) return;

    setError("");
    setNotice("");

    try {
      await request(`/api/tasks/${task.id}`, {
        method: "DELETE",
      });

      if (editingId === task.id) resetForm();

      setNotice("Task deleted successfully.");
      await loadData();
    } catch (err) {
      setError(err.message);
    }
  }

  async function addDependency(e) {
    e.preventDefault();
    setError("");
    setNotice("");

    if (!dependencyForTaskId || !dependencyTaskId) {
      setError("Select both tasks.");
      return;
    }

    if (dependencyForTaskId === dependencyTaskId) {
      setError("A task cannot depend on itself.");
      return;
    }

    try {
      await request(
        `/api/tasks/${dependencyForTaskId}/dependencies`,
        {
          method: "POST",
          body: JSON.stringify({
            dependsOnTaskId: Number(dependencyTaskId),
          }),
        }
      );

      setDependencyForTaskId("");
      setDependencyTaskId("");
      setNotice("Task dependency added.");
      await loadData();
    } catch (err) {
      setError(err.message);
    }
  }

  const completed = tasks.filter(
    (task) => task.status === "Done"
  ).length;

  const inProgress = tasks.filter(
    (task) => task.status === "In Progress"
  ).length;

  const blockedCount = tasks.filter(
    (task) => task.blocked === true
  ).length;

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const query = search.toLowerCase();

      const matchesSearch =
        (task.title || "").toLowerCase().includes(query) ||
        (task.description || "").toLowerCase().includes(query);

      const matchesStatus =
        filter === "All" || task.status === filter;

      const matchesPriority =
        priorityFilter === "All" ||
        task.priority === priorityFilter;

      const matchesView =
        taskView === "All" ||
        (taskView === "My Tasks" &&
          currentUser !== null &&
          Number(task.assignedTo) === Number(currentUser.id)) ||
        (taskView === "Blocked" && task.blocked === true);

      return (
        matchesSearch &&
        matchesStatus &&
        matchesPriority &&
        matchesView
      );
    });
  }, [
    tasks,
    search,
    filter,
    priorityFilter,
    taskView,
    currentUser,
  ]);

  function userName(userId) {
    const user = users.find(
      (item) => Number(item.id) === Number(userId)
    );

    return user ? user.name : "Unassigned";
  }

  function dependencyTitles(task) {
    return (task.dependencies || [])
      .map((id) => tasks.find((item) => item.id === id)?.title)
      .filter(Boolean);
  }

  const priorityStyles = {
    Low: "bg-green-100 text-green-700",
    Medium: "bg-amber-100 text-amber-700",
    High: "bg-red-100 text-red-700",
  };

    return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <nav className="flex flex-wrap items-center justify-between gap-3 border-b bg-white px-5 py-5 shadow-sm sm:px-8">
        <div>
          <h1 className="text-2xl font-bold text-indigo-600">
            TaskFlow
          </h1>
          <p className="text-sm text-slate-500">
            Smart Task Manager
          </p>
        </div>

        {currentUser ? (
          <div className="text-sm">
            Logged in as <strong>{currentUser.name}</strong>
            <button
              onClick={() => setCurrentUser(null)}
              className="ml-3 rounded-lg bg-slate-100 px-3 py-2 hover:bg-slate-200"
            >
              Log out
            </button>
          </div>
        ) : (
          <span className="text-sm text-slate-500">
            Mock login · No password required
          </span>
        )}
      </nav>

      <section className="mx-auto max-w-6xl px-5 py-8 sm:py-10">
        <div className="mb-7">
          <h2 className="text-3xl font-bold">
            Smart Task Dashboard
          </h2>
          <p className="mt-2 text-slate-500">
            Create tasks, assign users and manage dependencies.
          </p>
        </div>

        {error && (
          <div
            role="alert"
            className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          >
            {error}
          </div>
        )}

        {notice && (
          <div
            role="status"
            className="mb-4 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700"
          >
            {notice}
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          <section className="rounded-xl bg-white p-5 shadow-sm">
            <h3 className="mb-4 text-lg font-bold">Register User</h3>

            <form onSubmit={handleRegister} className="space-y-3">
              <input
                value={newUserName}
                onChange={(e) => setNewUserName(e.target.value)}
                placeholder="Full name"
                aria-label="New user's name"
                required
                className="w-full rounded-lg border p-3"
              />

              <input
                type="email"
                value={newUserEmail}
                onChange={(e) => setNewUserEmail(e.target.value)}
                placeholder="Email address"
                aria-label="New user's email"
                required
                className="w-full rounded-lg border p-3"
              />

              <button className="w-full rounded-lg bg-indigo-600 px-4 py-3 font-semibold text-white hover:bg-indigo-700">
                Register
              </button>
            </form>
          </section>

          <section className="rounded-xl bg-white p-5 shadow-sm">
            <h3 className="mb-4 text-lg font-bold">Mock Login</h3>

            <form onSubmit={handleLogin} className="space-y-3">
              <input
                type="email"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                placeholder="Registered email"
                aria-label="Login email"
                required
                className="w-full rounded-lg border p-3"
              />

              <button className="w-full rounded-lg bg-slate-800 px-4 py-3 font-semibold text-white hover:bg-slate-700">
                Login
              </button>
            </form>

            <p className="mt-3 text-xs text-slate-500">
              This is a demo login, not production authentication.
            </p>
          </section>
        </div>

        <section className="mt-5 rounded-xl bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-lg font-bold">Registered Users</h3>
            <span className="text-sm text-slate-500">
              {users.length} users
            </span>
          </div>

          {users.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">
              No users yet. Register your first user above.
            </p>
          ) : (
            <div className="mt-3 flex flex-wrap gap-2">
              {users.map((user) => (
                <div
                  key={user.id}
                  className="rounded-lg bg-slate-100 px-3 py-2 text-sm"
                >
                  <strong>{user.name}</strong>
                  <span className="ml-2 text-slate-500">
                    {user.email}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        <div className="mt-7 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard label="Total Tasks" value={tasks.length} />
          <StatCard label="In Progress" value={inProgress} />
          <StatCard label="Completed" value={completed} />
          <StatCard label="Blocked Tasks" value={blockedCount} />
        </div>

        <section className="mt-7 rounded-xl bg-white p-5 shadow-sm">
          <h3 className="mb-4 text-xl font-bold">
            {editingId !== null ? "Edit Task" : "Create Task"}
          </h3>

          <form onSubmit={handleSubmit} className="grid gap-3 md:grid-cols-2">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Task title"
              aria-label="Task title"
              required
              className="w-full rounded-lg border p-3"
            />

            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              aria-label="Task priority"
              className="w-full rounded-lg border p-3"
            >
              {PRIORITIES.map((item) => (
                <option key={item} value={item}>
                  {item} Priority
                </option>
              ))}
            </select>

            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Task description"
              aria-label="Task description"
              rows={3}
              className="w-full rounded-lg border p-3 md:col-span-2"
            />

            <select
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value)}
              aria-label="Assign task to user"
              className="w-full rounded-lg border p-3"
            >
              <option value="">Unassigned</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  Assign to {user.name}
                </option>
              ))}
            </select>

            <div className="flex flex-wrap gap-2">
              <button className="flex-1 rounded-lg bg-indigo-600 px-5 py-3 font-semibold text-white hover:bg-indigo-700">
                {editingId !== null ? "Save Changes" : "+ Add Task"}
              </button>

              {editingId !== null && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-lg bg-slate-200 px-4 py-3 font-semibold hover:bg-slate-300"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </section>

                <section className="mt-7 rounded-xl bg-white p-5 shadow-sm">
          <h3 className="text-xl font-bold">Add Task Dependency</h3>
          <p className="mt-1 text-sm text-slate-500">
            A task cannot be completed until its dependencies are Done.
          </p>

          <form
            onSubmit={addDependency}
            className="mt-4 grid gap-3 md:grid-cols-3"
          >
            <select
              value={dependencyForTaskId}
              onChange={(e) => setDependencyForTaskId(e.target.value)}
              required
              aria-label="Task that depends on another"
              className="rounded-lg border p-3"
            >
              <option value="">Select dependent task</option>
              {tasks.map((task) => (
                <option key={task.id} value={task.id}>
                  {task.title}
                </option>
              ))}
            </select>

            <select
              value={dependencyTaskId}
              onChange={(e) => setDependencyTaskId(e.target.value)}
              required
              aria-label="Prerequisite task"
              className="rounded-lg border p-3"
            >
              <option value="">Select prerequisite</option>
              {tasks
                .filter((task) => String(task.id) !== dependencyForTaskId)
                .map((task) => (
                  <option key={task.id} value={task.id}>
                    {task.title}
                  </option>
                ))}
            </select>

            <button className="rounded-lg bg-slate-800 px-4 py-3 font-semibold text-white hover:bg-slate-700">
              Add Dependency
            </button>
          </form>
        </section>

        <section className="mt-7 rounded-xl bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row">
            <select
              value={taskView}
              onChange={(e) => setTaskView(e.target.value)}
              aria-label="Filter task view"
              className="rounded-lg border p-3"
            >
              <option value="All">All Tasks</option>
              <option value="My Tasks">My Tasks</option>
              <option value="Blocked">Blocked Tasks</option>
            </select>

            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search title or description..."
              aria-label="Search tasks"
              className="min-w-0 flex-1 rounded-lg border p-3"
            />

            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              aria-label="Filter by status"
              className="rounded-lg border p-3"
            >
              <option value="All">All statuses</option>
              {STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>

            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              aria-label="Filter by priority"
              className="rounded-lg border p-3"
            >
              <option value="All">All priorities</option>
              {PRIORITIES.map((item) => (
                <option key={item} value={item}>
                  {item} Priority
                </option>
              ))}
            </select>
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-xl font-bold">Task List</h3>
            <span className="text-sm text-slate-500">
              {filteredTasks.length} shown
            </span>
          </div>

          {loading ? (
            <p className="py-10 text-center text-slate-500">
              Loading tasks from backend...
            </p>
          ) : filteredTasks.length === 0 ? (
            <p className="py-10 text-center text-slate-500">
              {tasks.length === 0
                ? "No tasks yet. Create your first task above."
                : taskView === "My Tasks" && !currentUser
                  ? "Log in to view tasks assigned to you."
                  : "No tasks match your filters."}
            </p>
          ) : (
            <div className="mt-4 space-y-3">
              {filteredTasks.map((task) => {
                const prerequisites = dependencyTitles(task);

                return (
                  <article
                    key={task.id}
                    className="rounded-xl border border-slate-200 p-4 hover:border-indigo-200"
                  >
                    <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4
                            className={`break-words text-lg font-semibold ${
                              task.status === "Done"
                                ? "text-slate-400 line-through"
                                : "text-slate-800"
                            }`}
                          >
                            {task.title}
                          </h4>

                          {task.blocked && (
                            <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-700">
                              Blocked
                            </span>
                          )}
                        </div>

                        {task.description && (
                          <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">
                            {task.description}
                          </p>
                        )}

                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${
                              priorityStyles[task.priority] ||
                              priorityStyles.Medium
                            }`}
                          >
                            {task.priority} Priority
                          </span>

                          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">
                            {task.status}
                          </span>

                          <span className="text-xs text-slate-500">
                            Assigned: {userName(task.assignedTo)}
                          </span>
                        </div>

                        {prerequisites.length > 0 && (
                          <p className="mt-3 text-sm text-slate-600">
                            <strong>Depends on:</strong>{" "}
                            {prerequisites.join(", ")}
                          </p>
                        )}

                        {task.createdAt && (
                          <p className="mt-2 text-xs text-slate-400">
                            Created{" "}
                            {new Date(task.createdAt).toLocaleString()}
                          </p>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <select
                          value={task.status}
                          onChange={(e) =>
                            changeStatus(task, e.target.value)
                          }
                          aria-label={`Status for ${task.title}`}
                          className="rounded-lg border p-2 text-sm"
                        >
                          {STATUSES.map((status) => (
                            <option key={status} value={status}>
                              {status}
                            </option>
                          ))}
                        </select>

                        <button
                          type="button"
                          onClick={() => editTask(task)}
                          className="rounded-lg bg-indigo-50 px-3 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-100"
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          onClick={() => deleteTask(task)}
                          className="rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-100"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <p className="mt-6 text-center text-xs text-slate-400">
          TaskFlow · Smart Task Manager
        </p>
      </section>
    </main>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="rounded-xl bg-white p-5 shadow-sm">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-bold">{value}</p>
    </div>
  );
}