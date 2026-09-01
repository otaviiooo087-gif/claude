"""API do portal:

- O advogado se cadastra pela OAB (os processos são descobertos sozinhos via
  sync_djen.py, que roda separado/periodicamente).
- O advogado vincula um processo já descoberto ao CPF do cliente (isso não dá
  pra automatizar: só o escritório sabe qual CPF corresponde a qual processo).
  Esse vínculo gera um código de acesso que o advogado repassa ao cliente.
- O cliente consulta com CPF + código de acesso e vê só os processos dele.

Rodar localmente:
    uvicorn api:app --reload
"""

import re
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, field_validator

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


@app.post("/advogados")
def cadastrar_advogado(dados: AdvogadoEntrada):
    with conectar() as conexao:
        try:
            cursor = conexao.execute(
                "INSERT INTO advogados (oab, uf, nome, email) VALUES (?, ?, ?, ?)",
                (dados.oab, dados.uf.upper(), dados.nome, dados.email),
            )
        except Exception:
            raise HTTPException(409, "Advogado já cadastrado com essa OAB/UF.")
        return {"id": cursor.lastrowid}


@app.get("/advogados/buscar")
def buscar_advogado(oab: str, uf: str):
    with conectar() as conexao:
        linha = conexao.execute(
            "SELECT id, oab, uf, nome, email FROM advogados WHERE oab = ? AND uf = ?",
            (oab, uf.upper()),
        ).fetchone()
        if not linha:
            raise HTTPException(404, "Advogado não encontrado.")
        return dict(linha)


@app.post("/advogados/{advogado_id}/sincronizar")
def sincronizar_agora(advogado_id: int):
    with conectar() as conexao:
        advogado = conexao.execute(
            "SELECT * FROM advogados WHERE id = ?", (advogado_id,)
        ).fetchone()
        if not advogado:
            raise HTTPException(404, "Advogado não encontrado.")
        sincronizar_advogado(conexao, dict(advogado))
    return {"ok": True}


@app.get("/advogados/{advogado_id}/processos")
def listar_processos(advogado_id: int):
    with conectar() as conexao:
        linhas = conexao.execute(
            "SELECT id, numero, orgao, status, cliente_cpf FROM processos WHERE advogado_id = ?",
            (advogado_id,),
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
def vincular_cliente(processo_id: int, dados: VincularClienteEntrada):
    with conectar() as conexao:
        processo = conexao.execute(
            "SELECT id FROM processos WHERE id = ?", (processo_id,)
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
