from datetime import datetime
from src.models import db

class Sala(db.Model):
    """
    Modelo de sala de aula do sistema.
    
    Atributos:
        id (int): Identificador único da sala
        nome (str): Nome da sala
        capacidade (int): Capacidade máxima de pessoas
        recursos (str): Recursos disponíveis (TV, quadro, climatização, etc.)
        tipo (str): Tipo de sala ('fixa' ou 'livre')
        data_criacao (datetime): Data de criação do registro
        data_atualizacao (datetime): Data da última atualização do registro
    """
    __tablename__ = 'salas'
    
    id = db.Column(db.Integer, primary_key=True)
    nome = db.Column(db.String(100), nullable=False, unique=True)
    capacidade = db.Column(db.Integer, nullable=False)
    recursos = db.Column(db.Text)
    tipo = db.Column(db.String(20), nullable=False, default='livre')  # 'fixa' ou 'livre'
    data_criacao = db.Column(db.DateTime, default=datetime.utcnow)
    data_atualizacao = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relacionamento com reservas
    reservas = db.relationship('ReservaSala', backref='sala', lazy=True)
    
    def __init__(self, nome, capacidade, recursos=None, tipo='livre'):
        """
        Inicializa uma nova sala.
        
        Args:
            nome (str): Nome da sala
            capacidade (int): Capacidade máxima de pessoas
            recursos (str, opcional): Recursos disponíveis
            tipo (str, opcional): Tipo de sala ('fixa' ou 'livre'). Padrão é 'livre'.
        """
        self.nome = nome
        self.capacidade = capacidade
        self.recursos = recursos
        self.tipo = tipo
    
    def to_dict(self):
        """
        Converte o objeto sala em um dicionário para serialização.
        
        Returns:
            dict: Dicionário com os dados da sala
        """
        return {
            'id': self.id,
            'nome': self.nome,
            'capacidade': self.capacidade,
            'recursos': self.recursos,
            'tipo': self.tipo,
            'data_criacao': self.data_criacao.isoformat() if self.data_criacao else None,
            'data_atualizacao': self.data_atualizacao.isoformat() if self.data_atualizacao else None
        }
    
    def __repr__(self):
        """
        Representação em string do objeto sala.
        
        Returns:
            str: Representação em string
        """
        return f"<Sala {self.nome}>"


class Instrutor(db.Model):
    """
    Modelo de instrutor do sistema.
    
    Atributos:
        id (int): Identificador único do instrutor
        nome (str): Nome completo do instrutor
        email (str): Email do instrutor
        area_atuacao (str): Área de atuação do instrutor
        cursos_possiveis (str): Cursos que o instrutor pode ministrar
        data_criacao (datetime): Data de criação do registro
        data_atualizacao (datetime): Data da última atualização do registro
    """
    __tablename__ = 'instrutores'
    
    id = db.Column(db.Integer, primary_key=True)
    nome = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(100), unique=True, nullable=False)
    area_atuacao = db.Column(db.String(200))
    cursos_possiveis = db.Column(db.Text)
    data_criacao = db.Column(db.DateTime, default=datetime.utcnow)
    data_atualizacao = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relacionamento com reservas
    reservas = db.relationship('ReservaSala', backref='instrutor', lazy=True)
    
    def __init__(self, nome, email, area_atuacao=None, cursos_possiveis=None):
        """
        Inicializa um novo instrutor.
        
        Args:
            nome (str): Nome completo do instrutor
            email (str): Email do instrutor
            area_atuacao (str, opcional): Área de atuação do instrutor
            cursos_possiveis (str, opcional): Cursos que o instrutor pode ministrar
        """
        self.nome = nome
        self.email = email
        self.area_atuacao = area_atuacao
        self.cursos_possiveis = cursos_possiveis
    
    def to_dict(self):
        """
        Converte o objeto instrutor em um dicionário para serialização.
        
        Returns:
            dict: Dicionário com os dados do instrutor
        """
        return {
            'id': self.id,
            'nome': self.nome,
            'email': self.email,
            'area_atuacao': self.area_atuacao,
            'cursos_possiveis': self.cursos_possiveis,
            'data_criacao': self.data_criacao.isoformat() if self.data_criacao else None,
            'data_atualizacao': self.data_atualizacao.isoformat() if self.data_atualizacao else None
        }
    
    def __repr__(self):
        """
        Representação em string do objeto instrutor.
        
        Returns:
            str: Representação em string
        """
        return f"<Instrutor {self.nome}>"


class ReservaSala(db.Model):
    """
    Modelo de reserva de sala do sistema.
    
    Atributos:
        id (int): Identificador único da reserva
        sala_id (int): ID da sala reservada
        instrutor_id (int): ID do instrutor responsável
        usuario_id (int): ID do usuário que fez a reserva
        data_reserva (date): Data da reserva
        horario_inicio (time): Horário de início
        horario_fim (time): Horário de fim
        curso_evento (str): Nome do curso ou evento
        turno (str): Turno da reserva (Manhã, Tarde, Noite)
        observacoes (str): Observações adicionais
        data_criacao (datetime): Data de criação do registro
        data_atualizacao (datetime): Data da última atualização do registro
    """
    __tablename__ = 'reservas_salas'
    
    id = db.Column(db.Integer, primary_key=True)
    sala_id = db.Column(db.Integer, db.ForeignKey('salas.id'), nullable=False)
    instrutor_id = db.Column(db.Integer, db.ForeignKey('instrutores.id'), nullable=True)
    usuario_id = db.Column(db.Integer, db.ForeignKey('usuarios.id'), nullable=False)
    data_reserva = db.Column(db.Date, nullable=False)
    horario_inicio = db.Column(db.Time, nullable=False)
    horario_fim = db.Column(db.Time, nullable=False)
    curso_evento = db.Column(db.String(200), nullable=False)
    turno = db.Column(db.String(20), nullable=False)
    observacoes = db.Column(db.Text)
    data_criacao = db.Column(db.DateTime, default=datetime.utcnow)
    data_atualizacao = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relacionamento com usuário
    usuario = db.relationship('User', backref='reservas_salas', lazy=True)
    
    def __init__(self, sala_id, usuario_id, data_reserva, horario_inicio, horario_fim, 
                 curso_evento, turno, instrutor_id=None, observacoes=None):
        """
        Inicializa uma nova reserva de sala.
        
        Args:
            sala_id (int): ID da sala reservada
            usuario_id (int): ID do usuário que fez a reserva
            data_reserva (date): Data da reserva
            horario_inicio (time): Horário de início
            horario_fim (time): Horário de fim
            curso_evento (str): Nome do curso ou evento
            turno (str): Turno da reserva
            instrutor_id (int, opcional): ID do instrutor responsável
            observacoes (str, opcional): Observações adicionais
        """
        self.sala_id = sala_id
        self.usuario_id = usuario_id
        self.data_reserva = data_reserva
        self.horario_inicio = horario_inicio
        self.horario_fim = horario_fim
        self.curso_evento = curso_evento
        self.turno = turno
        self.instrutor_id = instrutor_id
        self.observacoes = observacoes
    
    def to_dict(self):
        """
        Converte o objeto reserva em um dicionário para serialização.
        
        Returns:
            dict: Dicionário com os dados da reserva
        """
        return {
            'id': self.id,
            'sala_id': self.sala_id,
            'sala_nome': self.sala.nome if self.sala else None,
            'instrutor_id': self.instrutor_id,
            'instrutor_nome': self.instrutor.nome if self.instrutor else None,
            'usuario_id': self.usuario_id,
            'usuario_nome': self.usuario.nome if self.usuario else None,
            'data_reserva': self.data_reserva.isoformat() if self.data_reserva else None,
            'horario_inicio': self.horario_inicio.strftime('%H:%M') if self.horario_inicio else None,
            'horario_fim': self.horario_fim.strftime('%H:%M') if self.horario_fim else None,
            'curso_evento': self.curso_evento,
            'turno': self.turno,
            'observacoes': self.observacoes,
            'data_criacao': self.data_criacao.isoformat() if self.data_criacao else None,
            'data_atualizacao': self.data_atualizacao.isoformat() if self.data_atualizacao else None
        }
    
    def __repr__(self):
        """
        Representação em string do objeto reserva.
        
        Returns:
            str: Representação em string
        """
        return f"<ReservaSala {self.sala.nome if self.sala else 'N/A'} - {self.data_reserva}>"

