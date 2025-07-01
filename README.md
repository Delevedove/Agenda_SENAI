# Agenda_SENAI
Agenda de laboratórios e salas do SENAI

## Changelog
Consulte o arquivo [CHANGELOG.md](CHANGELOG.md) para detalhes das versões.

## Configuração rápida

1. Instale as dependências do projeto usando o Poetry:

   ```bash
   poetry install
   ```

2. Defina as variáveis de ambiente antes de rodar a aplicação ou os testes:

   ```bash
   export DATABASE_URL="postgresql://usuario:senha@host:5432/banco"
   export SECRET_KEY="sua-chave-secreta"
   ```

   A aplicação também reconhece a variável `FLASK_SECRET_KEY`. Uma das duas deve estar definida; se nenhuma estiver presente, a aplicação aborta a inicialização. Use um valor longo e aleatório (por exemplo, `export SECRET_KEY=$(openssl rand -hex 32)`).

   Se `DATABASE_URL` não for informado ou estiver vazio, o sistema utiliza por padrão um banco SQLite local (`agenda_laboratorio.db`).

3. Execute as migrações do banco para criar as tabelas necessárias:

   ```bash
   flask --app src.main db upgrade
   ```

4. Execute a suíte de testes para verificar se tudo está funcionando:

   ```bash
   pytest
   ```

5. Para iniciar a aplicação em modo de desenvolvimento, execute:

   ```bash
   flask --app src.main run
   ```

   As tabelas do banco estarão disponíveis após rodar as migrações e um
   usuário administrador padrão (`admin` / `admin123`) é gerado se ainda não existir.

6. As rotas de autenticação e cadastro possuem uma limitação de
   requisições por minuto para evitar abusos de login ou criação de contas.

## Usando Docker

Uma alternativa é rodar a aplicação em um container Docker. Para construir a imagem execute:

```bash
docker build -t agenda-senai .
```

Em seguida, inicie o container usando as variáveis definidas em um arquivo `.env`:

```bash
docker run -p 8000:8000 --env-file .env agenda-senai
```

A aplicação ficará disponível em [http://localhost:8000](http://localhost:8000).
