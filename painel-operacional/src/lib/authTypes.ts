export type UserRole = 'admin' | 'operador';

export interface UserProfile {
  uid: string;
  email: string;
  nome: string;
  role: UserRole;
  cpf?: string;
  telefone?: string;
  endereco?: string;
  criadoEm: number;
}
