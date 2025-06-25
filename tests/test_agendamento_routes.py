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


def test_criar_agendamento_dados_incompletos(client):
    token, _ = login_admin(client)
    headers = {'Authorization': f'Bearer {token}'}
    resp = client.post('/api/agendamentos', json={
        'data': date.today().isoformat(),
        'turma': '1A',
        'turno': 'Manhã',
        'horarios': ['08:00']
    }, headers=headers)
    assert resp.status_code == 400


def test_atualizar_agendamento_data_invalida(client):
    token, _ = login_admin(client)
    headers = {'Authorization': f'Bearer {token}'}
    r = client.post('/api/agendamentos', json={
        'data': date.today().isoformat(),
        'laboratorio': 'LabX',
        'turma': '1B',
        'turno': 'Manhã',
        'horarios': ['08:00']
    }, headers=headers)
    ag_id = r.get_json()['id']
    resp = client.put(f'/api/agendamentos/{ag_id}', json={'data': '2023-02-30'}, headers=headers)
    assert resp.status_code == 400


def test_verificar_disponibilidade_e_conflitos(client):
    token, _ = login_admin(client)
    headers = {'Authorization': f'Bearer {token}'}

    hoje = date.today()

    # Cria agendamento inicial
    resp_create = client.post('/api/agendamentos', json={
        'data': hoje.isoformat(),
        'laboratorio': 'LabDisp',
        'turma': '1C',
        'turno': 'Manhã',
        'horarios': ['08:00', '09:00']
    }, headers=headers)
    assert resp_create.status_code == 201
    ag_id = resp_create.get_json()['id']

    # Consulta disponibilidade para o mesmo período
    resp_check = client.get('/api/agendamentos/verificar-disponibilidade', query_string={
        'data': hoje.isoformat(),
        'laboratorio': 'LabDisp',
        'turno': 'Manhã'
    }, headers=headers)
    assert resp_check.status_code == 200
    resultados = resp_check.get_json()
    assert any(a['id'] == ag_id for a in resultados)

    # Consulta disponibilidade em data diferente (deve estar livre)
    resp_livre = client.get('/api/agendamentos/verificar-disponibilidade', query_string={
        'data': (hoje + timedelta(days=1)).isoformat(),
        'laboratorio': 'LabDisp',
        'turno': 'Manhã'
    }, headers=headers)
    assert resp_livre.status_code == 200
    assert resp_livre.get_json() == []

    # Tenta criar agendamento parcialmente sobreposto
    resp_conf = client.post('/api/agendamentos', json={
        'data': hoje.isoformat(),
        'laboratorio': 'LabDisp',
        'turma': '1D',
        'turno': 'Manhã',
        'horarios': ['09:00', '10:00']
    }, headers=headers)
    assert resp_conf.status_code == 409
    dados_conf = resp_conf.get_json()
    assert 'conflitos' in dados_conf
    assert dados_conf['conflitos']
