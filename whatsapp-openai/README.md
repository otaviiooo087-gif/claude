# 💬 WhatsApp AI Dashboard

Assistente de WhatsApp com **IA (OpenAI)** e um **dashboard web em tempo real** que mostra as
conversas chegando ao vivo — feito para ficar bonito na tela e fácil de demonstrar.

> ⚠️ Usa a biblioteca **não-oficial** [`@whiskeysockets/baileys`](https://github.com/WhiskeySockets/Baileys)
> para conectar ao WhatsApp. Use por sua conta e risco, de preferência com um número de teste.

## ✨ Recursos

- 🤖 **Respostas com IA** via Claude (API da Anthropic), com **memória de contexto por conversa**
- 📱 **QR Code** na tela para conectar o WhatsApp
- 💬 **Lista de conversas ao vivo** — mensagens aparecem em tempo real (Socket.io)
- 🔢 **Contador de mensagens** (total, recebidas, enviadas, contatos)
- ⌨️ **Indicador "digitando…"** enquanto o bot formula a resposta
- 📊 **Gráficos** — mensagens por hora e contatos mais ativos
- 🟢 **Status da conexão** (online / conectando / QR / offline)
- 🌙 **Dark mode** estilo WhatsApp, com cards e animações (framer-motion)
- 💾 **Persistência em arquivo JSON** (sem banco de dados)
- 🎬 **Modo demo** — gera conversas falsas para gravar o vídeo **sem precisar de um WhatsApp real**

## 🧱 Stack

| Camada     | Tecnologia |
|------------|------------|
| WhatsApp   | `@whiskeysockets/baileys` |
| IA         | `@anthropic-ai/sdk` (Claude Sonnet 4.6 por padrão) |
| Backend    | Node.js + Express 5 + Socket.io |
| Frontend   | React 19 + Vite + framer-motion + Recharts |
| Persistência | Arquivo JSON (`server/data/store.json`) |

## 🚀 Começando

**Requisitos:** Node.js **20+** (necessário para o Vite 8).

```powershell
# 1. Instalar tudo (raiz, server e client)
npm run install:all

# 2. Configurar variáveis de ambiente
Copy-Item .env.example .env
#    Edite o .env e coloque sua OPENAI_API_KEY (opcional — sem ela, usa respostas de fallback)

# 3. Rodar em modo desenvolvimento (backend + dashboard juntos)
npm run dev
```

- 🖥️ **Dashboard:** http://localhost:5173
- 🔌 **Backend/API:** http://localhost:3001

No dashboard, **escaneie o QR Code** (WhatsApp → Aparelhos conectados → Conectar aparelho)
**ou** clique em **▶ Modo demo** para ver tudo funcionando na hora.

## 📦 Produção

```powershell
npm run build   # gera o client em client/dist
npm start       # o backend passa a servir o dashboard + API em http://localhost:3001
```

## ⚙️ Configuração (`.env`)

| Variável | Padrão | Descrição |
|----------|--------|-----------|
| `OPENAI_API_KEY` | — | Chave da Anthropic. Sem ela → respostas de fallback. |
| `OPENAI_MODEL` | `gpt-4o-mini` | Modelo do Claude (`gpt-4o` é mais rápido/barato). |
| `BOT_NAME` | `Bot` | Nome do assistente. |
| `BOT_SYSTEM_PROMPT` | _(persona padrão)_ | Sobrescreve o prompt de sistema. |
| `PORT` | `3001` | Porta do backend. |
| `WHATSAPP_ENABLED` | `true` | Em `false`, sobe só com o modo demo (sem QR). |

## 📁 Estrutura

```
server/            Backend (ESM)
  src/
    index.js       Express + Socket.io + orquestração
    engine.js      Pipeline: recebe → persiste → emite → IA → responde
    whatsapp.js    Conexão Baileys (QR, mensagens, envio)
    ai.js          Integração com Claude (memória de contexto)
    demo.js        Simulador do modo demo
    store.js       Persistência em JSON
    stats.js       Cálculo das estatísticas
client/            Dashboard (React + Vite)
  src/
    hooks/useDashboard.js   Estado + listeners do Socket.io
    components/             TopBar, ConversationList, ChatPanel, SidePanel, Charts…
```

## 🔒 Notas

- `server/auth_info/` guarda a sessão do WhatsApp — **não está versionado** (veja `.gitignore`).
  Para reconectar com outro número, apague essa pasta.
- `server/data/store.json` guarda conversas e mensagens — também ignorado pelo git.
