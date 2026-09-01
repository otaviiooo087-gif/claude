# Monitoramento de Processos Judiciais (MVP)

Dois modos de uso, que podem rodar juntos:

- **Modo A — por número de processo (`monitor.py`)**: você já sabe o número
  de cada processo e quer ser avisado de novas movimentações. Usa a API
  pública do DataJud (CNJ).
- **Modo B — por OAB + portal do cliente (`sync_djen.py` + `api.py`)**: o
  advogado cadastra a **OAB dele** e o sistema descobre sozinho os
  processos novos, via DJEN (Diário de Justiça Eletrônico Nacional). O
  cliente final consulta pelo **próprio CPF** e vê só os processos dele.

O Modo B é o mais próximo do fluxo real de plataformas como a SabioAdv:
tela de "ativar monitoramento" pede **número da OAB + UF** (não CPF nem
número de processo) — é assim que eles descobrem a carteira de processos
do advogado automaticamente.

## Modo B — como funciona, passo a passo

1. **Advogado se cadastra pela OAB** (`POST /advogados`): número + UF + nome
   + e-mail. Não precisa informar nenhum processo manualmente.
2. **`sync_djen.py` roda periodicamente** (cron) e, para cada advogado
   cadastrado, consulta a API pública do DJEN filtrando por OAB + UF. Cada
   processo novo encontrado é criado automaticamente; cada comunicação nova
   vira uma movimentação. Se houver novidade, o advogado recebe e-mail.
3. **Advogado vincula um processo ao CPF do cliente**
   (`POST /processos/{id}/vincular-cliente`): isso **não dá para
   automatizar** — nenhuma fonte pública liga processo a CPF de forma
   confiável — é o escritório que já sabe isso pela procuração. Essa chamada
   gera um `codigo_acesso` que o advogado repassa ao cliente (WhatsApp,
   e-mail etc.).
4. **Cliente consulta** (`POST /consulta` com `cpf` + `codigo_acesso`) e vê
   os processos vinculados a ele, com histórico de movimentações. Exigir
   CPF **e** o código evita que alguém encontre o processo de outra pessoa
   só adivinhando/testando CPFs.

### Rodando o Modo B

```bash
pip install -r requirements.txt
cp .env.example .env   # preencha SMTP_* (usado nas notificações por e-mail)

python sync_djen.py       # roda a sincronização (agende via cron)
uvicorn api:app --reload  # sobe a API + o frontend, em http://localhost:8000
```

### Frontend

`uvicorn api:app` já serve o frontend estático em `frontend/` na raiz — abra
`http://localhost:8000` no navegador:

- `index.html` — escolha "Sou advogado" ou "Sou cliente".
- `advogado.html` — login por OAB + UF (cadastra na hora se ainda não
  existir), botão **"Buscar processos agora"** (chama a sincronização com o
  DJEN na hora, sem esperar o cron) e, para cada processo sem CPF vinculado,
  um campo para vincular o CPF do cliente e gerar o código de acesso.
- `cliente.html` — CPF + código de acesso, mostra os processos vinculados e
  o histórico de movimentações.

É HTML/CSS/JS puro (sem build step), pensado para rodar junto com a API sem
infraestrutura extra. Não tem autenticação de verdade ainda — ver
"Próximos passos".

Fluxo de teste rápido (via curl, sem o frontend):

```bash
curl -X POST localhost:8000/advogados \
  -H "Content-Type: application/json" \
  -d '{"oab":"123456","uf":"SP","nome":"Dra. Exemplo","email":"dra@exemplo.com"}'

# depois de rodar sync_djen.py e existir algum processo:
curl -X POST localhost:8000/processos/1/vincular-cliente \
  -H "Content-Type: application/json" -d '{"cpf":"123.456.789-09"}'

curl -X POST localhost:8000/consulta \
  -H "Content-Type: application/json" \
  -d '{"cpf":"12345678909","codigo_acesso":"<codigo retornado acima>"}'
```

### Limitações do Modo B

- **DJEN só traz publicações/intimações**, não o andamento processual
  completo nem um "status do processo" (em tramitação, arquivado, suspenso
  etc. — como a SabioAdv mostra na tela deles). Pra ter isso, precisaria
  trocar/complementar o DJEN por uma API paga com esse dado já classificado
  (Escavador ou Judit.io têm "monitoramento por OAB" com status incluído).
  A coluna `status` já existe na tabela `processos` esperando por isso.
- **Processos em segredo de justiça aparecem parcialmente**: a lei exige que
  a intimação ao advogado saia mesmo em segredo de justiça (com nome dele
  completo e número do processo), mas dados da outra parte vêm mascarados.
- **Vínculo processo → CPF é manual.** Não existe fonte pública confiável
  para automatizar isso — é dado que só o próprio escritório tem.

## Modo A — por número de processo (DataJud)

Ver comentários em `monitor.py`/`tribunais.py`. Resumo: você cadastra
processos em `processos.json` (número + tribunal), roda `python monitor.py`
periodicamente (cron) e recebe e-mail quando há movimentação nova. Usa a
API pública do DataJud, que cobre bem tribunais grandes mas tem cobertura
desigual e não é boa em busca por CPF (por isso o Modo B existe).

Setup: `DATAJUD_API_KEY` no `.env` (chave pública, obtida em
https://datajud-wiki.cnj.jus.br/api-publica/acesso) e `EMAIL_TO`.

## Configuração comum (`.env`)

```
DATAJUD_API_KEY=       # Modo A
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
EMAIL_FROM=
EMAIL_TO=               # Modo A (destinatário fixo)
```

No Modo B, o e-mail vai para o endereço cadastrado de cada advogado, não
para `EMAIL_TO`.

## Próximos passos possíveis

- Trocar/complementar DJEN por Escavador ou Judit.io para ter status do
  processo e histórico completo de movimentação (não só publicações).
- Autenticação de verdade no cadastro do advogado (hoje qualquer um pode
  chamar `POST /advogados`).
- Interface web em vez de chamadas de API cruas.
