'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/useAuth';
import MenuLateral from '@/components/MenuLateral';
import { Configuracoes, ouvirConfiguracoes, salvarConfiguracoes } from '@/lib/configuracoes';
import { MENSAGEM_ATRASO, MENSAGEM_CUIDADOS_POS_MONTAGEM } from '@/lib/format';

const PADRAO_ESTOU_INDO = 'Oi! Estou a caminho, {cliente}. Devo chegar em aproximadamente {minutos} minutos!';

export default function AvisosPage() {
  const { profile } = useAuth();
  const ehAdmin = profile?.role === 'admin';

  const [avisoEstouIndo, setAvisoEstouIndo] = useState('');
  const [avisoCuidadosPosMontagem, setAvisoCuidadosPosMontagem] = useState('');
  const [avisoAtraso, setAvisoAtraso] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [config, setConfig] = useState<Configuracoes>({});

  useEffect(() => {
    if (!ehAdmin) return;
    return ouvirConfiguracoes((dados) => {
      setConfig(dados);
      setAvisoEstouIndo(dados.avisoEstouIndo ?? '');
      setAvisoCuidadosPosMontagem(dados.avisoCuidadosPosMontagem ?? '');
      setAvisoAtraso(dados.avisoAtraso ?? '');
    });
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

  async function salvar() {
    setMensagem(null);
    setSalvando(true);
    try {
      await salvarConfiguracoes({ avisoEstouIndo, avisoCuidadosPosMontagem, avisoAtraso });
      setMensagem('Avisos salvos.');
    } catch (e) {
      setMensagem(e instanceof Error ? e.message : 'Erro ao salvar.');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-xl bg-slate-900 pb-24">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-slate-800 bg-slate-900/95 p-4 backdrop-blur">
        <MenuLateral />
        <h1 className="text-base font-bold text-slate-50">Avisos</h1>
      </header>

      <div className="flex flex-col gap-6 p-4">
        <p className="text-sm text-slate-400">
          Personalize as mensagens de WhatsApp que o app manda pro cliente. Deixe em branco pra usar o texto padrão.
          Use <code className="rounded bg-slate-800 px-1">{'{cliente}'}</code> e{' '}
          <code className="rounded bg-slate-800 px-1">{'{minutos}'}</code> onde fizer sentido.
        </p>

        <BlocoAviso
          titulo="Estou a caminho"
          descricao="Enviado quando o operador toca em &quot;Avisar que estou indo&quot;."
          placeholder={config.avisoEstouIndo ? undefined : PADRAO_ESTOU_INDO}
          value={avisoEstouIndo}
          onChange={setAvisoEstouIndo}
        />

        <BlocoAviso
          titulo="Cuidados pós-montagem"
          descricao="Enviado ao terminar uma montagem."
          placeholder={config.avisoCuidadosPosMontagem ? undefined : MENSAGEM_CUIDADOS_POS_MONTAGEM}
          value={avisoCuidadosPosMontagem}
          onChange={setAvisoCuidadosPosMontagem}
        />

        <BlocoAviso
          titulo="Atraso"
          descricao="Enviado pelo botão &quot;Avisar cliente&quot; quando uma tarefa está atrasada."
          placeholder={config.avisoAtraso ? undefined : MENSAGEM_ATRASO}
          value={avisoAtraso}
          onChange={setAvisoAtraso}
        />

        <button
          onClick={salvar}
          disabled={salvando}
          className="rounded-xl bg-brand-500 py-3 text-sm font-bold text-white disabled:opacity-50"
        >
          {salvando ? 'Salvando...' : 'Salvar avisos'}
        </button>
        {mensagem && <p className="text-center text-sm text-emerald-400">{mensagem}</p>}
      </div>
    </main>
  );
}

function BlocoAviso({
  titulo,
  descricao,
  placeholder,
  value,
  onChange,
}: {
  titulo: string;
  descricao: string;
  placeholder?: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <section className="flex flex-col gap-2 rounded-2xl border border-slate-800 bg-slate-800/40 p-4">
      <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400">{titulo}</h2>
      <p className="text-xs text-slate-500">{descricao}</p>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={4}
        className="w-full rounded-lg bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none ring-1 ring-slate-700"
      />
    </section>
  );
}
