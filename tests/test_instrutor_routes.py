import jwt
from datetime import datetime, timedelta
from src.models.user import User


def admin_headers(app):
    with app.app_context():
        user = User.query.filter_by(username='admin').first()
        token = jwt.encode(
            {
                'user_id': user.id,
                'nome': user.nome,
                'perfil': user.tipo,
                'exp': datetime.utcnow() + timedelta(hours=1),
            },
            app.config['SECRET_KEY'],
            algorithm='HS256',
        )
        return {'Authorization': f'Bearer {token}'}


def test_delete_instrutor_as_non_admin_fails(client, app, non_admin_auth_headers):
    headers = admin_headers(app)
    resp = client.post('/api/instrutores', json={'nome': 'Instrutor'}, headers=headers)
    assert resp.status_code == 201
    instrutor_id = resp.get_json()['id']

    resp_del = client.delete(f'/api/instrutores/{instrutor_id}', headers=non_admin_auth_headers)
    assert resp_del.status_code == 403

