# Gerador de Artes IA

Sistema web simples para gerar imagens a partir de descrições em texto, usando a API de geração de imagens da OpenAI (modelo `gpt-image-1`), com um chat estilo ChatGPT integrado.

Existem **duas formas de usar**, escolha a que preferir:

## Opção 1 — Página única, sem servidor (`standalone.html`)

A forma mais simples: um único arquivo HTML, sem instalar nada.

1. Abra `public/standalone.html` direto no navegador (duplo clique no arquivo).
2. Cole sua chave da OpenAI (https://platform.openai.com/api-keys) no campo do topo e clique em **Salvar** — ela fica guardada só no `localStorage` do seu navegador, nunca é enviada a nenhum outro lugar.
3. Descreva a arte, escolha tamanho/qualidade/quantidade e clique em **Gerar arte**.

⚠️ Como a chamada à API sai direto do navegador, alguns navegadores/redes podem bloquear por CORS. Se aparecer esse erro, use a Opção 2.

## Opção 2 — App com servidor (mais seguro, tem chat)

A chave fica só no backend, nunca é exposta ao navegador, e inclui a página de chat estilo ChatGPT.

1. Instale as dependências:

   ```bash
   cd art-generator
   npm install
   ```

2. Copie o arquivo de exemplo de variáveis de ambiente e adicione sua chave da OpenAI:

   ```bash
   cp .env.example .env
   ```

   Edite `.env` e defina `OPENAI_API_KEY` com uma chave válida.

3. Inicie o servidor:

   ```bash
   npm start
   ```

4. Abra `http://localhost:3000` no navegador (gerador de artes) ou `http://localhost:3000/chat.html` (chat).

## Funcionalidades

- Formulário para descrever a arte desejada (prompt)
- Opções de tamanho, qualidade e quantidade de imagens
- Galeria com as imagens geradas e botão de download
- Histórico local das últimas gerações (salvo no navegador)
- Chat estilo ChatGPT com respostas em streaming (só na versão com servidor)

## Estrutura

```
art-generator/
├── server.js              # Backend Express: /api/generate (imagens) e /api/chat (chat)
├── public/
│   ├── index.html          # Gerador de artes (usa o servidor)
│   ├── standalone.html      # Gerador de artes sem servidor (chave fica no navegador)
│   ├── chat.html             # Chat estilo ChatGPT (usa o servidor)
│   ├── style.css, chat.css    # Estilos
│   └── app.js, chat.js         # Lógica do frontend
├── package.json
└── .env.example
```

## Requisitos

- Node.js 18 ou superior (usa `fetch` nativo)
- Uma chave de API válida da OpenAI com acesso ao modelo `gpt-image-1`
