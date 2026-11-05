import { TaskDraft } from './importLogistica';

type T = Omit<TaskDraft, 'precisaRevisao' | 'horarioComparacao'> & { hc?: string };
const mk = (t: T): TaskDraft => {
  const { hc, ...resto } = t;
  return { ...resto, horarioComparacao: hc ?? resto.horario.slice(0, 5), precisaRevisao: false };
};

const ISABELA = 'RUA VISCONDESSA DE CAMPINAS, 193, NOVA CAMPINAS, CAMPINAS/SP';
const GABRIELA = 'RESIDENCIAL JARDIM EUROPA - R. FRANK SWALLES, 319 - CASA 300 - JARDIM PAULISTA, VINHEDO - SP';
const RENATA = 'R. ADHEMAR DE BARROS, 703 - JARDIM EUROPA, VALINHOS - SP, CASA 12';
const LUCIANA = 'RUA CARMEM LÚCIA DIAS FARIAS 2, VALE VERDE, VALINHOS/SP (ir pela localização, 10 min de casa)';
const CRISTINA = 'CONDOMÍNIO RESIDENCIAL SANS SOUCI: ROD COMENDADOR GUILHERME MAMPRIM KM 82, DOIS CÓRREGOS, LOTE 115, VALINHOS/SP';
const LUCCA = "SANT'ANNA INTERNATIONAL SCHOOL - AV. INDEPENDÊNCIA, 5588 - VILA STORANI, VINHEDO - SP";
const FABIANA = 'FARM HOUSE EVENTOS CAMPINAS - R. ADOLFINA DAGNONE, 120 - CHÁCARA RECANTO DA COLINA VERDE, CAMPINAS - SP';
const ANDRE = 'CONDOMÍNIO SANTA FÉ - ALAMEDA ITAGUÁ 267, VINHEDO/SP';
const SUZANA = 'MARIO VIEIRA BRAGA, 656 (ANTIGO 635), COLINA DOS PINHEIROS, VALINHOS/SP (em frente à Lagoa da Fonte Sônia, portão branco)';
const DET = '10 detergentes e bola de futebol.';
const PASSAR = 'Passar o produto e amarrar.';

/** Logística de 06 a 08/11/2026 (PDF "LOGÍSTICA 06 A 08 DE NOVEMBRO"), revisada à mão. */
export const LOGISTICA_6_A_8_NOVEMBRO: TaskDraft[] = [
  // ---------- SEXTA 06/11 ----------
  mk({ data: '2026-11-06', horario: '10:30/11:00', hc: '10:30', tipo: 'MONTAGEM', cliente: 'ISABELA NORONHA GUSTAVO', brinquedo: 'CAMA PEQUENA', telefone: '19 98167-2552', endereco: ISABELA, observacoes: 'Tempo estimado até aqui: 33 min. Retirada no domingo 08/11 às 16:00.' }),
  mk({ data: '2026-11-06', horario: '12:00/12:30', hc: '12:00', tipo: 'MONTAGEM', cliente: 'GABRIELA ZANINETTI', brinquedo: 'FUTEBOL DE SABÃO CORES DO BRASIL', telefone: '11 98315-7514', endereco: GABRIELA, observacoes: `${DET} Evento 13:30, retirada 18:30.` }),
  mk({ data: '2026-11-06', horario: '15:00', tipo: 'MONTAGEM', cliente: 'RENATA PONTES', brinquedo: 'CAMA MÉDIA', telefone: '19 99123-3306', endereco: RENATA, observacoes: 'Retirada no domingo 08/11 às 15:00.' }),
  mk({ data: '2026-11-06', horario: '17:00/17:30', hc: '17:00', tipo: 'MONTAGEM', cliente: 'LUCIANA RIBEIRO', brinquedo: 'CAMA ELÁSTICA', telefone: '19 97408-4600', endereco: LUCIANA, observacoes: 'Retirada no sábado 07/11 às 14:30.' }),
  mk({ data: '2026-11-06', horario: '18:30', tipo: 'RETIRADA', cliente: 'GABRIELA ZANINETTI', brinquedo: 'FUTEBOL DE SABÃO CORES DO BRASIL', telefone: '11 98315-7514', endereco: GABRIELA }),
  mk({ data: '2026-11-06', horario: '19:30', tipo: 'MONTAGEM', cliente: 'CRISTINA RIBEIRO LEMBI SCHULHOF', brinquedo: 'FUTEBOL BRASIL', telefone: '11 97320-9839', endereco: CRISTINA, observacoes: `${DET} Retirada no sábado 07/11 às 16:00.` }),
  mk({ data: '2026-11-06', horario: 'Após 19:30', hc: '20:30', tipo: 'LOGISTICA', cliente: 'Carregar para amanhã', brinquedo: '2 JACARÉS + FUTEBOL AZUL + 1 CAMA MÉDIA + BARRACA DE ALGODÃO DOCE', observacoes: 'Carregar os 2 jacarés, o futebol azul, 1 cama média e a barraca de algodão doce com a máquina e os materiais para amanhã.' }),
  // ---------- SÁBADO 07/11 ----------
  mk({ data: '2026-11-07', horario: '08:00', tipo: 'MONTAGEM', cliente: 'LUCCA CAPOVILLA', brinquedo: 'JACARÉ NOVO (SACO BRANCO) + BARRACA DE ALGODÃO DOCE', telefone: '11 98608-0547', endereco: LUCCA, observacoes: `Sem funcionário: eles que vão manusear a barraca. ${PASSAR} Tempo estimado até aqui: 40 min. Retirada às 13:00.` }),
  mk({ data: '2026-11-07', horario: '09:40/10:00', hc: '09:40', tipo: 'MONTAGEM', cliente: 'FABIANA PAIVA SOUTO (LUISA)', brinquedo: 'FUTEBOL DE SABÃO 10 X 5 METROS AZUL E LARANJA', telefone: '19 97146-0831', endereco: FABIANA, observacoes: `${DET} Retirada às 17:00 (1 hora de distância).` }),
  mk({ data: '2026-11-07', horario: '11:30/12:00', hc: '11:30', tipo: 'MONTAGEM', cliente: 'ANDRE MISHIMA UEHARA', brinquedo: 'JACARÉ ANTIGO (SACO PRETO) + CAMA MÉDIA', telefone: '11 97682-1167', endereco: ANDRE, observacoes: `${PASSAR} Matheus vai ver com o cliente se a retirada pode ser um pouco depois das 13:00, para a pausa do almoço; se não, almoçar depois de retirar (combinar). Retirada às 18:30.` }),
  mk({ data: '2026-11-07', horario: '13:00', tipo: 'RETIRADA', cliente: 'LUCCA CAPOVILLA', brinquedo: 'JACARÉ NOVO (SACO BRANCO) + BARRACA DE ALGODÃO DOCE', telefone: '11 98608-0547', endereco: LUCCA }),
  mk({ data: '2026-11-07', horario: '14:30', tipo: 'RETIRADA', cliente: 'LUCIANA RIBEIRO', brinquedo: 'CAMA ELÁSTICA', telefone: '19 97408-4600', endereco: LUCIANA }),
  mk({ data: '2026-11-07', horario: '16:00', tipo: 'RETIRADA', cliente: 'CRISTINA RIBEIRO LEMBI SCHULHOF', brinquedo: 'FUTEBOL BRASIL', telefone: '11 97320-9839', endereco: CRISTINA, observacoes: 'Chegar cedo no local, às 15:45, por causa da portaria. Tempo estimado até aqui: 35 min.' }),
  mk({ data: '2026-11-07', horario: '17:00', tipo: 'RETIRADA', cliente: 'FABIANA PAIVA SOUTO (LUISA)', brinquedo: 'FUTEBOL DE SABÃO 10 X 5 METROS AZUL E LARANJA', telefone: '19 97146-0831', endereco: FABIANA, observacoes: '1 hora de distância.' }),
  mk({ data: '2026-11-07', horario: '18:30', tipo: 'RETIRADA', cliente: 'ANDRE MISHIMA UEHARA', brinquedo: 'JACARÉ + CAMA MÉDIA', telefone: '11 97682-1167', endereco: ANDRE }),
  // ---------- DOMINGO 08/11 ----------
  mk({ data: '2026-11-08', horario: '10:30', tipo: 'MONTAGEM', cliente: 'SUZANA SCARAVATTI OLIMPIO MOURA', brinquedo: 'CAMA MÉDIA', telefone: '19 99456-4783', endereco: SUZANA, observacoes: 'Retirada às 17:00.' }),
  mk({ data: '2026-11-08', horario: '11:30', tipo: 'LOGISTICA', cliente: 'Talvez outra montagem (confirmando)', observacoes: 'O Matheus ainda está confirmando se haverá outra montagem às 11:30.' }),
  mk({ data: '2026-11-08', horario: '15:00', tipo: 'RETIRADA', cliente: 'RENATA PONTES', brinquedo: 'CAMA MÉDIA', telefone: '19 99123-3306', endereco: RENATA }),
  mk({ data: '2026-11-08', horario: '16:00', tipo: 'RETIRADA', cliente: 'ISABELA NORONHA GUSTAVO', brinquedo: 'CAMA PEQUENA', telefone: '19 98167-2552', endereco: ISABELA }),
  mk({ data: '2026-11-08', horario: '17:00', tipo: 'RETIRADA', cliente: 'SUZANA SCARAVATTI OLIMPIO MOURA', brinquedo: 'CAMA MÉDIA', telefone: '19 99456-4783', endereco: SUZANA }),
];
