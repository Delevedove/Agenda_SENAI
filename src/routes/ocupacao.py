from flask import Blueprint, request, jsonify, make_response, send_file
from src.models import db
from src.models.ocupacao import Ocupacao
from src.models.sala import Sala
from src.models.instrutor import Instrutor
from src.routes.user import verificar_autenticacao, verificar_admin
from datetime import datetime, date, time, timedelta
import csv
from io import StringIO, BytesIO
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from sqlalchemy import and_, or_

ocupacao_bp = Blueprint('ocupacao', __name__)

TURNOS_PADRAO = {
    'Manhã': (time.fromisoformat('08:00'), time.fromisoformat('12:00')),
    'Tarde': (time.fromisoformat('13:30'), time.fromisoformat('17:30')),
    'Noite': (time.fromisoformat('18:30'), time.fromisoformat('22:30'))
}

@ocupacao_bp.route('/ocupacoes', methods=['GET'])
def listar_ocupacoes():
    """
    Lista todas as ocupações com filtros opcionais.
    """
    autenticado, user = verificar_autenticacao(request)
    if not autenticado:
        return jsonify({'erro': 'Não autenticado'}), 401
    
    # Parâmetros de filtro
    data_inicio_str = request.args.get('data_inicio')
    data_fim_str = request.args.get('data_fim')
    sala_id = request.args.get('sala_id', type=int)
    instrutor_id = request.args.get('instrutor_id', type=int)
    status = request.args.get('status')
    tipo_ocupacao = request.args.get('tipo_ocupacao')
    curso_evento = request.args.get('curso_evento')
    
    # Query base
    query = Ocupacao.query
    
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
    
    # Aplica outros filtros
    if sala_id:
        query = query.filter(Ocupacao.sala_id == sala_id)
    
    if instrutor_id:
        query = query.filter(Ocupacao.instrutor_id == instrutor_id)
    
    if status:
        query = query.filter(Ocupacao.status == status)
    
    if tipo_ocupacao:
        query = query.filter(Ocupacao.tipo_ocupacao == tipo_ocupacao)
    
    if curso_evento:
        query = query.filter(Ocupacao.curso_evento.ilike(f'%{curso_evento}%'))
    
    # Controle de acesso: usuários comuns só veem suas próprias ocupações
    if not verificar_admin(user):
        query = query.filter(Ocupacao.usuario_id == user.id)
    
    # Ordena por data e horário
    ocupacoes = query.order_by(Ocupacao.data, Ocupacao.horario_inicio).all()

    return jsonify([ocupacao.to_dict() for ocupacao in ocupacoes])


@ocupacao_bp.route('/ocupacoes/export', methods=['GET'])
def exportar_ocupacoes():
    """Exporta ocupações em CSV ou PDF."""
    autenticado, user = verificar_autenticacao(request)
    if not autenticado:
        return jsonify({'erro': 'Não autenticado'}), 401

    formato = request.args.get('formato', 'csv').lower()

    if verificar_admin(user):
        ocupacoes = Ocupacao.query.all()
    else:
        ocupacoes = Ocupacao.query.filter_by(usuario_id=user.id).all()

    if formato == 'pdf':
        buffer = BytesIO()
        c = canvas.Canvas(buffer, pagesize=letter)
        c.drawString(50, 750, "Relatório de Ocupações")
        y = 730
        c.drawString(50, y, "ID  Sala  Data  Início  Fim  Status")
        y -= 20
        for oc in ocupacoes:
            sala = oc.sala.nome if oc.sala else oc.sala_id
            c.drawString(50, y, f"{oc.id}  {sala}  {oc.data}  {oc.horario_inicio}  {oc.horario_fim}  {oc.status}")
            y -= 20
            if y < 50:
                c.showPage()
                y = 750
        c.save()
        buffer.seek(0)
        return send_file(buffer, mimetype='application/pdf', as_attachment=True, download_name='ocupacoes.pdf')

    # CSV padrão
    si = StringIO()
    writer = csv.writer(si)
    writer.writerow(["ID", "Sala", "Data", "Início", "Fim", "Status"])
    for oc in ocupacoes:
        sala = oc.sala.nome if oc.sala else oc.sala_id
        writer.writerow([oc.id, sala, oc.data, oc.horario_inicio, oc.horario_fim, oc.status])
    output = make_response(si.getvalue())
    output.headers["Content-Disposition"] = "attachment; filename=ocupacoes.csv"
    output.headers["Content-Type"] = "text/csv"
    return output

@ocupacao_bp.route('/ocupacoes/<int:id>', methods=['GET'])
def obter_ocupacao(id):
    """
    Obtém detalhes de uma ocupação específica.
    """
    autenticado, user = verificar_autenticacao(request)
    if not autenticado:
        return jsonify({'erro': 'Não autenticado'}), 401
    
    ocupacao = db.session.get(Ocupacao, id)
    if not ocupacao:
        return jsonify({'erro': 'Ocupação não encontrada'}), 404
    
    # Controle de acesso: usuários comuns só podem ver suas próprias ocupações
    if not verificar_admin(user) and ocupacao.usuario_id != user.id:
        return jsonify({'erro': 'Permissão negada'}), 403
    
    return jsonify(ocupacao.to_dict())

@ocupacao_bp.route('/ocupacoes', methods=['POST'])
def criar_ocupacao():
    """
    Cria uma nova ocupação.
    """
    autenticado, user = verificar_autenticacao(request)
    if not autenticado:
        return jsonify({'erro': 'Não autenticado'}), 401
    
    data = request.json
    
    # Validação de dados obrigatórios
    campos_obrigatorios = ['sala_id', 'curso_evento', 'data_inicio', 'data_fim', 'turno']
    if not all(key in data for key in campos_obrigatorios):
        return jsonify({'erro': 'Campos obrigatórios: sala_id, curso_evento, data_inicio, data_fim, turno'}), 400
    
    # Verifica se a sala existe
    sala = db.session.get(Sala, data['sala_id'])
    if not sala:
        return jsonify({'erro': 'Sala não encontrada'}), 404
    
    # Verifica se o instrutor existe (se fornecido)
    instrutor = None
    if data.get('instrutor_id'):
        instrutor = db.session.get(Instrutor, data['instrutor_id'])
        if not instrutor:
            return jsonify({'erro': 'Instrutor não encontrado'}), 404
    
    try:
        data_inicio = datetime.strptime(data['data_inicio'], '%Y-%m-%d').date()
        data_fim = datetime.strptime(data['data_fim'], '%Y-%m-%d').date()

        if data_inicio > data_fim:
            return jsonify({'erro': 'Data de início deve ser anterior ou igual à data de fim'}), 400

        if data_inicio < date.today():
            return jsonify({'erro': 'Não é possível agendar para datas passadas'}), 400

        if data['turno'] not in TURNOS_PADRAO:
            return jsonify({'erro': 'Turno inválido'}), 400

        horario_inicio, horario_fim = TURNOS_PADRAO[data['turno']]

        conflitos_totais = []
        dia = data_inicio
        while dia <= data_fim:
            if not sala.is_disponivel(dia, horario_inicio, horario_fim):
                conflitos = Ocupacao.buscar_conflitos(data['sala_id'], dia, horario_inicio, horario_fim)
                conflitos_totais.extend(conflitos)
            dia += timedelta(days=1)

        if conflitos_totais:
            return jsonify({
                'erro': 'Sala não disponível no turno solicitado',
                'conflitos': [c.to_dict(include_relations=False) for c in conflitos_totais]
            }), 409
        
        # Verifica disponibilidade do instrutor (se fornecido)
        if instrutor:
            ocupacoes_instrutor = []
            dia = data_inicio
            while dia <= data_fim:
                ocorrencias = Ocupacao.query.filter(
                    Ocupacao.instrutor_id == instrutor.id,
                    Ocupacao.data == dia,
                    Ocupacao.status.in_(['confirmado', 'pendente']),
                    or_(
                        and_(Ocupacao.horario_inicio <= horario_inicio, Ocupacao.horario_fim > horario_inicio),
                        and_(Ocupacao.horario_inicio < horario_fim, Ocupacao.horario_fim >= horario_fim),
                        and_(Ocupacao.horario_inicio >= horario_inicio, Ocupacao.horario_fim <= horario_fim)
                    )
                ).all()
                ocupacoes_instrutor.extend(ocorrencias)
                dia += timedelta(days=1)

            if ocupacoes_instrutor:
                return jsonify({
                    'erro': 'Instrutor não disponível no turno solicitado',
                    'conflitos': [c.to_dict(include_relations=False) for c in ocupacoes_instrutor]
                }), 409
        
        # Validação de tipo de ocupação
        tipos_validos = ['aula_regular', 'evento_especial', 'reuniao', 'manutencao', 'reserva_especial']
        tipo_ocupacao = data.get('tipo_ocupacao', 'aula_regular')
        if tipo_ocupacao not in tipos_validos:
            return jsonify({'erro': f'Tipo de ocupação deve ser um dos seguintes: {", ".join(tipos_validos)}'}), 400
        
        # Validação de recorrência
        recorrencias_validas = ['unica', 'semanal', 'mensal']
        recorrencia = data.get('recorrencia', 'unica')
        if recorrencia not in recorrencias_validas:
            return jsonify({'erro': f'Recorrência deve ser uma das seguintes: {", ".join(recorrencias_validas)}'}), 400
        
        ocupacoes_criadas = []
        dia = data_inicio
        while dia <= data_fim:
            nova_ocupacao = Ocupacao(
                sala_id=data['sala_id'],
                instrutor_id=data.get('instrutor_id'),
                usuario_id=user.id,
                curso_evento=data['curso_evento'],
                data=dia,
                horario_inicio=horario_inicio,
                horario_fim=horario_fim,
                tipo_ocupacao=tipo_ocupacao,
                recorrencia=recorrencia,
                status=data.get('status', 'confirmado'),
                observacoes=data.get('observacoes')
            )
            db.session.add(nova_ocupacao)
            ocupacoes_criadas.append(nova_ocupacao)
            dia += timedelta(days=1)

        db.session.commit()

        return jsonify([o.to_dict() for o in ocupacoes_criadas]), 201
        
    except ValueError:
        return jsonify({'erro': 'Formato de data ou horário inválido'}), 400
    except Exception as e:
        db.session.rollback()
        return jsonify({'erro': str(e)}), 500

@ocupacao_bp.route('/ocupacoes/<int:id>', methods=['PUT'])
def atualizar_ocupacao(id):
    """
    Atualiza uma ocupação existente.
    """
    autenticado, user = verificar_autenticacao(request)
    if not autenticado:
        return jsonify({'erro': 'Não autenticado'}), 401
    
    ocupacao = db.session.get(Ocupacao, id)
    if not ocupacao:
        return jsonify({'erro': 'Ocupação não encontrada'}), 404
    
    # Verifica permissões
    if not ocupacao.pode_ser_editada_por(user):
        return jsonify({'erro': 'Permissão negada'}), 403
    
    data = request.json
    
    try:
        # Atualiza sala se fornecida
        if 'sala_id' in data:
            sala = db.session.get(Sala, data['sala_id'])
            if not sala:
                return jsonify({'erro': 'Sala não encontrada'}), 404
            ocupacao.sala_id = data['sala_id']
        
        # Atualiza instrutor se fornecido
        if 'instrutor_id' in data:
            if data['instrutor_id']:
                instrutor = db.session.get(Instrutor, data['instrutor_id'])
                if not instrutor:
                    return jsonify({'erro': 'Instrutor não encontrado'}), 404
            ocupacao.instrutor_id = data['instrutor_id']
        
        # Atualiza data e horários se fornecidos
        data_ocupacao = ocupacao.data
        horario_inicio = ocupacao.horario_inicio
        horario_fim = ocupacao.horario_fim

        if 'data_inicio' in data:
            data_ocupacao = datetime.strptime(data['data_inicio'], '%Y-%m-%d').date()
            if data_ocupacao < date.today():
                return jsonify({'erro': 'Não é possível agendar para datas passadas'}), 400
            ocupacao.data = data_ocupacao
        elif 'data' in data:
            data_ocupacao = datetime.strptime(data['data'], '%Y-%m-%d').date()
            if data_ocupacao < date.today():
                return jsonify({'erro': 'Não é possível agendar para datas passadas'}), 400
            ocupacao.data = data_ocupacao

        if 'turno' in data:
            if data['turno'] not in TURNOS_PADRAO:
                return jsonify({'erro': 'Turno inválido'}), 400
            horario_inicio, horario_fim = TURNOS_PADRAO[data['turno']]
            ocupacao.horario_inicio = horario_inicio
            ocupacao.horario_fim = horario_fim
        else:
            if 'horario_inicio' in data:
                horario_inicio = datetime.strptime(data['horario_inicio'], '%H:%M').time()
                ocupacao.horario_inicio = horario_inicio
            if 'horario_fim' in data:
                horario_fim = datetime.strptime(data['horario_fim'], '%H:%M').time()
                ocupacao.horario_fim = horario_fim
        
        # Validação de horários
        if horario_inicio >= horario_fim:
            return jsonify({'erro': 'Horário de início deve ser anterior ao horário de fim'}), 400
        
        # Verifica disponibilidade da sala (excluindo a ocupação atual)
        sala = db.session.get(Sala, ocupacao.sala_id)
        if not sala.is_disponivel(data_ocupacao, horario_inicio, horario_fim, ocupacao.id):
            conflitos = Ocupacao.buscar_conflitos(ocupacao.sala_id, data_ocupacao, horario_inicio, horario_fim, ocupacao.id)
            return jsonify({
                'erro': 'Sala não disponível no horário solicitado',
                'conflitos': [c.to_dict(include_relations=False) for c in conflitos]
            }), 409
        
        # Atualiza outros campos
        if 'curso_evento' in data:
            ocupacao.curso_evento = data['curso_evento']
        
        if 'tipo_ocupacao' in data:
            tipos_validos = ['aula_regular', 'evento_especial', 'reuniao', 'manutencao', 'reserva_especial']
            if data['tipo_ocupacao'] not in tipos_validos:
                return jsonify({'erro': f'Tipo de ocupação deve ser um dos seguintes: {", ".join(tipos_validos)}'}), 400
            ocupacao.tipo_ocupacao = data['tipo_ocupacao']
        
        if 'status' in data:
            status_validos = ['confirmado', 'pendente', 'cancelado']
            if data['status'] not in status_validos:
                return jsonify({'erro': f'Status deve ser um dos seguintes: {", ".join(status_validos)}'}), 400
            ocupacao.status = data['status']
        
        if 'observacoes' in data:
            ocupacao.observacoes = data['observacoes']
        
        db.session.commit()
        return jsonify(ocupacao.to_dict())
        
    except ValueError:
        return jsonify({'erro': 'Formato de data ou horário inválido'}), 400
    except Exception as e:
        db.session.rollback()
        return jsonify({'erro': str(e)}), 500

@ocupacao_bp.route('/ocupacoes/<int:id>', methods=['DELETE'])
def remover_ocupacao(id):
    """
    Remove uma ocupação.
    """
    autenticado, user = verificar_autenticacao(request)
    if not autenticado:
        return jsonify({'erro': 'Não autenticado'}), 401
    
    ocupacao = db.session.get(Ocupacao, id)
    if not ocupacao:
        return jsonify({'erro': 'Ocupação não encontrada'}), 404
    
    # Verifica permissões
    if not ocupacao.pode_ser_editada_por(user):
        return jsonify({'erro': 'Permissão negada'}), 403
    
    try:
        db.session.delete(ocupacao)
        db.session.commit()
        return jsonify({'mensagem': 'Ocupação removida com sucesso'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'erro': str(e)}), 500

@ocupacao_bp.route('/ocupacoes/verificar-disponibilidade', methods=['GET'])
def verificar_disponibilidade():
    """
    Verifica a disponibilidade de uma sala em uma data e horário específicos.
    """
    autenticado, user = verificar_autenticacao(request)
    if not autenticado:
        return jsonify({'erro': 'Não autenticado'}), 401
    
    # Parâmetros obrigatórios
    sala_id = request.args.get('sala_id', type=int)
    data_inicio_str = request.args.get('data_inicio')
    data_fim_str = request.args.get('data_fim')
    turno = request.args.get('turno')
    ocupacao_id = request.args.get('ocupacao_id', type=int)  # Para edição

    if not all([sala_id, data_inicio_str, data_fim_str, turno]):
        return jsonify({'erro': 'Parâmetros obrigatórios: sala_id, data_inicio, data_fim, turno'}), 400
    
    # Verifica se a sala existe
    sala = db.session.get(Sala, sala_id)
    if not sala:
        return jsonify({'erro': 'Sala não encontrada'}), 404
    
    try:
        data_inicio = datetime.strptime(data_inicio_str, '%Y-%m-%d').date()
        data_fim = datetime.strptime(data_fim_str, '%Y-%m-%d').date()

        if data_inicio > data_fim:
            return jsonify({'erro': 'Data de início deve ser anterior ou igual à data de fim'}), 400

        if turno not in TURNOS_PADRAO:
            return jsonify({'erro': 'Turno inválido'}), 400

        horario_inicio, horario_fim = TURNOS_PADRAO[turno]

        disponivel = True
        conflitos = []
        dia = data_inicio
        while dia <= data_fim:
            if not sala.is_disponivel(dia, horario_inicio, horario_fim, ocupacao_id):
                disponivel = False
                conflitos.extend(Ocupacao.buscar_conflitos(sala_id, dia, horario_inicio, horario_fim, ocupacao_id))
            dia += timedelta(days=1)
        
        return jsonify({
            'disponivel': disponivel,
            'sala': sala.to_dict(),
            'conflitos': conflitos
        })
        
    except ValueError:
        return jsonify({'erro': 'Formato de data ou horário inválido'}), 400
    except Exception as e:
        return jsonify({'erro': str(e)}), 500

@ocupacao_bp.route('/ocupacoes/calendario', methods=['GET'])
def obter_ocupacoes_calendario():
    """
    Obtém ocupações formatadas para exibição em calendário.
    """
    autenticado, user = verificar_autenticacao(request)
    if not autenticado:
        return jsonify({'erro': 'Não autenticado'}), 401
    
    # Parâmetros de filtro
    data_inicio_str = request.args.get('data_inicio')
    data_fim_str = request.args.get('data_fim')
    sala_id = request.args.get('sala_id', type=int)
    
    # Define período padrão (mês atual) se não fornecido
    if not data_inicio_str or not data_fim_str:
        hoje = date.today()
        primeiro_dia = hoje.replace(day=1)
        if hoje.month == 12:
            ultimo_dia = date(hoje.year + 1, 1, 1) - timedelta(days=1)
        else:
            ultimo_dia = date(hoje.year, hoje.month + 1, 1) - timedelta(days=1)
        
        data_inicio = primeiro_dia
        data_fim = ultimo_dia
    else:
        try:
            data_inicio = datetime.strptime(data_inicio_str, '%Y-%m-%d').date()
            data_fim = datetime.strptime(data_fim_str, '%Y-%m-%d').date()
        except ValueError:
            return jsonify({'erro': 'Formato de data inválido (YYYY-MM-DD)'}), 400
    
    # Query base
    query = Ocupacao.query.filter(
        Ocupacao.data >= data_inicio,
        Ocupacao.data <= data_fim,
        Ocupacao.status.in_(['confirmado', 'pendente'])
    )
    
    # Aplica filtro de sala se fornecido
    if sala_id:
        query = query.filter(Ocupacao.sala_id == sala_id)
    
    # Controle de acesso: usuários comuns só veem suas próprias ocupações
    if not verificar_admin(user):
        query = query.filter(Ocupacao.usuario_id == user.id)
    
    ocupacoes = query.order_by(Ocupacao.data, Ocupacao.horario_inicio).all()
    
    # Formata para o calendário
    eventos_calendario = []
    for ocupacao in ocupacoes:
        evento = {
            'id': ocupacao.id,
            'title': f"{ocupacao.curso_evento}",
            'start': f"{ocupacao.data}T{ocupacao.horario_inicio}",
            'end': f"{ocupacao.data}T{ocupacao.horario_fim}",
            'backgroundColor': ocupacao.get_cor_tipo(),
            'borderColor': ocupacao.get_cor_tipo(),
            'extendedProps': ocupacao.to_dict()
        }
        eventos_calendario.append(evento)
    
    return jsonify(eventos_calendario)

@ocupacao_bp.route('/ocupacoes/tipos', methods=['GET'])
def listar_tipos_ocupacao():
    """
    Lista os tipos de ocupação disponíveis.
    """
    autenticado, user = verificar_autenticacao(request)
    if not autenticado:
        return jsonify({'erro': 'Não autenticado'}), 401
    
    tipos = [
        {'valor': 'aula_regular', 'nome': 'Aula Regular', 'cor': '#4CAF50'},
        {'valor': 'evento_especial', 'nome': 'Evento Especial', 'cor': '#FF9800'},
        {'valor': 'reuniao', 'nome': 'Reunião', 'cor': '#2196F3'},
        {'valor': 'manutencao', 'nome': 'Manutenção', 'cor': '#F44336'},
        {'valor': 'reserva_especial', 'nome': 'Reserva Especial', 'cor': '#9C27B0'}
    ]
    
    return jsonify(tipos)

@ocupacao_bp.route('/ocupacoes/relatorio', methods=['GET'])
def gerar_relatorio_ocupacoes():
    """
    Gera relatório de ocupações com estatísticas.
    Apenas administradores podem acessar.
    """
    autenticado, user = verificar_autenticacao(request)
    if not autenticado:
        return jsonify({'erro': 'Não autenticado'}), 401
    
    if not verificar_admin(user):
        return jsonify({'erro': 'Permissão negada'}), 403
    
    # Parâmetros de filtro
    data_inicio_str = request.args.get('data_inicio')
    data_fim_str = request.args.get('data_fim')
    
    # Define período padrão (mês atual) se não fornecido
    if not data_inicio_str or not data_fim_str:
        hoje = date.today()
        primeiro_dia = hoje.replace(day=1)
        if hoje.month == 12:
            ultimo_dia = date(hoje.year + 1, 1, 1) - timedelta(days=1)
        else:
            ultimo_dia = date(hoje.year, hoje.month + 1, 1) - timedelta(days=1)
        
        data_inicio = primeiro_dia
        data_fim = ultimo_dia
    else:
        try:
            data_inicio = datetime.strptime(data_inicio_str, '%Y-%m-%d').date()
            data_fim = datetime.strptime(data_fim_str, '%Y-%m-%d').date()
        except ValueError:
            return jsonify({'erro': 'Formato de data inválido (YYYY-MM-DD)'}), 400
    
    # Estatísticas gerais
    total_ocupacoes = Ocupacao.query.filter(
        Ocupacao.data >= data_inicio,
        Ocupacao.data <= data_fim
    ).count()
    
    ocupacoes_confirmadas = Ocupacao.query.filter(
        Ocupacao.data >= data_inicio,
        Ocupacao.data <= data_fim,
        Ocupacao.status == 'confirmado'
    ).count()
    
    ocupacoes_pendentes = Ocupacao.query.filter(
        Ocupacao.data >= data_inicio,
        Ocupacao.data <= data_fim,
        Ocupacao.status == 'pendente'
    ).count()
    
    ocupacoes_canceladas = Ocupacao.query.filter(
        Ocupacao.data >= data_inicio,
        Ocupacao.data <= data_fim,
        Ocupacao.status == 'cancelado'
    ).count()
    
    # Estatísticas por sala
    salas_mais_utilizadas = db.session.query(
        Sala.nome,
        db.func.count(Ocupacao.id).label('total_ocupacoes')
    ).join(Ocupacao).filter(
        Ocupacao.data >= data_inicio,
        Ocupacao.data <= data_fim,
        Ocupacao.status.in_(['confirmado', 'pendente'])
    ).group_by(Sala.id, Sala.nome).order_by(db.desc('total_ocupacoes')).limit(10).all()
    
    # Estatísticas por tipo de ocupação
    ocupacoes_por_tipo = db.session.query(
        Ocupacao.tipo_ocupacao,
        db.func.count(Ocupacao.id).label('total')
    ).filter(
        Ocupacao.data >= data_inicio,
        Ocupacao.data <= data_fim,
        Ocupacao.status.in_(['confirmado', 'pendente'])
    ).group_by(Ocupacao.tipo_ocupacao).all()
    
    relatorio = {
        'periodo': {
            'data_inicio': data_inicio.isoformat(),
            'data_fim': data_fim.isoformat()
        },
        'estatisticas_gerais': {
            'total_ocupacoes': total_ocupacoes,
            'ocupacoes_confirmadas': ocupacoes_confirmadas,
            'ocupacoes_pendentes': ocupacoes_pendentes,
            'ocupacoes_canceladas': ocupacoes_canceladas
        },
        'salas_mais_utilizadas': [
            {'sala': sala, 'total_ocupacoes': total} 
            for sala, total in salas_mais_utilizadas
        ],
        'ocupacoes_por_tipo': [
            {'tipo': tipo or 'Não especificado', 'total': total} 
            for tipo, total in ocupacoes_por_tipo
        ]
    }
    
    return jsonify(relatorio)

