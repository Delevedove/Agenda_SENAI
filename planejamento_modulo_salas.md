# Planejamento do Módulo de Controle de Ocupação de Salas de Aula

## 1. Visão Geral do Módulo

O módulo de Controle de Ocupação de Salas de Aula será um sistema independente, mas integrado ao Sistema de Agenda de Laboratório existente. Este módulo permitirá a gestão completa da ocupação das salas de aula da unidade, oferecendo funcionalidades para reserva, visualização e controle da utilização por parte de setores administrativos e docentes.

### 1.1 Objetivos Principais

O módulo tem como objetivo principal otimizar o uso das salas de aula através de um sistema centralizado que permita:

- Visualização em tempo real da ocupação das salas
- Agendamento eficiente de espaços para cursos e eventos
- Controle de conflitos de horários
- Gestão de recursos e capacidades das salas
- Cadastro e gerenciamento de instrutores
- Relatórios de utilização e disponibilidade

### 1.2 Integração com o Sistema Existente

O novo módulo será integrado ao sistema atual através da tela de seleção de sistema, mantendo a mesma base de usuários e sistema de autenticação. A arquitetura seguirá os mesmos padrões estabelecidos no sistema de agenda de laboratórios, garantindo consistência e facilidade de manutenção.

## 2. Arquitetura do Sistema

### 2.1 Estrutura de Dados

O módulo será baseado em três entidades principais que se relacionam entre si:

#### 2.1.1 Entidade Sala
A entidade Sala representará os espaços físicos disponíveis para agendamento. Cada sala terá as seguintes características:

- **Identificação**: Nome único da sala, código de identificação
- **Capacidade**: Número máximo de pessoas que a sala comporta
- **Recursos**: Lista de equipamentos e recursos disponíveis (TV, quadro, climatização, projetor, computadores, etc.)
- **Localização**: Andar, bloco ou setor onde a sala está localizada
- **Tipo**: Classificação da sala (aula teórica, laboratório, auditório, etc.)
- **Status**: Ativa, inativa, em manutenção
- **Observações**: Informações adicionais sobre a sala

#### 2.1.2 Entidade Instrutor
A entidade Instrutor representará os profissionais que podem ministrar aulas ou conduzir eventos. Cada instrutor terá:

- **Dados Pessoais**: Nome completo, email, telefone
- **Capacidades Técnicas**: Lista de cursos que pode ministrar
- **Área de Atuação**: Departamento ou área de especialização
- **Disponibilidade**: Horários preferenciais ou restrições
- **Status**: Ativo, inativo, licença
- **Observações**: Informações adicionais sobre o instrutor

#### 2.1.3 Entidade Ocupação
A entidade Ocupação representará os agendamentos das salas. Cada ocupação terá:

- **Sala**: Referência à sala agendada
- **Instrutor**: Referência ao instrutor responsável
- **Curso/Evento**: Nome do curso ou evento
- **Data e Horário**: Período de ocupação da sala
- **Tipo de Ocupação**: Aula regular, evento especial, reunião, etc.
- **Recorrência**: Se é um agendamento único ou recorrente
- **Status**: Confirmado, pendente, cancelado
- **Observações**: Informações adicionais sobre a ocupação

### 2.2 Relacionamentos entre Entidades

Os relacionamentos entre as entidades seguirão o seguinte padrão:

- **Sala ↔ Ocupação**: Uma sala pode ter múltiplas ocupações (1:N), mas cada ocupação está vinculada a apenas uma sala
- **Instrutor ↔ Ocupação**: Um instrutor pode ter múltiplas ocupações (1:N), mas cada ocupação tem apenas um instrutor responsável
- **Usuário ↔ Ocupação**: Um usuário pode criar múltiplas ocupações (1:N), mantendo o controle de quem fez cada agendamento

### 2.3 Regras de Negócio

O sistema implementará as seguintes regras de negócio fundamentais:

#### 2.3.1 Conflitos de Agendamento
- Uma sala não pode ser reservada para dois eventos simultâneos
- O sistema deve verificar conflitos em tempo real durante o agendamento
- Conflitos devem ser sinalizados claramente ao usuário

#### 2.3.2 Controle de Permissões
- Usuários comuns podem visualizar disponibilidade e solicitar reservas
- Apenas usuários com permissão podem confirmar ou cancelar agendamentos
- Administradores têm acesso total a todas as funcionalidades

#### 2.3.3 Tipos de Salas
- Salas "fixas": Reservadas para cursos regulares com horários pré-definidos
- Salas "livres": Disponíveis para agendamentos diversos
- Salas em manutenção: Temporariamente indisponíveis

## 3. Funcionalidades Detalhadas

### 3.1 Visualização de Ocupações

#### 3.1.1 Grade Semanal
A visualização principal será uma grade semanal que mostrará:

- **Eixo Horizontal**: Dias da semana (Segunda a Domingo)
- **Eixo Vertical**: Horários (das 7h às 22h, em intervalos de 1 hora)
- **Células**: Cada célula representará um horário específico de uma sala
- **Cores**: Diferentes cores para diferentes tipos de ocupação
- **Informações**: Nome do curso/evento, instrutor, sala

#### 3.1.2 Grade Mensal
Uma visualização alternativa mostrará o mês completo com:

- **Visão Geral**: Densidade de ocupação por dia
- **Indicadores**: Cores para mostrar disponibilidade
- **Navegação**: Possibilidade de navegar entre meses
- **Detalhes**: Clique em um dia para ver detalhes das ocupações

#### 3.1.3 Filtros e Buscas
O sistema oferecerá múltiplas opções de filtro:

- **Por Turno**: Manhã, tarde, noite
- **Por Data**: Período específico ou data única
- **Por Sala**: Filtrar por sala específica ou tipo de sala
- **Por Curso**: Buscar por nome do curso ou evento
- **Por Instrutor**: Filtrar por instrutor específico
- **Por Status**: Confirmado, pendente, cancelado

### 3.2 Cadastro e Gerenciamento

#### 3.2.1 Gestão de Salas
Interface para cadastro e edição de salas com:

- **Formulário Completo**: Todos os campos da entidade Sala
- **Validações**: Verificação de dados obrigatórios e formatos
- **Lista de Salas**: Visualização tabular com opções de edição e exclusão
- **Busca e Filtros**: Localizar salas rapidamente
- **Histórico**: Registro de alterações nas informações das salas

#### 3.2.2 Gestão de Instrutores
Interface para cadastro e edição de instrutores com:

- **Formulário Detalhado**: Todos os campos da entidade Instrutor
- **Capacidades Técnicas**: Interface para adicionar/remover cursos
- **Lista de Instrutores**: Visualização com informações principais
- **Disponibilidade**: Configuração de horários preferenciais
- **Histórico**: Registro de ocupações anteriores

#### 3.2.3 Gestão de Ocupações
Interface para criação e edição de agendamentos com:

- **Formulário Intuitivo**: Seleção de sala, instrutor, horário
- **Verificação de Conflitos**: Validação em tempo real
- **Recorrência**: Opções para agendamentos repetitivos
- **Confirmação**: Processo de aprovação para agendamentos
- **Cancelamento**: Funcionalidade para cancelar ocupações

### 3.3 Funcionalidades Avançadas

#### 3.3.1 Agendamento Inteligente
O sistema oferecerá sugestões inteligentes baseadas em:

- **Histórico**: Padrões de uso anteriores
- **Preferências**: Configurações do instrutor
- **Disponibilidade**: Salas livres no horário desejado
- **Recursos**: Compatibilidade entre necessidades e recursos da sala

#### 3.3.2 Notificações
Sistema de notificações para:

- **Confirmações**: Agendamento confirmado ou rejeitado
- **Lembretes**: Próximas ocupações agendadas
- **Alterações**: Mudanças em agendamentos existentes
- **Conflitos**: Alertas sobre possíveis conflitos

#### 3.3.3 Relatórios
Geração de relatórios sobre:

- **Utilização**: Taxa de ocupação por sala e período
- **Instrutores**: Carga horária e distribuição de aulas
- **Cursos**: Frequência e duração dos cursos
- **Recursos**: Uso de equipamentos e recursos especiais

## 4. Interface do Usuário

### 4.1 Design e Usabilidade

A interface seguirá os mesmos padrões visuais do sistema existente, mantendo:

- **Consistência Visual**: Mesma paleta de cores e tipografia
- **Navegação Familiar**: Estrutura similar ao módulo de laboratórios
- **Responsividade**: Adaptação para diferentes tamanhos de tela
- **Acessibilidade**: Conformidade com padrões de acessibilidade web

### 4.2 Componentes Principais

#### 4.2.1 Dashboard de Ocupações
Página principal com:

- **Visão Geral**: Resumo das ocupações do dia
- **Estatísticas**: Métricas de utilização
- **Ações Rápidas**: Botões para funções mais usadas
- **Notificações**: Alertas e lembretes importantes

#### 4.2.2 Calendário de Ocupações
Interface de calendário com:

- **Múltiplas Visualizações**: Semanal, mensal, diária
- **Interatividade**: Clique para ver detalhes ou criar agendamento
- **Cores Diferenciadas**: Sistema de cores para tipos de ocupação
- **Navegação Intuitiva**: Controles para navegar entre períodos

#### 4.2.3 Formulários de Cadastro
Interfaces para:

- **Salas**: Formulário completo com validações
- **Instrutores**: Campos específicos para dados profissionais
- **Ocupações**: Processo guiado para agendamento

### 4.3 Experiência do Usuário

#### 4.3.1 Fluxo de Agendamento
O processo de agendamento seguirá um fluxo intuitivo:

1. **Seleção de Data**: Escolha do dia desejado
2. **Escolha de Horário**: Visualização de horários disponíveis
3. **Seleção de Sala**: Lista de salas compatíveis
4. **Definição de Instrutor**: Seleção ou cadastro de instrutor
5. **Detalhes do Evento**: Informações sobre o curso/evento
6. **Confirmação**: Revisão e confirmação do agendamento

#### 4.3.2 Feedback Visual
O sistema fornecerá feedback visual claro através de:

- **Cores**: Indicação de status e tipos de ocupação
- **Ícones**: Representação visual de recursos e status
- **Animações**: Transições suaves para melhor experiência
- **Mensagens**: Confirmações e alertas informativos

## 5. Implementação Técnica

### 5.1 Backend (Flask)

#### 5.1.1 Modelos de Dados
Implementação das entidades usando SQLAlchemy:

```python
# Modelo Sala
class Sala(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    nome = db.Column(db.String(100), nullable=False, unique=True)
    capacidade = db.Column(db.Integer, nullable=False)
    recursos = db.Column(db.Text)  # JSON com lista de recursos
    localizacao = db.Column(db.String(100))
    tipo = db.Column(db.String(50))
    status = db.Column(db.String(20), default='ativa')
    observacoes = db.Column(db.Text)
    data_criacao = db.Column(db.DateTime, default=datetime.utcnow)

# Modelo Instrutor
class Instrutor(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    nome = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), unique=True)
    telefone = db.Column(db.String(20))
    capacidades = db.Column(db.Text)  # JSON com lista de cursos
    area_atuacao = db.Column(db.String(100))
    disponibilidade = db.Column(db.Text)  # JSON com horários
    status = db.Column(db.String(20), default='ativo')
    observacoes = db.Column(db.Text)
    data_criacao = db.Column(db.DateTime, default=datetime.utcnow)

# Modelo Ocupação
class Ocupacao(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    sala_id = db.Column(db.Integer, db.ForeignKey('sala.id'), nullable=False)
    instrutor_id = db.Column(db.Integer, db.ForeignKey('instrutor.id'))
    usuario_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    curso_evento = db.Column(db.String(200), nullable=False)
    data = db.Column(db.Date, nullable=False)
    horario_inicio = db.Column(db.Time, nullable=False)
    horario_fim = db.Column(db.Time, nullable=False)
    tipo_ocupacao = db.Column(db.String(50))
    recorrencia = db.Column(db.String(20))  # unica, semanal, mensal
    status = db.Column(db.String(20), default='confirmado')
    observacoes = db.Column(db.Text)
    data_criacao = db.Column(db.DateTime, default=datetime.utcnow)
```

#### 5.1.2 Rotas da API
Implementação das rotas RESTful:

- **GET /api/salas**: Listar todas as salas
- **POST /api/salas**: Criar nova sala
- **GET /api/salas/{id}**: Obter detalhes de uma sala
- **PUT /api/salas/{id}**: Atualizar sala
- **DELETE /api/salas/{id}**: Remover sala

- **GET /api/instrutores**: Listar todos os instrutores
- **POST /api/instrutores**: Criar novo instrutor
- **GET /api/instrutores/{id}**: Obter detalhes de um instrutor
- **PUT /api/instrutores/{id}**: Atualizar instrutor
- **DELETE /api/instrutores/{id}**: Remover instrutor

- **GET /api/ocupacoes**: Listar ocupações (com filtros)
- **POST /api/ocupacoes**: Criar nova ocupação
- **GET /api/ocupacoes/{id}**: Obter detalhes de uma ocupação
- **PUT /api/ocupacoes/{id}**: Atualizar ocupação
- **DELETE /api/ocupacoes/{id}**: Remover ocupação
- **GET /api/ocupacoes/verificar-disponibilidade**: Verificar conflitos

### 5.2 Frontend (HTML/CSS/JavaScript)

#### 5.2.1 Estrutura de Arquivos
```
src/static/
├── salas/
│   ├── dashboard-salas.html
│   ├── calendario-salas.html
│   ├── gerenciar-salas.html
│   ├── gerenciar-instrutores.html
│   └── novo-agendamento-sala.html
├── css/
│   └── salas.css
└── js/
    └── salas.js
```

#### 5.2.2 Componentes JavaScript
Implementação de funções específicas para:

- **Renderização do Calendário**: Geração dinâmica da grade de ocupações
- **Validação de Formulários**: Verificação de dados em tempo real
- **Comunicação com API**: Funções para CRUD das entidades
- **Gerenciamento de Estado**: Controle de filtros e visualizações

### 5.3 Integração com Sistema Existente

#### 5.3.1 Autenticação Compartilhada
O módulo utilizará o mesmo sistema de autenticação:

- **Token JWT**: Mesmo mecanismo de autenticação
- **Controle de Acesso**: Mesmas permissões de usuário
- **Sessão Compartilhada**: Navegação fluida entre módulos

#### 5.3.2 Base de Dados Unificada
Utilização do mesmo banco de dados:

- **Tabelas Adicionais**: Novas entidades no mesmo schema
- **Relacionamentos**: Conexão com tabela de usuários existente
- **Migrações**: Scripts para criação das novas tabelas

## 6. Cronograma de Desenvolvimento

### 6.1 Fase 1: Modelos e API (Estimativa: 2-3 dias)
- Criação dos modelos de dados
- Implementação das rotas da API
- Testes básicos de funcionalidade

### 6.2 Fase 2: Interface de Gerenciamento (Estimativa: 3-4 dias)
- Desenvolvimento das páginas de cadastro
- Implementação dos formulários
- Validações e feedback visual

### 6.3 Fase 3: Visualização de Ocupações (Estimativa: 4-5 dias)
- Criação do calendário de ocupações
- Implementação dos filtros
- Sistema de cores e legendas

### 6.4 Fase 4: Integração e Testes (Estimativa: 2-3 dias)
- Integração com sistema existente
- Testes de funcionalidade completa
- Correções e ajustes finais

### 6.5 Fase 5: Documentação (Estimativa: 1-2 dias)
- Atualização da documentação técnica
- Criação de manual do usuário
- Preparação para entrega

## 7. Considerações de Segurança

### 7.1 Validação de Dados
- Sanitização de entradas do usuário
- Validação de tipos e formatos
- Prevenção contra injeção SQL

### 7.2 Controle de Acesso
- Verificação de permissões em todas as rotas
- Proteção contra acesso não autorizado
- Auditoria de ações dos usuários

### 7.3 Integridade dos Dados
- Validação de relacionamentos entre entidades
- Verificação de conflitos de agendamento
- Backup e recuperação de dados

## 8. Testes e Validação

### 8.1 Testes Unitários
- Validação dos modelos de dados
- Testes das funções de API
- Verificação de regras de negócio

### 8.2 Testes de Integração
- Comunicação entre frontend e backend
- Integração com sistema existente
- Fluxos completos de usuário

### 8.3 Testes de Usabilidade
- Navegação intuitiva
- Responsividade em diferentes dispositivos
- Acessibilidade para usuários com deficiência

## 9. Manutenção e Evolução

### 9.1 Monitoramento
- Logs de sistema para auditoria
- Métricas de uso e performance
- Alertas para problemas críticos

### 9.2 Atualizações Futuras
- Novas funcionalidades baseadas em feedback
- Melhorias de performance
- Integração com sistemas externos

### 9.3 Suporte
- Documentação para usuários finais
- Treinamento para administradores
- Canal de suporte técnico

Este planejamento detalhado servirá como base para o desenvolvimento do módulo de Controle de Ocupação de Salas de Aula, garantindo que todas as funcionalidades sejam implementadas de forma consistente e integrada ao sistema existente.

