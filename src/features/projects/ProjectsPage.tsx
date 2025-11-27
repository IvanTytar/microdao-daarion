/**
 * Сторінка Projects з Kanban board
 */

import { useState, useEffect } from 'react';
import { 
  getProjectTasks,
  createTask,
  updateTask,
  moveTask,
  deleteTask,
  type Task,
  type CreateTaskPayload
} from '../../api/projects';

const STATUSES = [
  { id: 'backlog', title: 'Backlog', color: 'bg-gray-100' },
  { id: 'todo', title: 'To Do', color: 'bg-blue-100' },
  { id: 'in_progress', title: 'In Progress', color: 'bg-yellow-100' },
  { id: 'review', title: 'Review', color: 'bg-purple-100' },
  { id: 'done', title: 'Done', color: 'bg-green-100' },
] as const;

interface ProjectsPageProps {
  projectId?: string;
}

export function ProjectsPage({ projectId = 'default-project' }: ProjectsPageProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [draggedTask, setDraggedTask] = useState<string | null>(null);
  const [newTask, setNewTask] = useState<Partial<CreateTaskPayload>>({
    title: '',
    status: 'todo',
    priority: 'medium',
    labels: [],
  });

  useEffect(() => {
    loadTasks();
  }, [projectId]);

  const loadTasks = async () => {
    setIsLoading(true);
    try {
      const data = await getProjectTasks(projectId);
      setTasks(data);
    } catch (error) {
      console.error('Failed to load tasks:', error);
      // Fallback до mock даних
      setTasks([
        {
          id: '1',
          projectId,
          title: 'Реалізувати Follow-ups UI',
          description: 'Створити компонент для відображення follow-ups',
          status: 'done',
          priority: 'high',
          labels: ['frontend', 'ui'],
          createdBy: 'user-1',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          position: 0,
        },
        {
          id: '2',
          projectId,
          title: 'Додати Kanban board',
          description: 'Реалізувати drag-and-drop для задач',
          status: 'in_progress',
          priority: 'high',
          labels: ['frontend', 'ui'],
          createdBy: 'user-1',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          position: 0,
        },
        {
          id: '3',
          projectId,
          title: 'Створити Settings page',
          description: 'Сторінка налаштувань користувача',
          status: 'todo',
          priority: 'medium',
          labels: ['frontend'],
          createdBy: 'user-1',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          position: 0,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateTask = async () => {
    if (!newTask.title) {
      alert('Введіть назву задачі!');
      return;
    }

    try {
      await createTask(projectId, newTask as CreateTaskPayload);
      setNewTask({ title: '', status: 'todo', priority: 'medium', labels: [] });
      setIsCreating(false);
      loadTasks();
    } catch (error) {
      console.error('Failed to create task:', error);
      alert('Помилка створення задачі');
    }
  };

  const handleDragStart = (taskId: string) => {
    setDraggedTask(taskId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (status: string) => {
    if (!draggedTask) return;

    const task = tasks.find(t => t.id === draggedTask);
    if (!task || task.status === status) {
      setDraggedTask(null);
      return;
    }

    try {
      await moveTask({
        taskId: draggedTask,
        status,
        position: 0,
      });
      loadTasks();
    } catch (error) {
      console.error('Failed to move task:', error);
    }

    setDraggedTask(null);
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('Видалити задачу?')) return;

    try {
      await deleteTask(taskId);
      loadTasks();
    } catch (error) {
      console.error('Failed to delete task:', error);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'border-red-400';
      case 'medium': return 'border-yellow-400';
      case 'low': return 'border-green-400';
      default: return 'border-gray-400';
    }
  };

  const getTasksByStatus = (status: string) => {
    return tasks.filter(task => task.status === status);
  };

  return (
    <div className="h-full p-6 overflow-x-auto">
      <div className="flex justify-between items-center mb-6 min-w-max">
        <h1 className="text-3xl font-bold">Projects & Tasks</h1>
        <button
          onClick={() => setIsCreating(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          + Створити задачу
        </button>
      </div>

      {/* Форма створення */}
      {isCreating && (
        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          <h3 className="text-xl font-bold mb-4">Нова задача</h3>
          <div className="space-y-4">
            <input
              type="text"
              placeholder="Назва задачі *"
              value={newTask.title}
              onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg"
            />
            <textarea
              placeholder="Опис"
              value={newTask.description || ''}
              onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg"
              rows={3}
            />
            <div className="grid grid-cols-3 gap-4">
              <select
                value={newTask.status}
                onChange={(e) => setNewTask({ ...newTask, status: e.target.value as any })}
                className="px-4 py-2 border rounded-lg"
              >
                {STATUSES.map(s => (
                  <option key={s.id} value={s.id}>{s.title}</option>
                ))}
              </select>
              <select
                value={newTask.priority}
                onChange={(e) => setNewTask({ ...newTask, priority: e.target.value as any })}
                className="px-4 py-2 border rounded-lg"
              >
                <option value="low">Низький пріоритет</option>
                <option value="medium">Середній пріоритет</option>
                <option value="high">Високий пріоритет</option>
              </select>
              <input
                type="text"
                placeholder="Labels (через кому)"
                value={newTask.labels?.join(', ') || ''}
                onChange={(e) => setNewTask({ ...newTask, labels: e.target.value.split(',').map(l => l.trim()).filter(Boolean) })}
                className="px-4 py-2 border rounded-lg"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleCreateTask}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Створити
              </button>
              <button
                onClick={() => setIsCreating(false)}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
              >
                Скасувати
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Kanban Board */}
      {isLoading ? (
        <div className="text-center py-12">Завантаження...</div>
      ) : (
        <div className="flex gap-4 min-w-max pb-6">
          {STATUSES.map((status) => (
            <div
              key={status.id}
              className={`flex-shrink-0 w-80 ${status.color} p-4 rounded-lg`}
              onDragOver={handleDragOver}
              onDrop={() => handleDrop(status.id)}
            >
              <h3 className="font-bold text-lg mb-4 flex items-center justify-between">
                <span>{status.title}</span>
                <span className="text-sm bg-white px-2 py-1 rounded">
                  {getTasksByStatus(status.id).length}
                </span>
              </h3>
              <div className="space-y-3">
                {getTasksByStatus(status.id).map((task) => (
                  <div
                    key={task.id}
                    draggable
                    onDragStart={() => handleDragStart(task.id)}
                    className={`bg-white p-4 rounded-lg shadow cursor-move hover:shadow-lg transition border-l-4 ${getPriorityColor(task.priority)}`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-semibold text-sm flex-1">{task.title}</h4>
                      <button
                        onClick={() => handleDeleteTask(task.id)}
                        className="text-red-500 hover:text-red-700 text-xs ml-2"
                      >
                        ×
                      </button>
                    </div>
                    {task.description && (
                      <p className="text-xs text-gray-600 mb-2">{task.description}</p>
                    )}
                    {task.labels.length > 0 && (
                      <div className="flex gap-1 flex-wrap mb-2">
                        {task.labels.map((label, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs"
                          >
                            {label}
                          </span>
                        ))}
                      </div>
                    )}
                    {task.assignedTo && (
                      <div className="text-xs text-gray-500 mt-2">
                        👤 {task.assignedTo}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

