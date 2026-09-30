'use client';

import { useEffect, useRef, useState } from 'react';
import ContratoDocumento from '@/components/ContratoDocumento';
import { ContratoPublico, assinarContrato, buscarContratoPublico } from '@/lib/contratoPublico';

/** Página pública: o cliente abre o link do WhatsApp, lê e assina na tela. Sem login. */
export default function AssinarPage() {
  const [token, setToken] = useState<string | null>(null);
  const [contrato, setContrato] = useState<ContratoPublico | null>(null);
  const [estado, setEstado] = useState<'carregando' | 'ok' | 'invalido'>('carregando');
  const [nome, setNome] = useState('');
  const [documento, setDocumento] = useState('');
  const [aceito, setAceito] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [desenhou, setDesenhou] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const desenhando = useRef(false);

  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get('t');
    setToken(t);
    if (!t) {
      setEstado('invalido');
      return;
    }
    buscarContratoPublico(t)
      .then((c) => {
        if (c) {
          setContrato(c);
          setNome(c.cliente);
          setDocumento(c.cpf ?? '');
          setEstado('ok');
        } else setEstado('invalido');
      })
      .catch(() => setEstado('invalido'));
  }, []);

  function ponto(e: React.PointerEvent<HTMLCanvasElement>) {
    const cv = canvasRef.current!;
    const r = cv.getBoundingClientRect();
    return { x: ((e.clientX - r.left) * cv.width) / r.width, y: ((e.clientY - r.top) * cv.height) / r.height };
  }

  function comecar(e: React.PointerEvent<HTMLCanvasElement>) {
    const ctx = canvasRef.current!.getContext('2d')!;
    canvasRef.current!.setPointerCapture(e.pointerId);
    desenhando.current = true;
    const p = ponto(e);
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#0f172a';
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
  }

  function mover(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!desenhando.current) return;
    const ctx = canvasRef.current!.getContext('2d')!;
    const p = ponto(e);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    setDesenhou(true);
  }

  function limpar() {
    const cv = canvasRef.current!;
    cv.getContext('2d')!.clearRect(0, 0, cv.width, cv.height);
    setDesenhou(false);
  }

  async function enviar() {
    if (!token) return;
    setErro(null);
    if (!nome.trim() || !documento.trim()) return setErro('Preencha seu nome e CPF/CNPJ.');
    if (!desenhou) return setErro('Desenhe sua assinatura no quadro.');
    if (!aceito) return setErro('Marque que leu e concorda com o contrato.');
    setEnviando(true);
    try {
      const em = Date.now();
      const imagem = canvasRef.current!.toDataURL('image/png');
      await assinarContrato(token, { nome: nome.trim(), documento: documento.trim(), imagem, em });
      setContrato((c) => (c ? { ...c, assinatura: { nome, documento, imagem, em }, assinadoEm: em } : c));
    } catch {
      setErro('Não foi possível enviar a assinatura. Confira a internet e tente de novo.');
    } finally {
      setEnviando(false);
    }
  }

  if (estado === 'carregando')
    return <main className="p-6 text-center text-slate-500">Carregando contrato...</main>;
  if (estado === 'invalido' || !contrato)
    return (
      <main className="p-6 text-center text-slate-600">
        Link inválido ou expirado. Peça um novo link para a Zimba Festas.
      </main>
    );

  const assinado = contrato.assinatura;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-xl flex-col gap-4 bg-slate-100 p-3 pb-16">
      <ContratoDocumento c={contrato} />

      {assinado ? (
        <section className="rounded-2xl bg-white p-5 text-center shadow">
          <p className="text-base font-bold text-emerald-600">✅ Contrato assinado</p>
          <p className="mt-1 text-sm text-slate-600">
            {assinado.nome} · {assinado.documento}
            <br />
            {new Date(assinado.em).toLocaleString('pt-BR')}
          </p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={assinado.imagem} alt="Assinatura" className="mx-auto mt-3 h-24 rounded border" />
          <button
            onClick={() => window.print()}
            className="mt-4 rounded-xl bg-slate-800 px-5 py-2 text-sm font-bold text-white"
          >
            Salvar / imprimir cópia
          </button>
        </section>
      ) : (
        <section className="rounded-2xl bg-white p-5 shadow">
          <h2 className="mb-3 text-sm font-extrabold uppercase text-slate-800">Assinar contrato</h2>
          <label className="mb-2 block text-xs font-bold text-slate-500">
            Nome completo
            <input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
            />
          </label>
          <label className="mb-3 block text-xs font-bold text-slate-500">
            CPF ou CNPJ
            <input
              value={documento}
              onChange={(e) => setDocumento(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
            />
          </label>
          <p className="mb-1 text-xs font-bold text-slate-500">Assinatura (desenhe com o dedo)</p>
          <canvas
            ref={canvasRef}
            width={600}
            height={220}
            onPointerDown={comecar}
            onPointerMove={mover}
            onPointerUp={() => (desenhando.current = false)}
            onPointerCancel={() => (desenhando.current = false)}
            style={{ touchAction: 'none' }}
            className="w-full rounded-lg border-2 border-dashed border-slate-300 bg-white"
          />
          <button onClick={limpar} className="mt-1 text-xs font-bold text-slate-500 underline">
            Limpar
          </button>
          <label className="mt-3 flex items-start gap-2 text-xs text-slate-600">
            <input type="checkbox" checked={aceito} onChange={(e) => setAceito(e.target.checked)} className="mt-0.5" />
            Li o contrato acima e concordo com todas as cláusulas.
          </label>
          {erro && <p className="mt-2 text-xs font-semibold text-red-600">{erro}</p>}
          <button
            onClick={enviar}
            disabled={enviando}
            className="mt-4 w-full rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white disabled:opacity-50"
          >
            {enviando ? 'Enviando...' : 'Assinar contrato'}
          </button>
        </section>
      )}
    </main>
  );
}
