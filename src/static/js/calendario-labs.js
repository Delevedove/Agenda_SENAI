// CÓDIGO COMPLETO E ADAPTADO PARA calendario-labs.js

document.addEventListener('DOMContentLoaded', function() {
    if (!verificarAutenticacao()) return;

    // Atualiza nome do usuário na navbar
    const usuario = getUsuarioLogado();
    if(usuario) document.getElementById('userName').textContent = usuario.nome;

    // Carrega filtros e inicializa o calendário
    carregarLaboratoriosParaFiltro();
    configurarFiltros();
    inicializarCalendario();
});

let calendar;

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

        dayCellContent: function(arg) {
            const dateStr = arg.date.toISOString().slice(0, 10);
            return {
                html: `<div class="fc-daygrid-day-number">${arg.dayNumberText}</div>
                       <div class="day-pills-container" data-date="${dateStr}"></div>`
            };
        },

        datesSet: async function(dateInfo) {
            aplicarFiltrosCalendario();
        }
    });
    
    calendar.render();
    document.getElementById('loadingCalendario').style.display = 'none';
    document.getElementById('calendario').style.display = 'block';
}

async function carregarLaboratoriosParaFiltro() {
    try {
        const laboratorios = await chamarAPI('/laboratorios');
        const select = document.getElementById('filtroLaboratorio');
        select.innerHTML = '<option value="">Todos</option>';
        laboratorios.forEach(lab => {
            select.innerHTML += `<option value="${lab.nome}">${lab.nome}</option>`;
        });
    } catch (error) {
        console.error('Erro ao carregar laboratórios:', error);
    }
}

function configurarFiltros() {
    document.getElementById('filtrosForm').addEventListener('submit', function(e) {
        e.preventDefault();
        aplicarFiltrosCalendario();
    });
}

async function aplicarFiltrosCalendario() {
    if (!calendar) return;

    try {
        const params = new URLSearchParams({
            data_inicio: calendar.view.activeStart.toISOString().slice(0, 10),
            data_fim: calendar.view.activeEnd.toISOString().slice(0, 10),
        });

        // Adiciona filtros selecionados aos parâmetros
        const laboratorio = document.getElementById('filtroLaboratorio').value;
        const turno = document.getElementById('filtroTurno').value;
        if (laboratorio) params.append('laboratorio', laboratorio);
        if (turno) params.append('turno', turno);

        const response = await fetch(`${API_URL}/agendamentos/resumo-calendario?${params.toString()}`, {
            headers: { 'Authorization': `Bearer ${getToken()}` }
        });

        if (!response.ok) throw new Error('Falha ao carregar resumo do calendário');

        const data = await response.json();
        renderizarPillulas(data.resumo, data.total_recursos);
        
    } catch (error) {
        console.error("Erro ao buscar ou renderizar resumo de agendamentos:", error);
    }
}

function renderizarPillulas(resumo, totalRecursos) {
    document.querySelectorAll('.day-pills-container').forEach(container => {
        const dataStr = container.getAttribute('data-date');
        const diaResumo = resumo ? resumo[dataStr] : null;
        let html = '';

        if (totalRecursos > 0) {
            ['Manhã', 'Tarde', 'Noite'].forEach(turno => {
                const ocupados = diaResumo && diaResumo[turno] ? diaResumo[turno].ocupados : 0;
                let statusClass = 'turno-livre';
                if (ocupados > 0) {
                    statusClass = ocupados >= totalRecursos ? 'turno-cheio' : 'turno-parcial';
                }
                html += `<div class="pill-turno ${statusClass}">${turno}: ${ocupados}/${totalRecursos}</div>`;
            });
        }
        container.innerHTML = html;
    });
}
