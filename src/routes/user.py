from flask import Blueprint, request, jsonify, current_app
from werkzeug.security import generate_password_hash
from datetime import datetime, timedelta
import jwt
from src.models import db
from src.models.user import User

user_bp = Blueprint('user', __name__)

# Função auxiliar para verificar autenticação
def verificar_autenticacao(request):
    """
    Verifica se o usuário está autenticado através do token no cabeçalho.
    
    Args:
        request: Objeto de requisição Flask
        
    Returns:
        tuple: (is_authenticated, user_data)
    """
    auth_header = request.headers.get('Authorization')
    if not auth_header or not auth_header.startswith('Bearer '):
        return False, None

    token = auth_header.split(' ')[1]
    try:
        dados = jwt.decode(token, current_app.config['SECRET_KEY'], algorithms=['HS256'])
        user_id = dados.get('user_id')
        user = db.session.get(User, user_id)
        if user:
            return True, user
        return False, None
    except jwt.ExpiredSignatureError:
        return False, None
    except jwt.InvalidTokenError:
        return False, None

# Função auxiliar para verificar permissões de administrador
def verificar_admin(user):
    """
    Verifica se o usuário é um administrador.
    
    Args:
        user: Objeto de usuário
        
    Returns:
        bool: True se o usuário for administrador, False caso contrário
    """
    return user and user.is_admin()

@user_bp.route('/usuarios', methods=['GET'])
def listar_usuarios():
    """
    Lista todos os usuários (requer permissão de administrador).
    """
    autenticado, user = verificar_autenticacao(request)
    if not autenticado:
        return jsonify({'erro': 'Não autenticado'}), 401
    
    if not verificar_admin(user):
        return jsonify({'erro': 'Permissão negada'}), 403
    
    usuarios = User.query.all()
    return jsonify([u.to_dict() for u in usuarios])

@user_bp.route('/usuarios/<int:id>', methods=['GET'])
def obter_usuario(id):
    """
    Obtém detalhes de um usuário específico.
    Usuários comuns só podem ver seus próprios dados.
    Administradores podem ver dados de qualquer usuário.
    """
    autenticado, user = verificar_autenticacao(request)
    if not autenticado:
        return jsonify({'erro': 'Não autenticado'}), 401
    
    # Verifica permissões
    if not verificar_admin(user) and user.id != id:
        return jsonify({'erro': 'Permissão negada'}), 403
    
    usuario = db.session.get(User, id)
    if not usuario:
        return jsonify({'erro': 'Usuário não encontrado'}), 404
    
    return jsonify(usuario.to_dict())

@user_bp.route('/usuarios', methods=['POST'])
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
    except Exception as e:
        db.session.rollback()
        return jsonify({'erro': str(e)}), 500

@user_bp.route('/usuarios/<int:id>', methods=['PUT'])
def atualizar_usuario(id):
    """
    Atualiza um usuário existente.
    Usuários comuns só podem atualizar seus próprios dados.
    Administradores podem atualizar dados de qualquer usuário.
    """
    autenticado, user = verificar_autenticacao(request)
    if not autenticado:
        return jsonify({'erro': 'Não autenticado'}), 401
    
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
        usuario.set_senha(data['senha'])
    
    try:
        db.session.commit()
        return jsonify(usuario.to_dict())
    except Exception as e:
        db.session.rollback()
        return jsonify({'erro': str(e)}), 500

@user_bp.route('/usuarios/<int:id>', methods=['DELETE'])
def remover_usuario(id):
    """
    Remove um usuário.
    Apenas administradores podem remover usuários.
    Um usuário não pode remover a si mesmo.
    """
    autenticado, user = verificar_autenticacao(request)
    if not autenticado:
        return jsonify({'erro': 'Não autenticado'}), 401
    
    # Verifica permissões
    if not verificar_admin(user):
        return jsonify({'erro': 'Permissão negada'}), 403
    
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
    except Exception as e:
        db.session.rollback()
        return jsonify({'erro': str(e)}), 500

@user_bp.route('/login', methods=['POST'])
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

    payload = {
        'user_id': usuario.id,
        'nome': usuario.nome,
        'perfil': usuario.tipo,
        'exp': datetime.utcnow() + timedelta(hours=1)
    }

    token = jwt.encode(payload, current_app.config['SECRET_KEY'], algorithm='HS256')

    return jsonify({
        'token': token,
        'usuario': usuario.to_dict()
    })
