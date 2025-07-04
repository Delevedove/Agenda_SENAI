// FUNÇÃO AUXILIAR PARA CALCULAR O INTERVALO DE TEMPO
function calcularIntervaloDeTempo(horarios) {
    if (!horarios) return '';
    try {
        const listaHorarios =
            typeof horarios === 'string' ? JSON.parse(horarios) : horarios;
        if (!Array.isArray(listaHorarios) || listaHorarios.length === 0)
            return '';

        const tempos = listaHorarios.flatMap((h) => h.split(' - '));
        const inicio = tempos[0];
        const fim = tempos[tempos.length - 1];
        return `${inicio} - ${fim}`;
    } catch (e) {
        console.error('Erro ao parsear horários:', e, horarios);
        return '';
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    if (!verificarAutenticacao()) return;

    // Variáveis de estado da página
    let laboratorios = [];
    let labSelecionadoId = null;
    let dataSelecionada = new Date();
    let miniCalendar;

    const loadingEl = document.getElementById('loading-page');
    const contentEl = document.getElementById('agenda-content');

    // Função de inicialização
    async function inicializarPagina() {
        await carregarLaboratorios();
        inicializarMiniCalendario();
        adicionarListeners();
        
        if (laboratorios.length > 0) {
            const primeiroLabIcon = document.querySelector('.lab-icon');
            if(primeiroLabIcon) {
                labSelecionadoId = primeiroLabIcon.dataset.id;
                primeiroLabIcon.classList.add('active');
            }
            await carregarAgendaDiaria();
            loadingEl.style.display = 'none';
            contentEl.style.display = 'block';
            if (miniCalendar) {
                miniCalendar.updateSize();
            }
        } else {
            loadingEl.innerHTML = '<p class="text-muted">Nenhum laboratório cadastrado.</p>';
        }
    }

    async function carregarLaboratorios() {
        try {
            laboratorios = await chamarAPI('/laboratorios');
            const seletor = document.getElementById('seletor-laboratorios');
            if (seletor) {
                seletor.innerHTML = laboratorios.map(lab => `
                    <div class="lab-icon" data-id="${lab.id}" title="${lab.nome}">
                        <i class="bi bi-display"></i>
                        <span>${lab.nome}</span>
                    </div>
                `).join('');
            }
        } catch (error) {
            exibirAlerta('Erro ao carregar laboratórios.', 'danger');
        }
    }

    function inicializarMiniCalendario() {
        const calendarEl = document.getElementById('mini-calendario');
        miniCalendar = new FullCalendar.Calendar(calendarEl, {
            initialDate: dataSelecionada,
            locale: 'pt-br',
            initialView: 'dayGridMonth',
            headerToolbar: { left: 'prev', center: 'title', right: 'next' },
            buttonText: { today: 'Hoje' },
            dateClick: async (info) => {
                dataSelecionada = info.date;
                miniCalendar.gotoDate(dataSelecionada);
                await carregarAgendaDiaria();
            }
        });
        miniCalendar.render();
    }
    
    async function carregarAgendaDiaria() {
        if (!labSelecionadoId) return;
        
        document.getElementById('dia-destaque').textContent = dataSelecionada.getDate().toString().padStart(2, '0');
        document.getElementById('data-extenso-destaque').textContent = dataSelecionada.toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        
        const container = document.getElementById('detalhes-dia-container');
        container.innerHTML = `<div class="text-center p-5"><div class="spinner-border spinner-border-sm"></div></div>`;

        try {
            const dataFormatada = dataSelecionada.toISOString().split('T')[0];
            const dados = await chamarAPI(`/agendamentos/agenda-diaria?laboratorio_id=${labSelecionadoId}&data=${dataFormatada}`);
            renderizarDetalhesDia(dados.agendamentos_por_turno);
        } catch (error) {
            exibirAlerta('Erro ao carregar agenda diária.', 'danger');
            container.innerHTML = '<p class="text-danger">Não foi possível carregar os agendamentos.</p>';
        }
    }

    function renderizarDetalhesDia(agendamentosPorTurno) {
        const container = document.getElementById('detalhes-dia-container');
        const dataFormatada = dataSelecionada.toISOString().split('T')[0];

        container.innerHTML = ['Manhã', 'Tarde', 'Noite']
            .map((turno) => {
                const dadosTurno = agendamentosPorTurno[turno] || {
                    agendamentos: [],
                    horarios_disponiveis: [],
                };
                const agendamentosDoTurno = dadosTurno.agendamentos;
                const horariosDisponiveis = dadosTurno.horarios_disponiveis;

                return `
            <div class="card turno-card">
                <div class="card-header">> ${turno}</div>
                <div class="card-body">
                    ${
                        agendamentosDoTurno.length > 0
                            ? `<h6><i class="bi bi-calendar-x"></i> Horários Ocupados</h6>` +
                              agendamentosDoTurno
                                  .map(
                                      (ag) => `
                            <div class="agendamento-item">
                                <div class="agendamento-info">
                                    <strong>${escapeHTML(ag.turma_nome)}</strong><br>
                                    <span class="text-muted small">
                                        <i class="bi bi-clock-fill"></i> 
                                        ${calcularIntervaloDeTempo(ag.horarios)}
                                    </span>
                                </div>
                                <div class="agendamento-acoes btn-group">
                                    <button class="btn btn-sm btn-outline-primary" onclick="window.location.href='/novo-agendamento.html?id=${ag.id}'" title="Editar"><i class="bi bi-pencil"></i></button>
                                    <button class="btn btn-sm btn-outline-danger" onclick="excluirAgendamento(${ag.id})" title="Excluir"><i class="bi bi-trash"></i></button>
                                </div>
                            </div>
                          `
                                  )
                                  .join('')
                            : '<p class="text-muted small">Nenhum agendamento neste turno.</p>'
                    }
                    ${
                        horariosDisponiveis.length > 0
                            ? `<h6 class="mt-4"><i class="bi bi-calendar-check"></i> Horários Disponíveis</h6>` +
                              horariosDisponiveis
                                  .map(
                                      (h) => `<span class="badge bg-light text-dark border me-1 mb-1">${h}</span>`
                                  )
                                  .join('')
                            : ''
                    }
                </div>
                <div class="card-footer text-end">
                    <a href="/novo-agendamento.html?lab_id=${labSelecionadoId}&data=${dataFormatada}&turno=${turno}" class="btn btn-primary btn-sm btn-novo-agendamento-turno">
                        <i class="bi bi-plus"></i> Novo Agendamento
                    </a>
                </div>
            </div>`;
            })
            .join('');
    }

    function adicionarListeners() {
        document.getElementById('seletor-laboratorios').addEventListener('click', (e) => {
            const icon = e.target.closest('.lab-icon');
            if (icon && !icon.classList.contains('active')) {
                document.querySelectorAll('.lab-icon').forEach(i => i.classList.remove('active'));
                icon.classList.add('active');
                labSelecionadoId = icon.dataset.id;
                carregarAgendaDiaria();
            }
        });

        // Adicione aqui a lógica para os botões de navegação de data, se desejar.
    }

    inicializarPagina();
});
