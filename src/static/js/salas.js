// Funções para gerenciamento de salas

// Variáveis globais
let salasData = [];
let salaEditando = null;
let recursosSala = [];


// Carrega recursos disponíveis para salas
async function carregarRecursosSala() {
    try {
        const response = await fetch(`${API_URL}/salas/recursos`, {
            headers: {
                'Authorization': `Bearer ${getToken()}`
            }
        });
        
        if (response.ok) {
            recursosSala = await response.json();
            
            // Preenche o container de recursos
            const container = document.getElementById('recursosContainer');
            container.innerHTML = '';
            
            recursosSala.forEach(recurso => {
                const col = document.createElement('div');
                col.className = 'col-md-4 col-sm-6';
                col.innerHTML = `
                    <div class="form-check">
                        <input class="form-check-input" type="checkbox" value="${recurso.valor}" id="recurso_${recurso.valor}">
                        <label class="form-check-label" for="recurso_${recurso.valor}">
                            ${recurso.nome}
                        </label>
                    </div>
                `;
                container.appendChild(col);
            });
        }
    } catch (error) {
        console.error('Erro ao carregar recursos de sala:', error);
    }
}

// Carrega lista de salas
async function carregarSalas() {
    try {
        document.getElementById('loadingSalas').style.display = 'block';
        document.getElementById('listaSalas').style.display = 'none';
        document.getElementById('nenhumaSala').style.display = 'none';
        
        // Constrói parâmetros de filtro
        const params = new URLSearchParams();
        
        const status = document.getElementById('filtroStatus').value;
        const capacidade = document.getElementById('filtroCapacidade').value;

        if (status) params.append('status', status);
        if (capacidade) params.append('capacidade_min', capacidade);
        
        const response = await fetch(`${API_URL}/salas?${params.toString()}`, {
            headers: {
                'Authorization': `Bearer ${getToken()}`
            }
        });

        if (response.ok) {
            salasData = await response.json();
            
            // Aplica filtro de busca local se necessário
            const busca = document.getElementById('filtroBusca').value.toLowerCase();
            let salasFiltradas = salasData;
            
            if (busca) {
                salasFiltradas = salasData.filter(sala => 
                    sala.nome.toLowerCase().includes(busca) ||
                    (sala.localizacao && sala.localizacao.toLowerCase().includes(busca))
                );
            }
            
            renderizarTabelaSalas(salasFiltradas);
        } else {
            const erro = await response.json().catch(() => ({}));
            throw new Error(erro.erro || `Erro ${response.status}`);
        }
    } catch (error) {
        console.error('Erro ao carregar salas:', error);
        let mensagem = 'Erro ao carregar salas.';
        if (error.message.includes('Failed to fetch')) {
            mensagem += ' Verifique sua conexão e tente novamente.';
        } else {
            mensagem += ` ${error.message}`;
        }
        exibirAlerta(mensagem, 'danger');
    } finally {
        document.getElementById('loadingSalas').style.display = 'none';
    }
}

// Renderiza a tabela de salas
function renderizarTabelaSalas(salas) {
    const tbody = document.getElementById('tabelaSalas');
    
    if (salas.length === 0) {
        document.getElementById('listaSalas').style.display = 'none';
        document.getElementById('nenhumaSala').style.display = 'block';
        return;
    }
    
    document.getElementById('listaSalas').style.display = 'block';
    document.getElementById('nenhumaSala').style.display = 'none';
    
    tbody.innerHTML = '';
    
    salas.forEach(sala => {
        const statusBadge = getStatusBadge(sala.status);
        const recursos = sala.recursos.slice(0, 3).join(', ') + (sala.recursos.length > 3 ? '...' : '');
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>
                <strong>${sala.nome}</strong>
                ${sala.localizacao ? `<br><small class="text-muted">${sala.localizacao}</small>` : ''}
            </td>
            <td>
                <span class="badge bg-info">${sala.capacidade} pessoas</span>
            </td>
            <td>${sala.localizacao || '-'}</td>
            <td>${statusBadge}</td>
            <td>
                <small class="text-muted">${recursos || 'Nenhum'}</small>
            </td>
            <td>
                <div class="btn-group btn-group-sm" role="group">
                    <button type="button" class="btn btn-outline-primary" onclick="editarSala(${sala.id})" title="Editar">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button type="button" class="btn btn-outline-info" onclick="verOcupacoesSala(${sala.id})" title="Ver Ocupações">
                        <i class="bi bi-calendar-check"></i>
                    </button>
                    <button type="button" class="btn btn-outline-danger" onclick="excluirSala(${sala.id}, '${sala.nome}')" title="Excluir">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Retorna badge de status
function getStatusBadge(status) {
    const badges = {
        'ativa': '<span class="badge bg-success">Ativa</span>',
        'inativa': '<span class="badge bg-secondary">Inativa</span>',
        'manutencao': '<span class="badge bg-warning">Manutenção</span>'
    };
    return badges[status] || '<span class="badge bg-secondary">-</span>';
}

// Aplica filtros
function aplicarFiltros() {
    carregarSalas();
}

// Limpa filtros
function limparFiltros() {
    document.getElementById('filtroStatus').value = '';
    document.getElementById('filtroCapacidade').value = '';
    document.getElementById('filtroBusca').value = '';
    carregarSalas();
}

// Abre modal para nova sala
function novaSala() {
    salaEditando = null;
    document.getElementById('modalSalaLabel').textContent = 'Nova Sala';
    document.getElementById('btnSalvarTexto').textContent = 'Salvar';
    document.getElementById('formSala').reset();
    document.getElementById('salaId').value = '';
    
    // Desmarca todos os recursos
    recursosSala.forEach(recurso => {
        const checkbox = document.getElementById(`recurso_${recurso.valor}`);
        if (checkbox) checkbox.checked = false;
    });
}

// Edita uma sala existente
async function editarSala(id) {
    try {
        const response = await fetch(`${API_URL}/salas/${id}`, {
            headers: {
                'Authorization': `Bearer ${getToken()}`
            }
        });
        
        if (response.ok) {
            const sala = await response.json();
            salaEditando = sala;
            
            // Preenche o formulário
            document.getElementById('modalSalaLabel').textContent = 'Editar Sala';
            document.getElementById('btnSalvarTexto').textContent = 'Atualizar';
            document.getElementById('salaId').value = sala.id;
            document.getElementById('salaNome').value = sala.nome;
            document.getElementById('salaCapacidade').value = sala.capacidade;
            document.getElementById('salaLocalizacao').value = sala.localizacao || '';
            document.getElementById('salaStatus').value = sala.status;
            document.getElementById('salaObservacoes').value = sala.observacoes || '';
            
            // Marca os recursos selecionados
            recursosSala.forEach(recurso => {
                const checkbox = document.getElementById(`recurso_${recurso.valor}`);
                if (checkbox) {
                    checkbox.checked = sala.recursos.includes(recurso.valor);
                }
            });
            
            // Abre o modal
            const modal = new bootstrap.Modal(document.getElementById('modalSala'));
            modal.show();
        } else {
            throw new Error('Erro ao carregar dados da sala');
        }
    } catch (error) {
        console.error('Erro ao editar sala:', error);
        exibirAlerta('Erro ao carregar dados da sala.', 'danger');
    }
}

// Salva sala (criar ou atualizar)
async function salvarSala() {
    try {
        const formData = {
            nome: document.getElementById('salaNome').value.trim(),
            capacidade: parseInt(document.getElementById('salaCapacidade').value),
            localizacao: document.getElementById('salaLocalizacao').value,
            status: document.getElementById('salaStatus').value,
            observacoes: document.getElementById('salaObservacoes').value.trim(),
            recursos: []
        };
        
        // Validações
        if (!formData.nome) {
            exibirAlerta('Nome da sala é obrigatório.', 'warning');
            return;
        }
        
        if (!formData.capacidade || formData.capacidade <= 0) {
            exibirAlerta('Capacidade deve ser um número maior que zero.', 'warning');
            return;
        }
        
        // Coleta recursos selecionados
        recursosSala.forEach(recurso => {
            const checkbox = document.getElementById(`recurso_${recurso.valor}`);
            if (checkbox && checkbox.checked) {
                formData.recursos.push(recurso.valor);
            }
        });
        
        const salaId = document.getElementById('salaId').value;
        const isEdicao = salaId !== '';
        
        const response = await fetch(`${API_URL}/salas${isEdicao ? `/${salaId}` : ''}`, {
            method: isEdicao ? 'PUT' : 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getToken()}`
            },
            body: JSON.stringify(formData)
        });
        
        const result = await response.json();
        
        if (response.ok) {
            exibirAlerta(`Sala ${isEdicao ? 'atualizada' : 'criada'} com sucesso!`, 'success');

            // Fecha o modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('modalSala'));
            modal.hide();

            // Reseta o formulário e o estado de edição para evitar
            // que uma nova criação seja tratada como atualização
            novaSala();

            // Recarrega a lista
            carregarSalas();
        } else {
            throw new Error(result.erro || 'Erro ao salvar sala');
        }
    } catch (error) {
        console.error('Erro ao salvar sala:', error);
        exibirAlerta(error.message, 'danger');
    }
}

// Exclui uma sala
function excluirSala(id, nome) {
    document.getElementById('nomeSalaExcluir').textContent = nome;
    document.getElementById('modalExcluirSala').setAttribute('data-sala-id', id);
    
    const modal = new bootstrap.Modal(document.getElementById('modalExcluirSala'));
    modal.show();
}

// Confirma exclusão da sala
async function confirmarExclusaoSala() {
    try {
        const salaId = document.getElementById('modalExcluirSala').getAttribute('data-sala-id');
        
        const response = await fetch(`${API_URL}/salas/${salaId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${getToken()}`
            }
        });
        
        const result = await response.json();
        
        if (response.ok) {
            exibirAlerta('Sala excluída com sucesso!', 'success');
            
            // Fecha o modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('modalExcluirSala'));
            modal.hide();
            
            // Recarrega a lista
            carregarSalas();
        } else {
            throw new Error(result.erro || 'Erro ao excluir sala');
        }
    } catch (error) {
        console.error('Erro ao excluir sala:', error);
        exibirAlerta(error.message, 'danger');
    }
}

// Ver ocupações de uma sala
function verOcupacoesSala(id) {
    // Redireciona para o calendário com filtro da sala
    window.location.href = `/calendario-salas.html?sala_id=${id}`;
}

// Função para exibir alertas
function exibirAlerta(mensagem, tipo) {
    // Remove alertas existentes
    const alertasExistentes = document.querySelectorAll('.alert-auto-dismiss');
    alertasExistentes.forEach(alerta => alerta.remove());

    // Cria novo alerta
    const alerta = document.createElement('div');
    alerta.className = `alert alert-${tipo} alert-dismissible fade show alert-auto-dismiss`;
    alerta.textContent = mensagem;
    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'btn-close';
    closeBtn.setAttribute('data-bs-dismiss', 'alert');
    closeBtn.setAttribute('aria-label', 'Close');
    alerta.appendChild(closeBtn);
    
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

