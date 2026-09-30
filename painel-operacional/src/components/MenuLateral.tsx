'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/useAuth';
import TrocarSenhaModal from './TrocarSenhaModal';
import { LOGO_UI } from '@/lib/contratoImagens';

interface ItemMenu {
  href: string;
  label: string;
}

const ITENS_ADMIN: ItemMenu[] = [
  { href: '/admin', label: 'Monitoramento de equipe' },
  { href: '/admin/agenda', label: 'Agenda de eventos' },
  { href: '/admin/atribuir', label: 'Planejamento de logística' },
  { href: '/admin/contratos', label: 'Contratos' },
  { href: '/admin/brinquedos', label: 'Brinquedos' },
  { href: '/admin/avisos', label: 'Avisos' },
  { href: '/admin/configuracoes', label: 'Configurações' },
  { href: '/', label: 'Minha agenda' },
];

const ITENS_OPERADOR: ItemMenu[] = [{ href: '/admin/brinquedos', label: 'Brinquedos' }];

export default function MenuLateral() {
  const [aberto, setAberto] = useState(false);
  const [trocandoSenha, setTrocandoSenha] = useState(false);
  const pathname = usePathname();
  const { profile, configured, logout } = useAuth();

  const itens = profile?.role === 'admin' ? ITENS_ADMIN : ITENS_OPERADOR;

  return (
    <>
      <button
        onClick={() => setAberto(true)}
        aria-label="Abrir menu"
        className="flex h-10 w-10 shrink-0 flex-col items-center justify-center gap-1 rounded-xl bg-slate-800"
      >
        <span className="h-0.5 w-5 rounded bg-slate-200" />
        <span className="h-0.5 w-5 rounded bg-slate-200" />
        <span className="h-0.5 w-5 rounded bg-slate-200" />
      </button>

      {aberto &&
        createPortal(
          <div className="fixed inset-0 z-[10000] flex bg-black/60" onClick={() => setAberto(false)}>
            <div
              className="flex h-full w-72 max-w-[85vw] flex-col overflow-y-auto bg-slate-900 p-4 shadow-2xl ring-1 ring-slate-800"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-4 flex items-center justify-between">
                <span className="flex items-center gap-2 text-base font-bold text-slate-50">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={LOGO_UI} alt="" className="h-9 w-auto rounded-lg bg-white p-1" />
                  Zimba Festas App
                </span>
                <button onClick={() => setAberto(false)} aria-label="Fechar menu" className="p-1 text-xl text-slate-400">
                  ×
                </button>
              </div>

              <nav className="flex flex-col gap-1">
                {itens.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setAberto(false)}
                    className={`rounded-xl px-4 py-3 text-sm font-semibold ${
                      pathname === item.href ? 'bg-brand-500 text-white' : 'text-slate-200 active:bg-slate-800'
                    }`}
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>

              {configured && (
                <div className="mt-auto border-t border-slate-800 pt-3">
                  <button
                    onClick={() => {
                      setAberto(false);
                      setTrocandoSenha(true);
                    }}
                    className="w-full rounded-xl px-4 py-3 text-left text-sm font-semibold text-slate-200 active:bg-slate-800"
                  >
                    Trocar minha senha
                  </button>
                  <button
                    onClick={() => {
                      setAberto(false);
                      logout();
                    }}
                    className="w-full rounded-xl px-4 py-3 text-left text-sm font-semibold text-red-400"
                  >
                    Sair
                  </button>
                </div>
              )}
            </div>
            <div className="flex-1" />
          </div>,
          document.body
        )}

      {trocandoSenha && createPortal(<TrocarSenhaModal onFechar={() => setTrocandoSenha(false)} />, document.body)}
    </>
  );
}
