from src.models import db
from datetime import datetime
import json

class Sala(db.Model):
    """
    Modelo para representar as salas de aula disponíveis para agendamento.
    """
    __tablename__ = 'salas'
    
    id = db.Column(db.Integer, primary_key=True)
    nome = db.Column(db.String(100), nullable=False, unique=True)
    capacidade = db.Column(db.Integer, nullable=False)
    recursos = db.Column(db.Text)  # JSON com lista de recursos
    localizacao = db.Column(db.String(100))
    tipo = db.Column(db.String(50))  # aula_teorica, laboratorio, auditorio, etc.
    status = db.Column(db.String(20), default='ativa')  # ativa, inativa, manutencao
    observacoes = db.Column(db.Text)
    data_criacao = db.Column(db.DateTime, default=datetime.utcnow)
    data_atualizacao = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relacionamento com ocupações
    ocupacoes = db.relationship('Ocupacao', backref='sala', lazy=True, cascade='all, delete-orphan')
    
    def __init__(self, nome, capacidade, recursos=None, localizacao=None, tipo=None, status='ativa', observacoes=None):
        self.nome = nome
        self.capacidade = capacidade
        self.recursos = json.dumps(recursos) if recursos else json.dumps([])
        self.localizacao = localizacao
        self.tipo = tipo
        self.status = status
        self.observacoes = observacoes
    
    def get_recursos(self):
        """
        Retorna a lista de recursos da sala.
        """
        try:
            return json.loads(self.recursos) if self.recursos else []
        except (json.JSONDecodeError, TypeError):
            return []
    
    def set_recursos(self, recursos_list):
        """
        Define a lista de recursos da sala.
        """
        self.recursos = json.dumps(recursos_list) if recursos_list else json.dumps([])
    
    def is_disponivel(self, data, horario_inicio, horario_fim, ocupacao_id=None, grupo_ocupacao_id=None):
        """
        Verifica se a sala está disponível em um determinado período.
        
        Args:
            data: Data da verificação
            horario_inicio: Horário de início
            horario_fim: Horário de fim
            ocupacao_id: ID da ocupação a ser excluída da verificação (para edição)
            grupo_ocupacao_id: Grupo de ocupações a ser ignorado (edição de período)
        
        Returns:
            bool: True se disponível, False caso contrário
        """
        if self.status != 'ativa':
            return False
        
        # Importa aqui para evitar import circular
        from src.models.ocupacao import Ocupacao
        
        # Busca ocupações conflitantes
        query = Ocupacao.query.filter(
            Ocupacao.sala_id == self.id,
            Ocupacao.data == data,
            Ocupacao.status.in_(['confirmado', 'pendente']),
            db.or_(
                db.and_(Ocupacao.horario_inicio <= horario_inicio, Ocupacao.horario_fim > horario_inicio),
                db.and_(Ocupacao.horario_inicio < horario_fim, Ocupacao.horario_fim >= horario_fim),
                db.and_(Ocupacao.horario_inicio >= horario_inicio, Ocupacao.horario_fim <= horario_fim)
            )
        )
        
        # Exclui a ocupação atual se estiver editando
        if ocupacao_id:
            query = query.filter(Ocupacao.id != ocupacao_id)

        if grupo_ocupacao_id:
            query = query.filter(Ocupacao.grupo_ocupacao_id != grupo_ocupacao_id)
        
        conflitos = query.all()
        return len(conflitos) == 0
    
    def to_dict(self):
        """
        Converte o objeto para dicionário.
        """
        return {
            'id': self.id,
            'nome': self.nome,
            'capacidade': self.capacidade,
            'recursos': self.get_recursos(),
            'localizacao': self.localizacao,
            'tipo': self.tipo,
            'status': self.status,
            'observacoes': self.observacoes,
            'data_criacao': self.data_criacao.isoformat() if self.data_criacao else None,
            'data_atualizacao': self.data_atualizacao.isoformat() if self.data_atualizacao else None
        }
    
    def __repr__(self):
        return f'<Sala {self.nome}>'

