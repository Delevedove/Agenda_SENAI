from flask import Blueprint, request, jsonify
from src.models import db
from src.models.sala import Sala
from src.models.ocupacao import Ocupacao
from src.routes.user import verificar_autenticacao, verificar_admin
from datetime import datetime, date, time

sala_bp = Blueprint('sala', __name__)

@sala_bp.route('/salas', methods=['GET'])
def listar_salas():
    """
    Lista todas as salas com filtros opcionais.
    """
    autenticado, user = verificar_autenticacao(request)
    if not autenticado:
        return jsonify({'erro': 'Não autenticado'}), 401
    
    # Parâmetros de filtro
    status = request.args.get('status')
    tipo = request.args.get('tipo')
    capacidade_min = request.args.get('capacidade_min', type=int)
    
    # Constrói a query base
    query = Sala.query
    
    # Aplica filtros
    if status:
        query = query.filter(Sala.status == status)
    
    if tipo:
        query = query.filter(Sala.tipo == tipo)
    
    if capacidade_min:
        query = query.filter(Sala.capacidade >= capacidade_min)
    
    # Ordena por nome
    salas = query.order_by(Sala.nome).all()
    
    return jsonify([sala.to_dict() for sala in salas])

@sala_bp.route('/salas/<int:id>', methods=['GET'])
def obter_sala(id):
    """
    Obtém detalhes de uma sala específica.
    """
    autenticado, user = verificar_autenticacao(request)
    if not autenticado:
        return jsonify({'erro': 'Não autenticado'}), 401
    
    sala = Sala.query.get(id)
    if not sala:
        return jsonify({'erro': 'Sala não encontrada'}), 404
    
    return jsonify(sala.to_dict())

@sala_bp.route('/salas', methods=['POST'])
def criar_sala():
    """
    Cria uma nova sala.
    Apenas administradores podem criar salas.
    """
    autenticado, user = verificar_autenticacao(request)
    if not autenticado:
        return jsonify({'erro': 'Não autenticado'}), 401
    
    if not verificar_admin(user):
        return jsonify({'erro': 'Permissão negada'}), 403
    
    data = request.json
    
    # Validação de dados obrigatórios
    if not all(key in data for key in ['nome', 'capacidade']):
        return jsonify({'erro': 'Nome e capacidade são obrigatórios'}), 400
    
    # Verifica se o nome já existe
    if Sala.query.filter_by(nome=data['nome']).first():
        return jsonify({'erro': 'Já existe uma sala com este nome'}), 400
    
    # Validação de capacidade
    if not isinstance(data['capacidade'], int) or data['capacidade'] <= 0:
        return jsonify({'erro': 'Capacidade deve ser um número inteiro positivo'}), 400
    
    # Validação de status
    status_validos = ['ativa', 'inativa', 'manutencao']
    status = data.get('status', 'ativa')
    if status not in status_validos:
        return jsonify({'erro': f'Status deve ser um dos seguintes: {", ".join(status_validos)}'}), 400
    
    try:
        nova_sala = Sala(
            nome=data['nome'],
            capacidade=data['capacidade'],
            recursos=data.get('recursos', []),
            localizacao=data.get('localizacao'),
            tipo=data.get('tipo'),
            status=status,
            observacoes=data.get('observacoes')
        )
        
        db.session.add(nova_sala)
        db.session.commit()
        
        return jsonify(nova_sala.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'erro': str(e)}), 500

@sala_bp.route('/salas/<int:id>', methods=['PUT'])
def atualizar_sala(id):
    """
    Atualiza uma sala existente.
    Apenas administradores podem atualizar salas.
    """
    autenticado, user = verificar_autenticacao(request)
    if not autenticado:
        return jsonify({'erro': 'Não autenticado'}), 401
    
    if not verificar_admin(user):
        return jsonify({'erro': 'Permissão negada'}), 403
    
    sala = Sala.query.get(id)
    if not sala:
        return jsonify({'erro': 'Sala não encontrada'}), 404
    
    data = request.json
    
    # Atualiza os campos fornecidos
    if 'nome' in data:
        # Verifica se o nome já existe para outra sala
        sala_existente = Sala.query.filter_by(nome=data['nome']).first()
        if sala_existente and sala_existente.id != id:
            return jsonify({'erro': 'Já existe uma sala com este nome'}), 400
        sala.nome = data['nome']
    
    if 'capacidade' in data:
        if not isinstance(data['capacidade'], int) or data['capacidade'] <= 0:
            return jsonify({'erro': 'Capacidade deve ser um número inteiro positivo'}), 400
        sala.capacidade = data['capacidade']
    
    if 'recursos' in data:
        sala.set_recursos(data['recursos'])
    
    if 'localizacao' in data:
        sala.localizacao = data['localizacao']
    
    if 'tipo' in data:
        sala.tipo = data['tipo']
    
    if 'status' in data:
        status_validos = ['ativa', 'inativa', 'manutencao']
        if data['status'] not in status_validos:
            return jsonify({'erro': f'Status deve ser um dos seguintes: {", ".join(status_validos)}'}), 400
        sala.status = data['status']
    
    if 'observacoes' in data:
        sala.observacoes = data['observacoes']
    
    try:
        db.session.commit()
        return jsonify(sala.to_dict())
    except Exception as e:
        db.session.rollback()
        return jsonify({'erro': str(e)}), 500

@sala_bp.route('/salas/<int:id>', methods=['DELETE'])
def remover_sala(id):
    """
    Remove uma sala.
    Apenas administradores podem remover salas.
    Não permite remoção se houver ocupações futuras.
    """
    autenticado, user = verificar_autenticacao(request)
    if not autenticado:
        return jsonify({'erro': 'Não autenticado'}), 401
    
    if not verificar_admin(user):
        return jsonify({'erro': 'Permissão negada'}), 403
    
    sala = Sala.query.get(id)
    if not sala:
        return jsonify({'erro': 'Sala não encontrada'}), 404
    
    # Verifica se há ocupações futuras
    ocupacoes_futuras = Ocupacao.query.filter(
        Ocupacao.sala_id == id,
        Ocupacao.data >= date.today(),
        Ocupacao.status.in_(['confirmado', 'pendente'])
    ).count()
    
    if ocupacoes_futuras > 0:
        return jsonify({'erro': 'Não é possível remover sala com ocupações futuras'}), 400
    
    try:
        db.session.delete(sala)
        db.session.commit()
        return jsonify({'mensagem': 'Sala removida com sucesso'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'erro': str(e)}), 500

@sala_bp.route('/salas/<int:id>/disponibilidade', methods=['GET'])
def verificar_disponibilidade_sala(id):
    """
    Verifica a disponibilidade de uma sala em uma data e horário específicos.
    """
    autenticado, user = verificar_autenticacao(request)
    if not autenticado:
        return jsonify({'erro': 'Não autenticado'}), 401
    
    sala = Sala.query.get(id)
    if not sala:
        return jsonify({'erro': 'Sala não encontrada'}), 404
    
    # Parâmetros obrigatórios
    data_str = request.args.get('data')
    horario_inicio_str = request.args.get('horario_inicio')
    horario_fim_str = request.args.get('horario_fim')
    ocupacao_id = request.args.get('ocupacao_id', type=int)
    
    if not all([data_str, horario_inicio_str, horario_fim_str]):
        return jsonify({'erro': 'Data, horário de início e fim são obrigatórios'}), 400
    
    try:
        # Converte strings para objetos date e time
        data_verificacao = datetime.strptime(data_str, '%Y-%m-%d').date()
        horario_inicio = datetime.strptime(horario_inicio_str, '%H:%M').time()
        horario_fim = datetime.strptime(horario_fim_str, '%H:%M').time()
        
        # Verifica disponibilidade
        disponivel = sala.is_disponivel(data_verificacao, horario_inicio, horario_fim, ocupacao_id)
        
        # Se não estiver disponível, busca os conflitos
        conflitos = []
        if not disponivel:
            ocupacoes_conflitantes = Ocupacao.buscar_conflitos(
                id, data_verificacao, horario_inicio, horario_fim, ocupacao_id
            )
            conflitos = [ocupacao.to_dict(include_relations=False) for ocupacao in ocupacoes_conflitantes]
        
        return jsonify({
            'disponivel': disponivel,
            'sala': sala.to_dict(),
            'conflitos': conflitos
        })
        
    except ValueError:
        return jsonify({'erro': 'Formato de data ou horário inválido'}), 400
    except Exception as e:
        return jsonify({'erro': str(e)}), 500

@sala_bp.route('/salas/<int:id>/ocupacoes', methods=['GET'])
def listar_ocupacoes_sala(id):
    """
    Lista as ocupações de uma sala específica com filtros opcionais.
    """
    autenticado, user = verificar_autenticacao(request)
    if not autenticado:
        return jsonify({'erro': 'Não autenticado'}), 401
    
    sala = Sala.query.get(id)
    if not sala:
        return jsonify({'erro': 'Sala não encontrada'}), 404
    
    # Parâmetros de filtro
    data_inicio_str = request.args.get('data_inicio')
    data_fim_str = request.args.get('data_fim')
    status = request.args.get('status')
    
    # Query base
    query = Ocupacao.query.filter(Ocupacao.sala_id == id)
    
    # Aplica filtros de data
    if data_inicio_str:
        try:
            data_inicio = datetime.strptime(data_inicio_str, '%Y-%m-%d').date()
            query = query.filter(Ocupacao.data >= data_inicio)
        except ValueError:
            return jsonify({'erro': 'Formato de data_inicio inválido (YYYY-MM-DD)'}), 400
    
    if data_fim_str:
        try:
            data_fim = datetime.strptime(data_fim_str, '%Y-%m-%d').date()
            query = query.filter(Ocupacao.data <= data_fim)
        except ValueError:
            return jsonify({'erro': 'Formato de data_fim inválido (YYYY-MM-DD)'}), 400
    
    # Aplica filtro de status
    if status:
        query = query.filter(Ocupacao.status == status)
    
    # Ordena por data e horário
    ocupacoes = query.order_by(Ocupacao.data, Ocupacao.horario_inicio).all()
    
    return jsonify({
        'sala': sala.to_dict(),
        'ocupacoes': [ocupacao.to_dict() for ocupacao in ocupacoes]
    })

@sala_bp.route('/salas/tipos', methods=['GET'])
def listar_tipos_sala():
    """
    Lista os tipos de sala disponíveis.
    """
    autenticado, user = verificar_autenticacao(request)
    if not autenticado:
        return jsonify({'erro': 'Não autenticado'}), 401
    
    tipos = [
        {'valor': 'aula_teorica', 'nome': 'Aula Teórica'},
        {'valor': 'laboratorio', 'nome': 'Laboratório'},
        {'valor': 'auditorio', 'nome': 'Auditório'},
        {'valor': 'sala_reuniao', 'nome': 'Sala de Reunião'},
        {'valor': 'sala_multiuso', 'nome': 'Sala Multiuso'},
        {'valor': 'biblioteca', 'nome': 'Biblioteca'},
        {'valor': 'oficina', 'nome': 'Oficina'}
    ]
    
    return jsonify(tipos)

@sala_bp.route('/salas/recursos', methods=['GET'])
def listar_recursos_disponiveis():
    """
    Lista os recursos disponíveis para salas.
    """
    autenticado, user = verificar_autenticacao(request)
    if not autenticado:
        return jsonify({'erro': 'Não autenticado'}), 401
    
    recursos = [
        {'valor': 'tv', 'nome': 'TV/Monitor'},
        {'valor': 'projetor', 'nome': 'Projetor'},
        {'valor': 'quadro_branco', 'nome': 'Quadro Branco'},
        {'valor': 'climatizacao', 'nome': 'Climatização'},
        {'valor': 'computadores', 'nome': 'Computadores'},
        {'valor': 'wifi', 'nome': 'Wi-Fi'},
        {'valor': 'bancadas', 'nome': 'Bancadas'},
        {'valor': 'armarios', 'nome': 'Armários'},
        {'valor': 'tomadas', 'nome': 'Tomadas Extras'}
    ]
    
    return jsonify(recursos)

