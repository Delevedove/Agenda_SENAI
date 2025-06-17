// Funções para o calendário de ocupações de salas

// Variáveis globais
let calendar;
let ocupacoesData = [];
let salasData = [];
let instrutoresData = [];
let tiposOcupacao = [];
let resumoOcupacoes = {};

// Inicializa o calendário
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
        moreLinkText: function(num) {
            return `+${num} mais`;
        },
        eventClick: function(info) {
            mostrarDetalhesOcupacao(info.event.extendedProps);
        },
        dateClick: function(info) {
            mostrarResumoDia(info.dateStr);
        },
        datesSet: function(info) {
            carregarResumoPeriodo(info.startStr, info.endStr);
        },
        events: function(fetchInfo, successCallback, failureCallback) {
            carregarOcupacoes(fetchInfo.startStr, fetchInfo.endStr)
                .then(eventos => successCallback(eventos))
                .catch(error => {
                    console.error('Erro ao carregar eventos:', error);
                    failureCallback(error);
                });
        }
    });
    
    calendar.render();
    
    // Esconde loading e mostra calendário
    document.getElementById('loadingCalendario').style.display = 'none';
    document.getElementById('calendario').style.display = 'block';
}

// Carrega ocupações do servidor
async function carregarOcupacoes(dataInicio, dataFim) {
    try {
        // Constrói parâmetros de filtro
        const params = new URLSearchParams({
            data_inicio: dataInicio.split('T')[0],
            data_fim: dataFim.split('T')[0]
        });
        
        // Aplica filtros ativos
        const salaId = document.getElementById('filtroSala').value;
        const instrutorId = document.getElementById('filtroInstrutor').value;
        const turno = document.getElementById('filtroTurno').value;
        
        if (salaId) params.append('sala_id', salaId);
        if (instrutorId) params.append('instrutor_id', instrutorId);
        if (turno) params.append('turno', turno);
        
        const response = await fetch(`${API_URL}/ocupacoes/calendario?${params.toString()}`, {
            headers: {
                'Authorization': `Bearer ${getToken()}`
            }
        });
        
        if (response.ok) {
            const eventos = await response.json();
            ocupacoesData = eventos;
            return eventos.map(evento => ({
                id: evento.id,
                title: evento.title,
                start: evento.start,
                end: evento.end,
                className: getClasseTurno(evento.extendedProps.turno),
                extendedProps: evento.extendedProps
            }));
        } else {
            throw new Error('Erro ao carregar ocupações');
        }
    } catch (error) {
        console.error('Erro ao carregar ocupações:', error);
        return [];
    }
}

// Carrega resumo de ocupações por período
async function carregarResumoPeriodo(dataInicio, dataFim) {
    try {
        const params = new URLSearchParams({
            data_inicio: dataInicio.split('T')[0],
            data_fim: dataFim.split('T')[0]
        });

        const salaId = document.getElementById('filtroSala').value;
        const instrutorId = document.getElementById('filtroInstrutor').value;
        const turno = document.getElementById('filtroTurno').value;

        if (salaId) params.append('sala_id', salaId);
        if (instrutorId) params.append('instrutor_id', instrutorId);
        if (turno) params.append('turno', turno);

        const response = await fetch(`${API_URL}/ocupacoes/resumo-periodo?${params.toString()}`, {
            headers: {
                'Authorization': `Bearer ${getToken()}`
            }
        });

        if (response.ok) {
            resumoOcupacoes = await response.json();
            atualizarResumoNoCalendario();
        }
    } catch (error) {
        console.error('Erro ao carregar resumo:', error);
    }
}

function atualizarResumoNoCalendario() {
    document.querySelectorAll('.fc-daygrid-day').forEach(cell => {
        const dateStr = cell.getAttribute('data-date');
        cell.querySelectorAll('.resumo-turno').forEach(e => e.remove());
        const resumoDia = resumoOcupacoes[dateStr];
        if (resumoDia) {
            ['Manhã', 'Tarde', 'Noite'].forEach(turno => {
                const info = resumoDia[turno];
                if (!info) return;
                const div = document.createElement('div');
                div.className = `resumo-turno resumo-${turno.toLowerCase()}`;
                div.textContent = `${turno}: ${info.ocupadas}/${info.total_salas}`;
                cell.appendChild(div);
            });
        }
    });
}

function mostrarResumoDia(dataStr) {
    const resumoDia = resumoOcupacoes[dataStr];
    if (!resumoDia) return;

    const modal = new bootstrap.Modal(document.getElementById('modalResumoDia'));
    const container = document.getElementById('conteudoResumoDia');

    container.innerHTML = `<h5 class="mb-3">${formatarData(dataStr)}</h5>`;

    ['Manhã', 'Tarde', 'Noite'].forEach(turno => {
        const info = resumoDia[turno];
        if (!info) return;

        const ocupacoesTurno = calendar.getEvents().filter(ev =>
            ev.extendedProps.data === dataStr && ev.extendedProps.turno === turno
        );

        let html = `<h6 class="mt-3">${turno} (${info.ocupadas}/${info.total_salas} ocupadas)</h6>`;

        if (ocupacoesTurno.length) {
            html += '<ul>';
            ocupacoesTurno.forEach(ev => {
                const props = ev.extendedProps;
                const instr = props.instrutor_nome ? ` - ${props.instrutor_nome}` : '';
                html += `<li>${props.sala_nome} - ${props.curso_evento}${instr} ` +
                        `<button class="btn btn-sm btn-link p-0 ms-1" onclick="editarOcupacao(${ev.id})"><i class="bi bi-pencil"></i></button></li>`;
            });
            html += '</ul>';
        } else {
            html += '<p><em>Sem ocupações.</em></p>';
        }

        if (info.salas_livres.length) {
            html += `<p><strong>Salas Livres:</strong> ${info.salas_livres.join(', ')}</p>`;
        }

        container.innerHTML += html;
    });

    modal.show();
}

// Carrega salas para filtro
async function carregarSalasParaFiltro() {
    try {
        const response = await fetch(`${API_URL}/salas?status=ativa`, {
            headers: {
                'Authorization': `Bearer ${getToken()}`
            }
        });
        
        if (response.ok) {
            salasData = await response.json();
            
            const select = document.getElementById('filtroSala');
            select.innerHTML = '<option value="">Todas as salas</option>';
            
            salasData.forEach(sala => {
                select.innerHTML += `<option value="${sala.id}">${sala.nome}</option>`;
            });
        }
    } catch (error) {
        console.error('Erro ao carregar salas:', error);
    }
}

// Carrega instrutores para filtro
async function carregarInstrutoresParaFiltro() {
    try {
        const response = await fetch(`${API_URL}/instrutores?status=ativo`, {
            headers: {
                'Authorization': `Bearer ${getToken()}`
            }
        });
        
        if (response.ok) {
            instrutoresData = await response.json();
            
            const select = document.getElementById('filtroInstrutor');
            select.innerHTML = '<option value="">Todos os instrutores</option>';
            
            instrutoresData.forEach(instrutor => {
                select.innerHTML += `<option value="${instrutor.id}">${instrutor.nome}</option>`;
            });
        }
    } catch (error) {
        console.error('Erro ao carregar instrutores:', error);
    }
}

// Carrega tipos de ocupação
async function carregarTiposOcupacao() {
    try {
        const response = await fetch(`${API_URL}/ocupacoes/tipos`, {
            headers: {
                'Authorization': `Bearer ${getToken()}`
            }
        });
        
        if (response.ok) {
            tiposOcupacao = await response.json();
        }
    } catch (error) {
        console.error('Erro ao carregar tipos de ocupação:', error);
    }
}

// Aplica filtros no calendário
function aplicarFiltrosCalendario() {
    if (calendar) {
        calendar.refetchEvents();
    }
}

// Configura formulários de filtros (desktop e mobile)
function configurarFiltros() {
    const form = document.getElementById('filtrosForm');
    const formMobile = document.getElementById('filtrosMobileForm');

    if (form) {
        form.addEventListener('submit', e => {
            e.preventDefault();
            document.getElementById('filtroSalaMobile').value = document.getElementById('filtroSala').value;
            document.getElementById('filtroInstrutorMobile').value = document.getElementById('filtroInstrutor').value;
            document.getElementById('filtroTurnoMobile').value = document.getElementById('filtroTurno').value;
            aplicarFiltrosCalendario();
        });
    }

    if (formMobile) {
        formMobile.addEventListener('submit', e => {
            e.preventDefault();
            document.getElementById('filtroSala').value = document.getElementById('filtroSalaMobile').value;
            document.getElementById('filtroInstrutor').value = document.getElementById('filtroInstrutorMobile').value;
            document.getElementById('filtroTurno').value = document.getElementById('filtroTurnoMobile').value;
            aplicarFiltrosCalendario();
        });
    }
}

// Aplica filtros da URL (quando vem de outras páginas)
function aplicarFiltrosURL() {
    const urlParams = new URLSearchParams(window.location.search);
    
    const salaId = urlParams.get('sala_id');
    const instrutorId = urlParams.get('instrutor_id');
    const turnoParam = urlParams.get('turno');
    const mesParam = urlParams.get('mes');
    
    if (salaId) {
        document.getElementById('filtroSala').value = salaId;
    }
    
    if (instrutorId) {
        document.getElementById('filtroInstrutor').value = instrutorId;
    }

    if (turnoParam) {
        document.getElementById('filtroTurno').value = turnoParam;
    }

    if (mesParam && calendar) {
        const dataMes = new Date(mesParam + '-01');
        calendar.gotoDate(dataMes);
    }

    // Aplica filtros se houver
    if (salaId || instrutorId || turnoParam) {
        setTimeout(() => aplicarFiltrosCalendario(), 1000);
    }
}

// Mostra detalhes da ocupação
function mostrarDetalhesOcupacao(ocupacao) {
    const modal = new bootstrap.Modal(document.getElementById('modalDetalhesOcupacao'));
    
    // Preenche conteúdo do modal
    const content = document.getElementById('detalhesOcupacaoContent');
    const acoes = document.getElementById('acoesOcupacao');
    
    const tipoNome = tiposOcupacao.find(t => t.valor === ocupacao.tipo_ocupacao)?.nome || ocupacao.tipo_ocupacao;
    const salaNome = salasData.find(s => s.id === ocupacao.sala_id)?.nome || 'Sala não encontrada';
    const instrutorNome = ocupacao.instrutor_id ? 
        (instrutoresData.find(i => i.id === ocupacao.instrutor_id)?.nome || 'Instrutor não encontrado') : 
        'Nenhum instrutor';
    
    content.innerHTML = `
        <div class="row">
            <div class="col-md-6">
                <h6>Curso/Evento</h6>
                <p class="mb-3">${ocupacao.curso_evento}</p>
                
                <h6>Tipo</h6>
                <p class="mb-3">
                    <span class="badge" style="background-color: ${getTipoCorPorValor(ocupacao.tipo_ocupacao)};">
                        ${tipoNome}
                    </span>
                </p>
                
                <h6>Status</h6>
                <p class="mb-3">
                    <span class="badge ${getStatusBadgeClass(ocupacao.status)}">
                        ${getStatusNome(ocupacao.status)}
                    </span>
                </p>
            </div>
            <div class="col-md-6">
                <h6>Data e Horário</h6>
                <p class="mb-3">
                    <i class="bi bi-calendar me-1"></i>
                    ${formatarData(ocupacao.data)}<br>
                    <i class="bi bi-clock me-1"></i>
                    ${ocupacao.horario_inicio} às ${ocupacao.horario_fim}
                </p>
                
                <h6>Sala</h6>
                <p class="mb-3">
                    <i class="bi bi-building me-1"></i>
                    ${salaNome}
                </p>
                
                <h6>Instrutor</h6>
                <p class="mb-3">
                    <i class="bi bi-person-badge me-1"></i>
                    ${instrutorNome}
                </p>
            </div>
        </div>
        
        ${ocupacao.observacoes ? `
            <div class="row">
                <div class="col-12">
                    <h6>Observações</h6>
                    <p class="mb-0">${ocupacao.observacoes}</p>
                </div>
            </div>
        ` : ''}
    `;
    
    // Configura ações baseadas nas permissões
    const usuario = getUsuarioLogado();
    const podeEditar = isAdmin() || ocupacao.usuario_id === usuario.id;
    
    acoes.innerHTML = '';
    
    if (podeEditar) {
        const btnEditar = document.createElement('button');
        btnEditar.type = 'button';
        btnEditar.className = 'btn btn-primary me-2';
        btnEditar.innerHTML = '<i class="bi bi-pencil me-1"></i>Editar';
        btnEditar.addEventListener('click', () => editarOcupacao(ocupacao.id));

        const btnExcluir = document.createElement('button');
        btnExcluir.type = 'button';
        btnExcluir.className = 'btn btn-danger';
        btnExcluir.innerHTML = '<i class="bi bi-trash me-1"></i>Excluir';
        btnExcluir.addEventListener('click', () => excluirOcupacao(ocupacao.id, ocupacao.curso_evento, ocupacao.grupo_ocupacao_id || ''));

        acoes.appendChild(btnEditar);
        acoes.appendChild(btnExcluir);
    }
    
    modal.show();
}

// Retorna cor do tipo por valor
function getTipoCorPorValor(valor) {
    const tipo = tiposOcupacao.find(t => t.valor === valor);
    return tipo ? tipo.cor : '#6c757d';
}

// Retorna classe do badge de status
function getStatusBadgeClass(status) {
    const classes = {
        'confirmado': 'bg-success',
        'pendente': 'bg-warning',
        'cancelado': 'bg-danger'
    };
    return classes[status] || 'bg-secondary';
}

// Retorna nome do status
function getStatusNome(status) {
    const nomes = {
        'confirmado': 'Confirmado',
        'pendente': 'Pendente',
        'cancelado': 'Cancelado'
    };
    return nomes[status] || status;
}

// Formata data para exibição
function formatarData(dataStr) {
    const data = new Date(dataStr + 'T00:00:00');
    return data.toLocaleDateString('pt-BR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

// Edita ocupação
function editarOcupacao(id) {
    // Fecha modal atual
    const modal = bootstrap.Modal.getInstance(document.getElementById('modalDetalhesOcupacao'));
    modal.hide();
    
    // Redireciona para edição (implementar página de edição)
    window.location.href = `/novo-agendamento-sala.html?editar=${id}`;
}

// Exclui ocupação
function excluirOcupacao(id, nome, grupoId) {
    // Fecha modal atual
    const modal = bootstrap.Modal.getInstance(document.getElementById('modalDetalhesOcupacao'));
    modal.hide();

    // Configura modal de exclusão
    let resumo = `<strong>${nome}</strong>`;
    if (grupoId) {
        const eventosGrupo = calendar.getEvents().filter(ev => ev.extendedProps.grupo_ocupacao_id === grupoId);
        const datas = eventosGrupo.map(ev => ev.extendedProps.data).sort();
        if (datas.length) {
            const inicio = formatarDataCurta(datas[0]);
            const fim = formatarDataCurta(datas[datas.length - 1]);
            resumo += `<br><small>${inicio} a ${fim}</small>`;
        }
    }
    document.getElementById('resumoOcupacaoExcluir').innerHTML = resumo;
    document.getElementById('modalExcluirOcupacao').setAttribute('data-ocupacao-id', id);
    
    // Mostra modal de confirmação
    const modalExcluir = new bootstrap.Modal(document.getElementById('modalExcluirOcupacao'));
    modalExcluir.show();
}

// Confirma exclusão da ocupação
async function confirmarExclusaoOcupacao() {
    try {
        const ocupacaoId = document.getElementById('modalExcluirOcupacao').getAttribute('data-ocupacao-id');
        
        const response = await fetch(`${API_URL}/ocupacoes/${ocupacaoId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${getToken()}`
            }
        });
        
        const result = await response.json();
        
        if (response.ok) {
            exibirAlerta('Ocupação excluída com sucesso!', 'success');
            
            // Fecha o modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('modalExcluirOcupacao'));
            modal.hide();
            
            // Atualiza o calendário
            calendar.refetchEvents();
        } else {
            throw new Error(result.erro || 'Erro ao excluir ocupação');
        }
    } catch (error) {
        console.error('Erro ao excluir ocupação:', error);
        exibirAlerta(error.message, 'danger');
    }
}

// Função para exibir alertas
function exibirAlerta(mensagem, tipo) {
    // Remove alertas existentes
    const alertasExistentes = document.querySelectorAll('.alert-auto-dismiss');
    alertasExistentes.forEach(alerta => alerta.remove());
    
    // Cria novo alerta
    const alerta = document.createElement('div');
    alerta.className = `alert alert-${tipo} alert-dismissible fade show alert-auto-dismiss`;
    alerta.innerHTML = `
        ${mensagem}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    
    // Insere no início do main
    const main = document.querySelector('main');
    main.insertBefore(alerta, main.firstChild);
    
    // Remove automaticamente após 5 segundos
    setTimeout(() => {
        if (alerta.parentNode) {
            alerta.remove();
        }
    }, 5000);
}

function formatarDataCurta(dataStr) {
    const data = new Date(dataStr + 'T00:00:00');
    return data.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit'
    });
}

