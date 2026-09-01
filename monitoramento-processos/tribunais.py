"""Mapa de aliases de tribunal para o endpoint público do DataJud (CNJ).

Lista completa de aliases em:
https://datajud-wiki.cnj.jus.br/api-publica/endpoints
"""

TRIBUNAIS = {
    "tjsp": "api_publica_tjsp",
    "tjrj": "api_publica_tjrj",
    "tjmg": "api_publica_tjmg",
    "tjrs": "api_publica_tjrs",
    "tjpr": "api_publica_tjpr",
    "tjba": "api_publica_tjba",
    "tjsc": "api_publica_tjsc",
    "tjdft": "api_publica_tjdft",
    "trf1": "api_publica_trf1",
    "trf2": "api_publica_trf2",
    "trf3": "api_publica_trf3",
    "trf4": "api_publica_trf4",
    "trf5": "api_publica_trf5",
    "trf6": "api_publica_trf6",
    "tst": "api_publica_tst",
    "tse": "api_publica_tse",
    "stj": "api_publica_stj",
}


def endpoint_url(tribunal: str) -> str:
    alias = TRIBUNAIS.get(tribunal.lower())
    if not alias:
        raise ValueError(
            f"Tribunal '{tribunal}' não mapeado. Adicione o alias em tribunais.py "
            "(veja a lista completa na wiki do DataJud)."
        )
    return f"https://api-publica.datajud.cnj.jus.br/{alias}/_search"
