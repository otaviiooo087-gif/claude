# Painel Operacional

🔗 **App publicado:** https://otaviiooo087-gif.github.io/claude/

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

1. Abra https://otaviiooo087-gif.github.io/claude/ no navegador do celular (com internet, pelo menos uma vez).
2. Use "Adicionar à tela de início" (Android/Chrome) ou "Adicionar à Tela de Início" (iOS/Safari).
3. A partir daí, o app abre em tela cheia e funciona sem internet.

## Funcionalidades do MVP

- **Dashboard "HOJE"**: data do dia, contadores (total/concluídas/em andamento/pendentes) e
  seletor rápido entre as datas com tarefas cadastradas.
- **Bloco AGORA**: destaque grande para a tarefa prioritária do dia, com botão
  **NAVEGAR COM WAZE** em primeiro lugar, LIGAR e INICIAR.
- **Bloco PRÓXIMA TAREFA**: prévia da tarefa seguinte.
- **Linha do tempo**: todas as tarefas do dia em ordem, com ícone de status
  (✓ concluída, ● em andamento, ○ pendente) e aviso **ATRASADA** quando o horário já passou.
- **Tela de serviço**: cliente, brinquedo, endereço completo (sempre visível, nunca só atrás
  do botão), telefone clicável (`tel:`), valor, observações completas e checklist próprio de
  cada tarefa — cada item marcado é salvo na hora no IndexedDB.
- **Navegação**: Waze é sempre a opção principal
  (`https://waze.com/ul?q=ENDEREÇO&navigate=yes`), com Google Maps como alternativa.
  Só a abertura do app de mapas depende de internet — o resto do painel continua 100% offline.
- **Observação adicional editável** por tarefa, e **status** (Pendente → Em deslocamento →
  Cheguei → Em execução → Concluída) com confirmação antes de concluir.
- **BASE / EMPRESA**: ponto de partida da operação cadastrado como referência (não é uma tarefa).
- Tudo funciona 100% offline após o primeiro carregamento: os dados ficam no IndexedDB
  do navegador e o app (HTML/CSS/JS) fica em cache via Service Worker. Nada é apagado
  automaticamente — fechar e reabrir o app recupera checklist, status e observações.

## Fora de escopo (de propósito)

Login, cadastro de usuários, múltiplos perfis, backend/banco remoto, pagamentos,
CRM, chat, GPS/rastreamento próprio, otimização automática de rota, IA, notificações push,
painel administrativo, sistema financeiro e apps nativos Android/iOS.
