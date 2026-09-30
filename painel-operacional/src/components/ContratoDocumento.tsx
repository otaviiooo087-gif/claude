import { CLAUSULAS, EMPRESA } from '@/lib/contratoModelo';
import { ContratoPublico } from '@/lib/contratoPublico';
import { formatCurrency } from '@/lib/format';

const dataBR = (iso: string) => iso.split('-').reverse().join('/');

/** Contrato preenchido, no formato do modelo oficial. Usado na página pública de assinatura. */
export default function ContratoDocumento({ c }: { c: ContratoPublico }) {
  return (
    <article className="rounded-2xl bg-white p-5 text-[13px] leading-relaxed text-slate-800 shadow">
      <header className="mb-4 border-b border-slate-300 pb-3 text-center">
        <h1 className="text-base font-extrabold">{EMPRESA.titulo}</h1>
        <p className="font-bold">{EMPRESA.razao}</p>
        <p>CNPJ {EMPRESA.cnpj}</p>
        <p className="text-xs text-slate-500">
          {EMPRESA.site} · {EMPRESA.email}
        </p>
      </header>

      <dl className="grid gap-1.5">
        <Linha rotulo="Nome do contratante" valor={c.cliente} />
        <Linha rotulo="CPF ou CNPJ" valor={c.cpf} />
        <Linha rotulo="Endereço" valor={c.endereco} />
        <Linha rotulo="Telefone" valor={c.telefone} />
        <Linha rotulo="Data da locação" valor={c.dataEvento ? dataBR(c.dataEvento) : ''} />
        <Linha rotulo="Início da montagem" valor={c.horarioInicio} />
        <Linha rotulo="Término" valor={c.horarioTermino} />
      </dl>

      <h2 className="mb-1 mt-4 text-xs font-extrabold uppercase">Descrição dos itens</h2>
      <ul className="grid gap-1">
        {c.itens.map((i, idx) => (
          <li key={idx} className="flex justify-between gap-3 rounded bg-slate-100 px-2 py-1">
            <span className="font-semibold">{i.nome}</span>
            <span className="text-right text-slate-600">{i.peso ? `Peso suportado: ${i.peso}` : ''}</span>
          </li>
        ))}
      </ul>

      <h2 className="mb-1 mt-4 text-xs font-extrabold uppercase">Valores</h2>
      <dl className="grid gap-1.5">
        <Linha rotulo="Valor total acordado" valor={formatCurrency(c.valorTotal)} />
        <Linha rotulo="Valor do sinal" valor={formatCurrency(c.valorSinal)} />
        <Linha rotulo="Valor restante (pago na chegada da equipe)" valor={formatCurrency(c.valorChegada)} />
        <Linha rotulo="Chave Pix" valor={EMPRESA.chavePix} />
      </dl>

      <div className="mt-4 grid gap-3 text-[11px] text-slate-600">
        {CLAUSULAS.map((cl, idx) => (
          <p key={idx}>
            <strong>{cl.titulo === 'REGRAS GERAIS' ? 'REGRAS GERAIS: ' : `${cl.titulo}) `}</strong>
            {cl.texto}
          </p>
        ))}
      </div>
    </article>
  );
}

function Linha({ rotulo, valor }: { rotulo: string; valor?: string }) {
  return (
    <div className="flex flex-wrap justify-between gap-x-3 border-b border-slate-200 pb-1">
      <dt className="font-bold">{rotulo}:</dt>
      <dd className="text-right">{valor || '—'}</dd>
    </div>
  );
}
