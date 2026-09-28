'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/useAuth';
import { parseLogistica, draftsParaTasks, TaskDraft } from '@/lib/importLogistica';
import { TaskType, TYPE_LABELS } from '@/lib/types';
import { listarUsuarios } from '@/lib/usuarios';
import { UserProfile } from '@/lib/authTypes';
import { atribuirTarefas } from '@/lib/tarefasAtribuidas';
import MenuLateral from '@/components/MenuLateral';

const TIPOS: TaskType[] = ['MONTAGEM', 'RETIRADA', 'EVENTO', 'LOGISTICA'];

export default function AtribuirLogisticaPage() {
  const { profile } = useAuth();
  const ehAdmin = profile?.role === 'admin';

  const [operadores, setOperadores] = useState<UserProfile[]>([]);
  const [texto, setTexto] = useState('');
  const [drafts, setDrafts] = useState<TaskDraft[] | null>(null);
  const [atribuicoes, setAtribuicoes] = useState<Record<number, string>>({});
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState<string | null>(null);

  useEffect(() => {
    if (!ehAdmin) return;
    listarUsuarios().then(setOperadores);
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

  function analisar() {
    const resultado = parseLogistica(texto);
    setDrafts(resultado);
    setAtribuicoes({});
  }

  function atualizarDraft(idx: number, campo: keyof TaskDraft, valor: string) {
    if (!drafts) return;
    const copia = [...drafts];
    copia[idx] = { ...copia[idx], [campo]: valor };
    if (campo === 'horarioComparacao' || campo === 'cliente') {
      copia[idx].precisaRevisao = !copia[idx].horarioComparacao || !copia[idx].cliente;
    }
    setDrafts(copia);
  }

  function removerDraft(idx: number) {
    if (!drafts) return;
    setDrafts(drafts.filter((_, i) => i !== idx));
    setAtribuicoes((atual) => {
      const copia = { ...atual };
      delete copia[idx];
      return copia;
    });
  }

  function definirOperador(idx: number, uid: string) {
    setAtribuicoes({ ...atribuicoes, [idx]: uid });
  }

  function atribuirTodosPara(uid: string) {
    if (!drafts) return;
    const nova: Record<number, string> = {};
    drafts.forEach((_, idx) => (nova[idx] = uid));
    setAtribuicoes(nova);
  }

  async function salvar() {
    if (!drafts || drafts.length === 0) return;
    setMensagem(null);

    const semOperador = drafts.some((_, idx) => !atribuicoes[idx]);
    if (semOperador) {
      setMensagem('Escolha o operador de cada tarefa antes de salvar.');
      return;
    }

    setSalvando(true);
    try {
      const tasks = draftsParaTasks(drafts, []);
      const porOperador = new Map<string, typeof tasks>();
      tasks.forEach((tarefa, idx) => {
        const uid = atribuicoes[idx];
        porOperador.set(uid, [...(porOperador.get(uid) || []), tarefa]);
      });

      for (const [uid, tarefasDoOperador] of porOperador) {
        await atribuirTarefas(uid, tarefasDoOperador);
      }

      const nomes = [...porOperador.keys()]
        .map((uid) => operadores.find((o) => o.uid === uid)?.nome || uid)
        .join(', ');
      setMensagem(`${tasks.length} tarefa${tasks.length !== 1 ? 's' : ''} atribuída${tasks.length !== 1 ? 's' : ''} para: ${nomes}.`);
      setTexto('');
      setDrafts(null);
      setAtribuicoes({});
    } catch (e) {
      setMensagem(e instanceof Error ? e.message : 'Erro ao atribuir tarefas.');
    } finally {
      setSalvando(false);
    }
  }

  const pendencias = drafts?.filter((d) => d.precisaRevisao).length ?? 0;

  return (
    <div className="min-h-screen bg-slate-900 pb-24">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-slate-800 bg-slate-900/95 p-4 backdrop-blur">
        <MenuLateral />
        <h1 className="text-base font-bold text-slate-50">Planejamento de logística</h1>
      </header>

      <div className="flex flex-col gap-4 p-4">
        {operadores.length === 0 && (
          <p className="text-sm text-amber-400">
            Nenhum operador cadastrado ainda — vá em &quot;+ Adicionar pessoa&quot; no Monitoramento de equipe
            antes de atribuir tarefas.
          </p>
        )}

        {!drafts && (
          <>
            <p className="text-sm text-slate-400">
              Cole aqui o texto da logística (do fim de semana, da semana, ou de um cliente que acabou de
              fechar). Depois de analisar, você escolhe qual operador pega cada tarefa antes de enviar — cada
              um só vê no próprio celular o que foi atribuído a ele.
            </p>
            <textarea
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              rows={14}
              placeholder="Cole aqui o texto da logística..."
              className="w-full rounded-xl bg-slate-800 px-4 py-3 text-sm text-slate-100 outline-none ring-1 ring-slate-700 focus:ring-brand-500"
            />
            <button
              onClick={analisar}
              disabled={!texto.trim()}
              className="rounded-xl bg-brand-500 py-3 text-base font-bold text-white disabled:opacity-50"
            >
              ANALISAR TEXTO
            </button>
          </>
        )}

        {drafts && (
          <>
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-300">
                {drafts.length} tarefa{drafts.length !== 1 ? 's' : ''} encontrada{drafts.length !== 1 ? 's' : ''}
                {pendencias > 0 && <span className="ml-2 text-amber-400">· {pendencias} para revisar</span>}
              </p>
              <button onClick={() => setDrafts(null)} className="text-xs font-semibold text-slate-400">
                Colar outro texto
              </button>
            </div>

            {operadores.length >= 1 && (
              <div className="flex flex-wrap items-center gap-2 rounded-xl bg-slate-800/40 p-3">
                <span className="text-xs text-slate-400">Atribuir tudo para:</span>
                {operadores.map((op) => (
                  <button
                    key={op.uid}
                    onClick={() => atribuirTodosPara(op.uid)}
                    className="rounded-full bg-slate-700 px-3 py-1 text-xs font-semibold text-slate-200"
                  >
                    {op.nome}
                  </button>
                ))}
              </div>
            )}

            <div className="flex flex-col gap-3">
              {drafts.map((d, idx) => (
                <div
                  key={idx}
                  className={`rounded-2xl border p-4 ${
                    d.precisaRevisao ? 'border-amber-500/60 bg-amber-500/5' : 'border-slate-800 bg-slate-800/40'
                  }`}
                >
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <input
                      type="date"
                      value={d.data}
                      onChange={(e) => atualizarDraft(idx, 'data', e.target.value)}
                      className="rounded-lg bg-slate-900 px-2 py-1 text-xs text-slate-200 outline-none ring-1 ring-slate-700"
                    />
                    <button onClick={() => removerDraft(idx)} className="text-xs font-semibold text-red-400">
                      Remover
                    </button>
                  </div>

                  <div className="mb-2">
                    <label className="mb-1 block text-[10px] font-bold uppercase text-slate-500">
                      Atribuir para
                    </label>
                    <select
                      value={atribuicoes[idx] || ''}
                      onChange={(e) => definirOperador(idx, e.target.value)}
                      className={`w-full rounded-lg px-2 py-2 text-sm outline-none ring-1 ${
                        atribuicoes[idx]
                          ? 'bg-slate-900 text-slate-100 ring-slate-700'
                          : 'bg-amber-500/10 text-amber-300 ring-amber-500/40'
                      }`}
                    >
                      <option value="">Escolher operador...</option>
                      {operadores.map((op) => (
                        <option key={op.uid} value={op.uid}>
                          {op.nome} {op.role === 'admin' ? '(admin)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="mb-2 grid grid-cols-2 gap-2">
                    <div>
                      <label className="mb-1 block text-[10px] font-bold uppercase text-slate-500">
                        Horário (rótulo)
                      </label>
                      <input
                        value={d.horario}
                        onChange={(e) => atualizarDraft(idx, 'horario', e.target.value)}
                        placeholder="ex: 09:30"
                        className="w-full rounded-lg bg-slate-900 px-2 py-2 text-sm text-slate-100 outline-none ring-1 ring-slate-700"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[10px] font-bold uppercase text-slate-500">
                        Horário (HH:MM p/ ordenar)
                      </label>
                      <input
                        value={d.horarioComparacao}
                        onChange={(e) => atualizarDraft(idx, 'horarioComparacao', e.target.value)}
                        placeholder="09:30"
                        className="w-full rounded-lg bg-slate-900 px-2 py-2 text-sm text-slate-100 outline-none ring-1 ring-slate-700"
                      />
                    </div>
                  </div>

                  <div className="mb-2">
                    <label className="mb-1 block text-[10px] font-bold uppercase text-slate-500">Tipo</label>
                    <div className="flex flex-wrap gap-1">
                      {TIPOS.map((t) => (
                        <button
                          key={t}
                          onClick={() => atualizarDraft(idx, 'tipo', t)}
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            d.tipo === t ? 'bg-brand-500 text-white' : 'bg-slate-900 text-slate-400'
                          }`}
                        >
                          {TYPE_LABELS[t]}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="mb-2">
                    <label className="mb-1 block text-[10px] font-bold uppercase text-slate-500">
                      Cliente / atividade
                    </label>
                    <input
                      value={d.cliente}
                      onChange={(e) => atualizarDraft(idx, 'cliente', e.target.value)}
                      className="w-full rounded-lg bg-slate-900 px-2 py-2 text-sm text-slate-100 outline-none ring-1 ring-slate-700"
                    />
                  </div>

                  <div className="mb-2 grid grid-cols-2 gap-2">
                    <div>
                      <label className="mb-1 block text-[10px] font-bold uppercase text-slate-500">
                        Brinquedo
                      </label>
                      <input
                        value={d.brinquedo || ''}
                        onChange={(e) => atualizarDraft(idx, 'brinquedo', e.target.value)}
                        className="w-full rounded-lg bg-slate-900 px-2 py-2 text-sm text-slate-100 outline-none ring-1 ring-slate-700"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[10px] font-bold uppercase text-slate-500">
                        Telefone
                      </label>
                      <input
                        value={d.telefone || ''}
                        onChange={(e) => atualizarDraft(idx, 'telefone', e.target.value)}
                        className="w-full rounded-lg bg-slate-900 px-2 py-2 text-sm text-slate-100 outline-none ring-1 ring-slate-700"
                      />
                    </div>
                  </div>

                  <div className="mb-2">
                    <label className="mb-1 block text-[10px] font-bold uppercase text-slate-500">
                      Endereço
                    </label>
                    <input
                      value={d.endereco || ''}
                      onChange={(e) => atualizarDraft(idx, 'endereco', e.target.value)}
                      className="w-full rounded-lg bg-slate-900 px-2 py-2 text-sm text-slate-100 outline-none ring-1 ring-slate-700"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-[10px] font-bold uppercase text-slate-500">
                      Observações
                    </label>
                    <textarea
                      value={d.observacoes || ''}
                      onChange={(e) => atualizarDraft(idx, 'observacoes', e.target.value)}
                      rows={2}
                      className="w-full rounded-lg bg-slate-900 px-2 py-2 text-sm text-slate-100 outline-none ring-1 ring-slate-700"
                    />
                  </div>
                </div>
              ))}
            </div>

            {mensagem && <p className="text-sm text-emerald-400">{mensagem}</p>}
          </>
        )}
      </div>

      {drafts && drafts.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 border-t border-slate-800 bg-slate-900/95 p-4 backdrop-blur">
          <button
            onClick={salvar}
            disabled={salvando}
            className="mx-auto block w-full max-w-xl rounded-xl bg-emerald-600 py-3 text-base font-bold text-white disabled:opacity-50"
          >
            {salvando ? 'ATRIBUINDO...' : `ATRIBUIR ${drafts.length} TAREFA${drafts.length !== 1 ? 'S' : ''}`}
          </button>
        </div>
      )}
    </div>
  );
}
