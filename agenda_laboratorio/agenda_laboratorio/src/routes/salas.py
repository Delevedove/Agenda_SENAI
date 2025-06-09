from flask import Blueprint, request, jsonify, session
from datetime import datetime, date, time
from src.models import db
from src.models.sala import Sala, Instrutor, ReservaSala
from src.models.user import User

# Blueprint para rotas de salas
salas_bp = Blueprint('salas', __name__)

# Função auxiliar para verificar autenticação (copiada do user.py)
def verificar_autenticacao():
    """
    Verifica se o usuário está autenticado através da sessão.
    
    Returns:
        User: Objeto do usuário autenticado ou None
    """
    user_id = session.get('user_id')
    if user_id:
        return User.query.get(user_id)
    return None

@salas_bp.route('/api/salas', methods=['GET'])
def listar_salas():
    """
    Lista todas as salas cadastradas.
    
    Returns:
        JSON: Lista de salas com seus dados
    """
    try:
        salas = Sala.query.all()
        return jsonify([sala.to_dict() for sala in salas]), 200
    except Exception as e:
        return jsonify({'erro': str(e)}), 500

@salas_bp.route('/api/salas', methods=['POST'])
def criar_sala():
    """
    Cria uma nova sala.
    Requer autenticação de administrador.
    
    Returns:
        JSON: Dados da sala criada ou erro
    """
    # Verificar autenticação
    usuario_autenticado = verificar_autenticacao()
    if not usuario_autenticado:
        return jsonify({'erro': 'Não autenticado'}), 401
    
    # Verificar se é administrador
    if usuario_autenticado.tipo != 'administrador':
        return jsonify({'erro': 'Acesso negado. Apenas administradores podem criar salas.'}), 403
    
    try:
        dados = request.get_json()
        
        # Validar dados obrigatórios
        if not dados.get('nome'):
            return jsonify({'erro': 'Nome da sala é obrigatório'}), 400
        
        if not dados.get('capacidade'):
            return jsonify({'erro': 'Capacidade da sala é obrigatória'}), 400
        
        # Verificar se já existe uma sala com o mesmo nome
        sala_existente = Sala.query.filter_by(nome=dados['nome']).first()
        if sala_existente:
            return jsonify({'erro': 'Já existe uma sala com este nome'}), 400
        
        # Criar nova sala
        nova_sala = Sala(
            nome=dados['nome'],
            capacidade=int(dados['capacidade']),
            recursos=dados.get('recursos', ''),
            tipo=dados.get('tipo', 'livre')
        )
        
        db.session.add(nova_sala)
        db.session.commit()
        
        return jsonify(nova_sala.to_dict()), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'erro': str(e)}), 500

@salas_bp.route('/api/salas/<int:sala_id>', methods=['PUT'])
def atualizar_sala(sala_id):
    """
    Atualiza uma sala existente.
    Requer autenticação de administrador.
    
    Args:
        sala_id (int): ID da sala a ser atualizada
        
    Returns:
        JSON: Dados da sala atualizada ou erro
    """
    # Verificar autenticação
    usuario_autenticado = verificar_autenticacao()
    if not usuario_autenticado:
        return jsonify({'erro': 'Não autenticado'}), 401
    
    # Verificar se é administrador
    if usuario_autenticado.tipo != 'administrador':
        return jsonify({'erro': 'Acesso negado. Apenas administradores podem atualizar salas.'}), 403
    
    try:
        sala = Sala.query.get(sala_id)
        if not sala:
            return jsonify({'erro': 'Sala não encontrada'}), 404
        
        dados = request.get_json()
        
        # Atualizar campos se fornecidos
        if 'nome' in dados:
            # Verificar se já existe outra sala com o mesmo nome
            sala_existente = Sala.query.filter(Sala.nome == dados['nome'], Sala.id != sala_id).first()
            if sala_existente:
                return jsonify({'erro': 'Já existe uma sala com este nome'}), 400
            sala.nome = dados['nome']
        
        if 'capacidade' in dados:
            sala.capacidade = int(dados['capacidade'])
        
        if 'recursos' in dados:
            sala.recursos = dados['recursos']
        
        if 'tipo' in dados:
            sala.tipo = dados['tipo']
        
        sala.data_atualizacao = datetime.utcnow()
        db.session.commit()
        
        return jsonify(sala.to_dict()), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'erro': str(e)}), 500

@salas_bp.route('/api/salas/<int:sala_id>', methods=['DELETE'])
def excluir_sala(sala_id):
    """
    Exclui uma sala.
    Requer autenticação de administrador.
    
    Args:
        sala_id (int): ID da sala a ser excluída
        
    Returns:
        JSON: Mensagem de sucesso ou erro
    """
    # Verificar autenticação
    usuario_autenticado = verificar_autenticacao()
    if not usuario_autenticado:
        return jsonify({'erro': 'Não autenticado'}), 401
    
    # Verificar se é administrador
    if usuario_autenticado.tipo != 'administrador':
        return jsonify({'erro': 'Acesso negado. Apenas administradores podem excluir salas.'}), 403
    
    try:
        sala = Sala.query.get(sala_id)
        if not sala:
            return jsonify({'erro': 'Sala não encontrada'}), 404
        
        # Verificar se há reservas associadas
        reservas = ReservaSala.query.filter_by(sala_id=sala_id).count()
        if reservas > 0:
            return jsonify({'erro': 'Não é possível excluir a sala pois há reservas associadas'}), 400
        
        db.session.delete(sala)
        db.session.commit()
        
        return jsonify({'mensagem': 'Sala excluída com sucesso'}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'erro': str(e)}), 500

@salas_bp.route('/api/instrutores', methods=['GET'])
def listar_instrutores():
    """
    Lista todos os instrutores cadastrados.
    
    Returns:
        JSON: Lista de instrutores com seus dados
    """
    try:
        instrutores = Instrutor.query.all()
        return jsonify([instrutor.to_dict() for instrutor in instrutores]), 200
    except Exception as e:
        return jsonify({'erro': str(e)}), 500

@salas_bp.route('/api/instrutores', methods=['POST'])
def criar_instrutor():
    """
    Cria um novo instrutor.
    Requer autenticação de administrador.
    
    Returns:
        JSON: Dados do instrutor criado ou erro
    """
    # Verificar autenticação
    usuario_autenticado = verificar_autenticacao()
    if not usuario_autenticado:
        return jsonify({'erro': 'Não autenticado'}), 401
    
    # Verificar se é administrador
    if usuario_autenticado.tipo != 'administrador':
        return jsonify({'erro': 'Acesso negado. Apenas administradores podem criar instrutores.'}), 403
    
    try:
        dados = request.get_json()
        
        # Validar dados obrigatórios
        if not dados.get('nome'):
            return jsonify({'erro': 'Nome do instrutor é obrigatório'}), 400
        
        if not dados.get('email'):
            return jsonify({'erro': 'Email do instrutor é obrigatório'}), 400
        
        # Verificar se já existe um instrutor com o mesmo email
        instrutor_existente = Instrutor.query.filter_by(email=dados['email']).first()
        if instrutor_existente:
            return jsonify({'erro': 'Já existe um instrutor com este email'}), 400
        
        # Criar novo instrutor
        novo_instrutor = Instrutor(
            nome=dados['nome'],
            email=dados['email'],
            area_atuacao=dados.get('area_atuacao', ''),
            cursos_possiveis=dados.get('cursos_possiveis', '')
        )
        
        db.session.add(novo_instrutor)
        db.session.commit()
        
        return jsonify(novo_instrutor.to_dict()), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'erro': str(e)}), 500

@salas_bp.route('/api/instrutores/<int:instrutor_id>', methods=['PUT'])
def atualizar_instrutor(instrutor_id):
    """
    Atualiza um instrutor existente.
    Requer autenticação de administrador.
    
    Args:
        instrutor_id (int): ID do instrutor a ser atualizado
        
    Returns:
        JSON: Dados do instrutor atualizado ou erro
    """
    # Verificar autenticação
    usuario_autenticado = verificar_autenticacao()
    if not usuario_autenticado:
        return jsonify({'erro': 'Não autenticado'}), 401
    
    # Verificar se é administrador
    if usuario_autenticado.tipo != 'administrador':
        return jsonify({'erro': 'Acesso negado. Apenas administradores podem atualizar instrutores.'}), 403
    
    try:
        instrutor = Instrutor.query.get(instrutor_id)
        if not instrutor:
            return jsonify({'erro': 'Instrutor não encontrado'}), 404
        
        dados = request.get_json()
        
        # Atualizar campos se fornecidos
        if 'nome' in dados:
            instrutor.nome = dados['nome']
        
        if 'email' in dados:
            # Verificar se já existe outro instrutor com o mesmo email
            instrutor_existente = Instrutor.query.filter(Instrutor.email == dados['email'], Instrutor.id != instrutor_id).first()
            if instrutor_existente:
                return jsonify({'erro': 'Já existe um instrutor com este email'}), 400
            instrutor.email = dados['email']
        
        if 'area_atuacao' in dados:
            instrutor.area_atuacao = dados['area_atuacao']
        
        if 'cursos_possiveis' in dados:
            instrutor.cursos_possiveis = dados['cursos_possiveis']
        
        instrutor.data_atualizacao = datetime.utcnow()
        db.session.commit()
        
        return jsonify(instrutor.to_dict()), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'erro': str(e)}), 500

@salas_bp.route('/api/instrutores/<int:instrutor_id>', methods=['DELETE'])
def excluir_instrutor(instrutor_id):
    """
    Exclui um instrutor.
    Requer autenticação de administrador.
    
    Args:
        instrutor_id (int): ID do instrutor a ser excluído
        
    Returns:
        JSON: Mensagem de sucesso ou erro
    """
    # Verificar autenticação
    usuario_autenticado = verificar_autenticacao()
    if not usuario_autenticado:
        return jsonify({'erro': 'Não autenticado'}), 401
    
    # Verificar se é administrador
    if usuario_autenticado.tipo != 'administrador':
        return jsonify({'erro': 'Acesso negado. Apenas administradores podem excluir instrutores.'}), 403
    
    try:
        instrutor = Instrutor.query.get(instrutor_id)
        if not instrutor:
            return jsonify({'erro': 'Instrutor não encontrado'}), 404
        
        # Verificar se há reservas associadas
        reservas = ReservaSala.query.filter_by(instrutor_id=instrutor_id).count()
        if reservas > 0:
            return jsonify({'erro': 'Não é possível excluir o instrutor pois há reservas associadas'}), 400
        
        db.session.delete(instrutor)
        db.session.commit()
        
        return jsonify({'mensagem': 'Instrutor excluído com sucesso'}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'erro': str(e)}), 500

@salas_bp.route('/api/reservas-salas', methods=['GET'])
def listar_reservas():
    """
    Lista todas as reservas de salas.
    Suporta filtros por data, sala, turno e curso.
    
    Returns:
        JSON: Lista de reservas com seus dados
    """
    try:
        # Construir query base
        query = ReservaSala.query
        
        # Aplicar filtros se fornecidos
        data_inicio = request.args.get('data_inicio')
        data_fim = request.args.get('data_fim')
        sala_id = request.args.get('sala_id')
        turno = request.args.get('turno')
        curso = request.args.get('curso')
        
        if data_inicio:
            data_inicio_obj = datetime.strptime(data_inicio, '%Y-%m-%d').date()
            query = query.filter(ReservaSala.data_reserva >= data_inicio_obj)
        
        if data_fim:
            data_fim_obj = datetime.strptime(data_fim, '%Y-%m-%d').date()
            query = query.filter(ReservaSala.data_reserva <= data_fim_obj)
        
        if sala_id:
            query = query.filter(ReservaSala.sala_id == int(sala_id))
        
        if turno:
            query = query.filter(ReservaSala.turno == turno)
        
        if curso:
            query = query.filter(ReservaSala.curso_evento.ilike(f'%{curso}%'))
        
        # Ordenar por data e horário
        reservas = query.order_by(ReservaSala.data_reserva, ReservaSala.horario_inicio).all()
        
        return jsonify([reserva.to_dict() for reserva in reservas]), 200
    except Exception as e:
        return jsonify({'erro': str(e)}), 500

@salas_bp.route('/api/reservas-salas', methods=['POST'])
def criar_reserva():
    """
    Cria uma nova reserva de sala.
    Verifica conflitos de horário.
    
    Returns:
        JSON: Dados da reserva criada ou erro
    """
    # Verificar autenticação
    usuario_autenticado = verificar_autenticacao()
    if not usuario_autenticado:
        return jsonify({'erro': 'Não autenticado'}), 401
    
    try:
        dados = request.get_json()
        
        # Validar dados obrigatórios
        campos_obrigatorios = ['sala_id', 'data_reserva', 'horario_inicio', 'horario_fim', 'curso_evento', 'turno']
        for campo in campos_obrigatorios:
            if not dados.get(campo):
                return jsonify({'erro': f'{campo} é obrigatório'}), 400
        
        # Converter dados
        data_reserva = datetime.strptime(dados['data_reserva'], '%Y-%m-%d').date()
        horario_inicio = datetime.strptime(dados['horario_inicio'], '%H:%M').time()
        horario_fim = datetime.strptime(dados['horario_fim'], '%H:%M').time()
        
        # Verificar se o horário de fim é posterior ao de início
        if horario_fim <= horario_inicio:
            return jsonify({'erro': 'Horário de fim deve ser posterior ao horário de início'}), 400
        
        # Verificar conflitos de horário
        conflitos = ReservaSala.query.filter(
            ReservaSala.sala_id == dados['sala_id'],
            ReservaSala.data_reserva == data_reserva,
            ReservaSala.horario_inicio < horario_fim,
            ReservaSala.horario_fim > horario_inicio
        ).first()
        
        if conflitos:
            return jsonify({'erro': 'Já existe uma reserva para esta sala neste horário'}), 400
        
        # Verificar se a sala existe
        sala = Sala.query.get(dados['sala_id'])
        if not sala:
            return jsonify({'erro': 'Sala não encontrada'}), 404
        
        # Verificar se o instrutor existe (se fornecido)
        instrutor_id = dados.get('instrutor_id')
        if instrutor_id:
            instrutor = Instrutor.query.get(instrutor_id)
            if not instrutor:
                return jsonify({'erro': 'Instrutor não encontrado'}), 404
        
        # Criar nova reserva
        nova_reserva = ReservaSala(
            sala_id=dados['sala_id'],
            usuario_id=usuario_autenticado.id,
            data_reserva=data_reserva,
            horario_inicio=horario_inicio,
            horario_fim=horario_fim,
            curso_evento=dados['curso_evento'],
            turno=dados['turno'],
            instrutor_id=instrutor_id,
            observacoes=dados.get('observacoes', '')
        )
        
        db.session.add(nova_reserva)
        db.session.commit()
        
        return jsonify(nova_reserva.to_dict()), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'erro': str(e)}), 500

@salas_bp.route('/api/reservas-salas/<int:reserva_id>', methods=['DELETE'])
def excluir_reserva(reserva_id):
    """
    Exclui uma reserva de sala.
    Usuários podem excluir apenas suas próprias reservas.
    Administradores podem excluir qualquer reserva.
    
    Args:
        reserva_id (int): ID da reserva a ser excluída
        
    Returns:
        JSON: Mensagem de sucesso ou erro
    """
    # Verificar autenticação
    usuario_autenticado = verificar_autenticacao()
    if not usuario_autenticado:
        return jsonify({'erro': 'Não autenticado'}), 401
    
    try:
        reserva = ReservaSala.query.get(reserva_id)
        if not reserva:
            return jsonify({'erro': 'Reserva não encontrada'}), 404
        
        # Verificar permissões
        if usuario_autenticado.tipo != 'administrador' and reserva.usuario_id != usuario_autenticado.id:
            return jsonify({'erro': 'Acesso negado. Você só pode excluir suas próprias reservas.'}), 403
        
        db.session.delete(reserva)
        db.session.commit()
        
        return jsonify({'mensagem': 'Reserva excluída com sucesso'}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'erro': str(e)}), 500

@salas_bp.route('/api/reservas-salas/calendario/<int:mes>/<int:ano>', methods=['GET'])
def obter_calendario_reservas(mes, ano):
    """
    Obtém as reservas de salas para um mês específico em formato de calendário.
    
    Args:
        mes (int): Mês (1-12)
        ano (int): Ano
        
    Returns:
        JSON: Reservas organizadas por data
    """
    try:
        # Validar mês e ano
        if mes < 1 or mes > 12:
            return jsonify({'erro': 'Mês inválido'}), 400
        
        if ano < 2020 or ano > 2030:
            return jsonify({'erro': 'Ano inválido'}), 400
        
        # Buscar reservas do mês
        from calendar import monthrange
        primeiro_dia = date(ano, mes, 1)
        ultimo_dia = date(ano, mes, monthrange(ano, mes)[1])
        
        reservas = ReservaSala.query.filter(
            ReservaSala.data_reserva >= primeiro_dia,
            ReservaSala.data_reserva <= ultimo_dia
        ).order_by(ReservaSala.data_reserva, ReservaSala.horario_inicio).all()
        
        # Organizar reservas por data
        calendario = {}
        for reserva in reservas:
            data_str = reserva.data_reserva.strftime('%Y-%m-%d')
            if data_str not in calendario:
                calendario[data_str] = []
            calendario[data_str].append(reserva.to_dict())
        
        return jsonify(calendario), 200
        
    except Exception as e:
        return jsonify({'erro': str(e)}), 500

