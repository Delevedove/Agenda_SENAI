# Visão Geral do Sistema

Este documento descreve a arquitetura e funcionamento principal da aplicação **Agenda SENAI**, desenvolvida em Flask. O objetivo é registrar uma agenda de laboratórios e salas de aula, além de usuários, instrutores e turmas.

## Objetivo
O sistema centraliza o agendamento de salas e laboratórios do SENAI, permitindo o gerenciamento de ocupações, turmas, laboratórios, salas, usuários e notificações.

## Arquitetura do Sistema
Os diagramas de arquitetura e fluxo de dados encontram-se na pasta `docs`. Eles ilustram a estrutura em camadas MVC utilizada pela aplicação e o fluxo das requisições REST entre frontend e backend. O novo módulo de **Gerenciamento de Turmas** foi integrado a essa arquitetura e participa do fluxo de criação e edição de ocupações.

## Principais Módulos
- **Usuários (`src/routes/user.py`)**: cadastro, login e gestão de usuários com perfis "comum" e "admin".
- **Agendamentos (`src/routes/agendamento.py`)**: reserva de laboratórios para turmas, com verificação de conflitos.
- **Ocupações de Salas (`src/routes/ocupacao.py`)**: agenda das salas com suporte a recorrência e controle de instrutores.
- **Salas (`src/routes/sala.py`)**: cadastro e consulta de salas com verificação de disponibilidade.
- **Laboratórios (`src/routes/laboratorio.py`)**: cadastro de laboratórios e consulta de disponibilidade.
- **Gerenciamento de Turmas (`src/routes/turma.py`)**: CRUD completo de turmas para vinculação às ocupações e agendamentos.
- **Instrutores (`src/routes/instrutor.py`)**: cadastro de instrutores e verificação de disponibilidade.
- **Notificações (`src/routes/notificacao.py`)**: alertas de agendamentos próximos.

## Estrutura de Banco de Dados
As principais tabelas utilizadas são:

- **usuarios**: informações de acesso e perfil dos usuários.
- **salas**: cadastro de salas de aula com recursos, localização e status.
- **laboratorios**: laboratórios disponíveis para agendamento.
- **turmas**: tabela compartilhada de turmas, utilizada em agendamentos e ocupações.
- **agendamentos**: reservas de laboratório vinculadas a um usuário e a uma turma.
- **ocupacoes**: reservas de salas, relacionadas a usuários e instrutores.
- **instrutores**: dados dos instrutores cadastrados.
- **notificacoes**: mensagens de alerta geradas pelo sistema.

O campo `curso_evento` da tabela **ocupacoes** é populado a partir da lista de turmas, permitindo associar uma ocupação a uma turma específica. A relação é lógica e, futuramente, poderá ser convertida em chave estrangeira direta.

## Estrutura de Módulos e Rotas
Cada módulo possui um *Blueprint* Flask registrado em `src/main.py` sob o prefixo `/api`. As rotas seguem o padrão REST para operações de listagem (`GET`), criação (`POST`), atualização (`PUT`) e exclusão (`DELETE`). Exemplos de rotas:

| Módulo | Principais Rotas |
|--------|-----------------|
| Usuários | `/api/usuarios`, `/api/login` |
| Agendamentos | `/api/agendamentos`, `/api/agendamentos/<id>` |
| Ocupações | `/api/ocupacoes`, `/api/ocupacoes/<id>`, `/api/ocupacoes/verificar-disponibilidade` |
| Salas | `/api/salas`, `/api/salas/<id>` |
| Laboratórios | `/api/laboratorios`, `/api/laboratorios/<id>` |
| Turmas | `/api/turmas`, `/api/turmas/<id>` |
| Instrutores | `/api/instrutores`, `/api/instrutores/<id>` |
| Notificações | `/api/notificacoes` |

### Endpoints REST
Todos os módulos seguem convenções REST. Abaixo estão listados os principais endpoints e métodos:

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| `GET` | `/api/turmas` | Lista de turmas |
| `POST` | `/api/turmas` | Criação de turma |
| `PUT` | `/api/turmas/<id>` | Atualização de turma |
| `DELETE` | `/api/turmas/<id>` | Remoção de turma |
| `GET` | `/api/ocupacoes/verificar-disponibilidade` | Valida disponibilidade de sala |
| `GET` | `/api/ocupacoes` | Consulta de ocupações |
| `POST` | `/api/ocupacoes` | Criação de ocupação |
| `PUT` | `/api/ocupacoes/<id>` | Edição de ocupação |
| `DELETE` | `/api/ocupacoes/<id>` | Exclusão de ocupação |

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

## Fluxos de Funcionalidades
- **Criação de ocupação**: a inclusão de novas ocupações foi unificada em uma única tela. Durante o preenchimento são feitas chamadas ao endpoint `/api/ocupacoes/verificar-disponibilidade` para apresentar ao usuário se a sala está disponível no turno desejado.
- **Edição de ocupação**: ao abrir uma ocupação para edição o sistema carrega todo o período originalmente reservado, permitindo ajustes com segurança.

## Validações e Regras de Negócio
- A verificação de conflito de ocupações ignora o próprio identificador quando a ação é de edição, evitando falsos positivos.
- Apenas salas ativas e instrutores disponíveis podem ser associados às reservas.

## Padrões de Navegação e Componentes Reutilizáveis
- Requisições retornam JSON e status HTTP adequados (200, 201, 400, 401, 403, 404, 409 e 500).
- Botões e formulários do frontend devem realizar chamadas às rotas REST acima, seguindo redirecionamentos após sucesso (ex.: voltar para lista).
- Componentes reutilizáveis incluem tabelas de listagem e formulários padrão para todas as entidades.

## Controle de Acesso
- **Administrador**: pode cadastrar, editar e excluir salas, laboratórios, turmas e instrutores, além de gerenciar todas as ocupações e agendamentos.
- **Usuário comum**: cria seus próprios agendamentos e ocupações e apenas consulta turmas, salas e laboratórios.
- Autenticação e autorização utilizam JWT. As funções `verificar_autenticacao` e `verificar_admin` validam o token e as permissões do usuário.

## Recomendações e Possíveis Melhorias
Aprimorar a autenticação JWT implementando mecanismos de refresh e revogação de tokens.
- Centralizar mensagens de erro e validações em utilitários para evitar repetição.
- Adicionar testes de integração para as rotas restantes (hoje apenas `tests/test_ocupacao.py`).
- Utilizar um cliente SPA ou framework de frontend para melhorar a experiência do usuário.

## Cores por Turno
Os calendários destacam os eventos conforme o turno selecionado para facilitar a visualização:

- **Manhã**: `#FFEB3B`
- **Tarde**: `#03A9F4`
- **Noite**: `#673AB7`

A mesma paleta é aplicada a agendamentos de laboratório e ocupações de sala por meio das classes CSS `agendamento-manha`, `agendamento-tarde` e `agendamento-noite`.

## Glossário Básico
- **Rotas**: URLs definidas no backend que respondem a requisições (ex.: `/api/salas`).
- **Componentes**: partes reutilizáveis da interface ou código (tabelas, formulários).
- **Responsividade**: capacidade do layout se adaptar a diferentes tamanhos de tela.
- **Modularização**: divisão do código em partes independentes (módulos/blueprints).
- **Estado**: conjunto de dados que determina o comportamento atual da aplicação (ex.: usuário logado).

