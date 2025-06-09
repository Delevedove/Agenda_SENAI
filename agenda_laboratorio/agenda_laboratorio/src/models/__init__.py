from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

# Importar todos os modelos para que sejam registrados no SQLAlchemy
from .user import User
from .laboratorio_turma import Laboratorio, Turma
from .agendamento import Agendamento
from .sala import Sala, Instrutor, ReservaSala
