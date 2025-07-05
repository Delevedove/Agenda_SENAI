// FUNÇÃO AUXILIAR PARA CALCULAR O INTERVALO DE TEMPO
function calcularIntervaloDeTempo(horariosJSON) {
    if (!horariosJSON) return '';
    try {
        const listaHorarios = Array.isArray(horariosJSON) ? horariosJSON : JSON.parse(horariosJSON);
        if (!Array.isArray(listaHorarios) || listaHorarios.length === 0) return '';

        const tempos = listaHorarios.flatMap(h => h.split(' - '));
        // Pega o primeiro tempo de início e o último tempo de fim
        return `${tempos[0]} - ${tempos[tempos.length - 1]}`;
    } catch (e) {
        console.error("Erro ao processar horários:", e, horariosJSON);
        return '';
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    if (!verificarAutenticacao()) {
        window.location.href = "/admin-login.html";
        return;
    }

    // Variáveis de estado da página
    let laboratorios = [], labSelecionadoId = null, dataSelecionada = new Date(), miniCalendar;
    let agendamentoParaExcluirId = null;

    const loadingEl = document.getElementById('loading-page');
    const contentEl = document.getElementById('agenda-content');
    const emptyStateEl = document.getElementById("empty-state-container");
    const seletorContainer = document.getElementById('seletor-laboratorios');
    const agendaContainer = document.getElementById('detalhes-dia-container');
    const diaDestaqueEl = document.getElementById('dia-destaque');
    const dataExtensoEl = document.getElementById('data-extenso-destaque');
    const miniCalendarEl = document.getElementById('mini-calendario');
    const navAnteriorBtn = document.getElementById('nav-anterior');
    const navHojeBtn = document.getElementById('nav-hoje');
    const navSeguinteBtn = document.getElementById('nav-seguinte');
    const confirmacaoModal = new bootstrap.Modal(document.getElementById('confirmarExclusaoModal'));

    // Função de inicialização
    async function inicializarPagina() {
        // Adiciona a referência ao novo elemento

        // Esconde o conteúdo principal por padrão para evitar piscar na tela
        contentEl.style.display = 'none';
        emptyStateEl.style.display = 'none';
        loadingEl.style.display = 'block';

        await carregarLaboratorios();

        // --- LÓGICA DE EXIBIÇÃO CORRIGIDA ---
        if (laboratorios && laboratorios.length > 0) {
            // Se há laboratórios, mostra a interface da agenda
            inicializarMiniCalendario();
            adicionarListeners();

            const primeiroLabIcon = document.querySelector('.lab-icon');
            if (primeiroLabIcon) {
                labSelecionadoId = primeiroLabIcon.dataset.id;
                primeiroLabIcon.classList.add('active');
            }
            await atualizarVisualizacaoCompleta(dataSelecionada);

            loadingEl.style.display = 'none';
            contentEl.style.display = 'block';
            setTimeout(() => miniCalendar.updateSize(), 50);
        } else {
            // Se NÃO há laboratórios, mostra a mensagem de estado vazio
            loadingEl.style.display = 'none';
            emptyStateEl.style.display = 'block'; // Mostra o novo container
        }
    }

    // VERSÃO FINAL DA FUNÇÃO carregarLaboratorios

    async function carregarLaboratorios() {
        try {
            // A LINHA MAIS IMPORTANTE: O resultado da API é atribuído à variável global.
            laboratorios = await chamarAPI('/laboratorios');

            if (seletorContainer) {
                // Lógica de renderização dos ícones (continua igual)
                seletorContainer.innerHTML = laboratorios.map(lab => {
                    let iconClass = 'bi-box-seam';
                    // ... (seu código switch para ícones) ...
                    return `<div class="lab-icon" data-id="${lab.id}" title="${escapeHTML(lab.nome)}"><i class="bi ${iconClass}"></i><span>${escapeHTML(lab.nome)}</span></div>`;
                }).join('');
            }
        } catch (error) {
            exibirAlerta('Erro ao carregar laboratórios.', 'danger');
            laboratorios = []; // Garante que a lista fique vazia em caso de erro
        }
    }

    function inicializarMiniCalendario() {
        const calendarEl = document.getElementById('mini-calendario');
        miniCalendar = new FullCalendar.Calendar(calendarEl, {
            initialDate: dataSelecionada, locale: 'pt-br', initialView: 'dayGridMonth',
            headerToolbar: { left: 'prev', center: 'title', right: 'next' },
            buttonText: { today: 'Hoje' },
            dateClick: (info) => {
                atualizarVisualizacaoCompleta(info.date);
            },
            // Evento que dispara após o calendário ser renderizado ou mudar de mês
            datesSet: (viewInfo) => {
                sinalizarDiasComReserva(viewInfo.start, viewInfo.end);
            }
        });
        miniCalendar.render();
    }

    function atualizarVisualizacaoCompleta(novaData) {
        dataSelecionada = novaData;
        if (miniCalendar) {
            miniCalendar.gotoDate(dataSelecionada);
        }
        carregarAgendaDiaria();
    }

    async function sinalizarDiasComReserva(dataInicio, dataFim) {
        try {
            const params = new URLSearchParams({
                data_inicio: dataInicio.toISOString().slice(0, 10),
                data_fim: dataFim.toISOString().slice(0, 10),
            });
            const data = await chamarAPI(`/agendamentos/resumo-calendario?${params.toString()}`);

            // Remove indicadores antigos
            document.querySelectorAll('.reserva-indicator').forEach(el => el.remove());

            // Adiciona novos indicadores
            if (data.resumo) {
                for (const dataStr in data.resumo) {
                    const dayCell = document.querySelector(`.fc-day[data-date="${dataStr}"]`);
                    if (dayCell) {
                        // Adiciona um ponto azul se houver qualquer reserva no dia
                        const hasReservas = Object.values(data.resumo[dataStr]).some(turno => turno.ocupados > 0);
                        if(hasReservas) {
                           dayCell.querySelector('.fc-daygrid-day-frame').insertAdjacentHTML('beforeend', '<div class="reserva-indicator"></div>');
                        }
                    }
                }
            }
        } catch (error) {
            console.error("Erro ao sinalizar dias com reserva:", error);
        }
    }
    
    async function carregarAgendaDiaria() {
        if (!labSelecionadoId) return;
        
        document.getElementById('dia-destaque').textContent = dataSelecionada.getDate().toString().padStart(2, '0');
        document.getElementById('data-extenso-destaque').textContent = dataSelecionada.toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        
        agendaContainer.innerHTML = `<div class="text-center p-5"><div class="spinner-border spinner-border-sm"></div></div>`;

        try {
            const dataFormatada = dataSelecionada.toISOString().split('T')[0];
            const dados = await chamarAPI(`/agendamentos/agenda-diaria?laboratorio_id=${labSelecionadoId}&data=${dataFormatada}`);
            renderizarDetalhesDia(dados.agendamentos_por_turno);
        } catch (error) {
            exibirAlerta('Erro ao carregar agenda diária.', 'danger');
            agendaContainer.innerHTML = '<p class="text-danger">Não foi possível carregar os agendamentos.</p>';
        }
    }

    function renderizarDetalhesDia(agendamentosPorTurno) {
        const dataFormatada = dataSelecionada.toISOString().split('T')[0];

        agendaContainer.innerHTML = ['Manhã', 'Tarde', 'Noite'].map(turno => {
            const dadosTurno = agendamentosPorTurno[turno] || { agendamentos: [], horarios_disponiveis: [] };
            const agendamentosDoTurno = dadosTurno.agendamentos;
            const horariosDisponiveis = dadosTurno.horarios_disponiveis;

            return `
            <div class="card turno-card">
                <div class="card-header">> ${turno.toUpperCase()}</div>
                <div class="card-body">
                    ${agendamentosDoTurno.length > 0
                        ? `<h6><i class="bi bi-calendar-x-fill"></i> Horários Ocupados</h6>` +
                          agendamentosDoTurno.map(ag => `
                            <div class="agendamento-item">
                                <div class="agendamento-info">
                                    <strong>${escapeHTML(ag.turma_nome)}</strong><br>
                                    <span class="text-muted small">
                                        <i class="bi bi-clock-fill"></i> ${calcularIntervaloDeTempo(ag.horarios)}
                                    </span>
                                </div>
                                <div class="agendamento-acoes btn-group">
                                    <a href="/novo-agendamento.html?id=${ag.id}" class="btn btn-sm btn-outline-primary" title="Editar"><i class="bi bi-pencil"></i></a>
                                    <button class="btn btn-sm btn-outline-danger" onclick="window.excluirAgendamento(${ag.id})" title="Excluir"><i class="bi bi-trash"></i></button>
                                </div>
                            </div>
                          `).join('')
                        : ''
                    }
                    
                    ${horariosDisponiveis.length > 0
                        ? `<h6 class="${agendamentosDoTurno.length > 0 ? 'mt-4' : ''}"><i class="bi bi-calendar-check-fill"></i> Horários Disponíveis</h6>` +
                          horariosDisponiveis.map(h => `<span class="badge bg-light text-dark border me-1 mb-1">${h}</span>`).join('')
                        : (agendamentosDoTurno.length === 0 ? '<p class="text-muted small">Nenhum agendamento neste turno.</p>' : '<p class="text-muted small mt-4">Todos os horários deste turno estão ocupados.</p>')
                    }
                </div>
                <div class="card-footer text-end">
                    <a href="/novo-agendamento.html?lab_id=${labSelecionadoId}&data=${dataFormatada}&turno=${turno}" class="btn btn-primary btn-sm btn-novo-agendamento-turno">
                        <i class="bi bi-plus"></i> Novo Agendamento
                    </a>
                </div>
            </div>`;
        }).join('');
    }

    // Função para abrir o modal de confirmação de exclusão
    window.excluirAgendamento = function(id) {
        agendamentoParaExcluirId = id;
        confirmacaoModal.show();
    }

    // Função para confirmar e executar a exclusão
    async function executarExclusao() {
        if (!agendamentoParaExcluirId) return;

        try {
            await chamarAPI(`/agendamentos/${agendamentoParaExcluirId}`, 'DELETE');
            exibirAlerta('Agendamento excluído com sucesso!', 'success');
            agendamentoParaExcluirId = null;
            confirmacaoModal.hide();
            await carregarAgendaDiaria();
        } catch (error) {
            exibirAlerta(`Erro ao excluir agendamento: ${error.message}`, 'danger');
        }
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

        const btnConfirma = document.getElementById('btnConfirmarExclusao');
        if (btnConfirma) {
            btnConfirma.addEventListener('click', executarExclusao);
        }

        // Adicione aqui a lógica para os botões de navegação de data, se desejar.
    }

    inicializarPagina();
});
