// Funções para nova ocupação

// Variáveis globais
let passoAtual = 1;
let salasDisponiveis = [];
let instrutoresDisponiveis = [];
let tiposOcupacaoData = [];
let ocupacaoEditando = null;

// Retorna o turno baseado nos horários
function obterTurnoPorHorario(inicio, fim) {
    const mapa = {
        '07:30': 'Manhã',
        '13:30': 'Tarde',
        '18:30': 'Noite'
    };
    if (mapa[inicio]) {
        return mapa[inicio];
    }
    // fallback
    if (inicio < '12:00') return 'Manhã';
    if (inicio < '18:00') return 'Tarde';
    return 'Noite';
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
            tiposOcupacaoData = await response.json();
            
            const select = document.getElementById('tipoOcupacao');
            select.innerHTML = '<option value="">Selecione...</option>';
            
            tiposOcupacaoData.forEach(tipo => {
                select.innerHTML += `<option value="${tipo.valor}">${tipo.nome}</option>`;
            });
        }
    } catch (error) {
        console.error('Erro ao carregar tipos de ocupação:', error);
    }
}

// Carrega salas disponíveis
async function carregarSalas() {
    try {
        const response = await fetch(`${API_URL}/salas?status=ativa`, {
            headers: {
                'Authorization': `Bearer ${getToken()}`
            }
        });
        
        if (response.ok) {
            salasDisponiveis = await response.json();
            
            const select = document.getElementById('salaOcupacao');
            select.innerHTML = '<option value="">Selecione...</option>';
            
            salasDisponiveis.forEach(sala => {
                select.innerHTML += `<option value="${sala.id}">${sala.nome} (${sala.capacidade} pessoas)</option>`;
            });
        }
    } catch (error) {
        console.error('Erro ao carregar salas:', error);
    }
}

// Carrega instrutores disponíveis
async function carregarInstrutores() {
    try {
        const response = await fetch(`${API_URL}/instrutores?status=ativo`, {
            headers: {
                'Authorization': `Bearer ${getToken()}`
            }
        });
        
        if (response.ok) {
            instrutoresDisponiveis = await response.json();
            
            const select = document.getElementById('instrutorOcupacao');
            select.innerHTML = '<option value="">Nenhum instrutor</option>';
            
            instrutoresDisponiveis.forEach(instrutor => {
                select.innerHTML += `<option value="${instrutor.id}">${instrutor.nome}</option>`;
            });
        }
    } catch (error) {
        console.error('Erro ao carregar instrutores:', error);
    }
}

// Adiciona listeners de validação
function adicionarListenersValidacao() {
    document.getElementById('dataInicio').addEventListener('change', validarDatas);
    document.getElementById('dataFim').addEventListener('change', validarDatas);

    // Verifica se há parâmetros na URL
    verificarParametrosURL();
}

// Verifica parâmetros da URL
function verificarParametrosURL() {
    const urlParams = new URLSearchParams(window.location.search);
    
    // Data pré-selecionada
    const data = urlParams.get('data');
    if (data) {
        document.getElementById('dataInicio').value = data;
        document.getElementById('dataFim').value = data;
    }
    
    // Edição de ocupação
    const editarId = urlParams.get('editar');
    if (editarId) {
        carregarOcupacaoParaEdicao(editarId);
    }
}

// Carrega ocupação para edição
async function carregarOcupacaoParaEdicao(id) {
    try {
        const response = await fetch(`${API_URL}/ocupacoes/${id}`, {
            headers: {
                'Authorization': `Bearer ${getToken()}`
            }
        });
        
        if (response.ok) {
            ocupacaoEditando = await response.json();
            
            // Preenche o formulário
            document.getElementById('cursoEvento').value = ocupacaoEditando.curso_evento;
            document.getElementById('tipoOcupacao').value = ocupacaoEditando.tipo_ocupacao;
            document.getElementById('dataInicio').value = ocupacaoEditando.data;
            document.getElementById('dataFim').value = ocupacaoEditando.data;
            document.getElementById('turno').value = obterTurnoPorHorario(ocupacaoEditando.horario_inicio, ocupacaoEditando.horario_fim);
            document.getElementById('salaOcupacao').value = ocupacaoEditando.sala_id;
            document.getElementById('instrutorOcupacao').value = ocupacaoEditando.instrutor_id || '';
            document.getElementById('observacoesOcupacao').value = ocupacaoEditando.observacoes || '';
            
            // Atualiza título
            document.querySelector('h1').textContent = 'Editar Ocupação';
        } else {
            throw new Error('Erro ao carregar ocupação');
        }
    } catch (error) {
        console.error('Erro ao carregar ocupação para edição:', error);
        exibirAlerta('Erro ao carregar dados da ocupação.', 'danger');
    }
}

// Valida datas de início e fim
function validarDatas() {
    const inicio = document.getElementById('dataInicio').value;
    const fim = document.getElementById('dataFim').value;
    const hoje = new Date().toISOString().split('T')[0];

    if (inicio && inicio < hoje) {
        document.getElementById('dataInicio').setCustomValidity('Data não pode ser no passado');
    } else {
        document.getElementById('dataInicio').setCustomValidity('');
    }

    if (inicio && fim && fim < inicio) {
        document.getElementById('dataFim').setCustomValidity('Data de fim deve ser posterior ou igual à data de início');
    } else {
        document.getElementById('dataFim').setCustomValidity('');
    }
}

// Verifica disponibilidade
async function verificarDisponibilidade() {
    // Valida formulário
    if (!validarFormulario()) {
        return;
    }
    
    // Avança para passo 2
    avancarPasso(2);
    
    // Mostra loading
    document.getElementById('verificandoDisponibilidade').style.display = 'block';
    document.getElementById('resultadoVerificacao').style.display = 'none';
    document.getElementById('botoesVerificacao').style.display = 'none';
    
    try {
        const params = new URLSearchParams({
            sala_id: document.getElementById('salaOcupacao').value,
            data_inicio: document.getElementById('dataInicio').value,
            data_fim: document.getElementById('dataFim').value,
            turno: document.getElementById('turno').value
        });
        
        // Se estiver editando, inclui o ID da ocupação
        if (ocupacaoEditando) {
            params.append('ocupacao_id', ocupacaoEditando.id);
        }
        
        const response = await fetch(`${API_URL}/ocupacoes/verificar-disponibilidade?${params.toString()}`, {
            headers: {
                'Authorization': `Bearer ${getToken()}`
            }
        });
        
        const resultado = await response.json();
        
        if (response.ok) {
            mostrarResultadoVerificacao(resultado);
        } else {
            throw new Error(resultado.erro || 'Erro ao verificar disponibilidade');
        }
    } catch (error) {
        console.error('Erro ao verificar disponibilidade:', error);
        exibirAlerta(error.message, 'danger');
        voltarPasso1();
    } finally {
        document.getElementById('verificandoDisponibilidade').style.display = 'none';
    }
}

// Mostra resultado da verificação
function mostrarResultadoVerificacao(resultado) {
    const container = document.getElementById('resultadoVerificacao');
    const botoes = document.getElementById('botoesVerificacao');
    const btnConfirmar = document.getElementById('btnConfirmarOcupacao');
    
    container.innerHTML = '';
    
    if (resultado.disponivel) {
        // Sala disponível
        container.innerHTML = `
            <div class="disponibilidade-check disponivel">
                <div class="d-flex align-items-center mb-3">
                    <i class="bi bi-check-circle-fill text-success me-3" style="font-size: 2rem;"></i>
                    <div>
                        <h5 class="text-success mb-1">Sala Disponível!</h5>
                        <p class="mb-0">A sala ${resultado.sala.nome} está disponível no turno solicitado.</p>
                    </div>
                </div>
                
                <div class="row">
                    <div class="col-md-6">
                        <h6>Detalhes da Sala</h6>
                        <ul class="list-unstyled">
                            <li><strong>Nome:</strong> ${resultado.sala.nome}</li>
                            <li><strong>Capacidade:</strong> ${resultado.sala.capacidade} pessoas</li>
                            <li><strong>Tipo:</strong> ${resultado.sala.tipo || 'Não especificado'}</li>
                            ${resultado.sala.localizacao ? `<li><strong>Localização:</strong> ${resultado.sala.localizacao}</li>` : ''}
                        </ul>
                    </div>
                    <div class="col-md-6">
                        <h6>Recursos Disponíveis</h6>
                        ${resultado.sala.recursos.length > 0 ? `
                            <ul class="list-unstyled">
                                ${resultado.sala.recursos.map(recurso => `<li><i class="bi bi-check text-success me-1"></i>${recurso}</li>`).join('')}
                            </ul>
                        ` : '<p class="text-muted">Nenhum recurso especificado</p>'}
                    </div>
                </div>
            </div>
        `;
        
        btnConfirmar.disabled = false;
        btnConfirmar.className = 'btn btn-success';
    } else {
        // Sala indisponível
        container.innerHTML = `
            <div class="disponibilidade-check indisponivel">
                <div class="d-flex align-items-center mb-3">
                    <i class="bi bi-x-circle-fill text-danger me-3" style="font-size: 2rem;"></i>
                    <div>
                        <h5 class="text-danger mb-1">Sala Indisponível</h5>
                        <p class="mb-0">A sala ${resultado.sala.nome} não está disponível no turno solicitado.</p>
                    </div>
                </div>
                
                <h6>Conflitos Encontrados:</h6>
                <div class="conflitos-container">
                    ${resultado.conflitos.map(conflito => `
                        <div class="conflito-item">
                            <strong>${conflito.curso_evento}</strong><br>
                            <small>
                                <i class="bi bi-clock me-1"></i>${conflito.horario_inicio} às ${conflito.horario_fim}
                                ${conflito.instrutor_nome ? `<br><i class="bi bi-person-badge me-1"></i>${conflito.instrutor_nome}` : ''}
                            </small>
                        </div>
                    `).join('')}
                </div>
                
                <div class="mt-3">
                    <p class="mb-2"><strong>Sugestões:</strong></p>
                    <ul class="list-unstyled">
                        <li><i class="bi bi-arrow-right me-1"></i>Escolha outro turno ou data</li>
                        <li><i class="bi bi-arrow-right me-1"></i>Selecione uma sala diferente</li>
                        <li><i class="bi bi-arrow-right me-1"></i>Altere a data da ocupação</li>
                    </ul>
                </div>
            </div>
        `;
        
        btnConfirmar.disabled = true;
        btnConfirmar.className = 'btn btn-secondary';
    }
    
    container.style.display = 'block';
    botoes.style.display = 'flex';
}

// Confirma ocupação
async function confirmarOcupacao() {
    // Avança para passo 3
    avancarPasso(3);
    
    try {
        const formData = {
            curso_evento: document.getElementById('cursoEvento').value,
            tipo_ocupacao: document.getElementById('tipoOcupacao').value,
            data_inicio: document.getElementById('dataInicio').value,
            data_fim: document.getElementById('dataFim').value,
            turno: document.getElementById('turno').value,
            sala_id: parseInt(document.getElementById('salaOcupacao').value),
            observacoes: document.getElementById('observacoesOcupacao').value
        };
        
        const instrutorId = document.getElementById('instrutorOcupacao').value;
        if (instrutorId) {
            formData.instrutor_id = parseInt(instrutorId);
        }
        
        const isEdicao = ocupacaoEditando !== null;
        const url = isEdicao ? `${API_URL}/ocupacoes/${ocupacaoEditando.id}` : `${API_URL}/ocupacoes`;
        const method = isEdicao ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getToken()}`
            },
            body: JSON.stringify(formData)
        });
        
        const resultado = await response.json();
        
        if (response.ok) {
            // Sucesso
            document.getElementById('salvandoOcupacao').style.display = 'none';
            document.getElementById('ocupacaoSalva').style.display = 'block';
        } else {
            throw new Error(resultado.erro || 'Erro ao salvar ocupação');
        }
    } catch (error) {
        console.error('Erro ao salvar ocupação:', error);
        
        // Mostra erro
        document.getElementById('salvandoOcupacao').style.display = 'none';
        document.getElementById('mensagemErro').textContent = error.message;
        document.getElementById('erroSalvarOcupacao').style.display = 'block';
    }
}

// Valida formulário
function validarFormulario() {
    const campos = [
        'cursoEvento',
        'tipoOcupacao',
        'dataInicio',
        'dataFim',
        'turno',
        'salaOcupacao'
    ];
    
    let valido = true;
    
    campos.forEach(campo => {
        const elemento = document.getElementById(campo);
        if (!elemento.value.trim()) {
            elemento.classList.add('is-invalid');
            valido = false;
        } else {
            elemento.classList.remove('is-invalid');
        }
    });
    
    // Valida datas
    validarDatas();

    if (document.getElementById('dataInicio').validationMessage || document.getElementById('dataFim').validationMessage) {
        valido = false;
    }
    
    if (!valido) {
        exibirAlerta('Por favor, preencha todos os campos obrigatórios corretamente.', 'warning');
    }
    
    return valido;
}

// Avança para próximo passo
function avancarPasso(passo) {
    // Esconde passo atual
    document.getElementById(`passo${passoAtual}`).style.display = 'none';
    document.getElementById(`step${passoAtual}`).classList.remove('active');
    document.getElementById(`step${passoAtual}`).classList.add('completed');
    
    // Mostra novo passo
    passoAtual = passo;
    document.getElementById(`passo${passoAtual}`).style.display = 'block';
    document.getElementById(`step${passoAtual}`).classList.add('active');
}

// Volta para passo 1
function voltarPasso1() {
    // Esconde passo atual
    document.getElementById(`passo${passoAtual}`).style.display = 'none';
    document.getElementById(`step${passoAtual}`).classList.remove('active');
    
    // Remove completed dos passos posteriores
    for (let i = 2; i <= 3; i++) {
        document.getElementById(`step${i}`).classList.remove('completed');
    }
    
    // Mostra passo 1
    passoAtual = 1;
    document.getElementById('passo1').style.display = 'block';
    document.getElementById('step1').classList.add('active');
}

// Nova ocupação
function novaOcupacao() {
    window.location.href = '/novo-agendamento-sala.html';
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

