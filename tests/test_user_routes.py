
def login_admin(client):
    response = client.post('/api/login', json={'username': 'admin', 'senha': 'password'})
    assert response.status_code == 200
    return response.get_json()['token']


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


def test_listar_usuarios(client):
    token = login_admin(client)
    headers = {'Authorization': f'Bearer {token}'}
    response = client.get('/api/usuarios', headers=headers)
    assert response.status_code == 200
    usuarios = response.get_json()
    assert any(u['username'] == 'admin' for u in usuarios)
