from functools import wraps
from flask import request, jsonify, current_app, g
import jwt

from src.models import db
from src.models.user import User


def verificar_autenticacao(req):
    """Verifica o token JWT no cabeçalho Authorization."""
    auth_header = req.headers.get('Authorization')
    if not auth_header or not auth_header.startswith('Bearer '):
        return False, None

    token = auth_header.split(' ')[1]
    try:
        dados = jwt.decode(token, current_app.config['SECRET_KEY'], algorithms=['HS256'])
        user = db.session.get(User, dados.get('user_id'))
        if user:
            return True, user
        return False, None
    except jwt.ExpiredSignatureError:
        return False, None
    except jwt.InvalidTokenError:
        return False, None


def verificar_admin(user):
    """Retorna True se o usuário tiver privilégio de administrador."""
    return user and user.is_admin()


def login_required(func):
    """Decorator que exige autenticação via JWT."""
    @wraps(func)
    def wrapper(*args, **kwargs):
        autenticado, user = verificar_autenticacao(request)
        if not autenticado:
            return jsonify({'erro': 'Não autenticado'}), 401
        g.current_user = user
        return func(*args, **kwargs)

    return wrapper


def admin_required(func):
    """Decorator que exige usuário administrador."""
    @wraps(func)
    @login_required
    def wrapper(*args, **kwargs):
        user = g.current_user
        if not verificar_admin(user):
            return jsonify({'erro': 'Permissão negada'}), 403
        return func(*args, **kwargs)

    return wrapper
