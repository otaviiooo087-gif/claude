/**
 * Gera o payload "Pix Copia e Cola" (BR Code / EMV) a partir da chave Pix,
 * nome e cidade do recebedor e do valor a cobrar — sem depender de nenhuma
 * API externa. Especificação do Banco Central: cada campo é um TLV
 * (id + tamanho em 2 dígitos + valor), terminando com o CRC16 do restante
 * do payload.
 */

function tlv(id: string, valor: string): string {
  const tamanho = valor.length.toString().padStart(2, '0');
  return `${id}${tamanho}${valor}`;
}

/** Remove acentos e caracteres fora do padrão ASCII exigido pelo Pix. */
function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9 ]/g, '')
    .trim();
}

function crc16(payload: string): string {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = (crc & 0x8000) !== 0 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

export interface DadosCobrancaPix {
  chave: string;
  nomeRecebedor: string;
  cidadeRecebedor: string;
  valor: number;
  identificador?: string; // ex: id do contrato, só letras/números
}

/** CPF/CNPJ/telefone vão só com números (sem pontos, barra, traço); e-mail e chave aleatória ficam como estão. */
export function normalizarChavePix(chave: string): string {
  let c = chave.trim().replace(/\s*\(.*\)\s*$/, ''); // tira "(CNPJ)" no fim
  if (c.includes('@') || /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(c)) return c;
  if (/^[\d.\-\/\s()+]+$/.test(c)) {
    const d = c.replace(/\D/g, '');
    if ((d.length === 10 || d.length === 11) && !/^\d{11}$/.test(d.replace(/^0+/, '')) === false && c.includes('(')) return `+55${d}`;
    if (c.startsWith('+')) return `+${d}`;
    return d;
  }
  return c;
}

export function montarPayloadPix({ chave, nomeRecebedor, cidadeRecebedor, valor, identificador }: DadosCobrancaPix): string {
  const nome = normalizar(nomeRecebedor).slice(0, 25) || 'ZIMBA FESTA';
  const cidade = normalizar(cidadeRecebedor).slice(0, 15) || 'VALINHOS';
  const txid = (identificador ? normalizar(identificador).replace(/ /g, '') : '') || '***';

  const merchantAccount = tlv('26', tlv('00', 'br.gov.bcb.pix') + tlv('01', normalizarChavePix(chave)));
  const dadosAdicionais = tlv('62', tlv('05', txid.slice(0, 25)));

  const semCrc =
    tlv('00', '01') +
    merchantAccount +
    tlv('52', '0000') +
    tlv('53', '986') +
    tlv('54', valor.toFixed(2)) +
    tlv('58', 'BR') +
    tlv('59', nome) +
    tlv('60', cidade) +
    dadosAdicionais +
    '6304';

  return semCrc + crc16(semCrc);
}
