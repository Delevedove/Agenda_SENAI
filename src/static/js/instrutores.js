// Em: src/static/js/instrutores.js

document.addEventListener('DOMContentLoaded', function () {
    // --- Variáveis de Estado Globais para o Módulo ---
    let capacidadesInstrutor = [];
    let instrutorEditando = null;

    // --- Elementos do DOM ---
    const modalInstrutor = document.getElementById('modalInstrutor');
    const formInstrutor = document.getElementById('formInstrutor');
    const inputCapacidade = document.getElementById('inputCapacidade');
    const btnAdicionarCapacidade = document.getElementById('btnAdicionarCapacidade');
    const containerCapacidades = document.getElementById('containerCapacidades');
    const tabelaInstrutoresBody = document.getElementById('tabelaInstrutores');

    // --- Funções de Renderização da UI ---

    function renderizarCapacidades() {
        containerCapacidades.innerHTML = '';
        capacidadesInstrutor.forEach((capacidade, index) => {
            const badge = document.createElement('span');
            badge.className = 'badge bg-primary me-2 mb-2';
            badge.innerHTML = `${escapeHTML(capacidade)} <button type="button" class="btn-close btn-close-white ms-1" data-index="${index}"></button>`;
            containerCapacidades.appendChild(badge);
        });
    }

    function renderizarTabela(instrutores) {
        tabelaInstrutoresBody.innerHTML = '';
        if (!instrutores || instrutores.length === 0) {
            const colCount = tabelaInstrutoresBody.closest('table').querySelector('thead tr').childElementCount;
            tabelaInstrutoresBody.innerHTML = `<tr><td colspan="${colCount}" class="text-center py-4">Nenhum instrutor encontrado.</td></tr>`;
            return;
        }

        instrutores.forEach(instrutor => {
            const statusBadge = getStatusBadge(instrutor.status);
            const capacidades = instrutor.capacidades && instrutor.capacidades.length > 0 ? instrutor.capacidades.join(', ') : 'Nenhuma';
            const row = `
                <tr>
                    <td><strong>${escapeHTML(instrutor.nome)}</strong></td>
                    <td>${escapeHTML(instrutor.email || '-')}</td>
                    <td>${escapeHTML(instrutor.area_atuacao || '-')}</td>
                    <td>${statusBadge}</td>
                    <td><small class="text-muted">${escapeHTML(capacidades)}</small></td>
                    <td>
                        <div class="btn-group btn-group-sm">
                            <button type="button" class="btn btn-outline-primary" title="Editar" onclick="abrirModalEdicaoInstrutor(${instrutor.id})"><i class="bi bi-pencil"></i></button>
                            <button type="button" class="btn btn-outline-danger" title="Excluir" onclick="excluirInstrutor(${instrutor.id})"><i class="bi bi-trash"></i></button>
                        </div>
                    </td>
                </tr>
            `;
            tabelaInstrutoresBody.insertAdjacentHTML('beforeend', row);
        });
    }
    
    function getStatusBadge(status) {
        const badges = {'ativo': 'bg-success', 'inativo': 'bg-secondary', 'licenca': 'bg-warning text-dark'};
        return `<span class="badge ${badges[status] || 'bg-light text-dark'}">${status}</span>`;
    }

    // --- Lógica de Carregamento Inicial ---

    async function carregarInstrutores() {
        const colCount = tabelaInstrutoresBody.closest('table').querySelector('thead tr').childElementCount;
        tabelaInstrutoresBody.innerHTML = `<tr><td colspan="${colCount}" class="text-center py-4"><div class="spinner-border spinner-border-sm" role="status"><span class="visually-hidden">Carregando...</span></div> Carregando instrutores...</td></tr>`;

        try {
            // Endpoint deve coincidir exatamente com o definido no backend
            const instrutores = await chamarAPI('/instrutores', 'GET');
            renderizarTabela(instrutores);
        } catch (error) {
            // Se a chamarAPI falhar (incluindo erro 401), exibe uma mensagem de erro na tabela.
            tabelaInstrutoresBody.innerHTML = `<tr><td colspan="${colCount}" class="text-center py-4 text-danger">Erro ao carregar instrutores: ${error.message}</td></tr>`;
        }
    }

    // --- Funções de Interação do Modal ---

    window.abrirModalEdicaoInstrutor = async function(id) {
        // ... (código para preencher o modal, conforme prompts anteriores) ...
    };
    
    function adicionarCapacidade(capacidade) {
        // ... (lógica para adicionar capacidade, conforme prompts anteriores) ...
    }

    // --- Event Listeners ---

    btnAdicionarCapacidade.addEventListener('click', () => adicionarCapacidade(inputCapacidade.value));
    // ... (outros event listeners para o modal, conforme prompts anteriores) ...
    formInstrutor.addEventListener('submit', async function(event) {
        // ... (lógica de submissão do formulário, conforme prompts anteriores) ...
    });

    // --- Inicialização ---
    carregarInstrutores();
});
