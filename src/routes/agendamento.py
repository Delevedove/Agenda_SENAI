from flask import Blueprint, request, jsonify
from datetime import datetime
import json
from src.models import db
from src.models.agendamento import Agendamento
from src.models.user import User
from src.routes.user import verificar_autenticacao, verificar_admin

agendamento_bp = Blueprint('agendamento', __name__)

@agendamento_bp.route('/agendamentos', methods=['GET'])
def listar_agendamentos():
    """
    Lista todos os agendamentos.
    Usuários comuns veem apenas seus próprios agendamentos.
    Administradores veem todos os agendamentos.
    """
    autenticado, user = verificar_autenticacao(request)
    if not autenticado:
        return jsonify({'erro': 'Não autenticado'}), 401
    
    if verificar_admin(user):
        # Administradores veem todos os agendamentos
        agendamentos = Agendamento.query.all()
    else:
        # Usuários comuns veem apenas seus próprios agendamentos
        agendamentos = Agendamento.query.filter_by(usuario_id=user.id).all()
    
    return jsonify([a.to_dict() for a in agendamentos])

@agendamento_bp.route('/agendamentos/<int:id>', methods=['GET'])
def obter_agendamento(id):
    """
    Obtém detalhes de um agendamento específico.
    Usuários comuns só podem ver seus próprios agendamentos.
    Administradores podem ver qualquer agendamento.
    """
    autenticado, user = verificar_autenticacao(request)
    if not autenticado:
        return jsonify({'erro': 'Não autenticado'}), 401
    
    agendamento = Agendamento.query.get(id)
    if not agendamento:
        return jsonify({'erro': 'Agendamento não encontrado'}), 404
    
    # Verifica permissões
    if not verificar_admin(user) and agendamento.usuario_id != user.id:
        return jsonify({'erro': 'Permissão negada'}), 403
    
    return jsonify(agendamento.to_dict())

@agendamento_bp.route('/agendamentos', methods=['POST'])
def criar_agendamento():
    """
    Cria um novo agendamento.
    Usuários comuns só podem criar agendamentos para si mesmos.
    Administradores podem criar agendamentos para qualquer usuário.
    """
    autenticado, user = verificar_autenticacao(request)
    if not autenticado:
        return jsonify({'erro': 'Não autenticado'}), 401
    
    data = request.json
    
    # Validação de dados
    campos_obrigatorios = ['data', 'laboratorio', 'turma', 'turno', 'horarios']
    if not all(campo in data for campo in campos_obrigatorios):
        return jsonify({'erro': 'Dados incompletos'}), 400
    
    # Verifica o formato da data
    try:
        data_agendamento = datetime.strptime(data['data'], '%Y-%m-%d').date()
    except ValueError:
        return jsonify({'erro': 'Formato de data inválido. Use YYYY-MM-DD'}), 400
    
    # Verifica o formato dos horários (deve ser uma string JSON válida)
    try:
        horarios = json.loads(data['horarios']) if isinstance(data['horarios'], str) else data['horarios']
        horarios_json = json.dumps(horarios)
    except json.JSONDecodeError:
        return jsonify({'erro': 'Formato de horários inválido'}), 400
    
    # Determina o usuário para o qual o agendamento será criado
    usuario_id = data.get('usuario_id', user.id)
    
    # Usuários comuns só podem criar agendamentos para si mesmos
    if not verificar_admin(user) and usuario_id != user.id:
        return jsonify({'erro': 'Permissão negada'}), 403
    
    # Verifica se o usuário existe
    if usuario_id != user.id:
        usuario_destino = User.query.get(usuario_id)
        if not usuario_destino:
            return jsonify({'erro': 'Usuário não encontrado'}), 404
    
    # Verifica conflitos de horários
    conflitos = verificar_conflitos_horarios(
        data_agendamento,
        data['laboratorio'],
        horarios_json,
        None  # Não há ID para comparar, pois é um novo agendamento
    )
    
    if conflitos:
        return jsonify({'erro': 'Conflito de horários', 'conflitos': conflitos}), 409
    
    # Cria o agendamento
    try:
        novo_agendamento = Agendamento(
            data=data_agendamento,
            laboratorio=data['laboratorio'],
            turma=data['turma'],
            turno=data['turno'],
            horarios=horarios_json,
            usuario_id=usuario_id
        )
        db.session.add(novo_agendamento)
        db.session.commit()
        return jsonify(novo_agendamento.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'erro': str(e)}), 500

@agendamento_bp.route('/agendamentos/<int:id>', methods=['PUT'])
def atualizar_agendamento(id):
    """
    Atualiza um agendamento existente.
    Usuários comuns só podem atualizar seus próprios agendamentos.
    Administradores podem atualizar qualquer agendamento.
    """
    autenticado, user = verificar_autenticacao(request)
    if not autenticado:
        return jsonify({'erro': 'Não autenticado'}), 401
    
    agendamento = Agendamento.query.get(id)
    if not agendamento:
        return jsonify({'erro': 'Agendamento não encontrado'}), 404
    
    # Verifica permissões
    if not verificar_admin(user) and agendamento.usuario_id != user.id:
        return jsonify({'erro': 'Permissão negada'}), 403
    
    data = request.json
    
    # Processa a data se fornecida
    data_agendamento = agendamento.data
    if 'data' in data:
        try:
            data_agendamento = datetime.strptime(data['data'], '%Y-%m-%d').date()
        except ValueError:
            return jsonify({'erro': 'Formato de data inválido. Use YYYY-MM-DD'}), 400
    
    # Processa os horários se fornecidos
    horarios_json = agendamento.horarios
    if 'horarios' in data:
        try:
            horarios = json.loads(data['horarios']) if isinstance(data['horarios'], str) else data['horarios']
            horarios_json = json.dumps(horarios)
        except json.JSONDecodeError:
            return jsonify({'erro': 'Formato de horários inválido'}), 400
    
    # Verifica conflitos de horários
    laboratorio = data.get('laboratorio', agendamento.laboratorio)
    conflitos = verificar_conflitos_horarios(
        data_agendamento,
        laboratorio,
        horarios_json,
        id  # ID do agendamento atual para excluir da verificação
    )
    
    if conflitos:
        return jsonify({'erro': 'Conflito de horários', 'conflitos': conflitos}), 409
    
    # Atualiza os campos fornecidos
    if 'data' in data:
        agendamento.data = data_agendamento
    if 'laboratorio' in data:
        agendamento.laboratorio = data['laboratorio']
    if 'turma' in data:
        agendamento.turma = data['turma']
    if 'turno' in data:
        agendamento.turno = data['turno']
    if 'horarios' in data:
        agendamento.horarios = horarios_json
    
    # Apenas administradores podem alterar o usuário responsável
    if 'usuario_id' in data and verificar_admin(user):
        usuario_destino = User.query.get(data['usuario_id'])
        if not usuario_destino:
            return jsonify({'erro': 'Usuário não encontrado'}), 404
        agendamento.usuario_id = data['usuario_id']
    
    try:
        db.session.commit()
        return jsonify(agendamento.to_dict())
    except Exception as e:
        db.session.rollback()
        return jsonify({'erro': str(e)}), 500

@agendamento_bp.route('/agendamentos/<int:id>', methods=['DELETE'])
def remover_agendamento(id):
    """
    Remove um agendamento.
    Usuários comuns só podem remover seus próprios agendamentos.
    Administradores podem remover qualquer agendamento.
    """
    autenticado, user = verificar_autenticacao(request)
    if not autenticado:
        return jsonify({'erro': 'Não autenticado'}), 401
    
    agendamento = Agendamento.query.get(id)
    if not agendamento:
        return jsonify({'erro': 'Agendamento não encontrado'}), 404
    
    # Verifica permissões
    if not verificar_admin(user) and agendamento.usuario_id != user.id:
        return jsonify({'erro': 'Permissão negada'}), 403
    
    try:
        db.session.delete(agendamento)
        db.session.commit()
        return jsonify({'mensagem': 'Agendamento removido com sucesso'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'erro': str(e)}), 500

@agendamento_bp.route('/agendamentos/calendario/<int:mes>/<int:ano>', methods=['GET'])
def agendamentos_calendario(mes, ano):
    """
    Obtém agendamentos para visualização em calendário.
    Filtra por mês e ano especificados.
    """
    autenticado, user = verificar_autenticacao(request)
    if not autenticado:
        return jsonify({'erro': 'Não autenticado'}), 401
    
    # Valida o mês e ano
    if not (1 <= mes <= 12):
        return jsonify({'erro': 'Mês inválido'}), 400
    
    if ano < 2000 or ano > 2100:  # Validação simples de ano
        return jsonify({'erro': 'Ano inválido'}), 400
    
    # Cria datas de início e fim do mês
    inicio_mes = datetime(ano, mes, 1).date()
    if mes == 12:
        fim_mes = datetime(ano + 1, 1, 1).date()
    else:
        fim_mes = datetime(ano, mes + 1, 1).date()
    
    # Consulta agendamentos no período
    if verificar_admin(user):
        # Administradores veem todos os agendamentos
        agendamentos = Agendamento.query.filter(
            Agendamento.data >= inicio_mes,
            Agendamento.data < fim_mes
        ).all()
    else:
        # Usuários comuns veem apenas seus próprios agendamentos
        agendamentos = Agendamento.query.filter(
            Agendamento.data >= inicio_mes,
            Agendamento.data < fim_mes,
            Agendamento.usuario_id == user.id
        ).all()
    
    return jsonify([a.to_dict() for a in agendamentos])

@agendamento_bp.route('/agendamentos/verificar-disponibilidade', methods=['GET'])
def verificar_disponibilidade():
    """
    Verifica a disponibilidade de horários para um laboratório em uma data e turno específicos.
    Retorna os agendamentos existentes para que o frontend possa determinar quais horários estão ocupados.
    """
    autenticado, user = verificar_autenticacao(request)
    if not autenticado:
        return jsonify({'erro': 'Não autenticado'}), 401
    
    # Obtém os parâmetros da requisição
    data_str = request.args.get('data')
    laboratorio = request.args.get('laboratorio')
    turno = request.args.get('turno')
    
    # Validação de parâmetros
    if not all([data_str, laboratorio, turno]):
        return jsonify({'erro': 'Parâmetros incompletos. Forneça data, laboratorio e turno.'}), 400
    
    # Converte a data para o formato correto
    try:
        data = datetime.strptime(data_str, '%Y-%m-%d').date()
    except ValueError:
        return jsonify({'erro': 'Formato de data inválido. Use YYYY-MM-DD'}), 400
    
    # Consulta agendamentos existentes para o laboratório, data e turno especificados
    agendamentos = Agendamento.query.filter(
        Agendamento.data == data,
        Agendamento.laboratorio == laboratorio,
        Agendamento.turno == turno
    ).all()
    
    # Retorna os agendamentos encontrados
    return jsonify([a.to_dict() for a in agendamentos])

def verificar_conflitos_horarios(data, laboratorio, horarios_json, agendamento_id=None):
    """
    Verifica se há conflitos de horários para um agendamento.
    
    Args:
        data: Data do agendamento
        laboratorio: Laboratório a ser agendado
        horarios_json: Horários em formato JSON
        agendamento_id: ID do agendamento atual (para excluir da verificação)
        
    Returns:
        list: Lista de conflitos encontrados
    """
    # Consulta agendamentos no mesmo dia e laboratório
    query = Agendamento.query.filter(
        Agendamento.data == data,
        Agendamento.laboratorio == laboratorio
    )
    
    # Exclui o agendamento atual da verificação (caso seja uma atualização)
    if agendamento_id:
        query = query.filter(Agendamento.id != agendamento_id)
    
    agendamentos_existentes = query.all()
    
    # Se não houver agendamentos no mesmo dia e laboratório, não há conflitos
    if not agendamentos_existentes:
        return []
    
    # Converte os horários do novo agendamento para um conjunto
    try:
        horarios_novos = set(json.loads(horarios_json))
    except:
        # Se não for possível converter, considera como lista vazia
        return ['Formato de horários inválido']
    
    conflitos = []
    
    # Verifica conflitos com cada agendamento existente
    for agendamento in agendamentos_existentes:
        try:
            horarios_existentes = set(json.loads(agendamento.horarios))
            # Se houver interseção entre os conjuntos de horários, há conflito
            intersecao = horarios_novos.intersection(horarios_existentes)
            if intersecao:
                conflitos.append({
                    'agendamento_id': agendamento.id,
                    'data': agendamento.data.isoformat(),
                    'laboratorio': agendamento.laboratorio,
                    'turma': agendamento.turma,
                    'horarios_conflitantes': list(intersecao)
                })
        except:
            # Ignora agendamentos com formato de horários inválido
            pass
    
    return conflitos
