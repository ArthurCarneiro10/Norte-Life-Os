export type Sphere = "profissional" | "pessoal";
export type TaskStatus = "a_fazer" | "em_andamento" | "aguardando" | "finalizado";
export type Priority = "baixa" | "media" | "alta";

export interface Task {
  id: string;
  user_id: string;
  sphere: Sphere;
  title: string;
  emoji: string | null;
  category: string | null;
  status: TaskStatus;
  priority: Priority;
  due_at: string | null;
  estimated_minutes: number | null;
  snapshot: string | null;
  sketch: string | null;
  notes: string | null;
  completed_at: string | null;
  scheduled_event_id: string | null;
  created_at: string;
  subtasks?: { done: boolean }[];
}

export interface Subtask {
  id: string;
  task_id: string;
  title: string;
  position: number;
  done: boolean;
  depends_on: string | null;
}

export const STATUS_LABEL: Record<TaskStatus, string> = {
  a_fazer: "A fazer",
  em_andamento: "Em andamento",
  aguardando: "Aguardando",
  finalizado: "Finalizado",
};

export interface AgendaEvent {
  id: string;
  user_id: string;
  sphere: Sphere;
  title: string;
  starts_at: string;
  ends_at: string;
  is_fixed: boolean;
  source: string;
}

export interface TaskAlert {
  id: string;
  task_id: string;
  label: string;
}
