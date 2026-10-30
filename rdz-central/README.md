# RDZ Central de Marketing e Orquestrador de Agentes

Aplicação nova (Node ≥ 22.13), multiempresa, com banco **PostgreSQL** (Supabase em produção; PGlite local para testes e desenvolvimento). Primeira empresa: **RDZ**.
Koreon Brasil e Koreon em inglês **não estão configuradas**; a arquitetura as comporta (todo registro tem `company_id`,
toda consulta filtra por ele, e o acesso é por empresa e por token).

## Operação atual e papel desta central
- **ChatGPT Cowork**: cria conteúdo, imagens e roteiros (Instagram, TikTok, WhatsApp). **Claude Cowork**: pesquisa, gera vídeos e distribui (WhatsApp, por ora).
- **O Google Drive é hoje o banco de dados** (arquivos e planilhas). A central lê dele e **não o substitui**: guarda só o estado novo
  (versões, aprovações, publicações, tarefas, auditoria) no Postgres. IDs e links do Drive são preservados.
- A central web anterior (`rdz-central-marketing.redseal36.chatgpt.site`) não tem código neste repositório e a URL não é acessível do ambiente
  de desenvolvimento: **nada foi reaproveitado nem alterado**.

## Rodar
```bash
cd rdz-central && npm install
npm run seed     # popula o banco e grava data/tokens.json (tokens; não versionado)
npm start        # http://127.0.0.1:8787 — informe o token admin ao abrir
npm test         # 15 testes das regras (PGlite em memória)
```
Sem `DATABASE_URL`, usa PGlite em `data/pglite` (um usuário, só desenvolvimento).

## Banco no Supabase
1. Crie o projeto em supabase.com (plano gratuito basta). Em *Project Settings → Database → Connection string*, copie a URI do **Session pooler** (porta 5432).
2. Rode com a variável (o schema de `migrations/001_schema.sql` é aplicado sozinho, é idempotente):
```bash
DATABASE_URL='postgresql://postgres.<ref>:<senha>@<host>:5432/postgres' npm run seed
DATABASE_URL='...' npm start
```
3. **RLS ligado em todas as tabelas, sem políticas**: a API pública do Supabase (chave anon) não lê nem grava nada. Só a central acessa, pela conexão direta.
4. A string de conexão é segredo: não vai para o git nem para o chat; use variável de ambiente do servidor onde a central rodar.
5. Verificado: os 15 testes passam em PostgreSQL 16 real (driver `pg`) e em PGlite. **Ainda não verificado contra o seu projeto Supabase** (o ambiente de desenvolvimento não alcança supabase.com).

## Regras garantidas pelo código (com testes)
- Duas autorizações independentes: **CRIAÇÃO** e **DISTRIBUIÇÃO**. Só o administrador decide; agentes não aprovam.
- Cada aprovação guarda um *escopo* com hash: versão, texto, arquivos (ID Drive, tamanho), canal, conta, destino, público e janela.
  Qualquer mudança nesses elementos **invalida** a aprovação (registro e motivo mantidos). Mudança de texto/planejamento após aprovação cria **nova versão**; a anterior permanece.
- Uma autorização de distribuição cobre vários destinos, mas todos precisam ser marcados explicitamente.
- Publicação só é registrada com aprovação válida cobrindo o destino, dentro da janela, sem duplicidade; a validade é rechecada ao executar.
  Se a aprovação cair depois do agendamento, a publicação vira FALHA e, se havia ID externo, fica marcada "cancelar no provedor".
- Estados: AGENDADO → EM_PUBLICACAO → PUBLICADO | FALHA | RESULTADO_INCERTO. PUBLICADO exige link público ou evidência; resolver incerto é do admin.
- Arquivos têm nível de conferência (`NAO_CONFERIDO`, `RELATADO_PELO_AGENTE`, `EXISTE_NO_DRIVE`, `CONFERIDO_PELO_ADMIN`) e quem/quando. Divergência de tamanho invalida a distribuição.
- Pesquisa (fato / interpretação / sugestão) não gera publicação; deduplicação por URL normalizada ou chave natural; importação idempotente.

## Estado dos recursos
| Recurso | Estado |
|---|---|
| Dashboard, Planejamento (lista), Aprovações A/B, Biblioteca, Inteligência, Agentes/Tarefas, Publicações, Status | **Implementado** |
| Multiempresa com isolamento (dados, contas, aprovações) | **Implementado** (só RDZ cadastrada) |
| Carga inicial RDZ_VIDEO_001–004 com IDs reais do Drive (arquivos conferidos nos metadados em 30/10/2026) | **Implementado** |
| Importador CSV das 4 planilhas de mercado (IDs reais registrados) | **Implementado**; **dados reais ainda não importados** (export do Drive é manual) |
| Provedor de publicação `manual` (registra agendamento feito fora, com referência obrigatória) | **Implementado** |
| Provedor `simulated` | **Simulado**, desligado (`RDZ_ALLOW_SIMULATION=1`), sempre rotulado SIMULADO |
| Metricool (verificar brandId 7678759, contas conectadas, agendar, ler resultado) | **Pendente**: sem ferramenta nem token nesta instância; contas ficam `NAO_VERIFICADA` |
| Leitura automática do Drive pelo servidor | **Pendente** (credencial de conta de serviço/OAuth) |
| Custos por tarefa | Campo existe; **sem fonte automática** |
| Calendário visual, edição de conteúdos/destinos pela interface (hoje via API), ligação direta dos agentes (tokens por agente já existem) | **Pendente** |
| Koreon BR / Koreon EN | **Não configuradas** (de propósito) |

## Observações do Drive
- Os vídeos 002–004 citam em "AUTORIZAÇÃO" um pedido do usuário. Isso é texto em arquivo, **não** aprovação registrada aqui: todos começam pendentes (a criação pode ser aprovada retroativamente; fica sinalizado).
- O SHA-256 declarado nas ordens 002–004 não bate com o texto extraído (espaços/quebras exatos desconhecidos). Ficam registrados o declarado e o calculado.
- 003 tem alerta do produtor: "Aumento a pontuação da sua pontuação" pode soar como promessa de aumento de score.
- A pasta "Saída de vídeos" citada se chama `03_Videos_Para_Aprovacao`. A pasta de 004 existe, vazia na conferência.
- 002 tinha publicação solicitada para 30/10 às 10h; se não houver registro, a janela aparece como vencida sem publicação.
