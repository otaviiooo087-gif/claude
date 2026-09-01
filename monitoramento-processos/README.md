# Monitoramento de Processos Judiciais (MVP)

Script que consulta a API pública do **DataJud (CNJ)** para uma lista de
processos, compara com a última movimentação conhecida e envia um e-mail
quando encontra novidade. Inspirado na funcionalidade de "ativar
monitoramento" de plataformas de gestão jurídica.

## Como funciona

1. Você cadastra os processos em `processos.json` (número + tribunal).
2. Ao rodar `monitor.py`, o script consulta o DataJud para cada processo.
3. Compara a movimentação mais recente com o que está salvo em
   `estado.json` (criado automaticamente).
4. Se houver movimento novo, envia um e-mail com o resumo.
5. Atualiza `estado.json` para não notificar de novo o mesmo movimento.

## Setup

```bash
cd monitoramento-processos
pip install -r requirements.txt
cp .env.example .env
```

Edite o `.env`:

- `DATAJUD_API_KEY`: chave pública do DataJud, disponível em
  https://datajud-wiki.cnj.jus.br/api-publica/acesso
- `SMTP_*` / `EMAIL_*`: credenciais de um e-mail para envio das notificações
  (com Gmail, use uma [senha de app](https://myaccount.google.com/apppasswords),
  não a senha normal da conta).

Edite `processos.json` com os processos reais, por exemplo:

```json
[
  {
    "numero": "1234567-89.2024.8.26.0100",
    "tribunal": "tjsp",
    "descricao": "Cliente X vs Empresa Y"
  }
]
```

O campo `tribunal` precisa estar mapeado em `tribunais.py` (já cobre os
tribunais mais comuns — TJs de SP/RJ/MG/RS/PR/BA/SC/DF, TRFs 1-6, STJ, TST,
TSE; adicione outros conforme a necessidade, seguindo a lista de aliases da
wiki do DataJud).

## Rodando

```bash
python monitor.py
```

## Agendando execução periódica

Como é um MVP simples, a forma mais direta é rodar via `cron` numa máquina
sempre ligada (servidor, Raspberry Pi, VPS):

```cron
0 8,14,20 * * * cd /caminho/monitoramento-processos && /usr/bin/python3 monitor.py >> monitor.log 2>&1
```

Isso consulta os processos 3x por dia. `estado.json` precisa persistir
entre execuções (não vai para o git — está no `.gitignore`).

## Limitações conhecidas / próximos passos

- **Cobertura do DataJud**: nem todo tribunal/vara publica dados completos
  na API pública, e pode haver atraso de horas/dias na indexação. Para
  monitoramento mais confiável e em tempo real, considerar migrar para uma
  API paga (Escavador, Judit.io, Codilo) — a estrutura do projeto
  (`consultar_movimentos`) foi pensada para trocar a fonte sem afetar o
  resto do fluxo.
- **Sem painel web**: hoje é só script + e-mail. Se quiser evoluir para um
  produto completo (like a SabioAdv), os próximos passos naturais seriam:
  um banco de dados (Postgres) no lugar dos JSONs, uma API/backend (ex.:
  FastAPI) para cadastro de processos, um worker separado para as
  consultas periódicas, e um frontend para visualizar histórico e status.
- **Um único destinatário de e-mail**: para múltiplos usuários/escritórios,
  seria necessário associar processos a usuários e implantar autenticação.
