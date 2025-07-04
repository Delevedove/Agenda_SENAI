document.addEventListener('DOMContentLoaded', async () => {
    if (!verificarAutenticacao()) return;

    let laboratorios = [], labSelecionadoId = null, dataSelecionada = new Date(), miniCalendar;
    const loadingEl = document.getElementById('loading-page'), contentEl = document.getElementById('agenda-content');
    const seletorContainer = document.getElementById('seletor-laboratorios'), agendaContainer = document.getElementById('detalhes-dia-container');
    const diaDestaqueEl = document.getElementById('dia-destaque'), dataExtensoEl = document.getElementById('data-extenso-destaque');
    const miniCalendarEl = document.getElementById('mini-calendario');
    const navAnteriorBtn = document.getElementById('nav-anterior'), navHojeBtn = document.getElementById('nav-hoje'), navSeguinteBtn = document.getElementById('nav-seguinte');

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
            await atualizarVisualizacaoCompleta(dataSelecionada);
            loadingEl.style.display = 'none';
            contentEl.style.display = 'block';
            
            // --- CORREÇÃO DO MINI-CALENDÁRIO ---
            // Força a atualização do tamanho do calendário após a sua div ficar visível.
            // O setTimeout garante que o navegador teve tempo de calcular as dimensões.
            setTimeout(() => miniCalendar.updateSize(), 50);

        } else {
            loadingEl.innerHTML = '<p class="text-muted">Nenhum laboratório cadastrado.</p>';
        }
    }

    async function atualizarVisualizacaoCompleta(novaData) {
        dataSelecionada = novaData;
        diaDestaqueEl.textContent = dataSelecionada.getDate().toString().padStart(2, '0');
        dataExtensoEl.textContent = dataSelecionada.toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        miniCalendar.gotoDate(dataSelecionada);
        await carregarAgendaDiaria();
    }

    async function carregarLaboratorios() {
        try {
            laboratorios = await chamarAPI('/laboratorios');
            if (seletorContainer) {
                seletorContainer.innerHTML = laboratorios.map(lab => `
                    <div class="lab-icon" data-id="${lab.id}" title="${escapeHTML(lab.nome)}">
                        <i class="bi bi-display"></i>
                        <span>${escapeHTML(lab.nome)}</span>
                    </div>
                `).join('');
            }
        } catch (error) { exibirAlerta('Erro ao carregar laboratórios.', 'danger'); }
    }

    function inicializarMiniCalendario() {
        miniCalendar = new FullCalendar.Calendar(miniCalendarEl, {
            initialDate: dataSelecionada, locale: 'pt-br', initialView: 'dayGridMonth',
            headerToolbar: { left: 'prev', center: 'title', right: 'next' },
            buttonText: { today: 'Hoje' },
            dateClick: (info) => { atualizarVisualizacaoCompleta(info.date); }
        });
        miniCalendar.render();
    }
    
    async function carregarAgendaDiaria() {
        if (!labSelecionadoId) return;
        agendaContainer.innerHTML = `<div class="text-center p-5"><div class="spinner-border spinner-border-sm"></div></div>`;
        try {
            const dataFormatada = dataSelecionada.toISOString().split('T')[0];
            const dados = await chamarAPI(`/agendamentos/agenda-diaria?laboratorio_id=${labSelecionadoId}&data=${dataFormatada}`);
            renderizarDetalhesDia(dados.agendamentos);
        } catch (error) {
            exibirAlerta('Erro ao carregar agenda diária.', 'danger');
            agendaContainer.innerHTML = '<p class="text-danger text-center">Não foi possível carregar os agendamentos.</p>';
        }
    }

    // --- CORREÇÃO DA EXIBIÇÃO DE HORÁRIOS ---
    function calcularIntervaloDeTempo(horarios) {
        if (!horarios || horarios.length === 0) return '';
        try {
            const listaHorarios = typeof horarios === 'string' ? JSON.parse(horarios) : horarios;
            if (listaHorarios.length === 0) return '';
            const tempos = listaHorarios.flatMap(h => h.split(' - '));
            return `${tempos[0]} - ${tempos[tempos.length - 1]}`;
        } catch(e) { return ''; }
    }

    function renderizarDetalhesDia(agendamentos) {
        const dataFormatada = dataSelecionada.toISOString().split('T')[0];
        agendaContainer.innerHTML = ['Manhã', 'Tarde', 'Noite'].map(turno => {
            const agendamentosDoTurno = agendamentos[turno] || [];
            return `
            <div class="card turno-card">
                <div class="card-header">> ${turno}</div>
                <div class="card-body">
                    ${agendamentosDoTurno.length > 0 
                        ? agendamentosDoTurno.map(ag => `
                            <div class="agendamento-item">
                                <div class="agendamento-info">
                                    <strong>${escapeHTML(ag.turma_nome)}</strong><br>
                                    <span class="text-muted small">
                                        <i class="bi bi-clock"></i> 
                                        ${calcularIntervaloDeTempo(ag.horarios)}
                                    </span>
                                </div>
                                <div class="agendamento-acoes btn-group">
                                    <button class="btn btn-sm btn-outline-primary" onclick="window.location.href='/novo-agendamento.html?id=${ag.id}'" title="Editar"><i class="bi bi-pencil"></i></button>
                                    <button class="btn btn-sm btn-outline-danger" onclick="excluirAgendamento(${ag.id})" title="Excluir"><i class="bi bi-trash"></i></button>
                                </div>
                            </div>`).join('') 
                        : '<p class="text-muted small">Nenhum agendamento neste turno.</p>'}
                </div>
                <div class="card-footer text-end">
                    <a href="/novo-agendamento.html?lab_id=${labSelecionadoId}&data=${dataFormatada}&turno=${turno}" class="btn btn-primary btn-sm btn-novo-agendamento-turno"><i class="bi bi-plus"></i> Novo Agendamento</a>
                </div>
            </div>`}).join('');
    }

    function adicionarListeners() {
        seletorContainer.addEventListener('click', (e) => {
            const icon = e.target.closest('.lab-icon');
            if (icon && !icon.classList.contains('active')) {
                document.querySelectorAll('.lab-icon').forEach(i => i.classList.remove('active'));
                icon.classList.add('active');
                labSelecionadoId = icon.dataset.id;
                carregarAgendaDiaria();
            }
        });
        navAnteriorBtn.addEventListener('click', () => { atualizarVisualizacaoCompleta(new Date(dataSelecionada.setDate(dataSelecionada.getDate() - 1))); });
        navHojeBtn.addEventListener('click', () => { atualizarVisualizacaoCompleta(new Date()); });
        navSeguinteBtn.addEventListener('click', () => { atualizarVisualizacaoCompleta(new Date(dataSelecionada.setDate(dataSelecionada.getDate() + 1))); });
    }
    
    inicializarPagina();
});
