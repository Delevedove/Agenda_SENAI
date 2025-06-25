
def login_admin(client):
    response = client.post('/api/login', json={'username': 'admin', 'senha': 'password'})
    assert response.status_code == 200
    data = response.get_json()
    return data['token'], data['refresh_token']


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
