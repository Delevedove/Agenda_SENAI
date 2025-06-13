# Integração Agenda de Laboratório × Controle de Ocupação

Este documento descreve como sincronizar o cadastro de turmas entre os dois sistemas.

## Compartilhamento da tabela `turmas`

Ambos os sistemas utilizam a mesma tabela `turmas` no banco de dados. Todas as operações de criação, edição ou exclusão executadas em um sistema são refletidas automaticamente no outro.

- **Fonte única**: a lista de turmas é mantida apenas nesta tabela compartilhada.
- **API**: as rotas `/api/turmas` fornecem o CRUD utilizado pelos dois sistemas.

## Gerenciamento pelo Controle de Ocupação

Foi adicionada a página `gerenciar-turmas.html` que permite cadastrar, alterar e remover turmas diretamente no módulo de ocupação. A página utiliza as mesmas rotas REST e mantém os registros sincronizados.

## Seleção de Turma nas Ocupações

Ao criar uma nova ocupação, o campo "Curso/Evento" passou de um texto livre para um seletor de turmas disponíveis. As opções são carregadas a partir da rota `/api/turmas`, garantindo consistência dos dados.

