// Funções para gerenciamento de instrutores

// Variáveis globais
let instrutoresData = [];
let instrutorEditando = null;
let areasAtuacao = [];
let capacidadesSugeridas = [];
let capacidadesInstrutor = [];

// Carrega áreas de atuação disponíveis
async function carregarAreasAtuacao() {
    try {
        const response = await fetch(`${API_URL}/instrutores/areas-atuacao`, {
            headers: {
                'Authorization': `Bearer ${getToken()}`
            }
        });
        
        if (response.ok) {
            areasAtuacao = await response.json();
            
            // Preenche os selects de área
            const selectArea = document.getElementById('instrutorAreaAtuacao');
            const filtroArea = document.getElementById('filtroArea');
            
            selectArea.innerHTML = '<option value="">Selecione...</option>';
            filtroArea.innerHTML = '<option value="">Todas</option>';
            
            areasAtuacao.forEach(area => {
                selectArea.innerHTML += `<option value="${area.valor}">${area.nome}</option>`;
                filtroArea.innerHTML += `<option value="${area.valor}">${area.nome}</option>`;
            });
        }
    } catch (error) {
        console.error('Erro ao carregar áreas de atuação:', error);
    }
}

// Carrega capacidades sugeridas
async function carregarCapacidadesSugeridas(area='') {
    try {
        const url = area ? `${API_URL}/instrutores/capacidades-sugeridas?area=${area}`
                         : `${API_URL}/instrutores/capacidades-sugeridas`;
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${getToken()}`
            }
        });
        
        if (response.ok) {
            capacidadesSugeridas = await response.json();
            renderizarCapacidadesSugeridas();
        }
    } catch (error) {
        console.error('Erro ao carregar capacidades sugeridas:', error);
    }
}

// Renderiza capacidades sugeridas
function renderizarCapacidadesSugeridas() {
    const container = document.getElementById('capacidadesSugeridas');
    container.innerHTML = '';
    
    // Mostra apenas algumas sugestões inicialmente
    const sugestoes = capacidadesSugeridas.slice(0, 10);
    
    sugestoes.forEach(capacidade => {
        const badge = document.createElement('span');
        badge.className = 'badge bg-light text-dark me-1 mb-1';
        badge.style.cursor = 'pointer';
        badge.textContent = capacidade;
        badge.onclick = () => adicionarCapacidadeSugerida(capacidade);
        container.appendChild(badge);
    });
    
    if (capacidadesSugeridas.length > 10) {
        const verMais = document.createElement('span');
        verMais.className = 'badge bg-primary';
        verMais.style.cursor = 'pointer';
        verMais.textContent = `+${capacidadesSugeridas.length - 10} mais`;
        verMais.onclick = () => mostrarTodasCapacidades();
        container.appendChild(verMais);
    }
}

// Mostra todas as capacidades sugeridas
function mostrarTodasCapacidades() {
    const container = document.getElementById('capacidadesSugeridas');
    container.innerHTML = '';
    
    capacidadesSugeridas.forEach(capacidade => {
        const badge = document.createElement('span');
        badge.className = 'badge bg-light text-dark me-1 mb-1';
        badge.style.cursor = 'pointer';
        badge.textContent = capacidade;
        badge.onclick = () => adicionarCapacidadeSugerida(capacidade);
        container.appendChild(badge);
    });
}

// Adiciona capacidade sugerida
function adicionarCapacidadeSugerida(capacidade) {
    if (!capacidadesInstrutor.includes(capacidade)) {
        capacidadesInstrutor.push(capacidade);
        renderizarCapacidades();
    }
}

// Configura interface de disponibilidade
function configurarDisponibilidade() {
    const container = document.getElementById('disponibilidadeContainer');
    container.innerHTML = `
        <div class="form-check form-check-inline">
            <input class="form-check-input" type="checkbox" id="dispManha" value="manha">
            <label class="form-check-label" for="dispManha">Manhã</label>
        </div>
        <div class="form-check form-check-inline">
            <input class="form-check-input" type="checkbox" id="dispTarde" value="tarde">
            <label class="form-check-label" for="dispTarde">Tarde</label>
        </div>
        <div class="form-check form-check-inline">
            <input class="form-check-input" type="checkbox" id="dispNoite" value="noite">
            <label class="form-check-label" for="dispNoite">Noite</label>
        </div>
    `;
}

// Carrega lista de instrutores disponíveis
async function carregarInstrutores() {
    try {
        document.getElementById('loadingInstrutores').style.display = 'block';
        document.getElementById('listaInstrutores').style.display = 'none';
        document.getElementById('nenhumInstrutor').style.display = 'none';
        
        // Constrói parâmetros de filtro
        const params = new URLSearchParams();
        
        const status = document.getElementById('filtroStatus').value;
        const area = document.getElementById('filtroArea').value;
        const capacidade = document.getElementById('filtroCapacidade').value;
        
        if (status) params.append('status', status);
        if (area) params.append('area_atuacao', area);
        if (capacidade) params.append('capacidade', capacidade);
        
        const response = await fetch(`${API_URL}/instrutores?${params.toString()}`, {
            headers: {
                'Authorization': `Bearer ${getToken()}`
            }
        });

        if (response.ok) {
            instrutoresData = await response.json();
            
            // Aplica filtro de busca local se necessário
            const busca = document.getElementById('filtroBusca').value.toLowerCase();
            let instrutoresFiltrados = instrutoresData;
            
            if (busca) {
                instrutoresFiltrados = instrutoresData.filter(instrutor => 
                    instrutor.nome.toLowerCase().includes(busca) ||
                    (instrutor.email && instrutor.email.toLowerCase().includes(busca))
                );
            }
            
            renderizarTabelaInstrutores(instrutoresFiltrados);
        } else {
            const erro = await response.json().catch(() => ({}));
            throw new Error(erro.erro || `Erro ${response.status}`);
        }
    } catch (error) {
        console.error('Erro ao carregar instrutores:', error);
        let mensagem = 'Erro ao carregar instrutores.';
        if (error.message.includes('Failed to fetch')) {
            mensagem += ' Verifique sua conexão e tente novamente.';
        } else {
            mensagem += ` ${error.message}`;
        }
        exibirAlerta(mensagem, 'danger');
    } finally {
        document.getElementById('loadingInstrutores').style.display = 'none';
    }
}

// Renderiza a tabela de instrutores
function renderizarTabelaInstrutores(instrutores) {
    const tbody = document.getElementById('tabelaInstrutores');
    
    if (instrutores.length === 0) {
        document.getElementById('listaInstrutores').style.display = 'none';
        document.getElementById('nenhumInstrutor').style.display = 'block';
        return;
    }
    
    document.getElementById('listaInstrutores').style.display = 'block';
    document.getElementById('nenhumInstrutor').style.display = 'none';
    
    tbody.innerHTML = '';
    
    instrutores.forEach(instrutor => {
        const statusBadge = getStatusBadgeInstrutor(instrutor.status);
        const areaNome = getAreaNome(instrutor.area_atuacao);
        const capacidades = instrutor.capacidades.slice(0, 3).join(', ') + (instrutor.capacidades.length > 3 ? '...' : '');
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>
                <strong>${instrutor.nome}</strong>
                ${instrutor.telefone ? `<br><small class="text-muted">${instrutor.telefone}</small>` : ''}
            </td>
            <td>${instrutor.email || '-'}</td>
            <td>${areaNome}</td>
            <td>${statusBadge}</td>
            <td>
                <small class="text-muted">${capacidades || 'Nenhuma'}</small>
            </td>
            <td>
                <div class="btn-group btn-group-sm" role="group">
                    <button type="button" class="btn btn-outline-primary" onclick="editarInstrutor(${instrutor.id})" title="Editar">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button type="button" class="btn btn-outline-info" onclick="verOcupacoesInstrutor(${instrutor.id})" title="Ver Ocupações">
                        <i class="bi bi-calendar-check"></i>
                    </button>
                    <button type="button" class="btn btn-outline-danger" onclick="excluirInstrutor(${instrutor.id}, '${instrutor.nome}')" title="Excluir">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Retorna o nome da área de atuação
function getAreaNome(valor) {
    const area = areasAtuacao.find(a => a.valor === valor);
    return area ? area.nome : valor || '-';
}

// Retorna badge de status para instrutor
function getStatusBadgeInstrutor(status) {
    const badges = {
        'ativo': '<span class="badge bg-success">Ativo</span>',
        'inativo': '<span class="badge bg-secondary">Inativo</span>',
        'licenca': '<span class="badge bg-warning">Licença</span>'
    };
    return badges[status] || '<span class="badge bg-secondary">-</span>';
}

// Aplica filtros
function aplicarFiltros() {
    carregarInstrutores();
}

// Limpa filtros
function limparFiltros() {
    document.getElementById('filtroStatus').value = '';
    document.getElementById('filtroArea').value = '';
    document.getElementById('filtroCapacidade').value = '';
    document.getElementById('filtroBusca').value = '';
    carregarInstrutores();
}

// Adiciona nova capacidade
function adicionarCapacidade() {
    const input = document.getElementById('novaCapacidade');
    const capacidade = input.value.trim();
    
    if (capacidade && !capacidadesInstrutor.includes(capacidade)) {
        capacidadesInstrutor.push(capacidade);
        input.value = '';
        renderizarCapacidades();
    }
}

// Renderiza capacidades do instrutor
function renderizarCapacidades() {
    const container = document.getElementById('capacidadesContainer');
    container.innerHTML = '';
    
    if (capacidadesInstrutor.length === 0) {
        container.innerHTML = '<small class="text-muted">Nenhuma capacidade adicionada</small>';
        return;
    }
    
    capacidadesInstrutor.forEach((capacidade, index) => {
        const badge = document.createElement('span');
        badge.className = 'badge bg-primary me-1 mb-1';
        badge.innerHTML = `
            ${capacidade}
            <button type="button" class="btn-close btn-close-white ms-1" onclick="removerCapacidade(${index})" style="font-size: 0.7em;"></button>
        `;
        container.appendChild(badge);
    });
}

// Remove capacidade
function removerCapacidade(index) {
    capacidadesInstrutor.splice(index, 1);
    renderizarCapacidades();
}

// Abre modal para novo instrutor
function novoInstrutor() {
    instrutorEditando = null;
    capacidadesInstrutor = [];
    
    document.getElementById('modalInstrutorLabel').textContent = 'Novo Instrutor';
    document.getElementById('btnSalvarTexto').textContent = 'Salvar';
    document.getElementById('formInstrutor').reset();
    document.getElementById('instrutorId').value = '';

    renderizarCapacidades();
    limparDisponibilidadeTodos();
}

// Limpa disponibilidade (desmarca todos os turnos)
function limparDisponibilidadeTodos() {
    document.getElementById('dispManha').checked = false;
    document.getElementById('dispTarde').checked = false;
    document.getElementById('dispNoite').checked = false;
}

// Edita um instrutor existente
async function editarInstrutor(id) {
    try {
        const response = await fetch(`${API_URL}/instrutores/${id}`, {
            headers: {
                'Authorization': `Bearer ${getToken()}`
            }
        });
        
        if (response.ok) {
            const instrutor = await response.json();
            instrutorEditando = instrutor;
            capacidadesInstrutor = [...instrutor.capacidades];
            
            // Preenche o formulário
            document.getElementById('modalInstrutorLabel').textContent = 'Editar Instrutor';
            document.getElementById('btnSalvarTexto').textContent = 'Atualizar';
            document.getElementById('instrutorId').value = instrutor.id;
            document.getElementById('instrutorNome').value = instrutor.nome;
            document.getElementById('instrutorEmail').value = instrutor.email || '';
            document.getElementById('instrutorAreaAtuacao').value = instrutor.area_atuacao || '';
            carregarCapacidadesSugeridas(instrutor.area_atuacao || '');
            document.getElementById('instrutorStatus').value = instrutor.status;
            document.getElementById('instrutorObservacoes').value = instrutor.observacoes || '';
            
            // Renderiza capacidades
            renderizarCapacidades();
            
            // Preenche disponibilidade
            const disponibilidade = instrutor.disponibilidade || [];
            document.getElementById('dispManha').checked = disponibilidade.includes('manha');
            document.getElementById('dispTarde').checked = disponibilidade.includes('tarde');
            document.getElementById('dispNoite').checked = disponibilidade.includes('noite');
            
            // Abre o modal
            const modal = new bootstrap.Modal(document.getElementById('modalInstrutor'));
            modal.show();
        } else {
            throw new Error('Erro ao carregar dados do instrutor');
        }
    } catch (error) {
        console.error('Erro ao editar instrutor:', error);
        exibirAlerta('Erro ao carregar dados do instrutor.', 'danger');
    }
}

// Salva instrutor (criar ou atualizar)
async function salvarInstrutor() {
    try {
        const formData = {
            nome: document.getElementById('instrutorNome').value.trim(),
            email: document.getElementById('instrutorEmail').value.trim(),
            area_atuacao: document.getElementById('instrutorAreaAtuacao').value,
            status: document.getElementById('instrutorStatus').value,
            observacoes: document.getElementById('instrutorObservacoes').value.trim(),
            capacidades: capacidadesInstrutor,
            disponibilidade: []
        };
        
        // Validações
        if (!formData.nome) {
            exibirAlerta('Nome do instrutor é obrigatório.', 'warning');
            return;
        }
        
        // Coleta disponibilidade
        if (document.getElementById('dispManha').checked) formData.disponibilidade.push('manha');
        if (document.getElementById('dispTarde').checked) formData.disponibilidade.push('tarde');
        if (document.getElementById('dispNoite').checked) formData.disponibilidade.push('noite');
        
        const instrutorId = document.getElementById('instrutorId').value;
        const isEdicao = instrutorId !== '';
        
        const response = await fetch(`${API_URL}/instrutores${isEdicao ? `/${instrutorId}` : ''}`, {
            method: isEdicao ? 'PUT' : 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getToken()}`
            },
            body: JSON.stringify(formData)
        });
        
        const result = await response.json();
        
        if (response.ok) {
            exibirAlerta(`Instrutor ${isEdicao ? 'atualizado' : 'criado'} com sucesso!`, 'success');

            // Fecha o modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('modalInstrutor'));
            modal.hide();

            // Reseta o formulário e o estado de edição para evitar
            // que uma nova criação seja tratada como atualização
            novoInstrutor();

            // Recarrega a lista
            carregarInstrutores();
        } else {
            throw new Error(result.erro || 'Erro ao salvar instrutor');
        }
    } catch (error) {
        console.error('Erro ao salvar instrutor:', error);
        exibirAlerta(error.message, 'danger');
    }
}

// Exclui um instrutor
function excluirInstrutor(id, nome) {
    document.getElementById('nomeInstrutorExcluir').textContent = nome;
    document.getElementById('modalExcluirInstrutor').setAttribute('data-instrutor-id', id);
    
    const modal = new bootstrap.Modal(document.getElementById('modalExcluirInstrutor'));
    modal.show();
}

// Confirma exclusão do instrutor
async function confirmarExclusaoInstrutor() {
    try {
        const instrutorId = document.getElementById('modalExcluirInstrutor').getAttribute('data-instrutor-id');
        
        const response = await fetch(`${API_URL}/instrutores/${instrutorId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${getToken()}`
            }
        });
        
        const result = await response.json();
        
        if (response.ok) {
            exibirAlerta('Instrutor excluído com sucesso!', 'success');
            
            // Fecha o modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('modalExcluirInstrutor'));
            modal.hide();
            
            // Recarrega a lista
            carregarInstrutores();
        } else {
            throw new Error(result.erro || 'Erro ao excluir instrutor');
        }
    } catch (error) {
        console.error('Erro ao excluir instrutor:', error);
        exibirAlerta(error.message, 'danger');
    }
}

// Ver ocupações de um instrutor
function verOcupacoesInstrutor(id) {
    // Redireciona para o calendário com filtro do instrutor
    window.location.href = `/calendario-salas.html?instrutor_id=${id}`;
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

