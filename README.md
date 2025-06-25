# Agenda_SENAI
Agenda de laboratórios e salas do SENAI

## Changelog
Consulte o arquivo [CHANGELOG.md](CHANGELOG.md) para detalhes das versões.

## Configuração rápida

1. Instale as dependências do projeto:

   ```bash
   pip install -r requirements.txt
   ```

2. Defina as variáveis de ambiente antes de rodar a aplicação ou os testes:

   ```bash
   export DATABASE_URL="postgresql://usuario:senha@host:5432/banco"
   export SECRET_KEY="sua-chave-secreta"
   ```

   A aplicação também reconhece a variável `FLASK_SECRET_KEY`. Uma das duas deve estar definida; se nenhuma estiver presente, a aplicação aborta a inicialização. Use um valor longo e aleatório (por exemplo, `export SECRET_KEY=$(openssl rand -hex 32)`).

   Se `DATABASE_URL` não for informado ou estiver vazio, o sistema utiliza por padrão um banco SQLite local (`agenda_laboratorio.db`).

3. Execute a suíte de testes para verificar se tudo está funcionando:

   ```bash
   pytest
   ```

4. Para iniciar a aplicação em modo de desenvolvimento, execute:

   ```bash
   flask --app src.main run
   ```

   As tabelas do banco são criadas automaticamente na primeira execução e um
   usuário administrador padrão (`admin` / `admin123`) é gerado se ainda não
   existir.
