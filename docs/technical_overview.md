# Visão Geral do Sistema

Este documento descreve a arquitetura e funcionamento principal da aplicação **Agenda SENAI**, desenvolvida em Flask. O objetivo é registrar uma agenda de laboratórios e salas de aula, além de usuários, instrutores e turmas.

## Objetivo
O sistema centraliza o agendamento de salas e laboratórios do SENAI, permitindo o gerenciamento de ocupações, turmas, laboratórios, salas, usuários e notificações.

## Principais Módulos
- **Usuários (`src/routes/user.py`)**: cadastro, login e gestão de usuários com perfis "comum" e "admin".
- **Agendamentos (`src/routes/agendamento.py`)**: reserva de laboratórios para turmas, com verificação de conflitos.
- **Ocupações de Salas (`src/routes/ocupacao.py`)**: agenda das salas com suporte a recorrência e controle de instrutores.
- **Salas (`src/routes/sala.py`)**: cadastro e consulta de salas com verificação de disponibilidade.
- **Laboratórios e Turmas (`src/routes/laboratorio.py`, `src/routes/turma.py`)**: registro de ambientes e turmas para os agendamentos.
- **Instrutores (`src/routes/instrutor.py`)**: cadastro de instrutores e verificação de disponibilidade.
- **Notificações (`src/routes/notificacao.py`)**: alertas de agendamentos próximos.

## Estrutura de Módulos e Rotas
Cada módulo possui um *Blueprint* Flask registrado em `src/main.py` sob o prefixo `/api`. As rotas seguem o padrão REST para operações de listagem (`GET`), criação (`POST`), atualização (`PUT`) e exclusão (`DELETE`). Exemplos de rotas:

| Módulo | Principais Rotas |
|--------|-----------------|
| Usuários | `/api/usuarios`, `/api/login` |
| Agendamentos | `/api/agendamentos`, `/api/agendamentos/<id>` |
| Ocupações | `/api/ocupacoes`, `/api/ocupacoes/<id>` |
| Salas | `/api/salas`, `/api/salas/<id>` |
| Laboratórios | `/api/laboratorios`, `/api/laboratorios/<id>` |
| Turmas | `/api/turmas`, `/api/turmas/<id>` |
| Instrutores | `/api/instrutores`, `/api/instrutores/<id>` |
| Notificações | `/api/notificacoes` |

### Componentes Principais
- **Dashboards/Consultas**: listam entidades (salas, laboratórios, instrutores, etc.).
- **Formulários**: usados nas rotas `POST` e `PUT` para envio de dados JSON.
- **Autenticação**: token JWT assinado enviado no cabeçalho `Authorization: Bearer <token>`.

## Funcionalidades por Módulo
### Usuários
- Cadastro e autenticação (`POST /usuarios`, `POST /login`).
- Listagem, visualização, alteração e remoção de usuários. Apenas administradores podem listar todos ou remover usuários.

### Agendamentos
- Criação, consulta, alteração e remoção de reservas de laboratório. Verifica conflitos de horários.
- Endpoints para visualizar agenda em formato de calendário.

### Ocupações de Sala
- Reserva de salas com verificação de disponibilidade de sala e instrutor.
- Suporta tipos de ocupação (aula, evento, reunião) e recorrência.
- Endpoints de consulta e atualização das ocupações.

### Salas
- Cadastro de novas salas e consulta de tipos e recursos disponíveis.
- Verificação de disponibilidade e listagem de ocupações por sala.

### Laboratórios e Turmas
- CRUD completo para laboratórios e turmas, restrito a administradores para alterações.

### Instrutores
- Cadastro de instrutores, atualização de dados e verificação de disponibilidade.
- Listagem de áreas de atuação e capacidades sugeridas.

### Notificações
- Listagem de notificações do usuário e marcação como lidas.
- Função auxiliar para criação de notificações futuras (pode ser agendada em job).

## Padrões de Navegação e Componentes Reutilizáveis
- Requisições retornam JSON e status HTTP adequados (200, 201, 400, 401, 403, 404, 409 e 500).
- Botões e formulários do frontend devem realizar chamadas às rotas REST acima, seguindo redirecionamentos após sucesso (ex.: voltar para lista).
- Componentes reutilizáveis incluem tabelas de listagem e formulários padrão para todas as entidades.

## Controle de Acesso
- **Administrador**: acesso total a todos os endpoints, inclusive criação e remoção de registros.
- **Usuário comum**: pode criar seus próprios agendamentos e visualizar suas notificações e ocupações.
- Autenticação e autorização utilizam JWT. As funções `verificar_autenticacao` e `verificar_admin` validam o token e as permissões do usuário.

## Recomendações e Possíveis Melhorias
Aprimorar a autenticação JWT implementando mecanismos de refresh e revogação de tokens.
- Centralizar mensagens de erro e validações em utilitários para evitar repetição.
- Adicionar testes de integração para as rotas restantes (hoje apenas `tests/test_ocupacao.py`).
- Utilizar um cliente SPA ou framework de frontend para melhorar a experiência do usuário.

## Glossário Básico
- **Rotas**: URLs definidas no backend que respondem a requisições (ex.: `/api/salas`).
- **Componentes**: partes reutilizáveis da interface ou código (tabelas, formulários).
- **Responsividade**: capacidade do layout se adaptar a diferentes tamanhos de tela.
- **Modularização**: divisão do código em partes independentes (módulos/blueprints).
- **Estado**: conjunto de dados que determina o comportamento atual da aplicação (ex.: usuário logado).

