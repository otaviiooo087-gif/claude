"""Envio de e-mail de notificação, compartilhado pelos dois modos de monitoramento."""

import os
import smtplib
from email.mime.text import MIMEText
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path(__file__).parent / ".env")

SMTP_HOST = os.environ["SMTP_HOST"]
SMTP_PORT = int(os.environ.get("SMTP_PORT", "587"))
SMTP_USER = os.environ["SMTP_USER"]
SMTP_PASS = os.environ["SMTP_PASS"]
EMAIL_FROM = os.environ.get("EMAIL_FROM", SMTP_USER)


def enviar_email(destinatario: str, assunto: str, corpo: str):
    msg = MIMEText(corpo, "plain", "utf-8")
    msg["Subject"] = assunto
    msg["From"] = EMAIL_FROM
    msg["To"] = destinatario

    with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as servidor:
        servidor.starttls()
        servidor.login(SMTP_USER, SMTP_PASS)
        servidor.sendmail(EMAIL_FROM, [destinatario], msg.as_string())
