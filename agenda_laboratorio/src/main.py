from flask import Flask
from flask_sqlalchemy import SQLAlchemy
import os
import sys

# Configuração do caminho para importações
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

# Importação dos modelos
from src.models import db

# Criação da aplicação Flask
app = Flask(__name__, static_url_path='', static_folder='static')

# Configuração do banco de dados
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///agenda_laboratorio.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SECRET_KEY'] = 'chave-secreta-do-sistema-de-agenda'

# Inicialização do banco de dados
db.init_app(app)

# Importação e registro dos blueprints
from src.routes.user import user_bp
from src.routes.agendamento import agendamento_bp
from src.routes.notificacao import notificacao_bp
from src.routes.laboratorio import laboratorio_bp
from src.routes.turma import turma_bp

app.register_blueprint(user_bp, url_prefix='/api')
app.register_blueprint(agendamento_bp, url_prefix='/api')
app.register_blueprint(notificacao_bp, url_prefix='/api')
app.register_blueprint(laboratorio_bp, url_prefix='/api')
app.register_blueprint(turma_bp, url_prefix='/api')

# Rota principal para servir a página inicial
@app.route('/')
def index():
    return app.send_static_file('index.html')

# Rota para qualquer outra página estática
@app.route('/<path:path>')
def static_file(path):
    return app.send_static_file(path)

# Criação das tabelas do banco de dados
def create_tables():
    with app.app_context():
        db.create_all()
        print("Tabelas criadas com sucesso!")

# Função para criar um usuário administrador inicial
def create_admin():
    from src.models.user import User
    with app.app_context():
        # Verifica se já existe um usuário admin
        from sqlalchemy.exc import SQLAlchemyError
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

# Execução da aplicação
if __name__ == '__main__':
    create_tables()
    create_admin()
    app.run(debug=True, host='0.0.0.0', port=5000)
