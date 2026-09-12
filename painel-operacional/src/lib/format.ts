import { Task } from './types';

export function todayISO(): string {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  const local = new Date(now.getTime() - offset * 60000);
  return local.toISOString().slice(0, 10);
}

export function nowHHMM(): string {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

export function formatDateChip(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const dia = String(date.getDate()).padStart(2, '0');
  const mes = date.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '').toUpperCase();
  return `${dia} ${mes}`;
}

export function formatDateFull(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date
    .toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })
    .toUpperCase()
    .replace(' DE ', ' DE ');
}

export function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function wazeUrl(task: Task): string | undefined {
  const query = task.wazeQuery || task.endereco;
  if (!query) return undefined;
  return `https://waze.com/ul?q=${encodeURIComponent(query)}&navigate=yes`;
}

export function googleMapsUrl(task: Task): string | undefined {
  const query = task.wazeQuery || task.endereco;
  if (!query) return undefined;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

export function telUrl(phone: string): string {
  return `tel:${phone.replace(/[^0-9+]/g, '')}`;
}

export function whatsappUrl(phone: string, mensagem?: string): string {
  const digits = phone.replace(/\D/g, '');
  const comCodigoPais = digits.startsWith('55') ? digits : `55${digits}`;
  const texto = mensagem ? `?text=${encodeURIComponent(mensagem)}` : '';
  return `https://wa.me/${comCodigoPais}${texto}`;
}

export const MENSAGEM_ATRASO =
  'Oi! Passando pra avisar que estou com um pequeno atraso, já estou a caminho. Obrigado pela paciência!';

export function isAtrasada(task: Task): boolean {
  if (task.status === 'CONCLUIDA') return false;
  if (task.data !== todayISO()) return false;
  return task.horarioComparacao < nowHHMM();
}
