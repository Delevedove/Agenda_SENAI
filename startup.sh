#!/bin/bash

# Este script é executado pela plataforma de deploy (Railway) para iniciar a aplicação.

# Saia imediatamente se um comando falhar
set -e

# 1. Aplicar as migrações da base de dados
echo "A aplicar migrações da base de dados..."
flask db upgrade

# 2. Iniciar o servidor web Gunicorn
# O Gunicorn irá escutar na porta fornecida pela variável de ambiente $PORT
echo "A iniciar o servidor Gunicorn..."
exec gunicorn src.main:app --bind 0.0.0.0:$PORT
