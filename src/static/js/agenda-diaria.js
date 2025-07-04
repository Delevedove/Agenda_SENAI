document.addEventListener('DOMContentLoaded', async () => {
    // Variáveis de estado
    let laboratorios = [];
    let labSelecionadoId = null;
    let dataSelecionada = new Date();
    let miniCalendar;

    // Função de inicialização
    async function inicializarPagina() {
        await carregarLaboratorios();
        inicializarMiniCalendario();
        adicionarListeners();
        // Carrega a agenda para o primeiro laboratório (se houver)
        if (laboratorios.length > 0) {
            labSelecionadoId = laboratorios[0].id;
            document.querySelector('.lab-icon').classList.add('active');
            await carregarAgendaDiaria();
            document.getElementById('agenda-view').style.visibility = 'visible';
        }
    }

    // Carrega os laboratórios e renderiza o seletor
    async function carregarLaboratorios() {
        try {
            laboratorios = await chamarAPI('/laboratorios');
            const seletor = document.getElementById('seletor-laboratorios');
            seletor.innerHTML = laboratorios.map(lab => `
                <div class="lab-icon" data-id="${lab.id}">
                    <i class="bi bi-display"></i>
                    <span>${lab.nome}</span>
                </div>
            `).join('');
        } catch (error) {
            console.error('Erro ao carregar laboratórios:', error);
        }
    }

    // Inicializa o mini-calendário
    function inicializarMiniCalendario() {
        const calendarEl = document.getElementById('mini-calendario');
        miniCalendar = new FullCalendar.Calendar(calendarEl, {
            initialDate: dataSelecionada,
            locale: 'pt-br',
            initialView: 'dayGridMonth',
            headerToolbar: { left: 'prev', center: 'title', right: 'next' },
            dateClick: (info) => {
                dataSelecionada = info.date;
                miniCalendar.gotoDate(dataSelecionada);
                carregarAgendaDiaria();
            }
        });
        miniCalendar.render();
    }
    
    // Carrega e renderiza a agenda do dia
    async function carregarAgendaDiaria() {
        if (!labSelecionadoId) return;
        
        // Atualiza a data em destaque
        const diaEl = document.getElementById('dia-destaque');
        const dataExtensoEl = document.getElementById('data-extenso-destaque');
        diaEl.textContent = dataSelecionada.getDate();
        dataExtensoEl.textContent = dataSelecionada.toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

        try {
            const dataFormatada = dataSelecionada.toISOString().split('T')[0];
            const dados = await chamarAPI(`/agendamentos/agenda-diaria?laboratorio_id=${labSelecionadoId}&data=${dataFormatada}`);
            renderizarDetalhesDia(dados.agendamentos);
        } catch (error) {
            console.error('Erro ao carregar agenda diária:', error);
        }
    }

    // Renderiza os cards de turno
    function renderizarDetalhesDia(agendamentos) {
        const container = document.getElementById('detalhes-dia-container');
        container.innerHTML = ['Manhã', 'Tarde', 'Noite'].map(turno => `
            <div class="card turno-card">
                <div class="card-header">> ${turno}</div>
                <div class="card-body">
                    ${agendamentos[turno].length > 0 
                        ? agendamentos[turno].map(ag => `
                            <div class="agendamento-item">
                                <div class="agendamento-info">
                                    <strong>${ag.turma_nome}</strong><br>
                                    <span>${ag.horario_inicio} - ${ag.horario_fim}</span>
                                </div>
                                <div class="agendamento-acoes">
                                    <button class="btn btn-sm btn-outline-primary"><i class="bi bi-pencil"></i></button>
                                    <button class="btn btn-sm btn-outline-danger"><i class="bi bi-trash"></i></button>
                                </div>
                            </div>
                        `).join('') 
                        : '<p class="text-muted">Nenhum agendamento neste turno.</p>'
                    }
                </div>
                <div class="card-footer text-end">
                    <a href="/novo-agendamento.html?lab_id=${labSelecionadoId}&data=${dataSelecionada.toISOString().split('T')[0]}&turno=${turno}" class="btn btn-primary btn-sm btn-novo-agendamento-turno">
                        <i class="bi bi-plus"></i> Novo Agendamento
                    </a>
                </div>
            </div>
        `).join('');
    }

    // Adiciona os event listeners
    function adicionarListeners() {
        document.getElementById('seletor-laboratorios').addEventListener('click', (e) => {
            const icon = e.target.closest('.lab-icon');
            if (icon) {
                document.querySelectorAll('.lab-icon').forEach(i => i.classList.remove('active'));
                icon.classList.add('active');
                labSelecionadoId = icon.dataset.id;
                carregarAgendaDiaria();
            }
        });
    }

    // Inicia a aplicação
    inicializarPagina();
});
