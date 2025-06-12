from flask import Blueprint, request, jsonify
from src.models import db
from src.models.instrutor import Instrutor
from src.models.ocupacao import Ocupacao
from src.routes.user import verificar_autenticacao, verificar_admin
from datetime import datetime, date

instrutor_bp = Blueprint('instrutor', __name__)

@instrutor_bp.route('/instrutores', methods=['GET'])
def listar_instrutores():
    """
    Lista todos os instrutores com filtros opcionais.
    """
    autenticado, user = verificar_autenticacao(request)
    if not autenticado:
        return jsonify({'erro': 'Não autenticado'}), 401
    
    # Parâmetros de filtro
    status = request.args.get('status')
    area_atuacao = request.args.get('area_atuacao')
    capacidade = request.args.get('capacidade')  # Busca por capacidade específica
    
    # Constrói a query base
    query = Instrutor.query
    
    # Aplica filtros
    if status:
        query = query.filter(Instrutor.status == status)
    
    if area_atuacao:
        query = query.filter(Instrutor.area_atuacao.ilike(f'%{area_atuacao}%'))
    
    if capacidade:
        # Busca instrutores que podem ministrar um curso específico
        query = query.filter(Instrutor.capacidades.ilike(f'%{capacidade}%'))
    
    # Ordena por nome
    instrutores = query.order_by(Instrutor.nome).all()
    
    return jsonify([instrutor.to_dict() for instrutor in instrutores])

@instrutor_bp.route('/instrutores/<int:id>', methods=['GET'])
def obter_instrutor(id):
    """
    Obtém detalhes de um instrutor específico.
    """
    autenticado, user = verificar_autenticacao(request)
    if not autenticado:
        return jsonify({'erro': 'Não autenticado'}), 401
    
    instrutor = Instrutor.query.get(id)
    if not instrutor:
        return jsonify({'erro': 'Instrutor não encontrado'}), 404
    
    return jsonify(instrutor.to_dict())

@instrutor_bp.route('/instrutores', methods=['POST'])
def criar_instrutor():
    """
    Cria um novo instrutor.
    Apenas administradores podem criar instrutores.
    """
    autenticado, user = verificar_autenticacao(request)
    if not autenticado:
        return jsonify({'erro': 'Não autenticado'}), 401
    
    if not verificar_admin(user):
        return jsonify({'erro': 'Permissão negada'}), 403
    
    data = request.json
    
    # Validação de dados obrigatórios
    if not data.get('nome'):
        return jsonify({'erro': 'Nome é obrigatório'}), 400
    
    # Verifica se o email já existe (se fornecido)
    if data.get('email'):
        if Instrutor.query.filter_by(email=data['email']).first():
            return jsonify({'erro': 'Já existe um instrutor com este email'}), 400
    
    # Validação de status
    status_validos = ['ativo', 'inativo', 'licenca']
    status = data.get('status', 'ativo')
    if status not in status_validos:
        return jsonify({'erro': f'Status deve ser um dos seguintes: {", ".join(status_validos)}'}), 400
    
    try:
        novo_instrutor = Instrutor(
            nome=data['nome'],
            email=data.get('email'),
            telefone=data.get('telefone'),
            capacidades=data.get('capacidades', []),
            area_atuacao=data.get('area_atuacao'),
            disponibilidade=data.get('disponibilidade', []),
            status=status,
            observacoes=data.get('observacoes')
        )
        
        db.session.add(novo_instrutor)
        db.session.commit()
        
        return jsonify(novo_instrutor.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'erro': str(e)}), 500

@instrutor_bp.route('/instrutores/<int:id>', methods=['PUT'])
def atualizar_instrutor(id):
    """
    Atualiza um instrutor existente.
    Apenas administradores podem atualizar instrutores.
    """
    autenticado, user = verificar_autenticacao(request)
    if not autenticado:
        return jsonify({'erro': 'Não autenticado'}), 401
    
    if not verificar_admin(user):
        return jsonify({'erro': 'Permissão negada'}), 403
    
    instrutor = Instrutor.query.get(id)
    if not instrutor:
        return jsonify({'erro': 'Instrutor não encontrado'}), 404
    
    data = request.json
    
    # Atualiza os campos fornecidos
    if 'nome' in data:
        if not data['nome']:
            return jsonify({'erro': 'Nome não pode estar vazio'}), 400
        instrutor.nome = data['nome']
    
    if 'email' in data:
        if data['email']:
            # Verifica se o email já existe para outro instrutor
            instrutor_existente = Instrutor.query.filter_by(email=data['email']).first()
            if instrutor_existente and instrutor_existente.id != id:
                return jsonify({'erro': 'Já existe um instrutor com este email'}), 400
        instrutor.email = data['email']
    
    if 'telefone' in data:
        instrutor.telefone = data['telefone']
    
    if 'capacidades' in data:
        instrutor.set_capacidades(data['capacidades'])
    
    if 'area_atuacao' in data:
        instrutor.area_atuacao = data['area_atuacao']
    
    if 'disponibilidade' in data:
        instrutor.set_disponibilidade(data['disponibilidade'])
    
    if 'status' in data:
        status_validos = ['ativo', 'inativo', 'licenca']
        if data['status'] not in status_validos:
            return jsonify({'erro': f'Status deve ser um dos seguintes: {", ".join(status_validos)}'}), 400
        instrutor.status = data['status']
    
    if 'observacoes' in data:
        instrutor.observacoes = data['observacoes']
    
    try:
        db.session.commit()
        return jsonify(instrutor.to_dict())
    except Exception as e:
        db.session.rollback()
        return jsonify({'erro': str(e)}), 500

@instrutor_bp.route('/instrutores/<int:id>', methods=['DELETE'])
def remover_instrutor(id):
    """
    Remove um instrutor.
    Apenas administradores podem remover instrutores.
    Não permite remoção se houver ocupações futuras.
    """
    autenticado, user = verificar_autenticacao(request)
    if not autenticado:
        return jsonify({'erro': 'Não autenticado'}), 401
    
    if not verificar_admin(user):
        return jsonify({'erro': 'Permissão negada'}), 403
    
    instrutor = Instrutor.query.get(id)
    if not instrutor:
        return jsonify({'erro': 'Instrutor não encontrado'}), 404
    
    # Verifica se há ocupações futuras
    ocupacoes_futuras = Ocupacao.query.filter(
        Ocupacao.instrutor_id == id,
        Ocupacao.data >= date.today(),
        Ocupacao.status.in_(['confirmado', 'pendente'])
    ).count()
    
    if ocupacoes_futuras > 0:
        return jsonify({'erro': 'Não é possível remover instrutor com ocupações futuras'}), 400
    
    try:
        db.session.delete(instrutor)
        db.session.commit()
        return jsonify({'mensagem': 'Instrutor removido com sucesso'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'erro': str(e)}), 500

@instrutor_bp.route('/instrutores/<int:id>/disponibilidade', methods=['GET'])
def verificar_disponibilidade_instrutor(id):
    """
    Verifica a disponibilidade de um instrutor em uma data e horário específicos.
    """
    autenticado, user = verificar_autenticacao(request)
    if not autenticado:
        return jsonify({'erro': 'Não autenticado'}), 401
    
    instrutor = Instrutor.query.get(id)
    if not instrutor:
        return jsonify({'erro': 'Instrutor não encontrado'}), 404
    
    # Parâmetros obrigatórios
    data_str = request.args.get('data')
    horario_str = request.args.get('horario')
    
    if not all([data_str, horario_str]):
        return jsonify({'erro': 'Data e horário são obrigatórios'}), 400
    
    try:
        # Converte strings para objetos date e time
        data_verificacao = datetime.strptime(data_str, '%Y-%m-%d').date()
        horario = datetime.strptime(horario_str, '%H:%M').time()
        
        # Obtém o dia da semana
        dias = ['segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado', 'domingo']
        dia_semana = dias[data_verificacao.weekday()]
        
        # Verifica disponibilidade geral do instrutor
        # Usa o horário formatado para garantir comparação correta
        horario_formatado = horario.strftime('%H:%M')
        disponivel_horario = instrutor.is_disponivel_horario(dia_semana, horario_formatado)
        
        # Verifica se há ocupações conflitantes
        ocupacoes_dia = Ocupacao.query.filter(
            Ocupacao.instrutor_id == id,
            Ocupacao.data == data_verificacao,
            Ocupacao.status.in_(['confirmado', 'pendente'])
        ).all()
        
        conflitos = []
        for ocupacao in ocupacoes_dia:
            if ocupacao.horario_inicio <= horario <= ocupacao.horario_fim:
                conflitos.append(ocupacao.to_dict(include_relations=False))
        
        disponivel = disponivel_horario and len(conflitos) == 0
        
        return jsonify({
            'disponivel': disponivel,
            'disponivel_horario': disponivel_horario,
            'instrutor': instrutor.to_dict(),
            'conflitos': conflitos
        })
        
    except ValueError:
        return jsonify({'erro': 'Formato de data ou horário inválido'}), 400
    except Exception as e:
        return jsonify({'erro': str(e)}), 500

@instrutor_bp.route('/instrutores/<int:id>/ocupacoes', methods=['GET'])
def listar_ocupacoes_instrutor(id):
    """
    Lista as ocupações de um instrutor específico com filtros opcionais.
    """
    autenticado, user = verificar_autenticacao(request)
    if not autenticado:
        return jsonify({'erro': 'Não autenticado'}), 401
    
    instrutor = Instrutor.query.get(id)
    if not instrutor:
        return jsonify({'erro': 'Instrutor não encontrado'}), 404
    
    # Parâmetros de filtro
    data_inicio_str = request.args.get('data_inicio')
    data_fim_str = request.args.get('data_fim')
    status = request.args.get('status')
    
    # Query base
    query = Ocupacao.query.filter(Ocupacao.instrutor_id == id)
    
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
        'instrutor': instrutor.to_dict(),
        'ocupacoes': [ocupacao.to_dict() for ocupacao in ocupacoes]
    })

@instrutor_bp.route('/instrutores/<int:id>/capacidades', methods=['PUT'])
def atualizar_capacidades_instrutor(id):
    """
    Atualiza as capacidades técnicas de um instrutor.
    Apenas administradores podem atualizar capacidades.
    """
    autenticado, user = verificar_autenticacao(request)
    if not autenticado:
        return jsonify({'erro': 'Não autenticado'}), 401
    
    if not verificar_admin(user):
        return jsonify({'erro': 'Permissão negada'}), 403
    
    instrutor = Instrutor.query.get(id)
    if not instrutor:
        return jsonify({'erro': 'Instrutor não encontrado'}), 404
    
    data = request.json
    
    if 'capacidades' not in data:
        return jsonify({'erro': 'Lista de capacidades é obrigatória'}), 400
    
    if not isinstance(data['capacidades'], list):
        return jsonify({'erro': 'Capacidades deve ser uma lista'}), 400
    
    try:
        instrutor.set_capacidades(data['capacidades'])
        db.session.commit()
        
        return jsonify({
            'mensagem': 'Capacidades atualizadas com sucesso',
            'instrutor': instrutor.to_dict()
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({'erro': str(e)}), 500

@instrutor_bp.route('/instrutores/areas-atuacao', methods=['GET'])
def listar_areas_atuacao():
    """
    Lista as áreas de atuação disponíveis.
    """
    autenticado, user = verificar_autenticacao(request)
    if not autenticado:
        return jsonify({'erro': 'Não autenticado'}), 401
    
    areas = [
        {'valor': 'automacao_industrial', 'nome': 'Automação Industrial'},
        {'valor': 'eletromecanica', 'nome': 'Eletromecânica'},
        {'valor': 'eletrotecnica', 'nome': 'Eletrotécnica'},
        {'valor': 'mecanica', 'nome': 'Mecânica'},
        {'valor': 'metalurgia', 'nome': 'Metalurgia'},
        {'valor': 'mineracao', 'nome': 'Mineração'},
        {'valor': 'informatica', 'nome': 'Informática'},
        {'valor': 'logistica', 'nome': 'Logística'},
        {'valor': 'administracao', 'nome': 'Administração'},
        {'valor': 'seguranca_trabalho', 'nome': 'Segurança do Trabalho'},
        {'valor': 'meio_ambiente', 'nome': 'Meio Ambiente'},
        {'valor': 'outros', 'nome': 'Outros'}
    ]
    
    return jsonify(areas)

@instrutor_bp.route('/instrutores/capacidades-sugeridas', methods=['GET'])
def listar_capacidades_sugeridas():
    """
    Lista capacidades técnicas sugeridas para instrutores.
    Retorna capacidades gerais se nenhuma área for informada.
    """
    autenticado, user = verificar_autenticacao(request)
    if not autenticado:
        return jsonify({'erro': 'Não autenticado'}), 401

    area = request.args.get('area')

    capacidades_por_area = {
        'automacao_industrial': [
            'Programação de CLP', 'Instrumentação Industrial', 'Controle de Processos'
        ],
        'eletromecanica': [
            'Manutenção Eletromecânica', 'Comandos Elétricos', 'Desenho Mecânico'
        ],
        'eletrotecnica': [
            'Instalações Elétricas', 'Projetos Elétricos', 'NR10'
        ],
        'mecanica': [
            'Usinagem', 'Metrologia', 'Desenho Técnico'
        ],
        'metalurgia': [
            'Soldagem', 'Processos de Fundição', 'Tratamento Térmico'
        ],
        'mineracao': [
            'Operação de Mina', 'Beneficiamento Mineral', 'Segurança em Mineração'
        ],
        'informatica': [
            'Desenvolvimento de Sistemas', 'Redes de Computadores', 'Suporte e Manutenção'
        ],
        'logistica': [
            'Gestão de Estoques', 'Transporte e Distribuição', 'Logística Reversa'
        ],
        'administracao': [
            'Gestão Empresarial', 'Recursos Humanos', 'Planejamento Financeiro'
        ],
        'seguranca_trabalho': [
            'Normas Regulamentadoras', 'Higiene Ocupacional', 'Prevenção de Riscos'
        ],
        'meio_ambiente': [
            'Gestão Ambiental', 'Sustentabilidade', 'Tratamento de Resíduos'
        ],
        'outros': [
            'Comunicação', 'Empreendedorismo'
        ]
    }

    if area and area in capacidades_por_area:
        capacidades = capacidades_por_area[area]
    else:
        # Junta todas as capacidades disponíveis
        capacidades = sorted({c for lista in capacidades_por_area.values() for c in lista})

    return jsonify(capacidades)

