"""Monitor de processos judiciais via API pública do DataJud (CNJ).

Consulta cada processo cadastrado em processos.json, compara com a última
movimentação conhecida (guardada em estado.json) e envia um e-mail quando
encontra movimentação nova.

Uso:
    python monitor.py
"""

import json
import os
import re
import smtplib
from email.mime.text import MIMEText
from pathlib import Path

import requests
from dotenv import load_dotenv

from tribunais import endpoint_url

BASE_DIR = Path(__file__).parent
PROCESSOS_FILE = BASE_DIR / "processos.json"
ESTADO_FILE = BASE_DIR / "estado.json"

load_dotenv(BASE_DIR / ".env")

DATAJUD_API_KEY = os.environ["DATAJUD_API_KEY"]

SMTP_HOST = os.environ["SMTP_HOST"]
SMTP_PORT = int(os.environ.get("SMTP_PORT", "587"))
SMTP_USER = os.environ["SMTP_USER"]
SMTP_PASS = os.environ["SMTP_PASS"]
EMAIL_FROM = os.environ.get("EMAIL_FROM", SMTP_USER)
EMAIL_TO = os.environ["EMAIL_TO"]


def carregar_json(path: Path, padrao):
    if not path.exists():
        return padrao
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def salvar_json(path: Path, dados):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(dados, f, ensure_ascii=False, indent=2)


def consultar_movimentos(numero: str, tribunal: str) -> list[dict]:
    numero_limpo = re.sub(r"\D", "", numero)
    resposta = requests.post(
        endpoint_url(tribunal),
        headers={
            "Authorization": f"APIKey {DATAJUD_API_KEY}",
            "Content-Type": "application/json",
        },
        json={"query": {"match": {"numeroProcesso": numero_limpo}}},
        timeout=30,
    )
    resposta.raise_for_status()
    hits = resposta.json().get("hits", {}).get("hits", [])
    if not hits:
        return []
    movimentos = hits[0]["_source"].get("movimentos", [])
    return sorted(movimentos, key=lambda m: m.get("dataHora", ""))


def enviar_email(assunto: str, corpo: str):
    msg = MIMEText(corpo, "plain", "utf-8")
    msg["Subject"] = assunto
    msg["From"] = EMAIL_FROM
    msg["To"] = EMAIL_TO

    with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as servidor:
        servidor.starttls()
        servidor.login(SMTP_USER, SMTP_PASS)
        servidor.sendmail(EMAIL_FROM, [EMAIL_TO], msg.as_string())


def main():
    processos = carregar_json(PROCESSOS_FILE, [])
    estado = carregar_json(ESTADO_FILE, {})

    if not processos:
        print("Nenhum processo cadastrado em processos.json.")
        return

    for processo in processos:
        numero = processo["numero"]
        tribunal = processo["tribunal"]
        descricao = processo.get("descricao", numero)

        try:
            movimentos = consultar_movimentos(numero, tribunal)
        except Exception as erro:
            print(f"[{numero}] erro ao consultar: {erro}")
            continue

        if not movimentos:
            print(f"[{numero}] nenhum movimento encontrado.")
            continue

        ultima_data_conhecida = estado.get(numero, {}).get("ultima_data", "")
        novos = [m for m in movimentos if m.get("dataHora", "") > ultima_data_conhecida]

        if novos:
            linhas = "\n".join(
                f"- {m.get('dataHora', '?')}: {m.get('nome', 'movimento sem nome')}"
                for m in novos
            )
            corpo = (
                f"Novo(s) movimento(s) no processo {numero} ({descricao}):\n\n{linhas}"
            )
            try:
                enviar_email(f"Movimentação em processo: {descricao}", corpo)
                print(f"[{numero}] {len(novos)} movimento(s) novo(s) — e-mail enviado.")
            except Exception as erro:
                print(f"[{numero}] movimento novo encontrado, mas falha ao enviar e-mail: {erro}")
                continue

        estado[numero] = {
            "ultima_data": movimentos[-1].get("dataHora", ""),
            "ultimo_movimento": movimentos[-1].get("nome", ""),
        }

    salvar_json(ESTADO_FILE, estado)


if __name__ == "__main__":
    main()
