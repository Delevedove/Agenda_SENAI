let laboratorios = [];
let labSelecionadoId = null;
let dataSelecionada = new Date();

document.addEventListener('DOMContentLoaded', () => {
    carregarLaboratorios();
    inicializarMiniCalendario();
    carregarAgendaDiaria();
});

async function carregarLaboratorios() {
    try {
        laboratorios = await chamarAPI('/laboratorios');
        const container = document.getElementById('seletor-laboratorios');
        if (!container) return;
        container.innerHTML = '';
        laboratorios.forEach(lab => {
            const div = document.createElement('div');
            div.className = 'lab-icon';
            div.dataset.id = lab.id;
            div.innerHTML = `<i class="bi bi-pc-display"></i><span>${escapeHTML(lab.nome)}</span>`;
            if (labSelecionadoId === null) labSelecionadoId = lab.id;
            if (lab.id === labSelecionadoId) div.classList.add('active');
            container.appendChild(div);
        });
    } catch (e) {
        console.error('Erro ao carregar laboratórios', e);
    }
}

function inicializarMiniCalendario() {
    const el = document.getElementById('mini-calendario');
    if (!el) return;
    const cal = new FullCalendar.Calendar(el, {
        locale: 'pt-br',
        initialView: 'dayGridMonth',
        height: 'auto',
        headerToolbar: { left: 'prev,next', center: 'title', right: '' },
        dateClick: info => {
            dataSelecionada = info.date;
            carregarAgendaDiaria();
        }
    });
    cal.render();
}

async function carregarAgendaDiaria() {
    atualizarDataDestaque();
    if (!labSelecionadoId) return;
    const params = new URLSearchParams({
        laboratorio_id: labSelecionadoId,
        data: dataSelecionada.toISOString().slice(0, 10)
    });
    try {
        const dados = await chamarAPI(`/agendamentos/agenda-diaria?${params.toString()}`);
        renderizarDetalhesDia(dados);
    } catch (e) {
        console.error('Erro ao carregar agenda diária', e);
    }
}

function atualizarDataDestaque() {
    const h1 = document.querySelector('#data-destaque h1');
    const p = document.querySelector('#data-destaque p');
    if (h1) h1.textContent = String(dataSelecionada.getDate()).padStart(2, '0');
    if (p) p.textContent = dataSelecionada.toLocaleDateString('pt-BR', { weekday: 'long', month: 'long', year: 'numeric' });
}

function renderizarDetalhesDia(dados) {
    const container = document.getElementById('detalhes-dia-container');
    if (!container || !dados) return;
    container.innerHTML = '';
    ['Manhã', 'Tarde', 'Noite'].forEach(turno => {
        const lista = (dados.agendamentos && dados.agendamentos[turno]) || [];
        let html = `<div class="card turno-card"><div class="card-header">${turno}</div><div class="card-body p-0">`;
        if (lista.length) {
            lista.forEach(ag => {
                html += `<div class="agendamento-item"><strong>${escapeHTML(ag.turma)}</strong><br>${ag.horario_inicio} - ${ag.horario_fim}</div>`;
            });
        } else {
            html += '<div class="p-2 text-muted">Nenhum agendamento</div>';
        }
        html += `<div class="p-2 text-end"><button class="btn btn-sm btn-outline-primary btn-novo-agendamento" data-turno="${turno}">+ Novo Agendamento</button></div></div></div>`;
        container.insertAdjacentHTML('beforeend', html);
    });
}

// Delegated events
const labsContainer = document.getElementById('seletor-laboratorios');
if (labsContainer) {
    labsContainer.addEventListener('click', ev => {
        const el = ev.target.closest('.lab-icon');
        if (!el) return;
        labSelecionadoId = parseInt(el.dataset.id, 10);
        document.querySelectorAll('#seletor-laboratorios .lab-icon').forEach(l => l.classList.remove('active'));
        el.classList.add('active');
        carregarAgendaDiaria();
    });
}

const detalhesContainer = document.getElementById('detalhes-dia-container');
if (detalhesContainer) {
    detalhesContainer.addEventListener('click', ev => {
        const btn = ev.target.closest('.btn-novo-agendamento');
        if (!btn) return;
        const turno = btn.dataset.turno;
        const data = dataSelecionada.toISOString().slice(0, 10);
        window.location.href = `/novo-agendamento.html?laboratorio_id=${labSelecionadoId}&data=${data}&turno=${encodeURIComponent(turno)}`;
    });
}
