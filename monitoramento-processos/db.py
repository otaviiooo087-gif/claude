"""Camada de dados (SQLite) do portal: advogados, processos e movimentações.

Modelo:
  advogado (1) -> (N) processo (1) -> (N) movimentacao

O advogado se cadastra pela OAB. Os processos são descobertos automaticamente
via DJEN (ver sync_djen.py). O vínculo processo -> CPF do cliente é manual
(feito pelo advogado/escritório, que já tem essa informação da procuração) —
não existe fonte pública que ligue processo a CPF de forma confiável.
"""

import secrets
import sqlite3
from pathlib import Path

DB_FILE = Path(__file__).parent / "dados.db"

SCHEMA = """
CREATE TABLE IF NOT EXISTS advogados (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    oab TEXT NOT NULL,
    uf TEXT NOT NULL,
    nome TEXT NOT NULL,
    email TEXT,
    ultima_sincronizacao TEXT,
    UNIQUE(oab, uf)
);

CREATE TABLE IF NOT EXISTS processos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    advogado_id INTEGER NOT NULL REFERENCES advogados(id),
    numero TEXT NOT NULL,
    orgao TEXT,
    status TEXT,
    cliente_cpf TEXT,
    codigo_acesso TEXT,
    UNIQUE(advogado_id, numero)
);

CREATE TABLE IF NOT EXISTS movimentacoes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    processo_id INTEGER NOT NULL REFERENCES processos(id),
    data TEXT,
    tipo TEXT,
    texto TEXT,
    UNIQUE(processo_id, data, texto)
);
"""


def conectar() -> sqlite3.Connection:
    conexao = sqlite3.connect(DB_FILE)
    conexao.row_factory = sqlite3.Row
    conexao.execute("PRAGMA foreign_keys = ON")
    return conexao


def iniciar_banco():
    with conectar() as conexao:
        conexao.executescript(SCHEMA)


def gerar_codigo_acesso() -> str:
    return secrets.token_hex(4).upper()
