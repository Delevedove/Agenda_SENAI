document.addEventListener('DOMContentLoaded', function () {
    // Variáveis de estado para o modal
    let capacidadesInstrutor = [];
    let todasCapacidades = []; // Para as sugestões

    // Elementos do DOM
    const modalInstrutor = document.getElementById('modalInstrutor');
    const formInstrutor = document.getElementById('formInstrutor');
    const inputCapacidade = document.getElementById('inputCapacidade');
    const btnAdicionarCapacidade = document.getElementById('btnAdicionarCapacidade');
    const containerCapacidades = document.getElementById('containerCapacidades');
    const sugestoesContainer = document.getElementById('sugestoesCapacidades');
    const selectArea = document.getElementById('instrutorAreaAtuacao');

    // Carrega sugestões iniciais
    async function carregarSugestoes(area = '') {
        try {
            const endpoint = area ? `/api/instrutores/capacidades-sugeridas?area=${area}`
                                  : '/api/instrutores/capacidades-sugeridas';
            todasCapacidades = await chamarAPI(endpoint);
        } catch (e) {
            console.error('Erro ao carregar sugestões:', e);
        }
    }

    // Mostra sugestões conforme o usuário digita
    inputCapacidade.addEventListener('input', () => {
        const termo = inputCapacidade.value.trim().toLowerCase();
        sugestoesContainer.innerHTML = '';
        if (!termo) return;
        const filtradas = todasCapacidades.filter(c => c.toLowerCase().includes(termo)).slice(0,5);
        filtradas.forEach(cap => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'btn btn-sm btn-light me-1 mb-1';
            btn.textContent = cap;
            btn.addEventListener('click', () => adicionarCapacidade(cap));
            sugestoesContainer.appendChild(btn);
        });
    });

    // --- Lógica do Componente de Capacidades ---

    // Função para renderizar os badges de capacidade
    function renderizarCapacidades() {
        containerCapacidades.innerHTML = '';
        capacidadesInstrutor.forEach((capacidade, index) => {
            const badge = document.createElement('span');
            badge.className = 'badge bg-primary me-2 mb-2';
            badge.innerHTML = `${escapeHTML(capacidade)} <button type="button" class="btn-close btn-close-white ms-1" data-index="${index}"></button>`;
            containerCapacidades.appendChild(badge);
        });
    }

    // Função para adicionar uma capacidade
    function adicionarCapacidade(capacidade) {
        const capacidadeLimpa = capacidade.trim();
        if (capacidadeLimpa && !capacidadesInstrutor.includes(capacidadeLimpa)) {
            capacidadesInstrutor.push(capacidadeLimpa);
            renderizarCapacidades();
            inputCapacidade.value = '';
            sugestoesContainer.innerHTML = '';
        }
    }

    // Função para remover uma capacidade
    containerCapacidades.addEventListener('click', function (e) {
        if (e.target.classList.contains('btn-close')) {
            const index = e.target.getAttribute('data-index');
            capacidadesInstrutor.splice(index, 1);
            renderizarCapacidades();
        }
    });

    // Event Listeners para adicionar capacidade
    btnAdicionarCapacidade.addEventListener('click', () => adicionarCapacidade(inputCapacidade.value));
    inputCapacidade.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            adicionarCapacidade(inputCapacidade.value);
        }
    });

    selectArea.addEventListener('change', () => carregarSugestoes(selectArea.value));
    carregarSugestoes();

    // --- Lógica do Modal e Submissão ---

    // Função para abrir o modal para novo instrutor
    window.abrirModalNovoInstrutor = function() {
        capacidadesInstrutor = [];
        formInstrutor.reset();
        document.getElementById('instrutorId').value = '';
        document.getElementById('modalInstrutorLabel').textContent = 'Novo Instrutor';
        renderizarCapacidades();
        document.getElementById('dispManha').checked = false;
        document.getElementById('dispTarde').checked = false;
        document.getElementById('dispNoite').checked = false;
        const modal = new bootstrap.Modal(modalInstrutor);
        modal.show();
    };

    // Função para abrir e preencher o modal para edição
    window.abrirModalEdicaoInstrutor = async function(id) {
        // Resetar o estado antes de preencher
        capacidadesInstrutor = [];
        formInstrutor.reset();
        document.getElementById('instrutorId').value = id;
        document.getElementById('modalInstrutorLabel').textContent = 'Editar Instrutor';

        try {
            const instrutor = await chamarAPI(`/api/instrutores/${id}`);
            document.getElementById('instrutorNome').value = instrutor.nome || '';
            document.getElementById('instrutorEmail').value = instrutor.email || '';
            document.getElementById('instrutorTelefone').value = instrutor.telefone || '';
            document.getElementById('instrutorAreaAtuacao').value = instrutor.area_atuacao || '';
            document.getElementById('instrutorStatus').value = instrutor.status || 'ativo';
            document.getElementById('instrutorObservacoes').value = instrutor.observacoes || '';

            // Preencher Capacidades
            capacidadesInstrutor = [...(instrutor.capacidades || [])];
            renderizarCapacidades();

            // Preencher Disponibilidade
            const disponibilidade = instrutor.disponibilidade || [];
            document.getElementById('dispManha').checked = disponibilidade.includes('manha');
            document.getElementById('dispTarde').checked = disponibilidade.includes('tarde');
            document.getElementById('dispNoite').checked = disponibilidade.includes('noite');

            const modal = new bootstrap.Modal(modalInstrutor);
            modal.show();
        } catch (error) {
            exibirAlerta(`Erro ao carregar dados do instrutor: ${error.message}`, 'danger');
        }
    };
    
    // Função para submeter o formulário (criar ou atualizar)
    formInstrutor.addEventListener('submit', async function (event) {
        event.preventDefault();
        const instrutorId = document.getElementById('instrutorId').value;
        const isEdicao = instrutorId !== '';

        // Recolher a Disponibilidade
        const disponibilidade = [];
        if (document.getElementById('dispManha').checked) disponibilidade.push('manha');
        if (document.getElementById('dispTarde').checked) disponibilidade.push('tarde');
        if (document.getElementById('dispNoite').checked) disponibilidade.push('noite');

        // Montar o payload completo
        const dadosInstrutor = {
            nome: document.getElementById('instrutorNome').value,
            email: document.getElementById('instrutorEmail').value,
            telefone: document.getElementById('instrutorTelefone').value,
            area_atuacao: document.getElementById('instrutorAreaAtuacao').value,
            status: document.getElementById('instrutorStatus').value,
            observacoes: document.getElementById('instrutorObservacoes').value,
            capacidades: capacidadesInstrutor, // Usa a variável de estado
            disponibilidade: disponibilidade
        };

        const url = isEdicao ? `/api/instrutores/${instrutorId}` : '/api/instrutores';
        const method = isEdicao ? 'PUT' : 'POST';

        try {
            await chamarAPI(url, method, dadosInstrutor);
            exibirAlerta(`Instrutor ${isEdicao ? 'atualizado' : 'criado'} com sucesso!`, 'success');
            bootstrap.Modal.getInstance(modalInstrutor).hide();
            carregarInstrutores(); // Função global que recarrega a tabela de instrutores
        } catch (error) {
            exibirAlerta(error.message, 'danger');
        }
    });

    // Lógica para carregar os instrutores na tabela (deve já existir, apenas garantir que é chamada)
    // carregarInstrutores(); 
});
