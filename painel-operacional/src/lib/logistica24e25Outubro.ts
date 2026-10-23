import { TaskDraft } from './importLogistica';

const base = { precisaRevisao: false };
const AMAR = 'RUA FAUZE SELHE, 446 (OU S/Nº) - JARDIM MONTE CRISTO / PARQUE OZIEL, CAMPINAS - SP';
const NOVILLE = 'CONDOMÍNIO NOVILLE - AVENIDA DERMIVAL BERNARDES SIQUEIRA 2075, SWISS PARK, CAMPINAS - SP (APARTAMENTO C-14) - montagem no salão de festas';
const ROBERTA = 'RUA PEDRO PELLEGRINI 25, ACESSO PELA RUA DA SERVIDÃO, FONTE MECIA, VALINHOS/SP [GPS -22.936306,-46.980167]';
const ROBERTA_GPS = '-22.936306,-46.980167'; // 22°56'10.7"S 46°58'48.6"W

/** Logística de 24 e 25/10/2026 (PDF "LOGÍSTICA 24 E 25 PARCIAL"), revisada à mão. */
export const LOGISTICA_24_E_25_OUTUBRO: TaskDraft[] = [
  { ...base, data: '2026-10-24', horario: '07:00', horarioComparacao: '07:00', tipo: 'MONTAGEM', cliente: 'AMAR E REPARTIR (contato: Rodolfo)', brinquedo: 'FUTEBOL DE SABÃO BRASIL + CENTOPEIA', telefone: '19 99157-9311', endereco: AMAR, observacoes: 'Início da montagem às 07:00. Retirada às 12:30 (logo após a montagem das 11:30).' },
  { ...base, data: '2026-10-24', horario: '09:00', horarioComparacao: '09:00', tipo: 'MONTAGEM', cliente: 'CARLA CRISTINA SOUZA GOMEZ OTA', brinquedo: 'MINI TOBOGÃ COM PISCINA DE BOLINHAS', telefone: '19 98105-5341', endereco: NOVILLE, observacoes: 'Início da montagem às 09:00. Evento 19:00/21:30; retirada 19:00/19:30.' },
  { ...base, data: '2026-10-24', horario: '10:30', horarioComparacao: '10:30', tipo: 'LOGISTICA', cliente: 'Ir na base de operação (casa do Matheus)', brinquedo: 'FUTEBOL AZUL E LARANJA + CAMA MÉDIA', endereco: 'CONDOMÍNIO RESERVA COLONIAL - RUA NILO TORDIN, 431, FAZENDA SÃO JOSÉ, VALINHOS - SP (QUADRA 20, LOTE 12)', observacoes: 'Carregar Futebol Azul e Laranja e Cama Média e pegar o lanche que ele vai deixar para o almoço.' },
  { ...base, data: '2026-10-24', horario: '11:30', horarioComparacao: '11:30', tipo: 'MONTAGEM', cliente: 'ROBERTA VIANA DA SILVA', brinquedo: 'FUTEBOL AZUL E LARANJA + CAMA MÉDIA', telefone: '19 97416-3430', endereco: ROBERTA, wazeQuery: ROBERTA_GPS, observacoes: 'Início da montagem às 11:30. Ir pela localização que o Matheus vai mandar. Retirada às 18:00.' },
  { ...base, data: '2026-10-24', horario: '12:30', horarioComparacao: '12:30', tipo: 'RETIRADA', cliente: 'AMAR E REPARTIR (contato: Rodolfo)', brinquedo: 'FUTEBOL DE SABÃO BRASIL + CENTOPEIA', telefone: '19 99157-9311', endereco: AMAR, observacoes: 'Retirada após a montagem da Roberta.' },
  { ...base, data: '2026-10-24', horario: '18:00', horarioComparacao: '18:00', tipo: 'RETIRADA', cliente: 'ROBERTA VIANA DA SILVA', brinquedo: 'FUTEBOL AZUL E LARANJA + CAMA MÉDIA', telefone: '19 97416-3430', endereco: ROBERTA, wazeQuery: ROBERTA_GPS, observacoes: 'Ir pela localização.' },
  { ...base, data: '2026-10-24', horario: '19:00/19:30', horarioComparacao: '19:00', tipo: 'RETIRADA', cliente: 'CARLA CRISTINA SOUZA GOMEZ OTA', brinquedo: 'MINI TOBOGÃ COM PISCINA DE BOLINHAS', telefone: '19 98105-5341', endereco: NOVILLE },
  { ...base, data: '2026-10-25', horario: '13:00', horarioComparacao: '13:00', tipo: 'MONTAGEM', cliente: 'BEATRIZ SCHIAVINATO', brinquedo: 'MINI COM PISCINA + CAMA MÉDIA', telefone: '19 99349-0975', endereco: 'CHÁCARA PERTO DO CÉU - R. ALAMEDA DAS GOIABEIRAS, 172 - PARQUE VALINHOS, VALINHOS - SP', observacoes: 'Início da montagem às 13:00. Retirada às 19:00.' },
  { ...base, data: '2026-10-25', horario: '19:00', horarioComparacao: '19:00', tipo: 'RETIRADA', cliente: 'BEATRIZ SCHIAVINATO', brinquedo: 'MINI COM PISCINA + CAMA MÉDIA', telefone: '19 99349-0975', endereco: 'CHÁCARA PERTO DO CÉU - R. ALAMEDA DAS GOIABEIRAS, 172 - PARQUE VALINHOS, VALINHOS - SP' },
];
