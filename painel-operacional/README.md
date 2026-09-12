# Painel Operacional

Ferramenta pessoal, offline-first, para quem monta e retira brinquedos infláveis.
Abrir o app → ver a próxima tarefa → navegar até o endereço → concluir → ver a próxima.

Não é SaaS, CRM ou sistema multiusuário: é um PWA de uso individual, sem login e sem backend.
Todos os dados ficam no IndexedDB do próprio celular.

## Rodando localmente

```bash
npm install
npm run dev       # http://localhost:3000
```

## Build de produção (site estático)

```bash
npm run build      # gera a pasta out/ com HTML/CSS/JS estáticos
npx serve out       # ou qualquer servidor estático / hospedagem (Vercel, Netlify, GitHub Pages...)
```

## Instalar como app no celular

1. Abra o site publicado no navegador do celular (com internet, pelo menos uma vez).
2. Use "Adicionar à tela de início" (Android/Chrome) ou "Adicionar à Tela de Início" (iOS/Safari).
3. A partir daí, o app abre em tela cheia e funciona sem internet.

## Funcionalidades do MVP

- Tela **Agora**: mostra a próxima tarefa pendente (cliente, endereço, horário), com botão
  para abrir a navegação no Google Maps, ligar/WhatsApp e marcar como concluída.
- Tela **Agenda**: todas as tarefas agrupadas por data.
- Cadastro/edição de tarefa: cliente, endereço, telefone, tipo (montagem/retirada), data, hora e observações.
- Tudo funciona 100% offline após o primeiro carregamento: os dados ficam no IndexedDB
  do navegador e o app (HTML/CSS/JS) fica em cache via Service Worker.

## Fora de escopo (de propósito)

Login, cadastro de usuários, múltiplos perfis, backend/banco remoto, pagamentos,
CRM, chat, GPS/rastreamento próprio, otimização automática de rota, IA, notificações push,
painel administrativo, sistema financeiro e apps nativos Android/iOS.
