
def login_admin(client):
    resp = client.post('/api/login', json={'username': 'admin', 'senha': 'password'})
    assert resp.status_code == 200
    return resp.get_json()['token']


def test_criar_e_listar_sala(client):
    token = login_admin(client)
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
