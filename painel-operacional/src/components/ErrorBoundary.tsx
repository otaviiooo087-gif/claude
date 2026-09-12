'use client';

import { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.error('Erro não tratado no Painel Operacional:', error);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-900 p-6 text-center">
        <p className="text-lg font-bold text-slate-100">Algo deu errado ao abrir o painel.</p>
        <p className="text-sm text-slate-400">Seus dados continuam salvos no aparelho. Toque para recarregar.</p>
        <button
          onClick={this.handleReload}
          className="w-full max-w-xs rounded-xl bg-brand-500 py-3 text-sm font-bold text-white"
        >
          RECARREGAR
        </button>
      </div>
    );
  }
}
