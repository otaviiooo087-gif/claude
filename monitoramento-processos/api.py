"""API do portal:

- O advogado se cadastra pela OAB + senha (os processos são descobertos
  sozinhos via sync_djen.py, que roda separado/periodicamente).
- Login gera um token de sessão; as rotas do advogado exigem esse token
  (header "Authorization: Bearer <token>") e só enxergam os próprios dados —
  não dá pra ver processo de outro advogado trocando um ID na URL.
- O advogado vincula um processo já descoberto ao CPF do cliente (isso não dá
  pra automatizar: só o escritório sabe qual CPF corresponde a qual processo).
  Esse vínculo gera um código de acesso que o advogado repassa ao cliente.
- O cliente consulta com CPF + código de acesso e vê só os processos dele.

Rodar localmente:
    uvicorn api:app --reload
"""

import re
from pathlib import Path

from fastapi import Depends, FastAPI, Header, HTTPException
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, field_validator

from auth import advogado_atual, criar_sessao, extrair_token, gerar_hash_senha, verificar_senha
from db import conectar, gerar_codigo_acesso, iniciar_banco
from sync_djen import sincronizar_advogado

iniciar_banco()

app = FastAPI(title="Portal de Monitoramento de Processos")


def limpar_cpf(cpf: str) -> str:
    return re.sub(r"\D", "", cpf)


class AdvogadoEntrada(BaseModel):
    oab: str
    uf: str
    nome: str
    email: str
    senha: str

    @field_validator("senha")
    @classmethod
    def validar_senha(cls, valor):
        if len(valor) < 6:
            raise ValueError("Senha precisa ter pelo menos 6 caracteres.")
        return valor


@app.post("/advogados")
def cadastrar_advogado(dados: AdvogadoEntrada):
    with conectar() as conexao:
        try:
            cursor = conexao.execute(
                "INSERT INTO advogados (oab, uf, nome, email, senha_hash) VALUES (?, ?, ?, ?, ?)",
                (dados.oab, dados.uf.upper(), dados.nome, dados.email, gerar_hash_senha(dados.senha)),
            )
        except Exception:
            raise HTTPException(409, "Advogado já cadastrado com essa OAB/UF.")

        token = criar_sessao(conexao, cursor.lastrowid)
        return {"id": cursor.lastrowid, "nome": dados.nome, "token": token}


@app.get("/advogados/buscar")
def existe_advogado(oab: str, uf: str):
    with conectar() as conexao:
        linha = conexao.execute(
            "SELECT id FROM advogados WHERE oab = ? AND uf = ?",
            (oab, uf.upper()),
        ).fetchone()
        if not linha:
            raise HTTPException(404, "Advogado não encontrado.")
        return {"existe": True}


class LoginEntrada(BaseModel):
    oab: str
    uf: str
    senha: str


@app.post("/login")
def login(dados: LoginEntrada):
    with conectar() as conexao:
        advogado = conexao.execute(
            "SELECT * FROM advogados WHERE oab = ? AND uf = ?",
            (dados.oab, dados.uf.upper()),
        ).fetchone()
        if not advogado or not verificar_senha(dados.senha, advogado["senha_hash"]):
            raise HTTPException(401, "OAB, UF ou senha incorretos.")

        token = criar_sessao(conexao, advogado["id"])
        return {"id": advogado["id"], "nome": advogado["nome"], "token": token}


@app.post("/logout")
def logout(authorization: str = Header(default="")):
    token = extrair_token(authorization)
    with conectar() as conexao:
        conexao.execute("DELETE FROM sessoes WHERE token = ?", (token,))
    return {"ok": True}


@app.post("/sincronizar")
def sincronizar_agora(advogado: dict = Depends(advogado_atual)):
    with conectar() as conexao:
        advogado_linha = conexao.execute(
            "SELECT * FROM advogados WHERE id = ?", (advogado["id"],)
        ).fetchone()
        sincronizar_advogado(conexao, dict(advogado_linha))
    return {"ok": True}


@app.get("/processos")
def listar_processos(advogado: dict = Depends(advogado_atual)):
    with conectar() as conexao:
        linhas = conexao.execute(
            "SELECT id, numero, orgao, status, cliente_cpf FROM processos WHERE advogado_id = ?",
            (advogado["id"],),
        ).fetchall()
        return [dict(linha) for linha in linhas]


class VincularClienteEntrada(BaseModel):
    cpf: str

    @field_validator("cpf")
    @classmethod
    def validar_cpf(cls, valor):
        cpf = limpar_cpf(valor)
        if len(cpf) != 11:
            raise ValueError("CPF deve ter 11 dígitos.")
        return cpf


@app.post("/processos/{processo_id}/vincular-cliente")
def vincular_cliente(
    processo_id: int, dados: VincularClienteEntrada, advogado: dict = Depends(advogado_atual)
):
    with conectar() as conexao:
        processo = conexao.execute(
            "SELECT id FROM processos WHERE id = ? AND advogado_id = ?",
            (processo_id, advogado["id"]),
        ).fetchone()
        if not processo:
            raise HTTPException(404, "Processo não encontrado.")

        codigo = gerar_codigo_acesso()
        conexao.execute(
            "UPDATE processos SET cliente_cpf = ?, codigo_acesso = ? WHERE id = ?",
            (dados.cpf, codigo, processo_id),
        )
        return {"codigo_acesso": codigo}


class ConsultaEntrada(BaseModel):
    cpf: str
    codigo_acesso: str


@app.post("/consulta")
def consultar_processos_do_cliente(dados: ConsultaEntrada):
    cpf = limpar_cpf(dados.cpf)
    with conectar() as conexao:
        processos = conexao.execute(
            "SELECT id, numero, orgao FROM processos WHERE cliente_cpf = ? AND codigo_acesso = ?",
            (cpf, dados.codigo_acesso.upper()),
        ).fetchall()

        if not processos:
            raise HTTPException(404, "Nenhum processo encontrado para esse CPF/código.")

        resultado = []
        for processo in processos:
            movimentacoes = conexao.execute(
                "SELECT data, tipo, texto FROM movimentacoes WHERE processo_id = ? ORDER BY data DESC",
                (processo["id"],),
            ).fetchall()
            resultado.append(
                {
                    "numero": processo["numero"],
                    "orgao": processo["orgao"],
                    "movimentacoes": [dict(m) for m in movimentacoes],
                }
            )

        return resultado


FRONTEND_DIR = Path(__file__).parent / "frontend"
app.mount("/", StaticFiles(directory=FRONTEND_DIR, html=True), name="frontend")
