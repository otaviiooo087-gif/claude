"""Hash de senha (scrypt, sem dependência externa) e sessões por token opaco."""

import base64
import hashlib
import hmac
import os
import secrets

from fastapi import Header, HTTPException

from db import conectar

_SCRYPT_PARAMS = {"n": 16384, "r": 8, "p": 1, "dklen": 32}


def gerar_hash_senha(senha: str) -> str:
    salt = os.urandom(16)
    derivado = hashlib.scrypt(senha.encode("utf-8"), salt=salt, **_SCRYPT_PARAMS)
    return base64.b64encode(salt + derivado).decode("ascii")


def verificar_senha(senha: str, hash_armazenado: str) -> bool:
    bruto = base64.b64decode(hash_armazenado)
    salt, hash_original = bruto[:16], bruto[16:]
    tentativa = hashlib.scrypt(senha.encode("utf-8"), salt=salt, **_SCRYPT_PARAMS)
    return hmac.compare_digest(tentativa, hash_original)


def criar_sessao(conexao, advogado_id: int) -> str:
    token = secrets.token_urlsafe(32)
    conexao.execute(
        "INSERT INTO sessoes (token, advogado_id) VALUES (?, ?)", (token, advogado_id)
    )
    return token


def extrair_token(authorization: str) -> str:
    if not authorization.startswith("Bearer "):
        raise HTTPException(401, "Não autenticado.")
    return authorization.removeprefix("Bearer ").strip()


def advogado_atual(authorization: str = Header(default="")) -> dict:
    token = extrair_token(authorization)

    with conectar() as conexao:
        linha = conexao.execute(
            """
            SELECT advogados.* FROM sessoes
            JOIN advogados ON advogados.id = sessoes.advogado_id
            WHERE sessoes.token = ?
            """,
            (token,),
        ).fetchone()

    if not linha:
        raise HTTPException(401, "Sessão inválida ou expirada.")
    return dict(linha)
