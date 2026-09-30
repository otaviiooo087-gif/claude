'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import ContratoDocumento from './ContratoDocumento';
import { ContratoPublico } from '@/lib/contratoPublico';

/** Botões da 2ª via do contrato: imprimir / salvar em PDF e baixar como imagem. */
export default function SegundaViaBotoes({ c }: { c: ContratoPublico }) {
  const [imprimindo, setImprimindo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!imprimindo) return;
    const fim = () => setImprimindo(false);
    window.addEventListener('afterprint', fim);
    const t = setTimeout(() => window.print(), 150);
    return () => {
      clearTimeout(t);
      window.removeEventListener('afterprint', fim);
    };
  }, [imprimindo]);

  async function baixarImagem() {
    setErro(null);
    try {
      const svg = ref.current?.querySelector('svg');
      if (!svg) throw new Error('sem svg');
      const clone = svg.cloneNode(true) as SVGSVGElement;
      clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
      clone.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
      clone.setAttribute('width', '1786');
      clone.setAttribute('height', '2526');
      const xml = new XMLSerializer().serializeToString(clone);
      const img = new Image();
      img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(xml)}`;
      await img.decode();
      const canvas = document.createElement('canvas');
      canvas.width = 1786;
      canvas.height = 2526;
      const g = canvas.getContext('2d')!;
      g.fillStyle = '#fff';
      g.fillRect(0, 0, canvas.width, canvas.height);
      g.drawImage(img, 0, 0, canvas.width, canvas.height);
      const blob: Blob = await new Promise((ok, no) => canvas.toBlob((b) => (b ? ok(b) : no(new Error('blob'))), 'image/png'));
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `contrato-zimba-festas-${c.cliente.trim().split(/\s+/)[0].toLowerCase()}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    } catch {
      setErro('Não consegui gerar a imagem neste aparelho. Use "Imprimir / salvar PDF".');
    }
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setImprimindo(true)}
          className="flex-1 rounded-xl bg-slate-800 px-4 py-2.5 text-sm font-bold text-white"
        >
          🖨️ Imprimir / salvar PDF
        </button>
        <button onClick={baixarImagem} className="flex-1 rounded-xl bg-slate-600 px-4 py-2.5 text-sm font-bold text-white">
          🖼️ Baixar imagem
        </button>
      </div>
      {erro && <p className="mt-2 text-xs font-semibold text-red-500">{erro}</p>}

      {/* cópia fora da tela, usada para gerar a imagem */}
      <div ref={ref} aria-hidden style={{ position: 'fixed', left: -99999, top: 0, width: 800 }}>
        <ContratoDocumento c={c} />
      </div>
      {imprimindo &&
        createPortal(
          <div id="via-impressao">
            <ContratoDocumento c={c} />
          </div>,
          document.body
        )}
    </div>
  );
}
