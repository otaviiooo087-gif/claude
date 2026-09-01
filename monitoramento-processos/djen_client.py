"""Cliente da API pública do DJEN (Diário de Justiça Eletrônico Nacional/CNJ).

Documentação: https://comunicaapi.pje.jus.br (sem autenticação).
Busca comunicações/publicações direcionadas a um advogado, por OAB + UF.
"""

import requests

BASE_URL = "https://comunicaapi.pje.jus.br/api/v1/comunicacao"


def buscar_comunicacoes(numero_oab: str, uf_oab: str, data_inicio: str, data_fim: str) -> list[dict]:
    """Retorna todas as comunicações da OAB no período (percorre paginação)."""
    itens = []
    pagina = 1
    while True:
        resposta = requests.get(
            BASE_URL,
            params={
                "numeroOab": numero_oab,
                "ufOab": uf_oab,
                "dataDisponibilizacaoInicio": data_inicio,
                "dataDisponibilizacaoFim": data_fim,
                "pagina": pagina,
                "itensPorPagina": 100,
            },
            headers={"Accept": "application/json"},
            timeout=30,
        )
        resposta.raise_for_status()
        corpo = resposta.json()
        pagina_itens = corpo.get("items", [])
        itens.extend(pagina_itens)

        if len(pagina_itens) < 100:
            break
        pagina += 1

    return itens


def extrair_numero_processo(item: dict) -> str | None:
    return item.get("numero_processo") or item.get("numeroProcesso")


def extrair_data(item: dict) -> str:
    return (
        item.get("data_disponibilizacao")
        or item.get("datadisponibilizacao")
        or item.get("data_publicacao")
        or ""
    )


def extrair_orgao(item: dict) -> str:
    return item.get("nomeOrgao") or item.get("nome_orgao") or ""


def extrair_texto(item: dict) -> str:
    return item.get("texto") or ""


def extrair_tipo(item: dict) -> str:
    return item.get("tipoComunicacao") or item.get("tipo_comunicacao") or ""
