from flask import jsonify
from .messages import (
    ERRO_REQUISICAO_MALFORMADA,
    ERRO_NAO_ENCONTRADO,
    FALLBACK_ERRO_GENERICO,
)


def register_error_handlers(app):
    @app.errorhandler(400)
    def handle_400(error):
        desc = getattr(error, 'description', ERRO_REQUISICAO_MALFORMADA)
        return jsonify({'erro': desc or ERRO_REQUISICAO_MALFORMADA}), 400

    @app.errorhandler(404)
    def handle_404(error):
        desc = getattr(error, 'description', ERRO_NAO_ENCONTRADO)
        return jsonify({'erro': desc or ERRO_NAO_ENCONTRADO}), 404

    @app.errorhandler(500)
    def handle_500(error):
        return jsonify({'erro': FALLBACK_ERRO_GENERICO}), 500
