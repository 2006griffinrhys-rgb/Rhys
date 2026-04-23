import { useEffect, useMemo, useState } from "react";
import "./App.css";

function App() {
  const [tasks, setTasks] = useState([]);
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const completedCount = useMemo(
    () => tasks.filter((task) => task.done).length,
    [tasks]
  );

  const loadTasks = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/tasks");
      if (!response.ok) {
        throw new Error("Could not load tasks.");
      }

      const payload = await response.json();
      setTasks(Array.isArray(payload) ? payload : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
  }, []);

  const addTask = async (event) => {
    event.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) {
      return;
    }

    setError("");

    try {
      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ title: trimmed }),
      });

      if (!response.ok) {
        throw new Error("Could not add task.");
      }

      const payload = await response.json();
      setTasks((current) => [payload, ...current]);
      setTitle("");
    } catch (err) {
      setError(err.message);
    }
  };

  const toggleTask = async (taskId) => {
    setError("");

    try {
      const response = await fetch(`/api/tasks/${taskId}/toggle`, {
        method: "PATCH",
      });

      if (!response.ok) {
        throw new Error("Could not update task.");
      }

      const payload = await response.json();
      setTasks((current) =>
        current.map((task) => (task.id === taskId ? payload : task))
      );
    } catch (err) {
      setError(err.message);
    }
  };

  const removeTask = async (taskId) => {
    setError("");

    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Could not delete task.");
      }

      setTasks((current) => current.filter((task) => task.id !== taskId));
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <main className="app">
      <section className="card">
        <header className="header">
          <h1>Rhys Task App</h1>
          <p>Simple full-stack app ready to run locally.</p>
        </header>

        <form className="task-form" onSubmit={addTask}>
          <input
            type="text"
            value={title}
            placeholder="Add a new task..."
            onChange={(event) => setTitle(event.target.value)}
            aria-label="Task title"
          />
          <button type="submit">Add</button>
        </form>

        {error && <p className="error">{error}</p>}
        {loading ? (
          <p className="status">Loading tasks...</p>
        ) : (
          <>
            <p className="status">
              {completedCount} of {tasks.length} completed
            </p>

            <ul className="tasks">
              {tasks.map((task) => (
                <li key={task.id} className="task-row">
                  <label>
                    <input
                      type="checkbox"
                      checked={task.done}
                      onChange={() => toggleTask(task.id)}
                    />
                    <span className={task.done ? "done" : ""}>{task.title}</span>
                  </label>
                  <button
                    className="delete"
                    type="button"
                    onClick={() => removeTask(task.id)}
                  >
                    Delete
                  </button>
                </li>
              ))}
              {tasks.length === 0 && <li className="empty">No tasks yet.</li>}
            </ul>
          </>
        )}
      </section>
    </main>
  );
}

export default App;
