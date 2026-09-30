'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/useAuth';
import MenuLateral from '@/components/MenuLateral';
import CobrancaPixModal from '@/components/CobrancaPixModal';
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
  nomesDosItens,
} from '@/lib/contracts';
import { ContratoPublico, buscarContratoPublico, removerContratoPublico, encurtarLink, gerarToken, linkAssinatura, montarPublico, ouvirAssinaturas, publicarContrato } from '@/lib/contratoPublico';
import ContratoDocumento from '@/components/ContratoDocumento';
import SegundaViaBotoes from '@/components/SegundaViaBotoes';
import ConfirmDialog from '@/components/ConfirmDialog';
import { lembretesProximos, formatDiaMes, mensagemLembrete } from '@/lib/lembretes';
import { Produto, buscarProdutos, ouvirProdutos } from '@/lib/produtos';
import { STATUS_LABELS } from '@/lib/types';
import { LogisticaContrato, apenasAtivas, excluirLogisticaCompleta, ouvirLogisticaContratos, salvarLogisticaContrato } from '@/lib/logisticaContratos';
import { TarefaComOperador, ouvirTodasTarefasAtribuidas } from '@/lib/tarefasAtribuidas';
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
  itens: [],
  horarioInicio: '',
  horarioTermino: '',
  valorTotal: 0,
};

export default function ContratosPage() {
  const { profile } = useAuth();
  const ehAdmin = profile?.role === 'admin';
  const [contratos, setContratos] = useState<Contrato[]>([]);
  const [editando, setEditando] = useState<string | null>(null);
  const [form, setForm] = useState<ContratoDraft>(VAZIO);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [cobrando, setCobrando] = useState<Contrato | null>(null);
  const [logistica, setLogistica] = useState<Record<string, LogisticaContrato>>({});
  const [andamento, setAndamento] = useState<TarefaComOperador[]>([]);
  const [gerandoLogistica, setGerandoLogistica] = useState<string | null>(null);
  const [erroAnexo, setErroAnexo] = useState<string | null>(null);
  const [processandoAnexo, setProcessandoAnexo] = useState(false);
  const [lendoContrato, setLendoContrato] = useState(false);
  const [erroLeitura, setErroLeitura] = useState<string | null>(null);
  const [catalogo, setCatalogo] = useState<Produto[]>([]);
  const [assinados, setAssinados] = useState<Record<string, number>>({});
  const [enviandoContrato, setEnviandoContrato] = useState<string | null>(null);
  const [avisoContrato, setAvisoContrato] = useState<string | null>(null);
  const [previa, setPrevia] = useState<Contrato | null>(null);
  const [excluindoContrato, setExcluindoContrato] = useState<Contrato | null>(null);
  const [segundaVia, setSegundaVia] = useState<ContratoPublico | null>(null);
  const [abrindoVia, setAbrindoVia] = useState<string | null>(null);

  /** Apaga o contrato e tudo que nasceu dele: link público, logística planejada e as tarefas dos operadores. */
  async function excluirContratoCompleto(c: Contrato) {
    try {
      const log = logistica[c.id];
      if (c.tokenAssinatura) await removerContratoPublico(c.tokenAssinatura).catch(() => {});
      await excluirContrato(c.id); // antes da logística, para a automação não recriá-la
      if (log) {
        const porTarefa: Record<string, string> = {};
        andamento.forEach((x) => (porTarefa[x.task.id] = x.uid));
        await excluirLogisticaCompleta(log, porTarefa, true);
      }
    } catch {
      setAvisoContrato('Não consegui excluir o contrato. Confira a internet e tente de novo.');
    }
  }

  /** 2ª via: usa a versão assinada (se o cliente já assinou); senão, o contrato como está agora. */
  async function abrirSegundaVia(c: Contrato) {
    setAbrindoVia(c.id);
    setAvisoContrato(null);
    try {
      const publico = c.tokenAssinatura ? await buscarContratoPublico(c.tokenAssinatura).catch(() => null) : null;
      setSegundaVia(publico?.assinatura ? publico : montarPublico(c));
    } finally {
      setAbrindoVia(null);
    }
  }

  useEffect(() => {
    if (!ehAdmin) return;
    const fns = [
      ouvirContratos(setContratos),
      ouvirProdutos(setCatalogo),
      ouvirAssinaturas(setAssinados),
      ouvirLogisticaContratos((m) => setLogistica(apenasAtivas(m))),
      ouvirTodasTarefasAtribuidas(setAndamento),
    ];
    return () => fns.forEach((f) => f());
  }, [ehAdmin]);

  const itensDoForm = useMemo(() => form.itens ?? [], [form.itens]);

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
        itens: extraido.brinquedo
          ? [{ nome: extraido.brinquedo, peso: catalogo.find((p) => p.nome === extraido.brinquedo)?.pesoSuportado ?? '' }]
          : [],
        dataEvento: extraido.dataEvento,
        valorSinal: extraido.valorSinal,
        valorChegada: extraido.valorChegada,
        valorTotal: extraido.valorSinal + extraido.valorChegada,
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
      itens: nomesDosItens(c).map((nome) => ({
        nome,
        peso: c.itens?.find((i) => i.nome === nome)?.peso ?? catalogo.find((p) => p.nome === nome)?.pesoSuportado ?? '',
      })),
      horarioInicio: c.horarioInicio ?? '',
      horarioTermino: c.horarioTermino ?? '',
      valorTotal: c.valorTotal ?? c.valorSinal + c.valorChegada,
      tokenAssinatura: c.tokenAssinatura,
    });
    setEditando(c.id);
    setMostrarForm(true);
  }

  function dadosParaSalvar(): ContratoDraft {
    const itens = itensDoForm.filter((i) => i.nome.trim());
    return {
      ...form,
      itens,
      brinquedo: itens.map((i) => i.nome).join(' + '),
      valorTotal: form.valorTotal || form.valorSinal + form.valorChegada,
    };
  }

  async function salvar() {
    const dados = dadosParaSalvar();
    if (editando) {
      await atualizarContrato(editando, dados);
    } else {
      const id = await criarContrato(dados);
      // Contrato já fechado/assinado (anexado com o arquivo): a logística sai na hora, sem esperar link de assinatura.
      if (dados.contratoAssinadoBase64) {
        try {
          await salvarLogisticaContrato(
            { ...dados, id, criadoEm: Date.now() },
            await buscarProdutos(),
            'manual'
          );
        } catch {
          setAvisoContrato('Contrato salvo, mas não consegui gerar a logística. Use o botão do card.');
        }
      }
    }
    setMostrarForm(false);
  }

  function adicionarItem(nome: string) {
    if (!nome) return;
    const peso = catalogo.find((p) => p.nome === nome)?.pesoSuportado ?? '';
    setForm((f) => ({ ...f, itens: [...(f.itens ?? []), { nome, peso }] }));
  }

  function definirTotal(total: number) {
    setForm((f) => ({ ...f, valorTotal: total, valorChegada: Math.max(0, total - (f.valorSinal || 0)) }));
  }

  function definirSinal(sinal: number) {
    setForm((f) => ({ ...f, valorSinal: sinal, valorChegada: Math.max(0, (f.valorTotal || 0) - sinal) }));
  }

  /** Salva (se preciso), publica o contrato preenchido e abre o WhatsApp do cliente com o link de assinatura. */
  async function enviarPeloWhatsapp(c: Contrato) {
    setAvisoContrato(null);
    if (!c.telefone) {
      setAvisoContrato('Esse contrato não tem telefone do cliente — edite e preencha para enviar pelo WhatsApp.');
      return;
    }
    setEnviandoContrato(c.id);
    try {
      const token = c.tokenAssinatura ?? gerarToken();
      // Já assinado: não republica (sobrescreveria a assinatura), só reenvia o link.
      if (!assinados[token]) await publicarContrato(c, token);
      if (!c.tokenAssinatura) await atualizarContrato(c.id, { tokenAssinatura: token });
      const link = c.linkCurto ?? (await encurtarLink(linkAssinatura(token), c.cliente.trim().split(/\s+/)[0]));
      if (link !== c.linkCurto && link.includes('is.gd')) await atualizarContrato(c.id, { linkCurto: link });
      const msg = `Olá, ${c.cliente.split(' ')[0]}! Segue o contrato de locação da Zimba Festas para conferir e assinar:\n${link}\n\nÉ só abrir, ler e assinar com o dedo na tela. Qualquer dúvida, é só chamar! 🎈`;
      window.open(whatsappUrl(c.telefone, msg), '_blank');
    } catch {
      setAvisoContrato('Não consegui gerar o link. Confira a internet e se as regras do Firestore foram republicadas.');
    } finally {
      setEnviandoContrato(null);
    }
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

  async function gerarLogisticaManual(c: Contrato) {
    setGerandoLogistica(c.id);
    setAvisoContrato(null);
    try {
      await salvarLogisticaContrato(c, await buscarProdutos(), 'manual');
    } catch {
      setAvisoContrato('Não consegui gerar a logística. Confira a internet e as regras do Firestore.');
    } finally {
      setGerandoLogistica(null);
    }
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-xl bg-slate-900 pb-24">
      <header className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 bg-slate-900/95 p-4 backdrop-blur">
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

      {avisoContrato && (
        <p className="border-b border-slate-800 bg-amber-500/10 px-4 py-2 text-xs text-amber-400">{avisoContrato}</p>
      )}
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
              <p className="mt-1 text-sm text-slate-300">{nomesDosItens(c).join(' + ')}</p>
              <div className="mt-2 flex items-center gap-2">
                <span className="text-xs text-slate-400">{c.dataEvento.split('-').reverse().join('/')}</span>
                <ClimaBadge endereco={c.endereco} data={c.dataEvento} />
              </div>
              <div className="mt-1 flex justify-end text-xs text-slate-400">
                <span>
                  Sinal {formatCurrency(c.valorSinal)} + chegada {formatCurrency(c.valorChegada)} ={' '}
                  {formatCurrency(c.valorSinal + c.valorChegada)}
                </span>
              </div>
            </button>
            <Etapas
              etapas={etapasDoContrato(c, assinados, logistica[c.id], andamento)}
              resumo={resumoEtapas(logistica[c.id], andamento)}
            />
            <button
              onClick={() => setPrevia(c)}
              disabled={enviandoContrato === c.id}
              className="mt-3 w-full rounded-lg bg-emerald-600 py-2 text-xs font-bold text-white disabled:opacity-50"
            >
              {enviandoContrato === c.id
                ? 'Gerando link...'
                : c.tokenAssinatura && assinados[c.tokenAssinatura]
                ? '✅ Assinado — reenviar link'
                : c.tokenAssinatura
                ? '⏳ Aguardando assinatura — reenviar pelo WhatsApp'
                : '📄 Gerar contrato e enviar pelo WhatsApp'}
            </button>
            <div className="mt-2 flex gap-2">
              <button onClick={() => abrirEdicao(c)} className="flex-1 rounded-lg bg-slate-800 py-2 text-xs font-bold text-slate-200">
                ✏️ Editar
              </button>
              <button
                onClick={() => setExcluindoContrato(c)}
                className="flex-1 rounded-lg bg-slate-800 py-2 text-xs font-bold text-red-400"
              >
                🗑️ Excluir
              </button>
            </div>
            <button
              onClick={() => abrirSegundaVia(c)}
              disabled={abrindoVia === c.id}
              className="mt-2 w-full rounded-lg bg-slate-800 py-2 text-xs font-bold text-slate-200 disabled:opacity-50"
            >
              {abrindoVia === c.id ? 'Abrindo...' : '📑 2ª via do contrato'}
            </button>
            <button
              onClick={() => setCobrando(c)}
              className="mt-2 w-full rounded-lg bg-emerald-600/20 py-2 text-xs font-bold text-emerald-400"
            >
              Cobrar via Pix
            </button>

            {logistica[c.id] ? (
              <Link
                href="/admin/atribuir"
                className="mt-2 block w-full rounded-lg bg-slate-800 py-2 text-center text-xs font-bold text-emerald-400"
              >
                📦 Ver logística no Planejamento
              </Link>
            ) : (
              <button
                onClick={() => gerarLogisticaManual(c)}
                disabled={gerandoLogistica === c.id}
                className="mt-2 w-full rounded-lg bg-slate-800 py-2 text-xs font-bold text-slate-400 disabled:opacity-50"
              >
                {gerandoLogistica === c.id ? 'Gerando...' : 'Gerar logística agora (sem esperar a assinatura)'}
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
              <Campo label="Nome do contratante">
                <input
                  value={form.cliente}
                  onChange={(e) => setForm({ ...form, cliente: e.target.value })}
                  className="w-full rounded-lg bg-slate-800 px-3 py-2 text-sm text-slate-100 outline-none ring-1 ring-slate-700"
                />
              </Campo>
              <h3 className="mt-2 border-b border-slate-800 pb-1 text-[11px] font-extrabold uppercase tracking-widest text-brand-500">Contratante</h3>
              <Campo label="Nome do contratante">
                <input
                  value={form.cliente}
                  onChange={(e) => setForm({ ...form, cliente: e.target.value })}
                  className="w-full rounded-lg bg-slate-800 px-3 py-2 text-sm text-slate-100 outline-none ring-1 ring-slate-700"
                />
              </Campo>
                <Campo label="CPF ou CNPJ">
                  <input
                    value={form.cpf}
                    onChange={(e) => setForm({ ...form, cpf: e.target.value })}
                    placeholder="000.000.000-00"
                    className="w-full rounded-lg bg-slate-800 px-3 py-2 text-sm text-slate-100 outline-none ring-1 ring-slate-700"
                  />
                </Campo>
              <Campo label="Telefone">
                <input
                  value={form.telefone}
                  onChange={(e) => setForm({ ...form, telefone: e.target.value })}
                  className="w-full rounded-lg bg-slate-800 px-3 py-2 text-sm text-slate-100 outline-none ring-1 ring-slate-700"
                />
              </Campo>
              <Campo label="Endereço">
                <input
                  value={form.endereco}
                  onChange={(e) => setForm({ ...form, endereco: e.target.value })}
                  className="w-full rounded-lg bg-slate-800 px-3 py-2 text-sm text-slate-100 outline-none ring-1 ring-slate-700"
                />
              </Campo>
              <h3 className="mt-2 border-b border-slate-800 pb-1 text-[11px] font-extrabold uppercase tracking-widest text-brand-500">Locação</h3>
              <div>
                <span className="mb-1 block text-[10px] font-bold uppercase text-slate-500">
                  Descrição dos itens (brinquedos)
                </span>
                <div className="flex flex-col gap-1">
                  {itensDoForm.map((it, idx) => (
                    <div key={idx} className="flex items-center gap-2 rounded-lg bg-slate-800 px-3 py-2 ring-1 ring-slate-700">
                      <span className="min-w-0 flex-1 truncate text-sm text-slate-100">{it.nome}</span>
                      <input
                        value={it.peso}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            itens: itensDoForm.map((x, i) => (i === idx ? { ...x, peso: e.target.value } : x)),
                          })
                        }
                        placeholder="peso suportado"
                        className="w-28 rounded bg-slate-900 px-2 py-1 text-xs text-slate-100 outline-none ring-1 ring-slate-700"
                      />
                      <button
                        onClick={() => setForm({ ...form, itens: itensDoForm.filter((_, i) => i !== idx) })}
                        className="text-xs font-bold text-red-400"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
                <select
                  value=""
                  onChange={(e) => adicionarItem(e.target.value)}
                  className="mt-2 w-full rounded-lg bg-slate-800 px-3 py-2 text-sm text-slate-100 outline-none ring-1 ring-slate-700"
                >
                  <option value="">+ Adicionar brinquedo do catálogo…</option>
                  {catalogo.map((p) => (
                    <option key={p.id} value={p.nome}>
                      {p.nome}
                      {p.pesoSuportado ? ` (${p.pesoSuportado})` : ''}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-slate-500">
                  O peso suportado vem do cadastro do brinquedo e vai preenchido no contrato.
                </p>
              </div>
                <Campo label="Data da locação">
                  <input
                    type="date"
                    value={form.dataEvento}
                    onChange={(e) => setForm({ ...form, dataEvento: e.target.value })}
                    className="w-full rounded-lg bg-slate-800 px-3 py-2 text-sm text-slate-100 outline-none ring-1 ring-slate-700"
                  />
                </Campo>
              <div className="grid grid-cols-2 gap-2">
                <Campo label="Início da montagem">
                  <input
                    type="time"
                    value={form.horarioInicio ?? ''}
                    onChange={(e) => setForm({ ...form, horarioInicio: e.target.value })}
                    className="w-full rounded-lg bg-slate-800 px-3 py-2 text-sm text-slate-100 outline-none ring-1 ring-slate-700"
                  />
                </Campo>
                <Campo label="Término">
                  <input
                    type="time"
                    value={form.horarioTermino ?? ''}
                    onChange={(e) => setForm({ ...form, horarioTermino: e.target.value })}
                    className="w-full rounded-lg bg-slate-800 px-3 py-2 text-sm text-slate-100 outline-none ring-1 ring-slate-700"
                  />
                </Campo>
              </div>
              <h3 className="mt-2 border-b border-slate-800 pb-1 text-[11px] font-extrabold uppercase tracking-widest text-brand-500">Valores</h3>
              <div className="grid grid-cols-2 gap-2">
                <Campo label="Valor total acordado (R$)">
                  <input
                    type="number"
                    value={form.valorTotal ?? 0}
                    onChange={(e) => definirTotal(Number(e.target.value))}
                    className="w-full rounded-lg bg-slate-800 px-3 py-2 text-sm text-slate-100 outline-none ring-1 ring-slate-700"
                  />
                </Campo>
                <Campo label="Valor do sinal (R$)">
                  <input
                    type="number"
                    value={form.valorSinal}
                    onChange={(e) => definirSinal(Number(e.target.value))}
                    className="w-full rounded-lg bg-slate-800 px-3 py-2 text-sm text-slate-100 outline-none ring-1 ring-slate-700"
                  />
                </Campo>
              </div>
              <p className="-mt-1 text-xs text-emerald-400">
                Restante pago na chegada da equipe: {formatCurrency(form.valorChegada || 0)}
              </p>
              <h3 className="mt-2 border-b border-slate-800 pb-1 text-[11px] font-extrabold uppercase tracking-widest text-brand-500">Outras informações (opcional)</h3>
                <Campo label="Data de nascimento">
                  <input
                    type="date"
                    value={form.dataNascimento}
                    onChange={(e) => setForm({ ...form, dataNascimento: e.target.value })}
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
                  onClick={() => {
                    const c = contratos.find((x) => x.id === editando);
                    if (c) setExcluindoContrato(c);
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

      {previa && (
        <div className="fixed inset-0 z-30 flex flex-col bg-black/80">
          <div className="flex items-center justify-between gap-2 bg-slate-900 p-3">
            <p className="text-xs font-bold text-slate-200">Confira o contrato antes de enviar</p>
            <button onClick={() => setPrevia(null)} className="text-xs font-bold text-slate-400">
              Fechar
            </button>
          </div>
          <div className="flex-1 overflow-y-auto bg-slate-200 p-2">
            <div className="mx-auto max-w-3xl shadow-lg">
              <ContratoDocumento c={montarPublico(previa)} />
            </div>
          </div>
          <div className="flex gap-2 bg-slate-900 p-3">
            <button
              onClick={() => {
                const c = previa;
                setPrevia(null);
                abrirEdicao(c);
              }}
              className="flex-1 rounded-xl bg-slate-800 py-3 text-sm font-bold text-slate-200"
            >
              Corrigir dados
            </button>
            <button
              onClick={async () => {
                const c = previa;
                setPrevia(null);
                await enviarPeloWhatsapp(c);
              }}
              className="flex-1 rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white"
            >
              Está certo — gerar link e enviar
            </button>
          </div>
        </div>
      )}

      {segundaVia && (
        <div className="fixed inset-0 z-30 flex flex-col bg-black/80">
          <div className="flex items-center justify-between gap-2 bg-slate-900 p-3">
            <p className="text-xs font-bold text-slate-200">
              2ª via — {segundaVia.assinatura ? 'assinada pelo cliente' : 'ainda sem assinatura do cliente'}
            </p>
            <button onClick={() => setSegundaVia(null)} className="text-xs font-bold text-slate-400">
              Fechar
            </button>
          </div>
          <div className="flex-1 overflow-y-auto bg-slate-200 p-2">
            <div className="mx-auto max-w-3xl shadow-lg">
              <ContratoDocumento c={segundaVia} />
            </div>
          </div>
          <div className="bg-slate-900 p-3">
            <SegundaViaBotoes c={segundaVia} />
          </div>
        </div>
      )}

      {excluindoContrato && (
        <ConfirmDialog
          message={`Excluir o contrato de ${excluindoContrato.cliente}? Some também o link de assinatura e a logística. Não dá pra desfazer.`}
          confirmLabel="EXCLUIR"
          onCancel={() => setExcluindoContrato(null)}
          onConfirm={async () => {
            const c = excluindoContrato;
            setExcluindoContrato(null);
            setMostrarForm(false);
            await excluirContratoCompleto(c);
          }}
        />
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

interface Etapa {
  rotulo: string;
  ok: boolean;
}

function etapasDoContrato(
  c: Contrato,
  assinados: Record<string, number>,
  log: LogisticaContrato | undefined,
  andamento: TarefaComOperador[]
): Etapa[] {
  const ids = log?.tarefas.map((t) => t.id) ?? [];
  const reais = andamento.filter((x) => ids.includes(x.task.id));
  return [
    { rotulo: 'Contrato criado', ok: true },
    { rotulo: 'Enviado ao cliente', ok: !!c.tokenAssinatura },
    { rotulo: 'Assinado', ok: !!(c.tokenAssinatura && assinados[c.tokenAssinatura]) },
    { rotulo: 'Pago', ok: c.status === 'PAGO' },
    { rotulo: 'Logística gerada', ok: !!log },
    { rotulo: 'Equipe definida', ok: !!log && log.tarefas.every((t) => log.atribuidas[t.id]) },
    { rotulo: 'Concluído', ok: ids.length > 0 && reais.length === ids.length && reais.every((x) => x.task.status === 'CONCLUIDA') },
  ];
}

function resumoEtapas(log: LogisticaContrato | undefined, andamento: TarefaComOperador[]): string {
  if (!log) return '';
  return log.tarefas
    .map((t) => {
      const real = andamento.find((x) => x.task.id === t.id);
      const quem = log.atribuidas[t.id]?.nome;
      const tipo = t.tipo === 'MONTAGEM' ? 'Montagem' : 'Retirada';
      return quem ? `${tipo}: ${quem} (${real ? STATUS_LABELS[real.task.status] : 'enviada'})` : `${tipo}: sem operador`;
    })
    .join(' · ');
}

function Etapas({ etapas, resumo }: { etapas: Etapa[]; resumo: string }) {
  return (
    <div className="mt-3 rounded-xl bg-slate-900/60 p-2.5">
      <div className="flex flex-wrap gap-1">
        {etapas.map((e) => (
          <span
            key={e.rotulo}
            className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
              e.ok ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-500'
            }`}
          >
            {e.ok ? '✓' : '○'} {e.rotulo}
          </span>
        ))}
      </div>
      {resumo && <p className="mt-1.5 text-[11px] text-slate-400">{resumo}</p>}
    </div>
  );
}
