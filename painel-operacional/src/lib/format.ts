import { Task } from './types';

// A operação é toda no interior de SP, então a hora "agora" usada para
// calcular atraso é sempre a de Brasília — não importa o fuso horário
// configurado no aparelho (evita erro se o celular estiver com fuso
// errado ou mudar de região).
const FUSO_OPERACAO = 'America/Sao_Paulo';

function agoraEmBrasilia(): { data: string; hora: string } {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: FUSO_OPERACAO,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date());

  const valor = (tipo: string) => partes.find((p) => p.type === tipo)?.value ?? '00';
  const hora = valor('hour') === '24' ? '00' : valor('hour');

  return {
    data: `${valor('year')}-${valor('month')}-${valor('day')}`,
    hora: `${hora}:${valor('minute')}`,
  };
}

export function todayISO(): string {
  return agoraEmBrasilia().data;
}

export function nowHHMM(): string {
  return agoraEmBrasilia().hora;
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
