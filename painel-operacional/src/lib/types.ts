export type TaskType = 'LOGISTICA' | 'MONTAGEM' | 'RETIRADA' | 'EVENTO';

export type TaskStatus = 'PENDENTE' | 'EM_DESLOCAMENTO' | 'CHEGUEI' | 'EM_EXECUCAO' | 'CONCLUIDA';

export interface ChecklistItem {
  id: string;
  texto: string;
  marcado: boolean;
}

export interface Task {
  id: string;
  data: string; // YYYY-MM-DD
  horario: string; // rótulo exibido, exatamente como informado (ex: "09:15–09:30", "Após 18:00")
  horarioComparacao: string; // HH:mm usado só para calcular atraso/ordenar, nunca exibido no lugar do rótulo
  tipo: TaskType;
  cliente: string;
  telefone?: string;
  endereco?: string;
  cidade?: string;
  valor?: number;
  brinquedo?: string;
  observacoes?: string;
  observacaoAdicional?: string;
  checklist: ChecklistItem[];
  status: TaskStatus;
  ordem: number;
  wazeQuery?: string; // termo de busca alternativo para o Waze (ex: nome de um local conhecido)
  createdAt: number;
  completedAt?: number;
  pagamentoConfirmado?: boolean;
  pagamentoConfirmadoEm?: number;
  statusHistorico?: Partial<Record<TaskStatus, number>>;
  ajudanteUid?: string;
  ajudanteNome?: string;
  cancelada?: boolean;
  arquivada?: boolean; // o operador arquivou: some da agenda dele (só local, o admin não é afetado)
}

/** Campos que o admin controla ao editar/reagendar/cancelar uma tarefa já atribuída — nunca sobrescreve o que o operador registrou em campo (checklist, status, observação, pagamento). */
export const CAMPOS_CONTROLADOS_PELO_ADMIN = [
  'data',
  'horario',
  'horarioComparacao',
  'tipo',
  'cliente',
  'telefone',
  'endereco',
  'cidade',
  'brinquedo',
  'valor',
  'observacoes',
  'ajudanteUid',
  'ajudanteNome',
  'cancelada',
] as const;

export const STATUS_ORDER: TaskStatus[] = [
  'PENDENTE',
  'EM_DESLOCAMENTO',
  'CHEGUEI',
  'EM_EXECUCAO',
  'CONCLUIDA',
];

export const STATUS_LABELS: Record<TaskStatus, string> = {
  PENDENTE: 'Pendente',
  EM_DESLOCAMENTO: 'Em deslocamento',
  CHEGUEI: 'Cheguei',
  EM_EXECUCAO: 'Em execução',
  CONCLUIDA: 'Concluída',
};

export const TYPE_LABELS: Record<TaskType, string> = {
  LOGISTICA: 'Logística',
  MONTAGEM: 'Montagem',
  RETIRADA: 'Retirada',
  EVENTO: 'Evento',
};

export const BASE_LOCATION = {
  nome: 'BASE / EMPRESA',
  linha1: 'Condomínio Reserva Colonial',
  endereco: 'Rua Nilo Tordin, 431, Fazenda São José, Valinhos - SP',
  complemento: 'Quadra 20, Lote 12',
};
