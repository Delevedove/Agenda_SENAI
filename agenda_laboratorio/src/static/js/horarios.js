/**
 * Renderiza os horários disponíveis para o turno selecionado
 * @param {string} turno - Turno selecionado (Manhã, Tarde, Noite)
 */
async function renderizarHorarios(turno) {
    const horariosContainer = document.getElementById('horariosContainer');
    horariosContainer.innerHTML = '';
    
    if (!turno) return;
    
    // Obtém os horários do turno
    const horariosTurno = horariosPorTurno[turno];
    
    // Verifica se há agendamentos existentes para o laboratório e data selecionados
    const data = document.getElementById('data').value;
    const laboratorio = document.getElementById('laboratorio').value;
    
    if (!data || !laboratorio) {
        // Se não tiver data ou laboratório selecionados, mostra todos os horários disponíveis
        renderizarTodosHorarios(horariosTurno);
        return;
    }
    
    try {
        // Busca agendamentos existentes para a data e laboratório selecionados
        const agendamentosExistentes = await chamarAPI(`/agendamentos/calendario/${new Date(data).getMonth() + 1}/${new Date(data).getFullYear()}`);
        
        // Filtra apenas os agendamentos do mesmo dia, laboratório e turno
        const agendamentosDoDia = agendamentosExistentes.filter(a => {
            const dataAgendamento = a.data.split('T')[0];
            return dataAgendamento === data && a.laboratorio === laboratorio && a.turno === turno;
        });
        
        // Coleta todos os horários já reservados
        const horariosReservados = new Set();
        agendamentosDoDia.forEach(agendamento => {
            try {
                const horarios = JSON.parse(agendamento.horarios);
                horarios.forEach(h => horariosReservados.add(h));
            } catch (e) {
                console.error('Erro ao processar horários:', e);
            }
        });
        
        // Renderiza os horários, desabilitando os já reservados
        horariosTurno.forEach((horario, index) => {
            const col = document.createElement('div');
            col.className = 'col-md-4 mb-2';
            
            const checkboxDiv = document.createElement('div');
            checkboxDiv.className = 'form-check';
            
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.className = 'form-check-input';
            checkbox.name = 'horarios';
            checkbox.id = `horario${index}`;
            checkbox.value = horario;
            
            // Desabilita o checkbox se o horário já estiver reservado
            // Exceto se estiver em modo de edição e o horário pertencer ao agendamento atual
            if (horariosReservados.has(horario) && (!modoEdicao || !horariosPertencemAoAgendamentoAtual(horario))) {
                checkbox.disabled = true;
                checkboxDiv.classList.add('text-muted');
            }
            
            const label = document.createElement('label');
            label.className = 'form-check-label';
            label.htmlFor = `horario${index}`;
            label.textContent = horario;
            
            checkboxDiv.appendChild(checkbox);
            checkboxDiv.appendChild(label);
            col.appendChild(checkboxDiv);
            horariosContainer.appendChild(col);
        });
    } catch (error) {
        console.error('Erro ao verificar horários disponíveis:', error);
        // Em caso de erro, mostra todos os horários
        renderizarTodosHorarios(horariosTurno);
    }
}

/**
 * Renderiza todos os horários do turno sem verificar disponibilidade
 * @param {Array} horariosTurno - Lista de horários do turno
 */
function renderizarTodosHorarios(horariosTurno) {
    const horariosContainer = document.getElementById('horariosContainer');
    
    horariosTurno.forEach((horario, index) => {
        const col = document.createElement('div');
        col.className = 'col-md-4 mb-2';
        
        const checkboxDiv = document.createElement('div');
        checkboxDiv.className = 'form-check';
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'form-check-input';
        checkbox.name = 'horarios';
        checkbox.id = `horario${index}`;
        checkbox.value = horario;
        
        const label = document.createElement('label');
        label.className = 'form-check-label';
        label.htmlFor = `horario${index}`;
        label.textContent = horario;
        
        checkboxDiv.appendChild(checkbox);
        checkboxDiv.appendChild(label);
        col.appendChild(checkboxDiv);
        horariosContainer.appendChild(col);
    });
}

/**
 * Verifica se um horário pertence ao agendamento atual (em modo de edição)
 * @param {string} horario - Horário a verificar
 * @returns {boolean} - True se o horário pertence ao agendamento atual
 */
function horariosPertencemAoAgendamentoAtual(horario) {
    // Esta função só é relevante em modo de edição
    if (!modoEdicao || !agendamentoAtual) return false;
    
    try {
        const horariosAtuais = JSON.parse(agendamentoAtual.horarios);
        return horariosAtuais.includes(horario);
    } catch (e) {
        return false;
    }
}

