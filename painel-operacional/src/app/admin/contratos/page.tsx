'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/useAuth';
import MenuLateral from '@/components/MenuLateral';
import { formatCurrency, whatsappUrl } from '@/lib/format';
import {
  Contrato,
  ContratoDraft,
  ContratoStatus,
  atualizarContrato,
  criarContrato,
  excluirContrato,
  ouvirContratos,
} from '@/lib/contracts';
import { lembretesProximos, formatDiaMes, mensagemLembrete } from '@/lib/lembretes';

const STATUS_LABEL: Record<ContratoStatus, string> = {
  PENDENTE: 'Pendente',
  PAGO: 'Pago',
  CANCELADO: 'Cancelado',
};

const VAZIO: ContratoDraft = {
  cliente: '',
  cpf: '',
  dataNascimento: '',
  telefone: '',
  brinquedo: '',
  dataEvento: '',
  endereco: '',
  motivoLembrete: '',
  dataLembrete: '',
  valorSinal: 0,
  valorChegada: 0,
  status: 'PENDENTE',
  observacoes: '',
};

export default function ContratosPage() {
  const { profile } = useAuth();
  const ehAdmin = profile?.role === 'admin';
  const [contratos, setContratos] = useState<Contrato[]>([]);
  const [editando, setEditando] = useState<string | null>(null);
  const [form, setForm] = useState<ContratoDraft>(VAZIO);
  const [mostrarForm, setMostrarForm] = useState(false);

  useEffect(() => {
    if (!ehAdmin) return;
    return ouvirContratos(setContratos);
  }, [ehAdmin]);

  if (!profile) return null;

  if (!ehAdmin) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-900 p-6 text-center">
        <p className="text-slate-300">Essa área é só para o admin.</p>
        <Link href="/" className="text-sm font-semibold text-brand-500">
          Voltar para o painel
        </Link>
      </main>
    );
  }

  function abrirNovo() {
    setForm(VAZIO);
    setEditando(null);
    setMostrarForm(true);
  }

  function abrirEdicao(c: Contrato) {
    setForm({
      cliente: c.cliente,
      cpf: c.cpf ?? '',
      dataNascimento: c.dataNascimento ?? '',
      telefone: c.telefone ?? '',
      brinquedo: c.brinquedo,
      dataEvento: c.dataEvento,
      endereco: c.endereco ?? '',
      motivoLembrete: c.motivoLembrete ?? '',
      dataLembrete: c.dataLembrete ?? '',
      valorSinal: c.valorSinal,
      valorChegada: c.valorChegada,
      status: c.status,
      observacoes: c.observacoes ?? '',
    });
    setEditando(c.id);
    setMostrarForm(true);
  }

  async function salvar() {
    if (editando) {
      await atualizarContrato(editando, form);
    } else {
      await criarContrato(form);
    }
    setMostrarForm(false);
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-xl bg-slate-900 pb-24">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-800 bg-slate-900/95 p-4 backdrop-blur">
        <div className="flex items-center gap-3">
          <MenuLateral />
          <h1 className="text-base font-bold text-slate-50">Contratos</h1>
        </div>
        <button onClick={abrirNovo} className="rounded-xl bg-brand-500 px-3 py-2 text-xs font-bold text-white">
          + Novo
        </button>
      </header>

      <LembretesProximos contratos={contratos} />

      <div className="flex flex-col gap-3 p-4">
        {contratos.length === 0 && <p className="text-sm text-slate-500">Nenhum contrato cadastrado ainda.</p>}

        {contratos.map((c) => (
          <button
            key={c.id}
            onClick={() => abrirEdicao(c)}
            className="rounded-2xl border border-slate-800 bg-slate-800/40 p-4 text-left"
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-100">{c.cliente}</span>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                  c.status === 'PAGO'
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : c.status === 'CANCELADO'
                    ? 'bg-slate-700 text-slate-400'
                    : 'bg-amber-500/20 text-amber-400'
                }`}
              >
                {STATUS_LABEL[c.status]}
              </span>
            </div>
            <p className="mt-1 text-sm text-slate-300">{c.brinquedo}</p>
            <div className="mt-2 flex justify-between text-xs text-slate-400">
              <span>{c.dataEvento}</span>
              <span>
                Sinal {formatCurrency(c.valorSinal)} + chegada {formatCurrency(c.valorChegada)} ={' '}
                {formatCurrency(c.valorSinal + c.valorChegada)}
              </span>
            </div>
          </button>
        ))}
      </div>

      {mostrarForm && (
        <div className="fixed inset-0 z-20 flex items-end bg-black/60" onClick={() => setMostrarForm(false)}>
          <div
            className="max-h-[90vh] w-full overflow-y-auto rounded-t-3xl bg-slate-900 p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="mb-4 text-base font-bold text-slate-50">
              {editando ? 'Editar contrato' : 'Novo contrato'}
            </h2>
            <div className="flex flex-col gap-3">
              <Campo label="Nome completo">
                <input
                  value={form.cliente}
                  onChange={(e) => setForm({ ...form, cliente: e.target.value })}
                  className="w-full rounded-lg bg-slate-800 px-3 py-2 text-sm text-slate-100 outline-none ring-1 ring-slate-700"
                />
              </Campo>
              <div className="grid grid-cols-2 gap-2">
                <Campo label="CPF">
                  <input
                    value={form.cpf}
                    onChange={(e) => setForm({ ...form, cpf: e.target.value })}
                    placeholder="000.000.000-00"
                    className="w-full rounded-lg bg-slate-800 px-3 py-2 text-sm text-slate-100 outline-none ring-1 ring-slate-700"
                  />
                </Campo>
                <Campo label="Data de nascimento">
                  <input
                    type="date"
                    value={form.dataNascimento}
                    onChange={(e) => setForm({ ...form, dataNascimento: e.target.value })}
                    className="w-full rounded-lg bg-slate-800 px-3 py-2 text-sm text-slate-100 outline-none ring-1 ring-slate-700"
                  />
                </Campo>
              </div>
              <Campo label="Telefone">
                <input
                  value={form.telefone}
                  onChange={(e) => setForm({ ...form, telefone: e.target.value })}
                  className="w-full rounded-lg bg-slate-800 px-3 py-2 text-sm text-slate-100 outline-none ring-1 ring-slate-700"
                />
              </Campo>
              <Campo label="Qual brinquedo">
                <input
                  value={form.brinquedo}
                  onChange={(e) => setForm({ ...form, brinquedo: e.target.value })}
                  placeholder="Ex: Cama elástica 3,05m"
                  className="w-full rounded-lg bg-slate-800 px-3 py-2 text-sm text-slate-100 outline-none ring-1 ring-slate-700"
                />
              </Campo>
              <Campo label="Endereço do evento">
                <input
                  value={form.endereco}
                  onChange={(e) => setForm({ ...form, endereco: e.target.value })}
                  className="w-full rounded-lg bg-slate-800 px-3 py-2 text-sm text-slate-100 outline-none ring-1 ring-slate-700"
                />
              </Campo>
              <Campo label="Motivo do lembrete (opcional)">
                <input
                  value={form.motivoLembrete}
                  onChange={(e) => setForm({ ...form, motivoLembrete: e.target.value })}
                  placeholder="Ex: aniversário do João, 1 ano de casados, formatura da Maria"
                  className="w-full rounded-lg bg-slate-800 px-3 py-2 text-sm text-slate-100 outline-none ring-1 ring-slate-700"
                />
              </Campo>
              <Campo label="Data do lembrete">
                <input
                  type="date"
                  value={form.dataLembrete}
                  onChange={(e) => setForm({ ...form, dataLembrete: e.target.value })}
                  className="w-full rounded-lg bg-slate-800 px-3 py-2 text-sm text-slate-100 outline-none ring-1 ring-slate-700"
                />
              </Campo>
              <p className="-mt-1 text-xs text-slate-500">
                Preenchendo a data, o contrato aparece automaticamente em &quot;Lembretes próximos&quot; nos 5
                dias antes da data — não precisa ser aniversário, pode ser qualquer data que valha a pena
                lembrar o cliente (o ano digitado não importa, só repete o dia/mês todo ano).
              </p>
              <div className="grid grid-cols-2 gap-2">
                <Campo label="Data do evento">
                  <input
                    type="date"
                    value={form.dataEvento}
                    onChange={(e) => setForm({ ...form, dataEvento: e.target.value })}
                    className="w-full rounded-lg bg-slate-800 px-3 py-2 text-sm text-slate-100 outline-none ring-1 ring-slate-700"
                  />
                </Campo>
                <Campo label="Status">
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value as ContratoStatus })}
                    className="w-full rounded-lg bg-slate-800 px-3 py-2 text-sm text-slate-100 outline-none ring-1 ring-slate-700"
                  >
                    {(Object.keys(STATUS_LABEL) as ContratoStatus[]).map((s) => (
                      <option key={s} value={s}>
                        {STATUS_LABEL[s]}
                      </option>
                    ))}
                  </select>
                </Campo>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Campo label="Valor do sinal (R$)">
                  <input
                    type="number"
                    value={form.valorSinal}
                    onChange={(e) => setForm({ ...form, valorSinal: Number(e.target.value) })}
                    className="w-full rounded-lg bg-slate-800 px-3 py-2 text-sm text-slate-100 outline-none ring-1 ring-slate-700"
                  />
                </Campo>
                <Campo label="Valor na chegada (R$)">
                  <input
                    type="number"
                    value={form.valorChegada}
                    onChange={(e) => setForm({ ...form, valorChegada: Number(e.target.value) })}
                    className="w-full rounded-lg bg-slate-800 px-3 py-2 text-sm text-slate-100 outline-none ring-1 ring-slate-700"
                  />
                </Campo>
              </div>
              <p className="-mt-1 text-xs text-slate-500">
                Valor total: {formatCurrency((form.valorSinal || 0) + (form.valorChegada || 0))}
              </p>
              <Campo label="Observações">
                <textarea
                  value={form.observacoes}
                  onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
                  rows={2}
                  className="w-full rounded-lg bg-slate-800 px-3 py-2 text-sm text-slate-100 outline-none ring-1 ring-slate-700"
                />
              </Campo>

              <button onClick={salvar} className="rounded-xl bg-brand-500 py-3 text-sm font-bold text-white">
                Salvar
              </button>
              {editando && (
                <button
                  onClick={async () => {
                    await excluirContrato(editando);
                    setMostrarForm(false);
                  }}
                  className="rounded-xl bg-slate-800 py-3 text-sm font-bold text-red-400"
                >
                  Excluir contrato
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[10px] font-bold uppercase text-slate-500">{label}</span>
      {children}
    </label>
  );
}

function LembretesProximos({ contratos }: { contratos: Contrato[] }) {
  const proximos = lembretesProximos(contratos);
  if (proximos.length === 0) return null;

  return (
    <div className="flex flex-col gap-2 p-4 pb-0">
      <h2 className="text-xs font-bold uppercase tracking-widest text-amber-400">🔔 Lembretes próximos</h2>
      {proximos.map(({ contrato, dias }) => (
        <div key={contrato.id} className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-100">{contrato.cliente}</span>
            <span className="text-xs font-semibold text-amber-400">
              {dias === 0 ? 'é hoje!' : dias === 1 ? 'amanhã' : `em ${dias} dias`}
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            {contrato.motivoLembrete || 'Data especial'} · {formatDiaMes(contrato.dataLembrete!)}
          </p>
          {contrato.telefone && (
            <a
              href={whatsappUrl(contrato.telefone, mensagemLembrete(contrato))}
              target="_blank"
              rel="noreferrer"
              className="mt-3 block rounded-lg bg-emerald-600 py-2 text-center text-xs font-bold text-white"
            >
              Mandar mensagem no WhatsApp
            </a>
          )}
        </div>
      ))}
    </div>
  );
}
