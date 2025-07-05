document.addEventListener('DOMContentLoaded', async () => {
    if (!verificarAutenticacao()) return;
    
    // --- VARIÁVEIS DE ESTADO E ELEMENTOS DO DOM ---
    let laboratorios = [];
    let labSelecionadoId = null;
    let dataSelecionada = new Date();
    let miniCalendar;

    const loadingEl = document.getElementById('loading-page');
    const contentEl = document.getElementById('agenda-content');
    const emptyStateEl = document.getElementById('empty-state-container');
    const seletorContainer = document.getElementById('seletor-laboratorios');
    const agendaContainer = document.getElementById('detalhes-dia-container');
    const diaDestaqueEl = document.getElementById('dia-destaque');
    const dataExtensoEl = document.getElementById('data-extenso-destaque');
    const miniCalendarEl = document.getElementById('mini-calendario');
    const navAnteriorBtn = document.getElementById('nav-anterior');
    const navHojeBtn = document.getElementById('nav-hoje');
    const navSeguinteBtn = document.getElementById('nav-seguinte');

    // --- FUNÇÕES ---

    const inicializarPagina = async () => {
        await carregarLaboratorios();
        if (laboratorios && laboratorios.length > 0) {
            inicializarMiniCalendario();
            adicionarListeners();
            const primeiroLabIcon = document.querySelector('.lab-icon');
            if(primeiroLabIcon) {
                labSelecionadoId = primeiroLabIcon.dataset.id;
                primeiroLabIcon.classList.add('active');
            }
            await atualizarVisualizacaoCompleta(dataSelecionada);
            loadingEl.classList.add('d-none');
            contentEl.classList.remove('d-none');
            setTimeout(() => miniCalendar.updateSize(), 50);
        } else {
            loadingEl.classList.add('d-none');
            emptyStateEl.classList.remove('d-none');
        }
    };

    const carregarLaboratorios = async () => {
        try {
            laboratorios = await chamarAPI('/laboratorios');
            seletorContainer.innerHTML = laboratorios.map(lab => {
                let iconClass = lab.classe_icone && lab.classe_icone.startsWith('bi-') ? lab.classe_icone : 'bi-box-seam';
                return `<div class="lab-icon" data-id="${lab.id}" title="${escapeHTML(lab.nome)}"><i class="bi ${iconClass}"></i><span>${escapeHTML(lab.nome)}</span></div>`;
            }).join('');
        } catch (error) {
            exibirAlerta('Erro ao carregar laboratórios.', 'danger');
            laboratorios = [];
        }
    };

    const inicializarMiniCalendario = () => {
        miniCalendar = new FullCalendar.Calendar(miniCalendarEl, {
            initialDate: dataSelecionada, locale: 'pt-br', initialView: 'dayGridMonth',
            headerToolbar: { left: 'prev', center: 'title', right: 'next' },
            buttonText: { today: 'Hoje' },
            dateClick: (info) => atualizarVisualizacaoCompleta(info.date),
        });
        miniCalendar.render();
    };
    
    const atualizarVisualizacaoCompleta = async (novaData) => {
        dataSelecionada = novaData;
        diaDestaqueEl.textContent = dataSelecionada.getDate().toString().padStart(2, '0');
        dataExtensoEl.textContent = dataSelecionada.toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long' });
        miniCalendar.gotoDate(dataSelecionada);
        await carregarAgendaDiaria();
    };

    const carregarAgendaDiaria = async () => {
        if (!labSelecionadoId) return;
        agendaContainer.innerHTML = `<div class="text-center p-5"><div class="spinner-border spinner-border-sm"></div></div>`;
        try {
            const dataFormatada = dataSelecionada.toISOString().split('T')[0];
            const dados = await chamarAPI(`/agendamentos/agenda-diaria?laboratorio_id=${labSelecionadoId}&data=${dataFormatada}`);
            renderizarDetalhesDia(dados.agendamentos_por_turno || dados.agendamentos);
        } catch (error) {
            exibirAlerta('Erro ao carregar agenda diária.', 'danger');
            agendaContainer.innerHTML = '<p class="text-danger text-center">Não foi possível carregar os agendamentos.</p>';
        }
    };
    
    const renderizarDetalhesDia = (agendamentosPorTurno) => {
        // ... (código da função renderizarDetalhesDia da resposta anterior) ...
    };
    
    const adicionarListeners = () => {
        seletorContainer.addEventListener('click', (e) => {
            const icon = e.target.closest('.lab-icon');
            if (icon && !icon.classList.contains('active')) {
                document.querySelectorAll('.lab-icon').forEach(i => i.classList.remove('active'));
                icon.classList.add('active');
                labSelecionadoId = icon.dataset.id;
                carregarAgendaDiaria();
            }
        });

        // ... (listeners para botões de navegação, se existirem) ...
    };

    inicializarPagina();
});

