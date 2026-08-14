# Gerador de Artes IA

Sistema web simples para gerar imagens a partir de descrições em texto, usando a API de geração de imagens da OpenAI (modelo `gpt-image-1`).

## Funcionalidades

- Formulário para descrever a arte desejada (prompt)
- Opções de tamanho, qualidade e quantidade de imagens
- Galeria com as imagens geradas e botão de download
- Histórico local das últimas gerações (salvo no navegador)
- Chave de API mantida apenas no servidor (nunca exposta ao navegador)

## Como rodar

1. Instale as dependências:

   ```bash
   cd art-generator
   npm install
   ```

2. Copie o arquivo de exemplo de variáveis de ambiente e adicione sua chave da OpenAI:

   ```bash
   cp .env.example .env
   ```

   Edite `.env` e defina `OPENAI_API_KEY` com uma chave válida (https://platform.openai.com/api-keys).

3. Inicie o servidor:

   ```bash
   npm start
   ```

4. Abra `http://localhost:3000` no navegador.

## Estrutura

```
art-generator/
├── server.js          # Backend Express: recebe o prompt e chama a API da OpenAI
├── public/
│   ├── index.html      # Interface
│   ├── style.css        # Estilos
│   └── app.js            # Lógica do frontend (fetch, galeria, histórico)
├── package.json
└── .env.example
```

## Requisitos

- Node.js 18 ou superior (usa `fetch` nativo)
- Uma chave de API válida da OpenAI com acesso ao modelo `gpt-image-1`
