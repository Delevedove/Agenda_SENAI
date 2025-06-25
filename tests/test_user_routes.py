
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
        'senha': 'senha'
    })
    assert response.status_code == 201
    data = response.get_json()
    assert data['username'] == 'novo'


def test_login(client):
    response = client.post('/api/login', json={'username': 'admin', 'senha': 'password'})
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
        'senha': 'original'
    })
    assert resp.status_code == 201
    user_id = resp.get_json()['id']

    # login como o novo usuario
    resp_login = client.post('/api/login', json={'username': 'teste', 'senha': 'original'})
    assert resp_login.status_code == 200
    token = resp_login.get_json()['token']
    headers = {'Authorization': f'Bearer {token}'}

    # Falta senha_atual
    resp_put = client.put(f'/api/usuarios/{user_id}', json={'senha': 'nova'}, headers=headers)
    assert resp_put.status_code == 400

    # Senha atual incorreta
    resp_put = client.put(
        f'/api/usuarios/{user_id}',
        json={'senha': 'nova', 'senha_atual': 'errada'},
        headers=headers,
    )
    assert resp_put.status_code == 403

    # Senha atual correta
    resp_put = client.put(
        f'/api/usuarios/{user_id}',
        json={'senha': 'nova', 'senha_atual': 'original'},
        headers=headers,
    )
    assert resp_put.status_code == 200

    # login com nova senha deve funcionar
    resp_login2 = client.post('/api/login', json={'username': 'teste', 'senha': 'nova'})
    assert resp_login2.status_code == 200
