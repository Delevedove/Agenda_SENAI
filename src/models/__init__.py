from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

# Importa todos os modelos para garantir que sejam registrados
from .user import User
from .agendamento import Agendamento
from .laboratorio_turma import Laboratorio, Turma
from .sala import Sala
from .instrutor import Instrutor
from .ocupacao import Ocupacao
