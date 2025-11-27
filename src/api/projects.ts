/**
 * API для Projects & Tasks (Kanban board)
 */

import { apiGet, apiPost, apiPatch, apiDelete } from './client';

export interface Project {
  id: string;
  name: string;
  description?: string;
  channelId?: string;
  microdaoId?: string;
  status: 'active' | 'archived' | 'completed';
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  id: string;
  projectId: string;
  title: string;
  description?: string;
  status: 'backlog' | 'todo' | 'in_progress' | 'review' | 'done';
  priority: 'low' | 'medium' | 'high';
  assignedTo?: string;
  labels: string[];
  dueDate?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  position: number;
}

export interface CreateProjectPayload {
  name: string;
  description?: string;
  channelId?: string;
  microdaoId?: string;
}

export interface UpdateProjectPayload {
  name?: string;
  description?: string;
  status?: 'active' | 'archived' | 'completed';
}

export interface CreateTaskPayload {
  title: string;
  description?: string;
  status?: 'backlog' | 'todo' | 'in_progress' | 'review' | 'done';
  priority?: 'low' | 'medium' | 'high';
  assignedTo?: string;
  labels?: string[];
  dueDate?: string;
}

export interface UpdateTaskPayload {
  title?: string;
  description?: string;
  status?: 'backlog' | 'todo' | 'in_progress' | 'review' | 'done';
  priority?: 'low' | 'medium' | 'high';
  assignedTo?: string;
  labels?: string[];
  dueDate?: string;
  position?: number;
}

export interface TaskMove {
  taskId: string;
  status: string;
  position: number;
}

/**
 * Отримати всі проєкти для каналу
 */
export async function getChannelProjects(channelId: string): Promise<Project[]> {
  return apiGet(`/v1/channels/${channelId}/projects`);
}

/**
 * Отримати всі проєкти для microDAO
 */
export async function getMicrodaoProjects(microdaoId: string): Promise<Project[]> {
  return apiGet(`/v1/microdao/${microdaoId}/projects`);
}

/**
 * Отримати конкретний проєкт
 */
export async function getProject(projectId: string): Promise<Project> {
  return apiGet(`/v1/projects/${projectId}`);
}

/**
 * Створити новий проєкт
 */
export async function createProject(payload: CreateProjectPayload): Promise<Project> {
  return apiPost('/v1/projects', payload);
}

/**
 * Оновити проєкт
 */
export async function updateProject(
  projectId: string,
  payload: UpdateProjectPayload
): Promise<Project> {
  return apiPatch(`/v1/projects/${projectId}`, payload);
}

/**
 * Видалити проєкт
 */
export async function deleteProject(projectId: string): Promise<void> {
  return apiDelete(`/v1/projects/${projectId}`);
}

/**
 * Отримати всі задачі проєкту
 */
export async function getProjectTasks(projectId: string): Promise<Task[]> {
  return apiGet(`/v1/projects/${projectId}/tasks`);
}

/**
 * Отримати конкретну задачу
 */
export async function getTask(taskId: string): Promise<Task> {
  return apiGet(`/v1/tasks/${taskId}`);
}

/**
 * Створити нову задачу
 */
export async function createTask(
  projectId: string,
  payload: CreateTaskPayload
): Promise<Task> {
  return apiPost(`/v1/projects/${projectId}/tasks`, payload);
}

/**
 * Оновити задачу
 */
export async function updateTask(
  taskId: string,
  payload: UpdateTaskPayload
): Promise<Task> {
  return apiPatch(`/v1/tasks/${taskId}`, payload);
}

/**
 * Видалити задачу
 */
export async function deleteTask(taskId: string): Promise<void> {
  return apiDelete(`/v1/tasks/${taskId}`);
}

/**
 * Перемістити задачу (drag & drop)
 */
export async function moveTask(move: TaskMove): Promise<Task> {
  return apiPost(`/v1/tasks/${move.taskId}/move`, {
    status: move.status,
    position: move.position,
  });
}

/**
 * Отримати всі задачі, призначені користувачу
 */
export async function getMyTasks(): Promise<Task[]> {
  return apiGet('/v1/tasks/me');
}

