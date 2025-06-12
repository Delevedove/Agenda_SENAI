# Agenda_SENAI
Agenda de laboratórios e salas do SENAI

## Changelog
Consulte o arquivo [CHANGELOG.md](CHANGELOG.md) para detalhes das versões.

## Documentação Técnica
A documentação detalhada com descrição dos módulos e controle de acesso está disponível em [docs/technical_overview.md](docs/technical_overview.md). O roadmap de melhorias está em [docs/roadmap.md](docs/roadmap.md).

## Uso com PostgreSQL no Railway

Ao realizar o deploy no Railway, defina a variável de ambiente `DATABASE_URL` com a URL fornecida pela plataforma. Um exemplo real é:

```
postgresql://postgres:BRtaZKVMSNjBDMiBMqPIzOcBSzDEsUjb@shuttle.proxy.rlwy.net:46850/railway
```

Essa variável já está configurada automaticamente no deploy do Railway e pode ser
usada localmente adicionando-a ao seu `.env`.

O arquivo `src/main.py` detecta automaticamente essa variável e utiliza o banco PostgreSQL. Para criar as tabelas diretamente no banco você pode executar a aplicação ou rodar manualmente:

```python
from src.main import db, app
with app.app_context():
    db.create_all()
```

Também é possível chamar a função `create_tables()` definida em `src/main.py`:

```python
from src.main import create_tables
create_tables()
```
