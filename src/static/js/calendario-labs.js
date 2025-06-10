// Calendário de agendamentos de laboratórios usando FullCalendar

let calendar;
let agendamentosData = [];

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
        eventDisplay: 'block',
        dayMaxEvents: 3,
        moreLinkText: num => `+${num} mais`,
        eventClick: info => mostrarDetalhesAgendamento(info.event.extendedProps),
        dateClick: info => {
            window.location.href = `/novo-agendamento.html?data=${info.dateStr}`;
        },
        events: (fetchInfo, successCallback, failureCallback) => {
            carregarAgendamentos(fetchInfo.startStr, fetchInfo.endStr)
                .then(successCallback)
                .catch(err => {
                    console.error('Erro ao carregar eventos:', err);
                    failureCallback(err);
                });
        }
    });
    calendar.render();
    document.getElementById('loadingCalendario').style.display = 'none';
    document.getElementById('calendario').style.display = 'block';
}

async function carregarAgendamentos(dataInicio, dataFim) {
    try {
        const params = new URLSearchParams({
            data_inicio: dataInicio.split('T')[0],
            data_fim: dataFim.split('T')[0]
        });
        const laboratorio = document.getElementById('filtroLaboratorio').value;
        const turno = document.getElementById('filtroTurno').value;
        if (laboratorio) params.append('laboratorio', laboratorio);
        if (turno) params.append('turno', turno);

        const response = await fetch(`${API_URL}/agendamentos/calendario?${params.toString()}`, {
            headers: { 'Authorization': `Bearer ${getToken()}` }
        });

        if (response.ok) {
            const eventos = await response.json();
            agendamentosData = eventos;
            return eventos.map(ev => ({
                id: ev.id,
                title: ev.title,
                start: ev.start,
                end: ev.end,
                backgroundColor: ev.backgroundColor,
                borderColor: ev.borderColor,
                className: getClasseTurno(ev.extendedProps.turno),
                extendedProps: ev.extendedProps
            }));
        } else {
            throw new Error('Erro ao carregar agendamentos');
        }
    } catch (error) {
        console.error('Erro ao carregar agendamentos:', error);
        return [];
    }
}

function aplicarFiltrosCalendario() {
    if (calendar) {
        calendar.refetchEvents();
    }
}

function mostrarDetalhesAgendamento(agendamento) {
    const modal = new bootstrap.Modal(document.getElementById('agendamentoModal'));
    const modalBody = document.getElementById('agendamentoModalBody');

    let horariosFormatados = '';
    try {
        const horarios = JSON.parse(agendamento.horarios);
        horariosFormatados = horarios.join('<br>');
    } catch (e) {
        horariosFormatados = agendamento.horarios;
    }

    modalBody.innerHTML = `
        <div class="mb-3"><strong>Laboratório:</strong> ${agendamento.laboratorio}</div>
        <div class="mb-3"><strong>Turma:</strong> ${agendamento.turma}</div>
        <div class="mb-3"><strong>Data:</strong> ${formatarData(agendamento.data)}</div>
        <div class="mb-3"><strong>Turno:</strong> <span class="badge ${getClasseTurno(agendamento.turno)}">${agendamento.turno}</span></div>
        <div class="mb-3"><strong>Horários:</strong><br>${horariosFormatados}</div>
        <div class="mb-3"><strong>Agendado por:</strong> ${agendamento.usuario_nome || 'Não informado'}</div>
    `;

    const usuario = getUsuarioLogado();
    const podeEditar = isAdmin() || (usuario && agendamento.usuario_id === usuario.id);
    document.getElementById('btnEditarAgendamento').style.display = podeEditar ? '' : 'none';
    document.getElementById('btnExcluirAgendamento').style.display = podeEditar ? '' : 'none';
    document.getElementById('btnEditarAgendamento').onclick = () => {
        window.location.href = `/novo-agendamento.html?id=${agendamento.id}`;
    };
    document.getElementById('btnExcluirAgendamento').onclick = () => {
        modal.hide();
        const confirmModal = new bootstrap.Modal(document.getElementById('confirmacaoModal'));
        confirmModal.show();
        document.getElementById('btnConfirmarExclusao').onclick = async () => {
            try {
                await chamarAPI(`/agendamentos/${agendamento.id}`, 'DELETE');
                confirmModal.hide();
                exibirAlerta('Agendamento excluído com sucesso!', 'success');
                calendar.refetchEvents();
            } catch (error) {
                exibirAlerta(`Erro ao excluir agendamento: ${error.message}`, 'danger');
            }
        };
    };

    modal.show();
}
 
// Configurações de filtros
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
