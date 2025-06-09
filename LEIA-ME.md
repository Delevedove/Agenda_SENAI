# Manual de Instalação e Uso - Sistema Completo

## Guia Rápido de Instalação

### 1. Requisitos do Sistema
- Python 3.11 ou superior
- Sistema operacional: Linux, Windows ou macOS
- 2GB de espaço em disco
- Navegador web moderno

### 2. Instalação Rápida

```bash
# 1. Extrair o arquivo
unzip agenda_laboratorio_sistema_completo_final.zip
cd agenda_laboratorio

# 2. Instalar dependências
pip3 install -r requirements.txt

# 3. Executar o sistema
cd src
python3 main.py
```

### 3. Acesso ao Sistema
- URL: http://localhost:5000
- Usuário admin: admin
- Senha: admin123

### 4. Primeiros Passos
1. Faça login com as credenciais de administrador
2. Escolha o módulo desejado na tela de seleção
3. Para o novo módulo de salas:
   - Cadastre salas em "Gerenciar Salas"
   - Cadastre instrutores em "Gerenciar Instrutores"
   - Crie ocupações em "Nova Ocupação"
   - Visualize no calendário

## Funcionalidades Principais

### Sistema Original - Agenda de Laboratórios
- Gerenciamento de laboratórios e turmas
- Agendamento de laboratórios
- Controle de usuários
- Calendário de agendamentos

### Novo Sistema - Controle de Ocupação de Salas
- **Dashboard Executivo**: Estatísticas e visão geral
- **Gerenciamento de Salas**: CRUD completo de salas
- **Gerenciamento de Instrutores**: Cadastro com capacidades
- **Sistema de Ocupações**: Agendamento com verificação de conflitos
- **Calendário Avançado**: Visualizações mês/semana/dia
- **Relatórios**: Estatísticas de utilização

## Suporte Técnico

Para dúvidas ou problemas:
1. Consulte a documentação completa em `documentacao_final_sistema_completo.md`
2. Verifique os logs do sistema
3. Teste em modo debug para identificar erros

## Estrutura de Arquivos

```
agenda_laboratorio/
├── src/                    # Código fonte
│   ├── main.py            # Aplicação principal
│   ├── models/            # Modelos de dados
│   ├── routes/            # APIs REST
│   └── static/            # Frontend (HTML/CSS/JS)
├── requirements.txt       # Dependências Python
├── instance/             # Banco de dados SQLite
└── documentacao/         # Documentação técnica
```

Sistema desenvolvido por Manus AI - Versão 2.0 - Junho 2025

