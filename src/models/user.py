"""Modelo de usuario do sistema."""
from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash
from src.models import db

class User(db.Model):
    """
    Modelo de usuário do sistema.
    
    Atributos:
        id (int): Identificador único do usuário
        nome (str): Nome completo do usuário
        email (str): Email do usuário (único)
        username (str): Nome de usuário para login (único)
        senha_hash (str): Hash da senha do usuário
        tipo (str): Tipo de usuário ('comum' ou 'admin')
        data_criacao (datetime): Data de criação do registro
        data_atualizacao (datetime): Data da última atualização do registro
    """
    __tablename__ = 'usuarios'
    
    id = db.Column(db.Integer, primary_key=True)
    nome = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(100), unique=True, nullable=False)
    username = db.Column(db.String(50), unique=True, nullable=False)
    senha_hash = db.Column(db.String(256), nullable=False)
    tipo = db.Column(db.String(20), nullable=False, default='comum')
    data_criacao = db.Column(db.DateTime, default=datetime.utcnow)
    data_atualizacao = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relacionamento com agendamentos
    agendamentos = db.relationship('Agendamento', backref='usuario', lazy=True)
    
    def __init__(self, nome, email, username, senha, tipo='comum'):
        """
        Inicializa um novo usuário.
        
        Args:
            nome (str): Nome completo do usuário
            email (str): Email do usuário
            username (str): Nome de usuário para login
            senha (str): Senha do usuário (será armazenada como hash)
            tipo (str, opcional): Tipo de usuário ('comum' ou 'admin'). Padrão é 'comum'.
        """
        self.nome = nome
        self.email = email
        self.username = username
        self.set_senha(senha)
        self.tipo = tipo
    
    def set_senha(self, senha):
        """
        Define a senha do usuário, armazenando-a como hash.
        
        Args:
            senha (str): Senha em texto plano
        """
        self.senha_hash = generate_password_hash(senha)
    
    def check_senha(self, senha):
        """
        Verifica se a senha fornecida corresponde ao hash armazenado.
        
        Args:
            senha (str): Senha em texto plano para verificação
            
        Returns:
            bool: True se a senha estiver correta, False caso contrário
        """
        return check_password_hash(self.senha_hash, senha)
    
    def is_admin(self):
        """
        Verifica se o usuário é um administrador.
        
        Returns:
            bool: True se o usuário for administrador, False caso contrário
        """
        return self.tipo == 'admin'
    
    def to_dict(self):
        """
        Converte o objeto usuário em um dicionário para serialização.
        
        Returns:
            dict: Dicionário com os dados do usuário (exceto senha)
        """
        return {
            'id': self.id,
            'nome': self.nome,
            'email': self.email,
            'username': self.username,
            'tipo': self.tipo,
            'data_criacao': self.data_criacao.isoformat() if self.data_criacao else None,
            'data_atualizacao': self.data_atualizacao.isoformat() if self.data_atualizacao else None
        }
    
    def __repr__(self):
        """
        Representação em string do objeto usuário.
        
        Returns:
            str: Representação em string
        """
        return f"<User {self.username}>"
