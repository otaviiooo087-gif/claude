import { Produto } from './produtos';

export interface ContratoExtraido {
  cliente: string;
  cpf: string;
  telefone: string;
  endereco: string;
  brinquedo: string;
  dataEvento: string; // YYYY-MM-DD
  valorSinal: number;
  valorChegada: number;
}

const MESES: Record<string, string> = {
  JANEIRO: '01',
  FEVEREIRO: '02',
  MARÇO: '03',
  MARCO: '03',
  ABRIL: '04',
  MAIO: '05',
  JUNHO: '06',
  JULHO: '07',
  AGOSTO: '08',
  SETEMBRO: '09',
  OUTUBRO: '10',
  NOVEMBRO: '11',
  DEZEMBRO: '12',
};

function extrairCpf(texto: string): string {
  const m = texto.match(/\d{3}\.?\d{3}\.?\d{3}-?\d{2}/);
  return m ? m[0] : '';
}

function extrairTelefone(texto: string): string {
  const m = texto.match(/\(?\d{2}\)?\D{0,3}9?\d{4}[\s-]?\d{4}/);
  if (!m) return '';
  const digitos = m[0].replace(/\D/g, '');
  if (digitos.length < 10) return '';
  const ddd = digitos.slice(0, 2);
  const resto = digitos.slice(2);
  return resto.length === 9 ? `${ddd} ${resto.slice(0, 5)}-${resto.slice(5)}` : `${ddd} ${resto.slice(0, 4)}-${resto.slice(4)}`;
}

function extrairData(texto: string): string {
  let m = texto.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;

  m = texto.match(/(\d{1,2})\s*de\s*([a-zçãõ]+)\s*de\s*(\d{4})/i);
  if (m) {
    const mes = MESES[m[2].toUpperCase()];
    if (mes) return `${m[3]}-${mes}-${m[1].padStart(2, '0')}`;
  }
  return '';
}

function extrairValores(texto: string): number[] {
  const matches = texto.match(/R\$\s?[\d.]{1,3}(?:\.\d{3})*(?:,\d{2})?/g) || [];
  return matches
    .map((v) => v.replace('R$', '').trim().replace(/\./g, '').replace(',', '.'))
    .map(Number)
    .filter((n) => !Number.isNaN(n) && n > 0);
}

function extrairNome(texto: string): string {
  const rotulo = texto.match(/(?:CONTRATANTE|NOME DO CONTRATANTE|CLIENTE)\s*:?\s*([A-ZÀ-Úa-zà-ú\s]{5,60})/i);
  if (rotulo) return rotulo[1].trim().replace(/\s{2,}/g, ' ');
  return '';
}

function extrairEndereco(texto: string): string {
  const rotulo = texto.match(/ENDERE[ÇC]O\s*:?\s*([^\n]{10,120})/i);
  if (rotulo) return rotulo[1].trim();
  return '';
}

function extrairBrinquedo(texto: string, catalogo: Produto[]): string {
  const textoUpper = texto.toUpperCase();
  const encontrado = catalogo.find((p) => textoUpper.includes(p.nome.toUpperCase()));
  return encontrado?.nome || '';
}

/** Extrai o que der pra reconhecer do texto de um contrato — sempre um rascunho pra revisar, nunca dado final. */
export function parseContrato(textoOriginal: string, catalogo: Produto[] = []): ContratoExtraido {
  const texto = textoOriginal.replace(/\s+/g, ' ').trim();
  const valores = extrairValores(texto);

  return {
    cliente: extrairNome(texto),
    cpf: extrairCpf(texto),
    telefone: extrairTelefone(texto),
    endereco: extrairEndereco(texto),
    brinquedo: extrairBrinquedo(texto, catalogo),
    dataEvento: extrairData(texto),
    valorSinal: valores[0] || 0,
    valorChegada: valores[1] || 0,
  };
}
