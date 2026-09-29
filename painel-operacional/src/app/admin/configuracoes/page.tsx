'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/useAuth';
import MenuLateral from '@/components/MenuLateral';
import { Configuracoes, ouvirConfiguracoes, salvarConfiguracoes } from '@/lib/configuracoes';
import { lerArquivoComoDataUrl } from '@/lib/arquivo';
import { UserRole, UserProfile } from '@/lib/authTypes';
import { listarUsuarios } from '@/lib/usuarios';

const TAMANHO_MAXIMO_BYTES = 700 * 1024;

function tamanhoLegivel(bytes: number): string {
  return `${(bytes / 1024).toFixed(0)} KB`;
}

const VAZIO_EQUIPE = { nome: '', email: '', senha: '', cpf: '', telefone: '', endereco: '', role: 'operador' as UserRole };

export default function ConfiguracoesPage() {
  const { profile, criarUsuario } = useAuth();
  const ehAdmin = profile?.role === 'admin';

  const [equipe, setEquipe] = useState<UserProfile[]>([]);
  const [formEquipe, setFormEquipe] = useState(VAZIO_EQUIPE);
  const [mostrarFormEquipe, setMostrarFormEquipe] = useState(false);
  const [salvandoEquipe, setSalvandoEquipe] = useState(false);
  const [mensagemEquipe, setMensagemEquipe] = useState<string | null>(null);

  const [config, setConfig] = useState<Configuracoes>({});
  const [chavePix, setChavePix] = useState('');
  const [nomeRecebedor, setNomeRecebedor] = useState('');
  const [cidadeRecebedor, setCidadeRecebedor] = useState('');
  const [modeloBase64, setModeloBase64] = useState<string | undefined>(undefined);
  const [modeloNome, setModeloNome] = useState<string | undefined>(undefined);
  const [processandoArquivo, setProcessandoArquivo] = useState(false);
  const [erroArquivo, setErroArquivo] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState<string | null>(null);
  const inputArquivoRef = useRef<HTMLInputElement>(null);

  function recarregarEquipe() {
    listarUsuarios().then(setEquipe);
  }

  useEffect(() => {
    if (!ehAdmin) return;
    recarregarEquipe();
  }, [ehAdmin]);

  useEffect(() => {
    if (!ehAdmin) return;
    return ouvirConfiguracoes((dados) => {
      setConfig(dados);
      setChavePix(dados.chavePix ?? '');
      setNomeRecebedor(dados.nomeRecebedorPix ?? '');
      setCidadeRecebedor(dados.cidadeRecebedorPix ?? '');
      setModeloBase64(dados.modeloContratoBase64);
      setModeloNome(dados.modeloContratoNome);
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

  async function selecionarModelo(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0];
    e.target.value = '';
    if (!arquivo) return;
    setErroArquivo(null);

    if (arquivo.size > TAMANHO_MAXIMO_BYTES) {
      setErroArquivo(
        `Esse arquivo tem ${tamanhoLegivel(arquivo.size)} — o limite é ${tamanhoLegivel(TAMANHO_MAXIMO_BYTES)}. Tente um PDF menor ou comprimido.`
      );
      return;
    }

    setProcessandoArquivo(true);
    try {
      const dataUrl = await lerArquivoComoDataUrl(arquivo);
      setModeloBase64(dataUrl);
      setModeloNome(arquivo.name);
    } catch {
      setErroArquivo('Não foi possível ler esse arquivo. Tente outro.');
    } finally {
      setProcessandoArquivo(false);
    }
  }

  function removerModelo() {
    setModeloBase64(undefined);
    setModeloNome(undefined);
  }

  async function criarLoginEquipe() {
    setMensagemEquipe(null);
    setSalvandoEquipe(true);
    try {
      await criarUsuario({
        email: formEquipe.email,
        senha: formEquipe.senha,
        nome: formEquipe.nome,
        role: formEquipe.role,
        cpf: formEquipe.cpf,
        telefone: formEquipe.telefone,
        endereco: formEquipe.endereco,
      });
      setMensagemEquipe(`Login criado para ${formEquipe.nome}. Repasse e-mail e senha para ele instalar o app.`);
      setFormEquipe(VAZIO_EQUIPE);
      setMostrarFormEquipe(false);
      recarregarEquipe();
    } catch (e) {
      setMensagemEquipe(e instanceof Error ? e.message : 'Erro ao criar login.');
    } finally {
      setSalvandoEquipe(false);
    }
  }

  async function salvar() {
    setMensagem(null);
    setSalvando(true);
    try {
      await salvarConfiguracoes({
        chavePix: chavePix.trim(),
        nomeRecebedorPix: nomeRecebedor.trim(),
        cidadeRecebedorPix: cidadeRecebedor.trim(),
        modeloContratoBase64: modeloBase64 ?? '',
        modeloContratoNome: modeloNome ?? '',
      });
      setMensagem('Configurações salvas.');
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
        <h1 className="text-base font-bold text-slate-50">Configurações</h1>
      </header>

      <div className="flex flex-col gap-6 p-4">
        <section className="flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-800/40 p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400">Equipe</h2>
            <button
              onClick={() => setMostrarFormEquipe((v) => !v)}
              className="rounded-lg bg-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-100"
            >
              + Adicionar pessoa
            </button>
          </div>

          {equipe.length === 0 && <p className="text-xs text-slate-500">Ninguém cadastrado ainda.</p>}
          {equipe.map((u) => (
            <div key={u.uid} className="rounded-xl bg-slate-900 px-4 py-3 ring-1 ring-slate-700">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-100">{u.nome}</span>
                <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-400">
                  {u.role === 'admin' ? 'Admin' : 'Operador'}
                </span>
              </div>
              <p className="text-xs text-slate-500">{u.email}</p>
              {(u.cpf || u.telefone || u.endereco) && (
                <p className="mt-1 text-xs text-slate-500">
                  {[u.cpf, u.telefone, u.endereco].filter(Boolean).join(' · ')}
                </p>
              )}
            </div>
          ))}

          {mostrarFormEquipe && (
            <div className="flex flex-col gap-2 rounded-xl bg-slate-900 p-3 ring-1 ring-slate-700">
              <input
                value={formEquipe.nome}
                onChange={(e) => setFormEquipe({ ...formEquipe, nome: e.target.value })}
                placeholder="Nome completo"
                className="rounded-lg bg-slate-800 px-3 py-2 text-sm text-slate-100 outline-none ring-1 ring-slate-700"
              />
              <input
                value={formEquipe.email}
                onChange={(e) => setFormEquipe({ ...formEquipe, email: e.target.value })}
                placeholder="E-mail para login"
                type="email"
                className="rounded-lg bg-slate-800 px-3 py-2 text-sm text-slate-100 outline-none ring-1 ring-slate-700"
              />
              <input
                value={formEquipe.senha}
                onChange={(e) => setFormEquipe({ ...formEquipe, senha: e.target.value })}
                placeholder="Senha (mín. 6 caracteres)"
                className="rounded-lg bg-slate-800 px-3 py-2 text-sm text-slate-100 outline-none ring-1 ring-slate-700"
              />
              <input
                value={formEquipe.cpf}
                onChange={(e) => setFormEquipe({ ...formEquipe, cpf: e.target.value })}
                placeholder="CPF"
                className="rounded-lg bg-slate-800 px-3 py-2 text-sm text-slate-100 outline-none ring-1 ring-slate-700"
              />
              <input
                value={formEquipe.telefone}
                onChange={(e) => setFormEquipe({ ...formEquipe, telefone: e.target.value })}
                placeholder="Telefone"
                className="rounded-lg bg-slate-800 px-3 py-2 text-sm text-slate-100 outline-none ring-1 ring-slate-700"
              />
              <input
                value={formEquipe.endereco}
                onChange={(e) => setFormEquipe({ ...formEquipe, endereco: e.target.value })}
                placeholder="Endereço"
                className="rounded-lg bg-slate-800 px-3 py-2 text-sm text-slate-100 outline-none ring-1 ring-slate-700"
              />
              <div className="flex gap-1">
                <button
                  onClick={() => setFormEquipe({ ...formEquipe, role: 'operador' })}
                  className={`flex-1 rounded-lg py-2 text-xs font-semibold ${
                    formEquipe.role === 'operador' ? 'bg-brand-500 text-white' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  Operador
                </button>
                <button
                  onClick={() => setFormEquipe({ ...formEquipe, role: 'admin' })}
                  className={`flex-1 rounded-lg py-2 text-xs font-semibold ${
                    formEquipe.role === 'admin' ? 'bg-brand-500 text-white' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  Admin
                </button>
              </div>
              <button
                onClick={criarLoginEquipe}
                disabled={salvandoEquipe || !formEquipe.nome || !formEquipe.email || formEquipe.senha.length < 6}
                className="rounded-lg bg-brand-500 py-2 text-sm font-bold text-white disabled:opacity-50"
              >
                {salvandoEquipe ? 'Criando...' : 'Criar login'}
              </button>
            </div>
          )}
          {mensagemEquipe && <p className="text-sm text-emerald-400">{mensagemEquipe}</p>}
        </section>

        <section className="flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-800/40 p-4">
          <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400">Modelo de contrato</h2>
          <p className="text-sm text-slate-400">
            Anexe aqui o modelo de contrato (PDF, Word ou imagem) que fica salvo pra qualquer pessoa com acesso
            ao painel abrir quando precisar.
          </p>

          {modeloNome ? (
            <div className="flex items-center justify-between gap-2 rounded-xl bg-slate-900 px-4 py-3 ring-1 ring-slate-700">
              <a
                href={modeloBase64}
                download={modeloNome}
                className="min-w-0 flex-1 truncate text-sm font-semibold text-brand-500"
              >
                {modeloNome}
              </a>
              <button onClick={removerModelo} className="shrink-0 text-xs font-bold text-red-400">
                Remover
              </button>
            </div>
          ) : (
            <p className="text-xs text-slate-500">Nenhum modelo anexado ainda.</p>
          )}

          <button
            onClick={() => inputArquivoRef.current?.click()}
            disabled={processandoArquivo}
            className="rounded-xl bg-slate-700 py-2.5 text-sm font-semibold text-slate-100 disabled:opacity-50"
          >
            {processandoArquivo ? 'Processando...' : modeloNome ? 'Trocar arquivo' : 'Anexar modelo'}
          </button>
          <input
            ref={inputArquivoRef}
            type="file"
            accept=".pdf,.doc,.docx,image/*"
            onChange={selecionarModelo}
            className="hidden"
          />
          {erroArquivo && <p className="text-xs text-red-400">{erroArquivo}</p>}
        </section>

        <section className="flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-800/40 p-4">
          <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400">Chave Pix para cobrança</h2>
          <p className="text-sm text-slate-400">
            Usada pra gerar o QR Code de cobrança na tela de Contratos, com o valor certo pra cada cliente.
          </p>

          <Campo label="Chave Pix (CPF, CNPJ, e-mail, telefone ou aleatória)">
            <input
              value={chavePix}
              onChange={(e) => setChavePix(e.target.value)}
              placeholder="Ex: 11999998888"
              className="w-full rounded-lg bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none ring-1 ring-slate-700"
            />
          </Campo>
          <Campo label="Nome do recebedor (como aparece no Pix)">
            <input
              value={nomeRecebedor}
              onChange={(e) => setNomeRecebedor(e.target.value)}
              placeholder="Ex: Zimba Festa"
              maxLength={25}
              className="w-full rounded-lg bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none ring-1 ring-slate-700"
            />
          </Campo>
          <Campo label="Cidade do recebedor">
            <input
              value={cidadeRecebedor}
              onChange={(e) => setCidadeRecebedor(e.target.value)}
              placeholder="Ex: Valinhos"
              maxLength={15}
              className="w-full rounded-lg bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none ring-1 ring-slate-700"
            />
          </Campo>
        </section>

        <button
          onClick={salvar}
          disabled={salvando}
          className="rounded-xl bg-brand-500 py-3 text-sm font-bold text-white disabled:opacity-50"
        >
          {salvando ? 'Salvando...' : 'Salvar configurações'}
        </button>
        {mensagem && <p className="text-center text-sm text-emerald-400">{mensagem}</p>}
        {config.atualizadoEm && (
          <p className="text-center text-xs text-slate-600">
            Última atualização: {new Date(config.atualizadoEm).toLocaleString('pt-BR')}
          </p>
        )}
      </div>
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
