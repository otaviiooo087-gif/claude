import { ContratoPublico } from '@/lib/contratoPublico';
import { FONTE, LINHAS_H, LINHAS_V, PAGINA, SUBLINHADOS, TEXTOS } from '@/lib/contratoLayout';
import { ASSINATURA_ZIMBA, LOGO } from '@/lib/contratoImagens';
import { formatCurrency } from '@/lib/format';

const FONTES = '"Times New Roman", "Liberation Serif", Tinos, Times, serif';
const dataBR = (iso: string) => iso.split('-').reverse().join('/');

/** Encolhe só se o texto passar do espaço disponível (estimativa de largura de fonte serifada). */
function ajuste(texto: string, larguraMax: number) {
  const estimado = texto.length * FONTE * 0.52;
  return estimado > larguraMax ? { textLength: larguraMax, lengthAdjust: 'spacingAndGlyphs' as const } : {};
}

function Valor({ x, y, texto, max, centro }: { x: number; y: number; texto: string; max: number; centro?: boolean }) {
  if (!texto) return null;
  return (
    <text x={x} y={y} textAnchor={centro ? 'middle' : 'start'} {...ajuste(texto, max)}>
      {texto}
    </text>
  );
}

/**
 * Contrato oficial (CONTRATO_2026.pdf) redesenhado em SVG com as mesmas posições, textos, fonte e
 * linhas do original. Só os campos em branco são preenchidos.
 */
export default function ContratoDocumento({ c }: { c: ContratoPublico }) {
  const itens = c.itens ?? [];
  const metade = Math.ceil(itens.length / 2);
  const linhasItens = [itens.slice(0, metade), itens.slice(metade)];

  return (
    <svg
      viewBox={`0 0 ${PAGINA.w} ${PAGINA.h}`}
      className="block h-auto w-full bg-white"
      style={{ fontFamily: FONTES, fontSize: FONTE }}
      role="img"
      aria-label="Contrato para locação"
    >
      <rect width={PAGINA.w} height={PAGINA.h} fill="#fff" />

      {/* grade */}
      {LINHAS_H.map(([y, x1, x2], i) => (
        <line key={`h${i}`} x1={x1} x2={x2} y1={y} y2={y} stroke="#000" strokeWidth={1.5} />
      ))}
      {LINHAS_V.map(([x, y1, y2], i) => (
        <line key={`v${i}`} x1={x} x2={x} y1={y1} y2={y2} stroke="#000" strokeWidth={1.5} />
      ))}
      {SUBLINHADOS.map(([y, x1, x2, w, cor], i) => (
        <line key={`u${i}`} x1={x1} x2={x2} y1={y} y2={y} stroke={cor} strokeWidth={w} />
      ))}

      <image href={LOGO} x={42.3} y={10} width={86.2} height={44.6} />

      {/* textos fixos do modelo */}
      {TEXTOS.map((t, i) => (
        <text key={i} x={t.x} y={t.y} fill={t.cor ?? '#000'} textLength={t.w} lengthAdjust="spacingAndGlyphs">
          {t.s}
          {t.valor && <tspan fill={t.corValor}>{t.valor}</tspan>}
        </text>
      ))}

      {/* campos preenchidos */}
      <Valor x={123} y={62.88} texto={c.cliente} max={220} />
      <Valor x={387} y={62.88} texto={c.cpf ?? ''} max={175} />
      <Valor x={72.5} y={76.32} texto={c.endereco ?? ''} max={490} />
      <Valor x={367} y={89.04} texto={c.telefone ?? ''} max={190} />

      {linhasItens.map((linha, i) => {
        if (linha.length === 0) return null;
        const y = i === 0 ? 114.6 : 127.2;
        return (
          <g key={i}>
            <Valor x={245} y={y} centro texto={linha.map((x) => x.nome).join(' + ')} max={425} />
            <Valor x={514.5} y={y} centro texto={linha.map((x) => x.peso).filter(Boolean).join(' + ')} max={95} />
          </g>
        );
      })}

      <Valor x={514.7} y={770} centro texto={c.dataEvento ? dataBR(c.dataEvento) : ''} max={95} />
      <Valor x={514.7} y={782.4} centro texto={c.horarioInicio ?? ''} max={95} />
      <Valor x={514.7} y={794.9} centro texto={c.horarioTermino ?? ''} max={95} />
      <Valor x={514.7} y={807.2} centro texto={formatCurrency(c.valorTotal)} max={95} />
      <Valor x={514.7} y={819.7} centro texto={formatCurrency(c.valorSinal)} max={95} />

      {/* assinatura da Zimba (já vem no modelo) e do cliente */}
      <image href={ASSINATURA_ZIMBA} x={357.7} y={821.5} width={100} height={10.8} />
      {c.assinatura && <image href={c.assinatura.imagem} x={118} y={811} width={128} height={20} preserveAspectRatio="xMidYMid meet" />}
    </svg>
  );
}
