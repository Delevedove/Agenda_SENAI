from flask import Blueprint, request, jsonify, current_app, g
from werkzeug.security import generate_password_hash

from src.rate_limiter import rate_limit
from datetime import datetime, timedelta
import jwt
import uuid
from src.models import db
from src.models.user import User
from src.models.refresh_token import RefreshToken
from sqlalchemy.exc import SQLAlchemyError
from src.utils.error_handler import handle_internal_error
from src.auth import (
    verificar_autenticacao,
    verificar_admin,
    login_required,
    admin_required,
)

user_bp = Blueprint('user', __name__)

# Funções auxiliares para geração de tokens

def gerar_token_acesso(usuario):
    payload = {
        'user_id': usuario.id,
        'nome': usuario.nome,
        'perfil': usuario.tipo,
        'exp': datetime.utcnow() + timedelta(minutes=15),
        'jti': str(uuid.uuid4()),
    }
    return jwt.encode(payload, current_app.config['SECRET_KEY'], algorithm='HS256')


def gerar_refresh_token(usuario):
    exp = datetime.utcnow() + timedelta(days=7)
    payload = {
        'user_id': usuario.id,
        'exp': exp,
        'type': 'refresh',
        'jti': str(uuid.uuid4()),
    }
    token = jwt.encode(payload, current_app.config['SECRET_KEY'], algorithm='HS256')
    rt = RefreshToken(user_id=usuario.id, token=token, expires_at=exp)
    db.session.add(rt)
    db.session.commit()
    return token



def verificar_refresh_token(token):
    try:
        dados = jwt.decode(token, current_app.config['SECRET_KEY'], algorithms=['HS256'])
        if dados.get('type') != 'refresh':
            return None
        rt = RefreshToken.query.filter_by(token=token, revoked=False).first()
        if not rt or rt.is_expired():
            return None
        usuario = db.session.get(User, dados.get('user_id'))
        return usuario
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None

@user_bp.route('/usuarios', methods=['GET'])
@admin_required
def listar_usuarios():
    """Lista todos os usuários."""
    usuarios = User.query.all()
    return jsonify([u.to_dict() for u in usuarios])

@user_bp.route('/usuarios/<int:id>', methods=['GET'])
@login_required
def obter_usuario(id):
    """Obtém detalhes de um usuário específico."""
    user = g.current_user
    if not verificar_admin(user) and user.id != id:
        return jsonify({'erro': 'Permissão negada'}), 403
    
    usuario = db.session.get(User, id)
    if not usuario:
        return jsonify({'erro': 'Usuário não encontrado'}), 404
    
    return jsonify(usuario.to_dict())

@user_bp.route('/usuarios', methods=['POST'])
@rate_limit(limit=5, window=60)
def criar_usuario():
    """
    Cria um novo usuário.
    Usuários não autenticados podem criar apenas usuários comuns.
    Administradores podem criar qualquer tipo de usuário.
    """
    data = request.json
    
    # Validação de dados
    if not all(key in data for key in ['nome', 'email', 'username', 'senha']):
        return jsonify({'erro': 'Dados incompletos'}), 400
    
    # Verifica se o tipo é válido
    tipo = data.get('tipo', 'comum')
    if tipo not in ['comum', 'admin']:
        return jsonify({'erro': 'Tipo de usuário inválido'}), 400
    
    # Verifica permissões para criar administradores
    if tipo == 'admin':
        autenticado, user = verificar_autenticacao(request)
        if not autenticado or not verificar_admin(user):
            return jsonify({'erro': 'Permissão negada para criar administrador'}), 403
    
    # Para usuários comuns, não é necessário autenticação (registro público)
    # Apenas para administradores é necessário estar autenticado
    
    # Verifica se username ou email já existem
    if User.query.filter_by(username=data['username']).first():
        return jsonify({'erro': 'Nome de usuário já existe'}), 400
    
    if User.query.filter_by(email=data['email']).first():
        return jsonify({'erro': 'Email já cadastrado'}), 400
    
    # Cria o usuário
    try:
        novo_usuario = User(
            nome=data['nome'],
            email=data['email'],
            username=data['username'],
            senha=data['senha'],
            tipo=tipo
        )
        db.session.add(novo_usuario)
        db.session.commit()
        return jsonify(novo_usuario.to_dict()), 201
    except SQLAlchemyError as e:
        db.session.rollback()
        return handle_internal_error(e)

@user_bp.route('/usuarios/<int:id>', methods=['PUT'])
@login_required
def atualizar_usuario(id):
    """
    Atualiza um usuário existente.
    Usuários comuns só podem atualizar seus próprios dados.
    Administradores podem atualizar dados de qualquer usuário.
    """
    user = g.current_user
    
    # Verifica permissões
    if not verificar_admin(user) and user.id != id:
        return jsonify({'erro': 'Permissão negada'}), 403
    
    usuario = db.session.get(User, id)
    if not usuario:
        return jsonify({'erro': 'Usuário não encontrado'}), 404
    
    data = request.json
    
    # Atualiza os campos fornecidos
    if 'nome' in data:
        usuario.nome = data['nome']
    
    if 'email' in data:
        # Verifica se o email já existe para outro usuário
        email_existente = User.query.filter_by(email=data['email']).first()
        if email_existente and email_existente.id != id:
            return jsonify({'erro': 'Email já cadastrado para outro usuário'}), 400
        usuario.email = data['email']
    
    # Apenas administradores podem alterar o tipo de usuário
    if 'tipo' in data and verificar_admin(user):
        if data['tipo'] not in ['comum', 'admin']:
            return jsonify({'erro': 'Tipo de usuário inválido'}), 400
        usuario.tipo = data['tipo']
    
    # Atualiza a senha se fornecida
    if 'senha' in data:
        senha_atual = data.get('senha_atual')

        # Se quem está alterando não é um administrador editando outro usuário,
        # exige a senha atual para confirmar a operação
        if not verificar_admin(user) or user.id == id:
            if not senha_atual:
                return jsonify({'erro': 'Senha atual obrigatória'}), 400
            if not usuario.check_senha(senha_atual):
                return jsonify({'erro': 'Senha atual incorreta'}), 403

        usuario.set_senha(data['senha'])
    
    try:
        db.session.commit()
        return jsonify(usuario.to_dict())
    except SQLAlchemyError as e:
        db.session.rollback()
        return handle_internal_error(e)

@user_bp.route('/usuarios/<int:id>', methods=['DELETE'])
@admin_required
def remover_usuario(id):
    """
    Remove um usuário.
    Apenas administradores podem remover usuários.
    Um usuário não pode remover a si mesmo.
    """
    user = g.current_user
    
    # Impede que um usuário remova a si mesmo
    if user.id == id:
        return jsonify({'erro': 'Não é possível remover o próprio usuário'}), 400
    
    usuario = db.session.get(User, id)
    if not usuario:
        return jsonify({'erro': 'Usuário não encontrado'}), 404
    
    try:
        db.session.delete(usuario)
        db.session.commit()
        return jsonify({'mensagem': 'Usuário removido com sucesso'})
    except SQLAlchemyError as e:
        db.session.rollback()
        return handle_internal_error(e)

@user_bp.route('/login', methods=['POST'])
@rate_limit(limit=10, window=60)
def login():
    """
    Autentica um usuário.
    """
    data = request.json
    
    if not all(key in data for key in ['username', 'senha']):
        return jsonify({'erro': 'Dados incompletos'}), 400
    
    usuario = User.query.filter_by(username=data['username']).first()

    if not usuario or not usuario.check_senha(data['senha']):
        return jsonify({'erro': 'Credenciais inválidas'}), 401

    access_token = gerar_token_acesso(usuario)
    refresh_token = gerar_refresh_token(usuario)

    return jsonify({
        'token': access_token,
        'refresh_token': refresh_token,
        'usuario': usuario.to_dict()
    })


@user_bp.route('/refresh', methods=['POST'])
def refresh_token():
    data = request.json or {}
    token = data.get('refresh_token')
    if not token:
        return jsonify({'erro': 'Refresh token obrigatório'}), 400
    usuario = verificar_refresh_token(token)
    if not usuario:
        return jsonify({'erro': 'Refresh token inválido'}), 401
    novo_token = gerar_token_acesso(usuario)
    return jsonify({'token': novo_token})


@user_bp.route('/logout', methods=['POST'])
def logout():
    data = request.json or {}
    token = data.get('refresh_token')
    if not token:
        return jsonify({'erro': 'Refresh token obrigatório'}), 400
    rt = RefreshToken.query.filter_by(token=token).first()
    if rt:
        rt.revoked = True
        db.session.commit()
    return jsonify({'mensagem': 'Logout realizado'})
