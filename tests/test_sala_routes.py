
import jwt
from datetime import datetime, timedelta
from src.models.user import User
from src.routes.user import gerar_token_acesso, gerar_refresh_token


def login_admin(client):
    with client.application.app_context():
        user = User.query.filter_by(username='admin').first()
        token = gerar_token_acesso(user)
        refresh = gerar_refresh_token(user)
    return token, refresh


def test_criar_e_listar_sala(client):
    token, _ = login_admin(client)
    headers = {'Authorization': f'Bearer {token}'}
    resp = client.post('/api/salas', json={'nome': 'Sala Nova', 'capacidade': 20}, headers=headers)
    assert resp.status_code == 201
    sala_id = resp.get_json()['id']

    resp = client.get(f'/api/salas/{sala_id}', headers=headers)
    assert resp.status_code == 200
    data = resp.get_json()
    assert data['nome'] == 'Sala Nova'

    resp = client.get('/api/salas', headers=headers)
    assert resp.status_code == 200
    salas = resp.get_json()
    assert any(s['id'] == sala_id for s in salas)


def test_create_sala_as_non_admin_fails(client, non_admin_auth_headers):
    response = client.post(
        '/api/salas',
        headers=non_admin_auth_headers,
        json={'nome': 'Sala Proibida', 'capacidade': 5},
    )
    assert response.status_code == 403


def test_delete_sala_as_non_admin_fails(client, non_admin_auth_headers):
    token, _ = login_admin(client)
    admin_headers = {'Authorization': f'Bearer {token}'}
    resp = client.post(
        '/api/salas',
        json={'nome': 'Sala Delete', 'capacidade': 5},
        headers=admin_headers,
    )
    assert resp.status_code == 201
    sala_id = resp.get_json()['id']

    delete_resp = client.delete(f'/api/salas/{sala_id}', headers=non_admin_auth_headers)
    assert delete_resp.status_code == 403


def test_criar_sala_dados_invalidos(client):
    token, _ = login_admin(client)
    headers = {'Authorization': f'Bearer {token}'}
    resp = client.post('/api/salas', json={'nome': 'SemCapacidade'}, headers=headers)
    assert resp.status_code == 400
    assert 'erro' in resp.get_json()


def test_atualizar_sala_nome_duplicado(client):
    token, _ = login_admin(client)
    headers = {'Authorization': f'Bearer {token}'}
    r1 = client.post('/api/salas', json={'nome': 'SalaA', 'capacidade': 10}, headers=headers)
    r2 = client.post('/api/salas', json={'nome': 'SalaB', 'capacidade': 10}, headers=headers)
    sala_b = r2.get_json()['id']
    resp = client.put(f'/api/salas/{sala_b}', json={'nome': 'SalaA'}, headers=headers)
    assert resp.status_code == 400


def test_atualiza_recursos_substitui(client):
    token, _ = login_admin(client)
    headers = {'Authorization': f'Bearer {token}'}

    resp = client.post(
        '/api/salas',
        json={'nome': 'SalaRec', 'capacidade': 10, 'recursos': ['tv', 'wifi']},
        headers=headers,
    )
    assert resp.status_code == 201
    sala_id = resp.get_json()['id']

    resp = client.put(
        f'/api/salas/{sala_id}',
        json={'recursos': ['projetor']},
        headers=headers,
    )
    assert resp.status_code == 200
    data = resp.get_json()
    assert data['recursos'] == ['projetor']
