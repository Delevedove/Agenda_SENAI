// Variáveis globais para o módulo de ocupação de salas
let mesAtual = new Date().getMonth() + 1;
let anoAtual = new Date().getFullYear();
let reservaAtual = null;
let salas = [];
let instrutores = [];
let reservas = [];

// Inicialização da página
document.addEventListener('DOMContentLoaded', function() {
    carregarSalas();
    carregarInstrutores();
    carregarCalendario();
    
    // Configurar formulário de nova reserva
    document.getElementById('formNovaReserva').addEventListener('submit', function(e) {
        e.preventDefault();
        criarReserva();
    });
    
    // Configurar data mínima para hoje
    const hoje = new Date().toISOString().split('T')[0];
    document.getElementById('reservaData').min = hoje;
});

// Função para carregar salas
async function carregarSalas() {
    try {
        const response = await chamarAPI('/api/salas', 'GET');
        salas = response;
        
        // Atualizar select de salas nos filtros
        const selectFiltro = document.getElementById('filtroSala');
        selectFiltro.innerHTML = '<option value="">Todas</option>';
        
        // Atualizar select de salas na nova reserva
        const selectReserva = document.getElementById('reservaSala');
        selectReserva.innerHTML = '<option value="">Selecione uma sala</option>';
        
        salas.forEach(sala => {
            const option1 = new Option(sala.nome, sala.id);
            const option2 = new Option(`${sala.nome} (Cap: ${sala.capacidade})`, sala.id);
            selectFiltro.appendChild(option1);
            selectReserva.appendChild(option2);
        });
        
        // Atualizar tabela de salas
        atualizarTabelaSalas();
        
    } catch (error) {
        console.error('Erro ao carregar salas:', error);
        mostrarAlerta('Erro ao carregar salas', 'danger');
    }
}

// Função para carregar instrutores
async function carregarInstrutores() {
    try {
        const response = await chamarAPI('/api/instrutores', 'GET');
        instrutores = response;
        
        // Atualizar select de instrutores na nova reserva
        const selectInstrutor = document.getElementById('reservaInstrutor');
        selectInstrutor.innerHTML = '<option value="">Selecione um instrutor</option>';
        
        instrutores.forEach(instrutor => {
            const option = new Option(instrutor.nome, instrutor.id);
            selectInstrutor.appendChild(option);
        });
        
        // Atualizar tabela de instrutores
        atualizarTabelaInstrutores();
        
    } catch (error) {
        console.error('Erro ao carregar instrutores:', error);
        mostrarAlerta('Erro ao carregar instrutores', 'danger');
    }
}

// Função para carregar calendário
async function carregarCalendario() {
    try {
        const response = await chamarAPI(`/api/reservas-salas/calendario/${mesAtual}/${anoAtual}`, 'GET');
        reservas = response;
        
        // Atualizar título do mês
        const meses = [
            'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
            'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
        ];
        document.getElementById('mesAnoAtual').textContent = `${meses[mesAtual - 1]} ${anoAtual}`;
        
        // Gerar calendário
        gerarCalendario();
        
    } catch (error) {
        console.error('Erro ao carregar calendário:', error);
        mostrarAlerta('Erro ao carregar calendário', 'danger');
    }
}

// Função para gerar calendário
function gerarCalendario() {
    const calendarioBody = document.getElementById('calendarioBody');
    calendarioBody.innerHTML = '';
    
    // Primeiro dia do mês
    const primeiroDia = new Date(anoAtual, mesAtual - 1, 1);
    const ultimoDia = new Date(anoAtual, mesAtual, 0);
    const diasNoMes = ultimoDia.getDate();
    const diaSemanaInicio = primeiroDia.getDay();
    
    let dia = 1;
    let semana = document.createElement('tr');
    
    // Células vazias antes do primeiro dia
    for (let i = 0; i < diaSemanaInicio; i++) {
        const celula = document.createElement('td');
        celula.className = 'dia-vazio';
        semana.appendChild(celula);
    }
    
    // Dias do mês
    for (let i = diaSemanaInicio; i < 7 && dia <= diasNoMes; i++) {
        const celula = criarCelulaDia(dia);
        semana.appendChild(celula);
        dia++;
    }
    
    calendarioBody.appendChild(semana);
    
    // Semanas restantes
    while (dia <= diasNoMes) {
        semana = document.createElement('tr');
        
        for (let i = 0; i < 7 && dia <= diasNoMes; i++) {
            const celula = criarCelulaDia(dia);
            semana.appendChild(celula);
            dia++;
        }
        
        // Completar semana com células vazias se necessário
        while (semana.children.length < 7) {
            const celula = document.createElement('td');
            celula.className = 'dia-vazio';
            semana.appendChild(celula);
        }
        
        calendarioBody.appendChild(semana);
    }
}

// Função para criar célula do dia
function criarCelulaDia(dia) {
    const celula = document.createElement('td');
    celula.className = 'dia-calendario';
    
    const dataStr = `${anoAtual}-${mesAtual.toString().padStart(2, '0')}-${dia.toString().padStart(2, '0')}`;
    const reservasDoDia = reservas[dataStr] || [];
    
    // Número do dia
    const numeroDia = document.createElement('div');
    numeroDia.className = 'numero-dia';
    numeroDia.textContent = dia;
    celula.appendChild(numeroDia);
    
    // Reservas do dia
    reservasDoDia.forEach(reserva => {
        const divReserva = document.createElement('div');
        divReserva.className = `reserva-item turno-${reserva.turno.toLowerCase()}`;
        divReserva.innerHTML = `
            <small>
                <strong>${reserva.sala_nome}</strong><br>
                ${reserva.horario_inicio}-${reserva.horario_fim}<br>
                ${reserva.curso_evento}
            </small>
        `;
        divReserva.onclick = () => mostrarDetalhesReserva(reserva);
        celula.appendChild(divReserva);
    });
    
    return celula;
}

// Função para navegar entre meses
function navegarMes(direcao) {
    mesAtual += direcao;
    
    if (mesAtual > 12) {
        mesAtual = 1;
        anoAtual++;
    } else if (mesAtual < 1) {
        mesAtual = 12;
        anoAtual--;
    }
    
    carregarCalendario();
}

// Função para aplicar filtros
async function aplicarFiltros() {
    try {
        const params = new URLSearchParams();
        
        const salaId = document.getElementById('filtroSala').value;
        const turno = document.getElementById('filtroTurno').value;
        const curso = document.getElementById('filtroCurso').value;
        
        // Filtrar pelo mês atual
        const dataInicio = `${anoAtual}-${mesAtual.toString().padStart(2, '0')}-01`;
        const ultimoDia = new Date(anoAtual, mesAtual, 0).getDate();
        const dataFim = `${anoAtual}-${mesAtual.toString().padStart(2, '0')}-${ultimoDia.toString().padStart(2, '0')}`;
        
        params.append('data_inicio', dataInicio);
        params.append('data_fim', dataFim);
        
        if (salaId) params.append('sala_id', salaId);
        if (turno) params.append('turno', turno);
        if (curso) params.append('curso', curso);
        
        const response = await chamarAPI(`/api/reservas-salas?${params.toString()}`, 'GET');
        
        // Reorganizar reservas por data
        const reservasFiltradas = {};
        response.forEach(reserva => {
            const data = reserva.data_reserva;
            if (!reservasFiltradas[data]) {
                reservasFiltradas[data] = [];
            }
            reservasFiltradas[data].push(reserva);
        });
        
        reservas = reservasFiltradas;
        gerarCalendario();
        
    } catch (error) {
        console.error('Erro ao aplicar filtros:', error);
        mostrarAlerta('Erro ao aplicar filtros', 'danger');
    }
}

// Função para criar nova reserva
async function criarReserva() {
    try {
        const dados = {
            sala_id: parseInt(document.getElementById('reservaSala').value),
            instrutor_id: document.getElementById('reservaInstrutor').value || null,
            data_reserva: document.getElementById('reservaData').value,
            horario_inicio: document.getElementById('reservaHorarioInicio').value,
            horario_fim: document.getElementById('reservaHorarioFim').value,
            curso_evento: document.getElementById('reservaCurso').value,
            turno: document.getElementById('reservaTurno').value,
            observacoes: document.getElementById('reservaObservacoes').value
        };
        
        // Validar horários
        if (dados.horario_fim <= dados.horario_inicio) {
            mostrarAlerta('Horário de fim deve ser posterior ao horário de início', 'warning');
            return;
        }
        
        await chamarAPI('/api/reservas-salas', 'POST', dados);
        
        mostrarAlerta('Reserva criada com sucesso!', 'success');
        document.getElementById('formNovaReserva').reset();
        
        // Voltar para a aba do calendário
        const calendarioTab = new bootstrap.Tab(document.getElementById('calendario-tab'));
        calendarioTab.show();
        
        // Recarregar calendário
        carregarCalendario();
        
    } catch (error) {
        console.error('Erro ao criar reserva:', error);
        mostrarAlerta(error.message || 'Erro ao criar reserva', 'danger');
    }
}

// Função para mostrar detalhes da reserva
function mostrarDetalhesReserva(reserva) {
    reservaAtual = reserva;
    
    const content = document.getElementById('detalhesReservaContent');
    content.innerHTML = `
        <div class="row">
            <div class="col-md-6">
                <p><strong>Sala:</strong> ${reserva.sala_nome}</p>
                <p><strong>Data:</strong> ${new Date(reserva.data_reserva + 'T00:00:00').toLocaleDateString('pt-BR')}</p>
                <p><strong>Horário:</strong> ${reserva.horario_inicio} às ${reserva.horario_fim}</p>
                <p><strong>Turno:</strong> ${reserva.turno}</p>
            </div>
            <div class="col-md-6">
                <p><strong>Curso/Evento:</strong> ${reserva.curso_evento}</p>
                <p><strong>Instrutor:</strong> ${reserva.instrutor_nome || 'Não informado'}</p>
                <p><strong>Responsável:</strong> ${reserva.usuario_nome}</p>
                ${reserva.observacoes ? `<p><strong>Observações:</strong> ${reserva.observacoes}</p>` : ''}
            </div>
        </div>
    `;
    
    const modal = new bootstrap.Modal(document.getElementById('modalDetalhesReserva'));
    modal.show();
}

// Função para excluir reserva
async function excluirReserva() {
    if (!reservaAtual) return;
    
    if (!confirm('Tem certeza que deseja excluir esta reserva?')) return;
    
    try {
        await chamarAPI(`/api/reservas-salas/${reservaAtual.id}`, 'DELETE');
        
        mostrarAlerta('Reserva excluída com sucesso!', 'success');
        
        // Fechar modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('modalDetalhesReserva'));
        modal.hide();
        
        // Recarregar calendário
        carregarCalendario();
        
    } catch (error) {
        console.error('Erro ao excluir reserva:', error);
        mostrarAlerta(error.message || 'Erro ao excluir reserva', 'danger');
    }
}

// Função para atualizar tabela de salas
function atualizarTabelaSalas() {
    const tbody = document.getElementById('tabelaSalas');
    tbody.innerHTML = '';
    
    salas.forEach(sala => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${sala.nome}</td>
            <td>${sala.capacidade}</td>
            <td><span class="badge bg-${sala.tipo === 'fixa' ? 'warning' : 'success'}">${sala.tipo}</span></td>
            <td>${sala.recursos || '-'}</td>
            <td>
                <button class="btn btn-sm btn-outline-primary me-1" onclick="editarSala(${sala.id})">
                    <i class="bi bi-pencil"></i>
                </button>
                <button class="btn btn-sm btn-outline-danger" onclick="excluirSala(${sala.id})">
                    <i class="bi bi-trash"></i>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// Função para atualizar tabela de instrutores
function atualizarTabelaInstrutores() {
    const tbody = document.getElementById('tabelaInstrutores');
    tbody.innerHTML = '';
    
    instrutores.forEach(instrutor => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${instrutor.nome}</td>
            <td>${instrutor.email}</td>
            <td>${instrutor.area_atuacao || '-'}</td>
            <td>${instrutor.cursos_possiveis || '-'}</td>
            <td>
                <button class="btn btn-sm btn-outline-primary me-1" onclick="editarInstrutor(${instrutor.id})">
                    <i class="bi bi-pencil"></i>
                </button>
                <button class="btn btn-sm btn-outline-danger" onclick="excluirInstrutor(${instrutor.id})">
                    <i class="bi bi-trash"></i>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// Função para salvar sala
async function salvarSala() {
    try {
        const dados = {
            nome: document.getElementById('salaNome').value,
            capacidade: parseInt(document.getElementById('salaCapacidade').value),
            tipo: document.getElementById('salaTipo').value,
            recursos: document.getElementById('salaRecursos').value
        };
        
        const salaId = document.getElementById('salaId').value;
        
        if (salaId) {
            // Editar sala existente
            await chamarAPI(`/api/salas/${salaId}`, 'PUT', dados);
            mostrarAlerta('Sala atualizada com sucesso!', 'success');
        } else {
            // Criar nova sala
            await chamarAPI('/api/salas', 'POST', dados);
            mostrarAlerta('Sala criada com sucesso!', 'success');
        }
        
        // Fechar modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('modalSala'));
        modal.hide();
        
        // Recarregar salas
        carregarSalas();
        
    } catch (error) {
        console.error('Erro ao salvar sala:', error);
        mostrarAlerta(error.message || 'Erro ao salvar sala', 'danger');
    }
}

// Função para editar sala
function editarSala(id) {
    const sala = salas.find(s => s.id === id);
    if (!sala) return;
    
    document.getElementById('modalSalaTitle').textContent = 'Editar Sala';
    document.getElementById('salaId').value = sala.id;
    document.getElementById('salaNome').value = sala.nome;
    document.getElementById('salaCapacidade').value = sala.capacidade;
    document.getElementById('salaTipo').value = sala.tipo;
    document.getElementById('salaRecursos').value = sala.recursos || '';
    
    const modal = new bootstrap.Modal(document.getElementById('modalSala'));
    modal.show();
}

// Função para excluir sala
async function excluirSala(id) {
    if (!confirm('Tem certeza que deseja excluir esta sala?')) return;
    
    try {
        await chamarAPI(`/api/salas/${id}`, 'DELETE');
        mostrarAlerta('Sala excluída com sucesso!', 'success');
        carregarSalas();
    } catch (error) {
        console.error('Erro ao excluir sala:', error);
        mostrarAlerta(error.message || 'Erro ao excluir sala', 'danger');
    }
}

// Função para salvar instrutor
async function salvarInstrutor() {
    try {
        const dados = {
            nome: document.getElementById('instrutorNome').value,
            email: document.getElementById('instrutorEmail').value,
            area_atuacao: document.getElementById('instrutorArea').value,
            cursos_possiveis: document.getElementById('instrutorCursos').value
        };
        
        const instrutorId = document.getElementById('instrutorId').value;
        
        if (instrutorId) {
            // Editar instrutor existente
            await chamarAPI(`/api/instrutores/${instrutorId}`, 'PUT', dados);
            mostrarAlerta('Instrutor atualizado com sucesso!', 'success');
        } else {
            // Criar novo instrutor
            await chamarAPI('/api/instrutores', 'POST', dados);
            mostrarAlerta('Instrutor criado com sucesso!', 'success');
        }
        
        // Fechar modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('modalInstrutor'));
        modal.hide();
        
        // Recarregar instrutores
        carregarInstrutores();
        
    } catch (error) {
        console.error('Erro ao salvar instrutor:', error);
        mostrarAlerta(error.message || 'Erro ao salvar instrutor', 'danger');
    }
}

// Função para editar instrutor
function editarInstrutor(id) {
    const instrutor = instrutores.find(i => i.id === id);
    if (!instrutor) return;
    
    document.getElementById('modalInstrutorTitle').textContent = 'Editar Instrutor';
    document.getElementById('instrutorId').value = instrutor.id;
    document.getElementById('instrutorNome').value = instrutor.nome;
    document.getElementById('instrutorEmail').value = instrutor.email;
    document.getElementById('instrutorArea').value = instrutor.area_atuacao || '';
    document.getElementById('instrutorCursos').value = instrutor.cursos_possiveis || '';
    
    const modal = new bootstrap.Modal(document.getElementById('modalInstrutor'));
    modal.show();
}

// Função para excluir instrutor
async function excluirInstrutor(id) {
    if (!confirm('Tem certeza que deseja excluir este instrutor?')) return;
    
    try {
        await chamarAPI(`/api/instrutores/${id}`, 'DELETE');
        mostrarAlerta('Instrutor excluído com sucesso!', 'success');
        carregarInstrutores();
    } catch (error) {
        console.error('Erro ao excluir instrutor:', error);
        mostrarAlerta(error.message || 'Erro ao excluir instrutor', 'danger');
    }
}

// Limpar formulários ao abrir modais
document.getElementById('modalSala').addEventListener('show.bs.modal', function() {
    if (!document.getElementById('salaId').value) {
        document.getElementById('modalSalaTitle').textContent = 'Nova Sala';
        document.getElementById('formSala').reset();
    }
});

document.getElementById('modalInstrutor').addEventListener('show.bs.modal', function() {
    if (!document.getElementById('instrutorId').value) {
        document.getElementById('modalInstrutorTitle').textContent = 'Novo Instrutor';
        document.getElementById('formInstrutor').reset();
    }
});

// Função para mostrar alertas
function mostrarAlerta(mensagem, tipo) {
    // Remover alertas existentes
    const alertasExistentes = document.querySelectorAll('.alert-flutuante');
    alertasExistentes.forEach(alerta => alerta.remove());
    
    // Criar novo alerta
    const alerta = document.createElement('div');
    alerta.className = `alert alert-${tipo} alert-dismissible fade show alert-flutuante`;
    alerta.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 9999;
        min-width: 300px;
    `;
    alerta.innerHTML = `
        ${mensagem}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    document.body.appendChild(alerta);
    
    // Remover automaticamente após 5 segundos
    setTimeout(() => {
        if (alerta.parentNode) {
            alerta.remove();
        }
    }, 5000);
}

