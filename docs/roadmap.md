# Roadmap de Melhorias

Este roadmap sugere próximos passos para evolução do projeto.

## Prioridade Alta
- **Correções de validação**: garantir tratamento uniforme de erros e mensagens nas rotas.
- **Refresh token**: adicionar mecanismo de renovação e revogação do JWT.
- **Novos testes**: ampliar cobertura de testes automatizados, incluindo rotas de usuários, salas e agendamentos.

## Prioridade Média
- **Interface responsiva**: criar ou aprimorar frontend para melhor uso em dispositivos móveis.
- **Refatoração de código**: mover validações repetitivas para funções utilitárias e reduzir duplicação.
- **Integração de Notificações**: implementar job periódico chamando `criar_notificacoes_agendamentos_proximos` e enviar emails ou mensagens.

## Prioridade Baixa
- **Exportação de dados**: permitir exportar agendamentos e ocupações em CSV ou PDF.
- **Integração com calendário externo**: avaliar sincronização com Google Calendar ou similar.
- **Dashboard visual**: painéis gráficos para utilização de salas e instrutores.

