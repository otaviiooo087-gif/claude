'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/useAuth';
import MenuLateral from '@/components/MenuLateral';
import CobrancaPixModal from '@/components/CobrancaPixModal';
import AtribuirOperadorBotao from '@/components/AtribuirOperadorBotao';
import ClimaBadge from '@/components/ClimaBadge';
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
import { buscarProdutos } from '@/lib/produtos';
import { ChecklistItem, Task } from '@/lib/types';
import { lerArquivoComoDataUrl } from '@/lib/arquivo';
import { extrairTextoContrato } from '@/lib/lerContrato';
import { parseContrato } from '@/lib/parseContrato';

const TAMANHO_MAXIMO_ANEXO = 700 * 1024;

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
  const [cobrando, setCobrando] = useState<Contrato | null>(null);
  const [logisticaGerada, setLogisticaGerada] = useState<Record<string, Task>>({});
  const [gerandoLogistica, setGerandoLogistica] = useState<string | null>(null);
  const [erroAnexo, setErroAnexo] = useState<string | null>(null);
  const [processandoAnexo, setProcessandoAnexo] = useState(false);
  const [lendoContrato, setLendoContrato] = useState(false);
  const [erroLeitura, setErroLeitura] = useState<string | null>(null);

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

  async function anexarELer(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0];
    e.target.value = '';
    if (!arquivo) return;

    setErroLeitura(null);
    setLendoContrato(true);
    try {
      const [dataUrl, texto, catalogo] = await Promise.all([
        lerArquivoComoDataUrl(arquivo),
        extrairTextoContrato(arquivo),
        buscarProdutos(),
      ]);
      const extraido = parseContrato(texto, catalogo);

      setForm({
        ...VAZIO,
        cliente: extraido.cliente,
        cpf: extraido.cpf,
        telefone: extraido.telefone,
        endereco: extraido.endereco,
        brinquedo: extraido.brinquedo,
        dataEvento: extraido.dataEvento,
        valorSinal: extraido.valorSinal,
        valorChegada: extraido.valorChegada,
        contratoAssinadoBase64: dataUrl,
        contratoAssinadoNome: arquivo.name,
      });
      setEditando(null);
      setMostrarForm(true);
    } catch (err) {
      setErroLeitura(err instanceof Error ? err.message : 'Não consegui ler esse contrato.');
    } finally {
      setLendoContrato(false);
    }
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
      contratoAssinadoBase64: c.contratoAssinadoBase64 ?? '',
      contratoAssinadoNome: c.contratoAssinadoNome ?? '',
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

  async function selecionarContratoAssinado(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0];
    e.target.value = '';
    if (!arquivo) return;
    setErroAnexo(null);

    if (arquivo.size > TAMANHO_MAXIMO_ANEXO) {
      setErroAnexo(`Esse arquivo é grande demais (limite ${(TAMANHO_MAXIMO_ANEXO / 1024).toFixed(0)} KB).`);
      return;
    }

    setProcessandoAnexo(true);
    try {
      const dataUrl = await lerArquivoComoDataUrl(arquivo);
      setForm((f) => ({ ...f, contratoAssinadoBase64: dataUrl, contratoAssinadoNome: arquivo.name }));
    } catch {
      setErroAnexo('Não foi possível ler esse arquivo. Tente outro.');
    } finally {
      setProcessandoAnexo(false);
    }
  }

  async function gerarLogistica(c: Contrato) {
    setGerandoLogistica(c.id);
    try {
      const produtos = await buscarProdutos();
      const produto = produtos.find((p) => p.nome.trim().toLowerCase() === c.brinquedo.trim().toLowerCase());
      const checklist: ChecklistItem[] =
        produto?.itens.map((item, idx) => ({ id: `item-${idx}`, texto: item, marcado: false })) ?? [];

      const observacoesPartes = [
        `Sinal já pago: ${formatCurrency(c.valorSinal)}.`,
        `Cobrar na chegada: ${formatCurrency(c.valorChegada)}.`,
      ];
      if (c.observacoes) observacoesPartes.push(c.observacoes);

      const tarefa: Task = {
        id: `contrato-${c.id}`,
        data: c.dataEvento,
        horario: 'A combinar',
        horarioComparacao: '00:00',
        tipo: 'MONTAGEM',
        cliente: c.cliente,
        telefone: c.telefone,
        endereco: c.endereco,
        brinquedo: c.brinquedo,
        valor: c.valorChegada,
        observacoes: observacoesPartes.join(' '),
        checklist,
        status: 'PENDENTE',
        ordem: 0,
        createdAt: Date.now(),
      };
      setLogisticaGerada((atual) => ({ ...atual, [c.id]: tarefa }));
    } finally {
      setGerandoLogistica(null);
    }
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-xl bg-slate-900 pb-24">
      <header className="sticky top-0 z-10 flex items-center justify-between gap-2 border-b border-slate-800 bg-slate-900/95 p-4 backdrop-blur">
        <div className="flex min-w-0 items-center gap-3">
          <MenuLateral />
          <h1 className="truncate text-base font-bold text-slate-50">Contratos</h1>
        </div>
        <div className="flex shrink-0 gap-2">
          <label
            className={`cursor-pointer rounded-xl bg-slate-800 px-3 py-2 text-xs font-bold text-slate-200 ${
              lendoContrato ? 'opacity-50' : ''
            }`}
          >
            {lendoContrato ? 'Lendo...' : '📎 Anexar contrato'}
            <input
              type="file"
              accept=".pdf,image/*"
              onChange={anexarELer}
              disabled={lendoContrato}
              className="hidden"
            />
          </label>
          <button onClick={abrirNovo} className="rounded-xl bg-brand-500 px-3 py-2 text-xs font-bold text-white">
            + Novo
          </button>
        </div>
      </header>

      {erroLeitura && (
        <p className="border-b border-slate-800 bg-amber-500/10 px-4 py-2 text-xs text-amber-400">{erroLeitura}</p>
      )}

      <LembretesProximos contratos={contratos} />

      <div className="flex flex-col gap-3 p-4">
        {contratos.length === 0 && <p className="text-sm text-slate-500">Nenhum contrato cadastrado ainda.</p>}

        {contratos.map((c) => (
          <div key={c.id} className="rounded-2xl border border-slate-800 bg-slate-800/40 p-4">
            <button onClick={() => abrirEdicao(c)} className="w-full text-left">
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
              <div className="mt-2 flex items-center gap-2">
                <span className="text-xs text-slate-400">{c.dataEvento}</span>
                <ClimaBadge endereco={c.endereco} data={c.dataEvento} />
              </div>
              <div className="mt-1 flex justify-end text-xs text-slate-400">
                <span>
                  Sinal {formatCurrency(c.valorSinal)} + chegada {formatCurrency(c.valorChegada)} ={' '}
                  {formatCurrency(c.valorSinal + c.valorChegada)}
                </span>
              </div>
            </button>
            <button
              onClick={() => setCobrando(c)}
              className="mt-3 w-full rounded-lg bg-emerald-600/20 py-2 text-xs font-bold text-emerald-400"
            >
              Cobrar via Pix
            </button>

            {logisticaGerada[c.id] ? (
              <div className="mt-2 flex items-center justify-between gap-2 rounded-lg bg-slate-900 px-3 py-2 ring-1 ring-slate-700">
                <span className="text-xs text-slate-400">
                  Logística pronta{logisticaGerada[c.id].checklist.length > 0 ? ` (${logisticaGerada[c.id].checklist.length} itens)` : ''} — atribuir a:
                </span>
                <AtribuirOperadorBotao task={logisticaGerada[c.id]} />
              </div>
            ) : (
              <button
                onClick={() => gerarLogistica(c)}
                disabled={gerandoLogistica === c.id}
                className="mt-2 w-full rounded-lg bg-slate-800 py-2 text-xs font-bold text-slate-200 disabled:opacity-50"
              >
                {gerandoLogistica === c.id ? 'Gerando...' : 'Gerar logística (checklist do brinquedo)'}
              </button>
            )}
          </div>
        ))}
      </div>

      {mostrarForm && (
        <div className="fixed inset-0 z-20 flex items-end bg-black/60" onClick={() => setMostrarForm(false)}>
          <div
            className="max-h-[90vh] w-full overflow-y-auto rounded-t-3xl bg-slate-900 p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="mb-1 text-base font-bold text-slate-50">
              {editando ? 'Editar contrato' : 'Novo contrato'}
            </h2>
            {!editando && form.contratoAssinadoNome && (
              <p className="mb-4 text-xs text-amber-400">
                Preenchido automaticamente a partir do contrato anexado — confira os dados antes de salvar.
              </p>
            )}
            <div className={`flex flex-col gap-3 ${!editando && form.contratoAssinadoNome ? '' : 'mt-4'}`}>
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

              <div>
                <span className="mb-1 block text-[10px] font-bold uppercase text-slate-500">
                  Contrato assinado (opcional)
                </span>
                {form.contratoAssinadoNome ? (
                  <div className="flex items-center justify-between gap-2 rounded-lg bg-slate-800 px-3 py-2 ring-1 ring-slate-700">
                    <a
                      href={form.contratoAssinadoBase64}
                      download={form.contratoAssinadoNome}
                      className="min-w-0 flex-1 truncate text-sm font-semibold text-brand-500"
                    >
                      {form.contratoAssinadoNome}
                    </a>
                    <button
                      onClick={() => setForm({ ...form, contratoAssinadoBase64: '', contratoAssinadoNome: '' })}
                      className="shrink-0 text-xs font-bold text-red-400"
                    >
                      Remover
                    </button>
                  </div>
                ) : (
                  <label className="block cursor-pointer rounded-lg bg-slate-700 py-2.5 text-center text-sm font-semibold text-slate-100">
                    {processandoAnexo ? 'Processando...' : 'Anexar PDF/foto do contrato assinado'}
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx,image/*"
                      onChange={selecionarContratoAssinado}
                      disabled={processandoAnexo}
                      className="hidden"
                    />
                  </label>
                )}
                {erroAnexo && <p className="mt-1 text-xs text-red-400">{erroAnexo}</p>}
              </div>

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

      {cobrando && <CobrancaPixModal contrato={cobrando} onFechar={() => setCobrando(null)} />}
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
