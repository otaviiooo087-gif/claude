# CRM Limpa Nome

CRM multi-empresa (SaaS) para negócios de limpa nome e crédito. Sem dependências externas: só Node 22.13+ (usa `node:sqlite`).

## Rodar
```bash
cd crm-limpa-nome
npm start        # http://localhost:3000  (PORT=xxxx para mudar)
npm test
```
Os dados ficam em `data/crm.db` (ignorado pelo git).

## O que tem
- Cadastro de empresa + login (senha com scrypt, cookie HttpOnly, limite de tentativas)
- Isolamento por empresa: toda consulta filtra por `empresa_id` (coberto por teste)
- Funil kanban (arrastar e soltar) com 9 etapas do limpa nome
- Ficha do cliente: dados com CPF validado, consentimento LGPD, dívidas por credor, parcelas, notas, tarefas
- Painel: conversão, recebido, a receber, em atraso, origem dos leads

## Próximos passos
Cobrança dos planos (Asaas/Stripe), WhatsApp, modelos de contrato, importação CSV, usuários extras por empresa, e trocar SQLite por Postgres antes de escalar.
