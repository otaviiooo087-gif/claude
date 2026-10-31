'use client';

import { Task } from '@/lib/types';
import { whatsappUrl } from '@/lib/format';
import { useConfiguracoes } from '@/lib/useConfiguracoes';

/** Depois de concluir: montagem pede um story; retirada pede a avaliação no Google (por WhatsApp ao cliente). */
export default function PosServicoModal({ task, onFechar }: { task: Task; onFechar: () => void }) {
  const config = useConfiguracoes();
  if (task.tipo !== 'MONTAGEM' && task.tipo !== 'RETIRADA') return null;

  const primeiroNome = task.cliente.trim().split(/\s+/)[0] || '';
  const link = config?.linkAvaliacaoGoogle?.trim();

  function abrirStory() {
    // No celular abre direto a câmera de story do Instagram; sem o app, cai no site.
    const inicio = Date.now();
    window.location.href = 'instagram://story-camera';
    setTimeout(() => {
      if (document.visibilityState === 'visible' && Date.now() - inicio < 2500) {
        window.open('https://www.instagram.com/', '_blank', 'noreferrer');
      }
    }, 1200);
  }

  function pedirAvaliacao() {
    if (!task.telefone || !link) return;
    const msg = `Olá, ${primeiroNome}! Muito obrigado por escolher a Zimba Festas 🎈 Se gostou do nosso serviço, nos ajuda com uma avaliação rapidinha no Google? Leva 1 minuto e faz muita diferença pra gente: ${link} 🙏⭐`;
    window.open(whatsappUrl(task.telefone, msg), '_blank', 'noreferrer');
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-end bg-black/70 sm:items-center sm:justify-center" onClick={onFechar}>
      <div className="w-full max-w-sm rounded-t-3xl bg-slate-900 p-5 sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
        {task.tipo === 'MONTAGEM' ? (
          <>
            <p className="text-3xl">📸</p>
            <h3 className="mt-1 text-lg font-bold text-slate-50">Montagem concluída!</h3>
            <p className="mt-1 text-sm text-slate-400">
              Tire uma foto ou vídeo do brinquedo montado e poste um <strong>story</strong> marcando a Zimba Festas.
            </p>
            <button onClick={abrirStory} className="mt-4 w-full rounded-xl bg-pink-600 py-3 text-sm font-bold text-white">
              Abrir Instagram (story)
            </button>
          </>
        ) : (
          <>
            <p className="text-3xl">⭐</p>
            <h3 className="mt-1 text-lg font-bold text-slate-50">Retirada concluída!</h3>
            <p className="mt-1 text-sm text-slate-400">
              Peça para {primeiroNome || 'o cliente'} avaliar a Zimba Festas no Google. O WhatsApp abre com a mensagem e o
              link prontos.
            </p>
            {!link ? (
              <p className="mt-3 rounded-lg bg-amber-500/10 p-3 text-xs text-amber-400">
                O link de avaliação do Google ainda não foi cadastrado. O admin coloca em Configurações → Pós-serviço.
              </p>
            ) : !task.telefone ? (
              <p className="mt-3 rounded-lg bg-amber-500/10 p-3 text-xs text-amber-400">Essa tarefa não tem telefone do cliente.</p>
            ) : (
              <button onClick={pedirAvaliacao} className="mt-4 w-full rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white">
                Pedir avaliação no WhatsApp
              </button>
            )}
          </>
        )}
        <button onClick={onFechar} className="mt-2 w-full rounded-xl bg-slate-800 py-3 text-sm font-semibold text-slate-300">
          {task.tipo === 'MONTAGEM' ? 'Já postei / pular' : 'Já pedi / pular'}
        </button>
      </div>
    </div>
  );
}
