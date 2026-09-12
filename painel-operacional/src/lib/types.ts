export type TaskType = 'montagem' | 'retirada';
export type TaskStatus = 'pendente' | 'concluido';

export interface Task {
  id: string;
  clientName: string;
  address: string;
  phone?: string;
  type: TaskType;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  notes?: string;
  status: TaskStatus;
  createdAt: number;
  completedAt?: number;
}

export type TaskInput = Omit<Task, 'id' | 'status' | 'createdAt' | 'completedAt'>;
