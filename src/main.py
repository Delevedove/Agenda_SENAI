from flask import Flask
import os

from src.models import db
from src.routes.agendamento import agendamento_bp
from src.routes.instrutor import instrutor_bp
from src.routes.laboratorio import laboratorio_bp
from src.routes.notificacao import notificacao_bp
from src.routes.ocupacao import ocupacao_bp
from src.routes.sala import sala_bp
from src.routes.turma import turma_bp
from src.routes.user import user_bp

def create_admin(app):
    """Create the initial admin user if it doesn't exist."""
    from src.models.user import User
    from sqlalchemy.exc import SQLAlchemyError
    with app.app_context():
        try:
            admin = User.query.filter_by(username='admin').first()
            if not admin:
                admin = User(
                    nome='Administrador',
                    email='admin@example.com',
                    username='admin',
                    senha='admin123',
                    tipo='admin'
                )
                db.session.add(admin)
                db.session.commit()
                print("Usuário administrador criado com sucesso!")
            else:
                print("Usuário administrador já existe.")
        except SQLAlchemyError as e:
            db.session.rollback()
            print(f"Erro ao criar usuário administrador: {str(e)}")


def create_app():
    """Application factory used by Flask."""
    app = Flask(__name__, static_url_path='', static_folder='static')

    db_uri = os.getenv("postgresql://postgres:BRtaZKVMSNjBDMiBMqPIzOcBSzDEsUjb@postgres.railway.internal:5432/railway", "").strip()
    if not db_uri:
        db_uri = 'sqlite:///agenda_laboratorio.db'
    if db_uri.startswith('postgres://'):
        db_uri = db_uri.replace('postgres://', 'postgresql://', 1)

    app.config['SQLALCHEMY_DATABASE_URI'] = db_uri
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

    secret_key = os.getenv('SECRET_KEY') or os.getenv('FLASK_SECRET_KEY') or 'chave-secreta-do-sistema-de-agenda'
    app.config['SECRET_KEY'] = secret_key

    db.init_app(app)

    app.register_blueprint(user_bp, url_prefix='/api')
    app.register_blueprint(agendamento_bp, url_prefix='/api')
    app.register_blueprint(notificacao_bp, url_prefix='/api')
    app.register_blueprint(laboratorio_bp, url_prefix='/api')
    app.register_blueprint(turma_bp, url_prefix='/api')
    app.register_blueprint(sala_bp, url_prefix='/api')
    app.register_blueprint(instrutor_bp, url_prefix='/api')
    app.register_blueprint(ocupacao_bp, url_prefix='/api')

    @app.route('/')
    def index():
        return app.send_static_file('index.html')

    @app.route('/<path:path>')
    def static_file(path):
        return app.send_static_file(path)

    with app.app_context():
        db.create_all()
        create_admin(app)

    return app


app = create_app()

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
