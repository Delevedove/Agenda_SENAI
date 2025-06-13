import os
import sys
from datetime import date, datetime, timedelta
import jwt

import pytest
from flask import Flask

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from src.models import db
from src.models.sala import Sala
from src.models.user import User
from src.models.ocupacao import Ocupacao
from src.routes.ocupacao import ocupacao_bp

@pytest.fixture
def app():
    app = Flask(__name__)
    app.config['TESTING'] = True
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config['SECRET_KEY'] = 'test'
    db.init_app(app)
    app.register_blueprint(ocupacao_bp, url_prefix='/api')

    with app.app_context():
        db.create_all()
        user = User(
            nome='Test',
            email='test@example.com',
            username='test',
            senha='password',
            tipo='admin'
        )
        db.session.add(user)
        sala = Sala(nome='Sala Teste', capacidade=10)
        db.session.add(sala)
        db.session.commit()
    return app

@pytest.fixture
def client(app):
    return app.test_client()


def test_verificar_disponibilidade(client, app):
    with app.app_context():
        user = User.query.first()
        sala = Sala.query.first()
        sala_id = sala.id
    token = jwt.encode({
        'user_id': user.id,
        'nome': user.nome,
        'perfil': user.tipo,
        'exp': datetime.utcnow() + timedelta(hours=1)
    }, app.config['SECRET_KEY'], algorithm='HS256')
    response = client.get(
        '/api/ocupacoes/verificar-disponibilidade',
        query_string={
            'sala_id': sala_id,
            'data_inicio': date.today().strftime('%Y-%m-%d'),
            'data_fim': date.today().strftime('%Y-%m-%d'),
            'turno': 'Manhã'
        },
        headers={'Authorization': f'Bearer {token}'}
    )
    assert response.status_code == 200
    data = response.get_json()
    assert set(data.keys()) == {'disponivel', 'sala', 'conflitos'}
    assert data['disponivel'] is True
    assert data['conflitos'] == []
    assert data['sala']['id'] == sala_id


def test_excluir_ocupacao_periodo(client, app):
    with app.app_context():
        user = User.query.first()
        sala = Sala.query.first()

    token = jwt.encode({
        'user_id': user.id,
        'nome': user.nome,
        'perfil': user.tipo,
        'exp': datetime.utcnow() + timedelta(hours=1)
    }, app.config['SECRET_KEY'], algorithm='HS256')

    data_inicio = date.today()
    data_fim = data_inicio + timedelta(days=2)

    resp = client.post('/api/ocupacoes', json={
        'sala_id': sala.id,
        'curso_evento': 'Curso Teste',
        'data_inicio': data_inicio.isoformat(),
        'data_fim': data_fim.isoformat(),
        'turno': 'Manhã'
    }, headers={'Authorization': f'Bearer {token}'})
    assert resp.status_code == 201
    ocupacoes = resp.get_json()
    assert len(ocupacoes) == 3

    primeiro_id = ocupacoes[0]['id']
    grupo_id = ocupacoes[0]['grupo_ocupacao_id']

    resp_del = client.delete(f'/api/ocupacoes/{primeiro_id}', headers={'Authorization': f'Bearer {token}'})
    assert resp_del.status_code == 200
    resultado = resp_del.get_json()
    assert resultado['removidas'] == 3

    with app.app_context():
        restantes = Ocupacao.query.filter_by(grupo_ocupacao_id=grupo_id).all()
        assert restantes == []
