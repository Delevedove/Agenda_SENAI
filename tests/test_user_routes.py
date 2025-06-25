
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


def test_criar_usuario(client):
    response = client.post('/api/usuarios', json={
        'nome': 'Novo Usuario',
        'email': 'novo@example.com',
        'username': 'novo',
        'senha': 'Senha@123'
    }, environ_base={'REMOTE_ADDR': '1.1.1.10'})
    assert response.status_code == 201
    data = response.get_json()
    assert data['username'] == 'novo'


def test_login(client):
    response = client.post('/api/login', json={'username': 'admin', 'senha': 'Password1!'})
    assert response.status_code == 200
    json_data = response.get_json()
    assert 'token' in json_data
    assert 'refresh_token' in json_data


def test_listar_usuarios(client):
    token, _ = login_admin(client)
    headers = {'Authorization': f'Bearer {token}'}
    response = client.get('/api/usuarios', headers=headers)
    assert response.status_code == 200
    usuarios = response.get_json()
    assert any(u['username'] == 'admin' for u in usuarios)


def test_refresh_token(client):
    token, refresh = login_admin(client)
    # Expire token by not waiting but calling refresh
    resp = client.post('/api/refresh', json={'refresh_token': refresh})
    assert resp.status_code == 200
    dados = resp.get_json()
    assert 'token' in dados


def test_atualizar_senha_requer_verificacao(client):
    # cria usuario normal
    resp = client.post('/api/usuarios', json={
        'nome': 'Teste',
        'email': 'teste@example.com',
        'username': 'teste',
        'senha': 'Original1!'
    }, environ_base={'REMOTE_ADDR': '1.1.1.11'})
    assert resp.status_code == 201
    user_id = resp.get_json()['id']

    # login como o novo usuario
    resp_login = client.post('/api/login', json={'username': 'teste', 'senha': 'Original1!'})
    assert resp_login.status_code == 200
    token = resp_login.get_json()['token']
    headers = {'Authorization': f'Bearer {token}'}

    # Falta senha_atual
    resp_put = client.put(f'/api/usuarios/{user_id}', json={'senha': 'Nova1!'}, headers=headers)
    assert resp_put.status_code == 400

    # Senha atual incorreta
    resp_put = client.put(
        f'/api/usuarios/{user_id}',
        json={'senha': 'Nova1!', 'senha_atual': 'Errada1!'},
        headers=headers,
    )
    assert resp_put.status_code == 403

    # Senha atual correta
    resp_put = client.put(
        f'/api/usuarios/{user_id}',
        json={'senha': 'Nova1!', 'senha_atual': 'Original1!'},
        headers=headers,
    )
    assert resp_put.status_code == 200

    # login com nova senha deve funcionar
    resp_login2 = client.post('/api/login', json={'username': 'teste', 'senha': 'Nova1!'})
    assert resp_login2.status_code == 200


def test_criar_usuario_dados_incompletos(client):
    resp = client.post(
        '/api/usuarios',
        json={'nome': 'Incompleto'},
        environ_base={'REMOTE_ADDR': '1.1.1.1'}
    )
    assert resp.status_code == 400
    assert 'erro' in resp.get_json()


def test_criar_usuario_duplicado(client):
    resp1 = client.post('/api/usuarios', json={
        'nome': 'Dup',
        'email': 'dup1@example.com',
        'username': 'dup',
        'senha': 'Dup#1234'
    }, environ_base={'REMOTE_ADDR': '1.1.1.2'})
    assert resp1.status_code == 201
    resp2 = client.post('/api/usuarios', json={
        'nome': 'Outro',
        'email': 'dup2@example.com',
        'username': 'dup',
        'senha': 'Dup#4321'
    }, environ_base={'REMOTE_ADDR': '1.1.1.3'})
    assert resp2.status_code == 400


def test_atualizar_usuario_tipo_invalido(client):
    token, _ = login_admin(client)
    headers = {'Authorization': f'Bearer {token}'}
    resp = client.post('/api/usuarios', json={
        'nome': 'Tipo',
        'email': 'tipo@example.com',
        'username': 'tipo',
        'senha': 'Tipo@123'
    }, environ_base={'REMOTE_ADDR': '1.1.1.4'})
    assert resp.status_code == 201
    user_id = resp.get_json()['id']
    resp_put = client.put(f'/api/usuarios/{user_id}', json={'tipo': 'super'}, headers=headers)
    assert resp_put.status_code == 400


def test_login_dados_incompletos(client):
    resp = client.post('/api/login', json={'username': 'admin'})
    assert resp.status_code == 400


def test_refresh_sem_token(client):
    resp = client.post('/api/refresh', json={})
    assert resp.status_code == 400


def test_logout_sem_token(client):
    resp = client.post('/api/logout', json={})
    assert resp.status_code == 400
