'use client';

import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/lib/useAuth';
import { Produto, ProdutoDraft, atualizarProduto, criarProduto, excluirProduto, ouvirProdutos } from '@/lib/produtos';
import { comprimirImagem } from '@/lib/imagem';
import MenuLateral from '@/components/MenuLateral';
import ConfirmDialog from '@/components/ConfirmDialog';
import { ResultadoDisponibilidade, verificarDisponibilidade } from '@/lib/disponibilidade';
import { todayISO } from '@/lib/format';

const VAZIO: ProdutoDraft = {
  nome: '',
  cor: '#1568bb',
  imagemUrl: '',
  itens: [],
  quantidade: 1,
  pesoSuportado: '',
};

export default function BrinquedosPage() {
  const { profile } = useAuth();
  const ehAdmin = profile?.role === 'admin';
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [editando, setEditando] = useState<string | null>(null);
  const [form, setForm] = useState<ProdutoDraft>(VAZIO);
  const [novoItem, setNovoItem] = useState('');
  const [mostrarForm, setMostrarForm] = useState(false);
  const [confirmandoExcluir, setConfirmandoExcluir] = useState(false);
  const [processandoImagem, setProcessandoImagem] = useState(false);
  const [erroImagem, setErroImagem] = useState<string | null>(null);
  const inputArquivoRef = useRef<HTMLInputElement>(null);

  const [dataConsulta, setDataConsulta] = useState(todayISO());
  const [brinquedoConsulta, setBrinquedoConsulta] = useState('');
  const [resultado, setResultado] = useState<ResultadoDisponibilidade | null>(null);
  const [consultando, setConsultando] = useState(false);

  useEffect(() => {
    if (!profile) return;
    return ouvirProdutos(setProdutos);
  }, [profile]);

  if (!profile) return null;

  function abrirNovo() {
    setForm(VAZIO);
    setEditando(null);
    setNovoItem('');
    setMostrarForm(true);
  }

  function abrirEdicao(p: Produto) {
    setForm({ nome: p.nome, cor: p.cor, imagemUrl: p.imagemUrl, itens: [...p.itens], quantidade: p.quantidade ?? 1, pesoSuportado: p.pesoSuportado ?? '' });
    setEditando(p.id);
    setNovoItem('');
    setMostrarForm(true);
  }

  async function consultarDisponibilidade() {
    if (!brinquedoConsulta || !dataConsulta) return;
    setConsultando(true);
    try {
      setResultado(await verificarDisponibilidade(brinquedoConsulta, dataConsulta));
    } finally {
      setConsultando(false);
    }
  }

  function adicionarItem() {
    const texto = novoItem.trim();
    if (!texto) return;
    setForm({ ...form, itens: [...form.itens, texto] });
    setNovoItem('');
  }

  function removerItem(idx: number) {
    setForm({ ...form, itens: form.itens.filter((_, i) => i !== idx) });
  }

  async function selecionarFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0];
    e.target.value = '';
    if (!arquivo) return;
    setErroImagem(null);
    setProcessandoImagem(true);
    try {
      const dataUrl = await comprimirImagem(arquivo);
      setForm((f) => ({ ...f, imagemUrl: dataUrl }));
    } catch {
      setErroImagem('Não foi possível processar essa foto. Tente outra.');
    } finally {
      setProcessandoImagem(false);
    }
  }

  async function salvar() {
    if (editando) {
      await atualizarProduto(editando, form);
    } else {
      await criarProduto(form);
    }
    setMostrarForm(false);
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-xl bg-slate-900 pb-24">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-800 bg-slate-900/95 p-4 backdrop-blur">
        <div className="flex items-center gap-3">
          <MenuLateral />
          <h1 className="text-base font-bold text-slate-50">Brinquedos</h1>
        </div>
        {ehAdmin && (
          <button onClick={abrirNovo} className="rounded-xl bg-brand-500 px-3 py-2 text-xs font-bold text-white">
            + Cadastrar
          </button>
        )}
      </header>

      {ehAdmin && (
        <section className="m-4 flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-800/40 p-4">
          <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400">Verificar disponibilidade</h2>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="date"
              value={dataConsulta}
              onChange={(e) => setDataConsulta(e.target.value)}
              className="rounded-lg bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none ring-1 ring-slate-700"
            />
            <select
              value={brinquedoConsulta}
              onChange={(e) => setBrinquedoConsulta(e.target.value)}
              className="rounded-lg bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none ring-1 ring-slate-700"
            >
              <option value="">Escolher brinquedo...</option>
              {produtos.map((p) => (
                <option key={p.id} value={p.nome}>
                  {p.nome}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={consultarDisponibilidade}
            disabled={!brinquedoConsulta || !dataConsulta || consultando}
            className="rounded-lg bg-brand-500 py-2 text-sm font-bold text-white disabled:opacity-50"
          >
            {consultando ? 'Consultando...' : 'Verificar'}
          </button>

          {resultado && (
            <div
              className={`rounded-xl p-3 text-sm ${
                resultado.disponiveis > 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
              }`}
            >
              <p className="font-bold">
                {resultado.disponiveis > 0
                  ? `Disponível — ${resultado.disponiveis} de ${resultado.quantidadeTotal} livre${resultado.disponiveis !== 1 ? 's' : ''}`
                  : `Indisponível — os ${resultado.quantidadeTotal} já estão reservados nessa data`}
              </p>
              {resultado.reservas.length > 0 && (
                <p className="mt-1 text-xs opacity-80">
                  Reservado para: {resultado.reservas.map((r) => r.cliente).join(', ')}
                </p>
              )}
            </div>
          )}
        </section>
      )}

      <div className="flex flex-col gap-3 p-4">
        {produtos.length === 0 && (
          <p className="text-sm text-slate-500">Nenhum brinquedo cadastrado ainda.</p>
        )}

        {produtos.map((p) => (
          <button
            key={p.id}
            onClick={() => ehAdmin && abrirEdicao(p)}
            disabled={!ehAdmin}
            className="flex items-start gap-3 rounded-2xl border border-slate-800 bg-slate-800/40 p-4 text-left disabled:opacity-100"
          >
            {p.imagemUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={p.imagemUrl} alt={p.nome} className="h-14 w-14 shrink-0 rounded-lg object-cover" />
            ) : (
              <span
                className="h-14 w-14 shrink-0 rounded-lg"
                style={{ backgroundColor: p.cor }}
                aria-hidden
              />
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: p.cor }} aria-hidden />
                <span className="font-bold text-slate-100">{p.nome}</span>
                {(p.quantidade ?? 1) > 1 && (
                  <span className="rounded-full bg-slate-700 px-2 py-0.5 text-[10px] font-bold text-slate-300">
                    {p.quantidade} un.
                  </span>
                )}
              </div>
              {p.itens.length > 0 && (
                <p className="mt-1 text-xs text-slate-400">{p.itens.join(' · ')}</p>
              )}
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
              {editando ? 'Editar brinquedo' : 'Novo brinquedo'}
            </h2>
            <div className="flex flex-col gap-3">
              <Campo label="Nome do brinquedo">
                <input
                  value={form.nome}
                  onChange={(e) => setForm({ ...form, nome: e.target.value })}
                  placeholder="Ex: Cama elástica 3,05m"
                  className="w-full rounded-lg bg-slate-800 px-3 py-2 text-sm text-slate-100 outline-none ring-1 ring-slate-700"
                />
              </Campo>

              <Campo label="Quantidade (unidades desse brinquedo)">
                <input
                  type="number"
                  min={1}
                  value={form.quantidade}
                  onChange={(e) => setForm({ ...form, quantidade: Math.max(1, Number(e.target.value)) })}
                  className="w-full rounded-lg bg-slate-800 px-3 py-2 text-sm text-slate-100 outline-none ring-1 ring-slate-700"
                />
              </Campo>

              <Campo label="Peso suportado (aparece no contrato)">
                <input
                  value={form.pesoSuportado ?? ''}
                  onChange={(e) => setForm({ ...form, pesoSuportado: e.target.value })}
                  placeholder="Ex: até 150 kg no total"
                  className="w-full rounded-lg bg-slate-800 px-3 py-2 text-sm text-slate-100 outline-none ring-1 ring-slate-700"
                />
              </Campo>

              <Campo label="Cor de identificação">
                <input
                  type="color"
                  value={form.cor}
                  onChange={(e) => setForm({ ...form, cor: e.target.value })}
                  className="h-10 w-full rounded-lg bg-slate-800 ring-1 ring-slate-700"
                />
              </Campo>

              <div>
                <span className="mb-1 block text-[10px] font-bold uppercase text-slate-500">Foto do brinquedo</span>
                <div className="flex items-center gap-3">
                  {form.imagemUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={form.imagemUrl}
                      alt="Prévia"
                      className="h-16 w-16 shrink-0 rounded-lg object-cover ring-1 ring-slate-700"
                    />
                  ) : (
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-slate-800 text-[10px] text-slate-500 ring-1 ring-slate-700">
                      Sem foto
                    </div>
                  )}
                  <button
                    onClick={() => inputArquivoRef.current?.click()}
                    disabled={processandoImagem}
                    className="flex-1 rounded-lg bg-slate-700 py-2.5 text-sm font-semibold text-slate-100 disabled:opacity-50"
                  >
                    {processandoImagem ? 'Processando...' : form.imagemUrl ? 'Trocar foto' : 'Tirar/escolher foto'}
                  </button>
                </div>
                <input
                  ref={inputArquivoRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={selecionarFoto}
                  className="hidden"
                />
                {erroImagem && <p className="mt-1 text-xs text-red-400">{erroImagem}</p>}
              </div>

              <div>
                <span className="mb-1 block text-[10px] font-bold uppercase text-slate-500">
                  Itens que compõem o brinquedo
                </span>
                <div className="flex flex-col gap-2">
                  {form.itens.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2 rounded-lg bg-slate-800 px-3 py-2">
                      <span className="flex-1 text-sm text-slate-100">{item}</span>
                      <button onClick={() => removerItem(idx)} className="text-xs font-bold text-red-400">
                        Remover
                      </button>
                    </div>
                  ))}
                </div>
                <div className="mt-2 flex gap-2">
                  <input
                    value={novoItem}
                    onChange={(e) => setNovoItem(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        adicionarItem();
                      }
                    }}
                    placeholder="Ex: Motor, Lona, Extensão 20m, 4 estacas..."
                    className="flex-1 rounded-lg bg-slate-800 px-3 py-2 text-sm text-slate-100 outline-none ring-1 ring-slate-700"
                  />
                  <button onClick={adicionarItem} className="rounded-lg bg-slate-700 px-4 text-sm font-bold text-slate-100">
                    + Item
                  </button>
                </div>
              </div>

              <button
                onClick={salvar}
                disabled={!form.nome || !form.imagemUrl || processandoImagem}
                className="rounded-xl bg-brand-500 py-3 text-sm font-bold text-white disabled:opacity-50"
              >
                Salvar
              </button>
              {!form.imagemUrl && (
                <p className="-mt-2 text-center text-xs text-slate-500">A foto é obrigatória para salvar.</p>
              )}
              {editando && (
                <button
                  onClick={() => setConfirmandoExcluir(true)}
                  className="rounded-xl bg-slate-800 py-3 text-sm font-bold text-red-400"
                >
                  Excluir brinquedo
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {confirmandoExcluir && editando && (
        <ConfirmDialog
          message="Excluir este brinquedo do catálogo? Contratos já feitos não são apagados."
          confirmLabel="EXCLUIR"
          onCancel={() => setConfirmandoExcluir(false)}
          onConfirm={async () => {
            await excluirProduto(editando);
            setConfirmandoExcluir(false);
            setMostrarForm(false);
          }}
        />
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
