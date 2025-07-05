#!/bin/bash
set -e

echo "A aplicar migrações da base de dados..."
flask db upgrade

echo "A iniciar o servidor Gunicorn..."
exec gunicorn src.main:app --bind 0.0.0.0:$PORT
