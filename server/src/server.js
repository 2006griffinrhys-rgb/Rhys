import express from "express";
import {
  createTask,
  deleteTask,
  listTasks,
  toggleTaskDone,
} from "./store.js";

const app = express();
const PORT = process.env.PORT || 4000;

app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.get("/api/tasks", async (_req, res) => {
  try {
    const tasks = await listTasks();
    res.json(tasks);
  } catch (error) {
    console.error("Failed to list tasks:", error);
    res.status(500).json({ message: "Unable to load tasks." });
  }
});

app.post("/api/tasks", async (req, res) => {
  const { title } = req.body ?? {};
  if (!title || !title.trim()) {
    return res.status(400).json({ message: "Task title is required." });
  }

  try {
    const task = await createTask({ title });
    return res.status(201).json(task);
  } catch (error) {
    console.error("Failed to create task:", error);
    return res.status(500).json({ message: "Unable to create task." });
  }
});

app.patch("/api/tasks/:id/toggle", async (req, res) => {
  try {
    const task = await toggleTaskDone(req.params.id);
    if (!task) {
      return res.status(404).json({ message: "Task not found." });
    }

    return res.json(task);
  } catch (error) {
    console.error("Failed to toggle task:", error);
    return res.status(500).json({ message: "Unable to update task." });
  }
});

app.delete("/api/tasks/:id", async (req, res) => {
  try {
    const deleted = await deleteTask(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: "Task not found." });
    }

    return res.status(204).send();
  } catch (error) {
    console.error("Failed to delete task:", error);
    return res.status(500).json({ message: "Unable to delete task." });
  }
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
