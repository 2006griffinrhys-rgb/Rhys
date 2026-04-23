import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_FILE = path.resolve(__dirname, "../data/tasks.json");

const ensureDataFile = async () => {
  await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });

  try {
    await fs.access(DATA_FILE);
  } catch {
    await fs.writeFile(DATA_FILE, "[]", "utf8");
  }
};

const readTasks = async () => {
  await ensureDataFile();
  const raw = await fs.readFile(DATA_FILE, "utf8");
  return JSON.parse(raw);
};

const writeTasks = async (tasks) => {
  await fs.writeFile(DATA_FILE, JSON.stringify(tasks, null, 2), "utf8");
};

export const listTasks = async () => {
  return readTasks();
};

export const createTask = async ({ title }) => {
  const tasks = await readTasks();

  const task = {
    id: randomUUID(),
    title: title.trim(),
    done: false,
    createdAt: new Date().toISOString(),
  };

  tasks.unshift(task);
  await writeTasks(tasks);
  return task;
};

export const toggleTaskDone = async (id) => {
  const tasks = await readTasks();
  const task = tasks.find((item) => item.id === id);

  if (!task) {
    return null;
  }

  task.done = !task.done;
  await writeTasks(tasks);
  return task;
};

export const deleteTask = async (id) => {
  const tasks = await readTasks();
  const nextTasks = tasks.filter((item) => item.id !== id);

  if (nextTasks.length === tasks.length) {
    return false;
  }

  await writeTasks(nextTasks);
  return true;
};
