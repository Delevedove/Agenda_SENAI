from flask import Blueprint, request, jsonify
from src.models import db
from src.models.laboratorio_turma import Laboratorio, Turma
from src.routes.user import verificar_autenticacao, verificar_admin

laboratorio_bp = Blueprint('laboratorio', __name__)

@laboratorio_bp.route('/laboratorios', methods=['GET'])
def listar_laboratorios():
    """
    Lista todos os laboratórios disponíveis.
    Acessível para todos os usuários autenticados.
    """
    autenticado, _ = verificar_autenticacao(request)
    if not autenticado:
        return jsonify({'erro': 'Não autenticado'}), 401
    
    laboratorios = Laboratorio.query.all()
    return jsonify([lab.to_dict() for lab in laboratorios])

@laboratorio_bp.route('/laboratorios/<int:id>', methods=['GET'])
def obter_laboratorio(id):
    """
    Obtém detalhes de um laboratório específico.
    Acessível para todos os usuários autenticados.
    """
    autenticado, _ = verificar_autenticacao(request)
    if not autenticado:
        return jsonify({'erro': 'Não autenticado'}), 401
    
    laboratorio = Laboratorio.query.get(id)
    if not laboratorio:
        return jsonify({'erro': 'Laboratório não encontrado'}), 404
    
    return jsonify(laboratorio.to_dict())

@laboratorio_bp.route('/laboratorios', methods=['POST'])
def criar_laboratorio():
    """
    Cria um novo laboratório.
    Apenas administradores podem criar laboratórios.
    """
    autenticado, user = verificar_autenticacao(request)
    if not autenticado:
        return jsonify({'erro': 'Não autenticado'}), 401
    
    # Verifica permissões de administrador
    if not verificar_admin(user):
        return jsonify({'erro': 'Permissão negada'}), 403
    
    data = request.json
    
    # Validação de dados
    if 'nome' not in data or not data['nome'].strip():
        return jsonify({'erro': 'Nome do laboratório é obrigatório'}), 400
    
    # Verifica se já existe um laboratório com o mesmo nome
    if Laboratorio.query.filter_by(nome=data['nome']).first():
        return jsonify({'erro': 'Já existe um laboratório com este nome'}), 400
    
    # Cria o laboratório
    try:
        novo_laboratorio = Laboratorio(nome=data['nome'])
        db.session.add(novo_laboratorio)
        db.session.commit()
        return jsonify(novo_laboratorio.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'erro': str(e)}), 500

@laboratorio_bp.route('/laboratorios/<int:id>', methods=['PUT'])
def atualizar_laboratorio(id):
    """
    Atualiza um laboratório existente.
    Apenas administradores podem atualizar laboratórios.
    """
    autenticado, user = verificar_autenticacao(request)
    if not autenticado:
        return jsonify({'erro': 'Não autenticado'}), 401
    
    # Verifica permissões de administrador
    if not verificar_admin(user):
        return jsonify({'erro': 'Permissão negada'}), 403
    
    laboratorio = Laboratorio.query.get(id)
    if not laboratorio:
        return jsonify({'erro': 'Laboratório não encontrado'}), 404
    
    data = request.json
    
    # Validação de dados
    if 'nome' not in data or not data['nome'].strip():
        return jsonify({'erro': 'Nome do laboratório é obrigatório'}), 400
    
    # Verifica se já existe outro laboratório com o mesmo nome
    lab_existente = Laboratorio.query.filter_by(nome=data['nome']).first()
    if lab_existente and lab_existente.id != id:
        return jsonify({'erro': 'Já existe outro laboratório com este nome'}), 400
    
    # Atualiza o laboratório
    try:
        laboratorio.nome = data['nome']
        db.session.commit()
        return jsonify(laboratorio.to_dict())
    except Exception as e:
        db.session.rollback()
        return jsonify({'erro': str(e)}), 500

@laboratorio_bp.route('/laboratorios/<int:id>', methods=['DELETE'])
def remover_laboratorio(id):
    """
    Remove um laboratório.
    Apenas administradores podem remover laboratórios.
    """
    autenticado, user = verificar_autenticacao(request)
    if not autenticado:
        return jsonify({'erro': 'Não autenticado'}), 401
    
    # Verifica permissões de administrador
    if not verificar_admin(user):
        return jsonify({'erro': 'Permissão negada'}), 403
    
    laboratorio = Laboratorio.query.get(id)
    if not laboratorio:
        return jsonify({'erro': 'Laboratório não encontrado'}), 404
    
    try:
        db.session.delete(laboratorio)
        db.session.commit()
        return jsonify({'mensagem': 'Laboratório removido com sucesso'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'erro': str(e)}), 500
