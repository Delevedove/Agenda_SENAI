// Calendário de agendamentos com resumo por turno
let calendar;
let resumoDias = {};
let totalLaboratorios = 0;

function inicializarCalendario() {
    const calendarEl = document.getElementById('calendario');
    calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        locale: 'pt-br',
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay'
        },
        buttonText: {
            today: 'Hoje',
            month: 'Mês',
            week: 'Semana',
            day: 'Dia'
        },
        height: 'auto',

        // 1. Injeta um container nas células do calendário para receber as pílulas.
        dayCellContent: function(arg) {
            const dateStr = arg.date.toISOString().slice(0, 10);
            return {
                html: `<div class="fc-daygrid-day-number">${arg.dayNumberText}</div>
                       <div class="day-pills-container" data-date="${dateStr}"></div>`
            };
        },

        // 2. A propriedade 'events' não será usada para buscar dados, apenas para eventos pontuais se necessário.
        events: function(fetchInfo, successCallback, failureCallback) {
            // Devolvemos um array vazio porque a nossa renderização é customizada.
            successCallback([]);
        },

        // 3. USA-SE O 'datesSet' PARA BUSCAR DADOS E RENDERIZAR AS PÍLULAS.
        // Este evento é acionado sempre que a faixa de datas do calendário muda.
        datesSet: async function(dateInfo) {
            try {
                const params = new URLSearchParams({
                    data_inicio: dateInfo.startStr.slice(0, 10),
                    data_fim: dateInfo.endStr.slice(0, 10)
                });

                const response = await fetch(`${API_URL}/agendamentos/resumo-calendario?${params.toString()}`, {
                    headers: { 'Authorization': `Bearer ${getToken()}` }
                });

                if (!response.ok) {
                    throw new Error('Falha ao carregar resumo do calendário');
                }

                const data = await response.json();
                renderizarPillulas(data.resumo, data.total_laboratorios);

            } catch (error) {
                console.error("Erro ao buscar ou renderizar resumo de agendamentos:", error);
                // Opcional: exibir um alerta de erro para o usuário.
            }
        },
        
        // 4. A função de clique no dia abre o modal de resumo, como antes.
        dateClick: function(info) {
             // Esta função deve chamar o seu modal de resumo.
             // Se o modal já funciona, esta parte está correta.
             // Exemplo: mostrarResumoAgendamentos(info.dateStr);
             mostrarResumoAgendamentos(info.dateStr);
        }
    });
    
    calendar.render();
    document.getElementById('loadingCalendario').style.display = 'none';
    document.getElementById('calendario').style.display = 'block';
}

async function carregarResumoCalendario(inicio, fim) {
    const params = new URLSearchParams({
        data_inicio: inicio.split('T')[0],
        data_fim: fim.split('T')[0]
    });
    const resp = await fetch(`${API_URL}/agendamentos/resumo-calendario?${params.toString()}`, {
        headers: { 'Authorization': `Bearer ${getToken()}` }
    });
    if (!resp.ok) throw new Error('Erro ao obter resumo');
    const dados = await resp.json();
    resumoDias = dados.resumo || {};
    totalLaboratorios = dados.total_laboratorios || 0;
}

async function mostrarResumoAgendamentos(dataStr) {
    const modalEl = document.getElementById('modalResumoAgendamentos');
    const modal = new bootstrap.Modal(modalEl);
    const container = document.getElementById('conteudoResumoAgendamentos');
    document.getElementById('modalResumoAgendamentosLabel').textContent = 'Resumo de Agendamentos – ' + formatarData(dataStr);
    container.innerHTML = '<div class="text-center py-3"><div class="spinner-border text-primary" role="status"></div></div>';
    try {
        const [agendamentos, laboratorios] = await Promise.all([
            chamarAPI(`/agendamentos/calendario?data_inicio=${dataStr}&data_fim=${dataStr}`),
            chamarAPI('/laboratorios')
        ]);
        const nomesLabs = laboratorios.map(l => l.nome);
        container.innerHTML = '';
        ['Manhã', 'Tarde', 'Noite'].forEach(turno => {
            const eventos = agendamentos.filter(e => e.extendedProps.turno === turno);
            const ocupados = eventos.map(e => e.extendedProps.laboratorio);
            const livres = nomesLabs.filter(n => !ocupados.includes(n));
            const card = document.createElement('div');
            card.className = 'card mb-3';
            const header = document.createElement('div');
            header.className = 'card-header bg-light d-flex justify-content-between align-items-center';
            header.innerHTML = `<h6 class="mb-0">${escapeHTML(turno)}</h6><span class="badge bg-secondary">${eventos.length} / ${nomesLabs.length} Laboratórios</span>`;
            card.appendChild(header);
            const body = document.createElement('div');
            body.className = 'card-body';
            let html = '<div class="row">';
            html += '<div class="col-md-7">';
            html += '<h6><i class="bi bi-flask text-danger"></i> Laboratórios Ocupados:</h6>';
            if (eventos.length) {
                html += '<ul class="list-group list-group-flush">';
                eventos.forEach(ev => {
                    const p = ev.extendedProps;
                    html += `<li class="list-group-item d-flex justify-content-between align-items-center">` +
                             `<div><strong>${escapeHTML(p.laboratorio)}:</strong> ${escapeHTML(p.turma)}</div>` +
                             `<div class="btn-group">` +
                             `<button class="btn btn-sm btn-outline-primary btn-editar-agendamento" data-id="${ev.id}" title="Editar"><i class="bi bi-pencil"></i></button>` +
                             `<button class="btn btn-sm btn-outline-danger btn-excluir-agendamento" data-id="${ev.id}" title="Excluir"><i class="bi bi-trash"></i></button>` +
                             `</div></li>`;
                });
                html += '</ul>';
            } else {
                html += '<p class="fst-italic text-muted">Nenhum laboratório ocupado neste turno.</p>';
            }
            html += '</div>';
            html += '<div class="col-md-5">';
            html += '<h6><i class="bi bi-flask-fill text-success"></i> Laboratórios Livres:</h6>';
            if (livres.length) {
                livres.forEach(n => {
                    html += `<span class="badge bg-light text-dark border me-1 mb-1">${escapeHTML(n)}</span>`;
                });
            } else {
                html += '<p class="fst-italic text-muted">Todos os laboratórios estão ocupados.</p>';
            }
            html += '</div></div>';
            body.innerHTML = sanitizeHTML(html);
            card.appendChild(body);
            container.appendChild(card);
        });
        container.querySelectorAll('.btn-editar-agendamento').forEach(btn => {
            btn.addEventListener('click', e => editarAgendamento(e.currentTarget.getAttribute('data-id')));
        });
        container.querySelectorAll('.btn-excluir-agendamento').forEach(btn => {
            btn.addEventListener('click', e => excluirAgendamento(e.currentTarget.getAttribute('data-id')));
        });
    } catch (err) {
        console.error('Erro ao carregar resumo', err);
        container.innerHTML = '<p class="text-danger">Erro ao carregar dados.</p>';
    }
    modal.show();
}

function editarAgendamento(id) {
    window.location.href = `/novo-agendamento.html?id=${id}`;
}

function excluirAgendamento(id) {
    const confirmModal = new bootstrap.Modal(document.getElementById('confirmacaoModal'));
    confirmModal.show();
    document.getElementById('btnConfirmarExclusao').onclick = async () => {
        try {
            await chamarAPI(`/agendamentos/${id}`, 'DELETE');
            confirmModal.hide();
            exibirAlerta('Agendamento excluído com sucesso!', 'success');
            calendar.refetchEvents();
        } catch (error) {
            exibirAlerta(`Erro ao excluir agendamento: ${error.message}`, 'danger');
        }
    };
}

function aplicarFiltrosCalendario() {
    if (calendar) {
        calendar.refetchEvents();
    }
}

function configurarFiltros() {
    const form = document.getElementById('filtrosForm');
    const formMobile = document.getElementById('filtrosMobileForm');
    if (form) {
        form.addEventListener('submit', e => {
            e.preventDefault();
            document.getElementById('filtroLaboratorioMobile').value = document.getElementById('filtroLaboratorio').value;
            document.getElementById('filtroTurnoMobile').value = document.getElementById('filtroTurno').value;
            aplicarFiltrosCalendario();
        });
    }
    if (formMobile) {
        formMobile.addEventListener('submit', e => {
            e.preventDefault();
            document.getElementById('filtroLaboratorio').value = document.getElementById('filtroLaboratorioMobile').value;
            document.getElementById('filtroTurno').value = document.getElementById('filtroTurnoMobile').value;
            aplicarFiltrosCalendario();
        });
    }
}

// Esta função auxiliar desenha as pílulas e deve estar no mesmo ficheiro.
function renderizarPillulas(resumo, totalLabs) {
    if (!resumo || totalLabs === 0) return;

    // Limpa pílulas antigas para evitar duplicatas ao navegar
    document.querySelectorAll('.day-pills-container').forEach(c => c.innerHTML = '');

    for (const dataStr in resumo) {
        const container = document.querySelector(`.day-pills-container[data-date="${dataStr}"]`);
        if (!container) continue;

        let html = '';
        ['Manhã', 'Tarde', 'Noite'].forEach(turno => {
            const ocupados = resumo[dataStr][turno] ? resumo[dataStr][turno].ocupados : 0;
            let statusClass = 'turno-livre';
            if (ocupados > 0) {
                statusClass = ocupados === totalLabs ? 'turno-cheio' : 'turno-parcial';
            }
            html += `<div class="pill-turno ${statusClass}">${turno}: ${ocupados}/${totalLabs}</div>`;
        });
        container.innerHTML = html;
    }
}
