from datetime import date, datetime, timedelta
import jwt
from src.models.user import User
from src.routes.user import gerar_token_acesso, gerar_refresh_token


def login_admin(client):
    with client.application.app_context():
        user = User.query.filter_by(username='admin').first()
        token = gerar_token_acesso(user)
        refresh = gerar_refresh_token(user)
    return token, refresh


def test_criar_e_listar_agendamento(client):
    token, _ = login_admin(client)
    headers = {'Authorization': f'Bearer {token}'}
    resp = client.post('/api/agendamentos', json={
        'data': date.today().isoformat(),
        'laboratorio': 'Lab1',
        'turma': '1A',
        'turno': 'Manhã',
        'horarios': ['08:00', '09:00']
    }, headers=headers)
    assert resp.status_code == 201
    ag_id = resp.get_json()['id']

    resp = client.get(f'/api/agendamentos/{ag_id}', headers=headers)
    assert resp.status_code == 200
    data = resp.get_json()
    assert data['laboratorio'] == 'Lab1'

    resp = client.get('/api/agendamentos', headers=headers)
    assert resp.status_code == 200
    ags = resp.get_json()
    assert any(a['id'] == ag_id for a in ags)
