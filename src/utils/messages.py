from flask import jsonify

ERRO_NAO_AUTENTICADO = 'Não autenticado'
ERRO_PERMISSAO_NEGADA = 'Permissão negada'
ERRO_REQUISICAO_MALFORMADA = 'Requisição malformada'
ERRO_NAO_ENCONTRADO = 'Página ou item não encontrado'
ERRO_INTERNO = 'Erro interno'
FALLBACK_ERRO_GENERICO = 'Algo deu errado. Tente novamente mais tarde.'
ERRO_DADOS_INCOMPLETOS = 'Dados incompletos'


def error_response(message: str, status_code: int):
    """Gera uma resposta de erro padronizada."""
    return jsonify({'erro': message}), status_code
