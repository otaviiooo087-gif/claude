"""Sincroniza, para cada advogado cadastrado, as comunicações do DJEN
por OAB e descobre/atualiza automaticamente os processos dele.

Uso:
    python sync_djen.py
"""

from datetime import date, timedelta

from db import conectar, iniciar_banco
from djen_client import (
    buscar_comunicacoes,
    extrair_data,
    extrair_numero_processo,
    extrair_orgao,
    extrair_texto,
    extrair_tipo,
)
from notificacoes import enviar_email

DIAS_JANELA_INICIAL = 30


def obter_ou_criar_processo(conexao, advogado_id: int, numero: str, orgao: str) -> int:
    linha = conexao.execute(
        "SELECT id FROM processos WHERE advogado_id = ? AND numero = ?",
        (advogado_id, numero),
    ).fetchone()
    if linha:
        return linha["id"]

    cursor = conexao.execute(
        "INSERT INTO processos (advogado_id, numero, orgao) VALUES (?, ?, ?)",
        (advogado_id, numero, orgao),
    )
    return cursor.lastrowid


def registrar_movimentacao(conexao, processo_id: int, data_mov: str, tipo: str, texto: str) -> bool:
    try:
        conexao.execute(
            "INSERT INTO movimentacoes (processo_id, data, tipo, texto) VALUES (?, ?, ?, ?)",
            (processo_id, data_mov, tipo, texto),
        )
        return True
    except Exception:
        return False


def sincronizar_advogado(conexao, advogado: dict):
    data_fim = date.today().isoformat()
    data_inicio = advogado["ultima_sincronizacao"] or (
        date.today() - timedelta(days=DIAS_JANELA_INICIAL)
    ).isoformat()

    try:
        itens = buscar_comunicacoes(advogado["oab"], advogado["uf"], data_inicio, data_fim)
    except Exception as erro:
        print(f"[OAB {advogado['oab']}/{advogado['uf']}] erro ao consultar DJEN: {erro}")
        return

    novidades = []
    for item in itens:
        numero = extrair_numero_processo(item)
        if not numero:
            continue

        processo_id = obter_ou_criar_processo(conexao, advogado["id"], numero, extrair_orgao(item))
        inserida = registrar_movimentacao(
            conexao, processo_id, extrair_data(item), extrair_tipo(item), extrair_texto(item)
        )
        if inserida:
            novidades.append((numero, extrair_tipo(item), extrair_texto(item)))

    conexao.execute(
        "UPDATE advogados SET ultima_sincronizacao = ? WHERE id = ?",
        (data_fim, advogado["id"]),
    )
    conexao.commit()

    print(f"[OAB {advogado['oab']}/{advogado['uf']}] {len(novidades)} nova(s) comunicação(ões).")

    if novidades and advogado["email"]:
        linhas = "\n\n".join(
            f"Processo {numero} — {tipo}\n{texto[:500]}" for numero, tipo, texto in novidades
        )
        try:
            enviar_email(
                advogado["email"],
                f"{len(novidades)} nova(s) comunicação(ões) no DJEN",
                linhas,
            )
        except Exception as erro:
            print(f"[OAB {advogado['oab']}/{advogado['uf']}] falha ao enviar e-mail: {erro}")


def main():
    iniciar_banco()
    with conectar() as conexao:
        advogados = conexao.execute("SELECT * FROM advogados").fetchall()
        if not advogados:
            print("Nenhum advogado cadastrado.")
            return
        for advogado in advogados:
            sincronizar_advogado(conexao, dict(advogado))


if __name__ == "__main__":
    main()
