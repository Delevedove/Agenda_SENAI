import os
import sys
from datetime import date

import pytest
from flask import Flask

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from src.models import db
from src.models.user import User
from src.models.sala import Sala
from src.routes.user import user_bp
from src.routes.sala import sala_bp
from src.routes.agendamento import agendamento_bp

@pytest.fixture
def app():
    app = Flask(__name__)
    app.config['TESTING'] = True
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config['SECRET_KEY'] = 'test'
    db.init_app(app)
    app.register_blueprint(user_bp, url_prefix='/api')
    app.register_blueprint(sala_bp, url_prefix='/api')
    app.register_blueprint(agendamento_bp, url_prefix='/api')

    with app.app_context():
        db.create_all()
        admin = User(
            nome='Admin',
            email='admin@example.com',
            username='admin',
            senha='password',
            tipo='admin'
        )
        db.session.add(admin)
        sala = Sala(nome='Sala Teste', capacidade=10)
        db.session.add(sala)
        db.session.commit()
    return app

@pytest.fixture
def client(app):
    return app.test_client()
