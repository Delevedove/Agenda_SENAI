// Em: src/static/js/corpo-docente.js
document.addEventListener('DOMContentLoaded', () => {
    const tabelaBody = document.getElementById('tabelaCorpoDocente');
    const editRowTemplate = document.getElementById('edit-row-template');
    const btnAdicionarNovo = document.getElementById('btnAdicionarNovo');
    let instrutoresData = [];

    // --- FUNÇÕES DE RENDERIZAÇÃO ---

    function createViewRow(instrutor) {
        const disp = instrutor.disponibilidade || [];
        const dispBadges = `
            <span class="badge ${disp.includes('manha') ? 'bg-success' : 'bg-light text-dark'}">M</span>
            <span class="badge ${disp.includes('tarde') ? 'bg-success' : 'bg-light text-dark'}">T</span>
            <span class="badge ${disp.includes('noite') ? 'bg-success' : 'bg-light text-dark'}">N</span>
        `;
        const statusBadge = `<span class="badge ${instrutor.status === 'ativo' ? 'bg-success' : 'bg-secondary'}">${instrutor.status}</span>`;

        const row = document.createElement('tr');
        row.dataset.id = instrutor.id;
        row.innerHTML = `
            <td><strong>${escapeHTML(instrutor.nome)}</strong><br><small class="text-muted">${escapeHTML(instrutor.email || '')}</small></td>
            <td>${escapeHTML(instrutor.area_atuacao || '')}</td>
            <td>${statusBadge}</td>
            <td><div class="d-flex gap-1">${dispBadges}</div></td>
            <td class="text-end">
                <button class="btn btn-sm btn-outline-primary btn-edit"><i class="bi bi-pencil"></i></button>
                <button class="btn btn-sm btn-outline-danger btn-delete"><i class="bi bi-trash"></i></button>
            </td>
        `;
        return row;
    }

    function createEditRow(instrutor = {}) {
        const editRow = document.importNode(editRowTemplate.content, true).firstElementChild;
        editRow.dataset.id = instrutor.id || ''; // Se for novo, o ID é vazio

        // Preencher campos
        editRow.querySelector('[data-field="nome"]').value = instrutor.nome || '';
        editRow.querySelector('[data-field="area_atuacao"]').value = instrutor.area_atuacao || '';
        editRow.querySelector('[data-field="status"]').value = instrutor.status || 'ativo';
        const disp = instrutor.disponibilidade || [];
        editRow.querySelector('[data-field="disp-manha"]').checked = disp.includes('manha');
        editRow.querySelector('[data-field="disp-tarde"]').checked = disp.includes('tarde');
        editRow.querySelector('[data-field="disp-noite"]').checked = disp.includes('noite');
        
        return editRow;
    }
    
    function renderizarTabela() {
        tabelaBody.innerHTML = '';
        instrutoresData.forEach(instrutor => tabelaBody.appendChild(createViewRow(instrutor)));
    }

    // --- FUNÇÕES DE DADOS E API ---

    async function carregarInstrutores() {
        try {
            // CORREÇÃO DO ERRO 404: Garanta que o endpoint está correto.
            const dados = await chamarAPI('/api/instrutores', 'GET');
            instrutoresData = dados; // Atualiza o estado global
            renderizarTabela();
        } catch (error) {
            exibirAlerta(`Erro ao carregar instrutores: ${error.message}`, 'danger');
            // Limpa a tabela e mostra o erro
            const colCount = document
                .getElementById('tabelaCorpoDocente')
                .closest('table')
                .querySelector('thead tr').childElementCount;
            document.getElementById('tabelaCorpoDocente').innerHTML =
                `<tr><td colspan="${colCount}" class="text-center py-4 text-danger">Falha ao carregar dados.</td></tr>`;
        }
    }

    async function salvarDados(id, editRow) {
        // Recolher dados da linha de edição...
        const disponibilidade = [];
        if (editRow.querySelector('[data-field="disp-manha"]').checked) disponibilidade.push('manha');
        if (editRow.querySelector('[data-field="disp-tarde"]').checked) disponibilidade.push('tarde');
        if (editRow.querySelector('[data-field="disp-noite"]').checked) disponibilidade.push('noite');

        // Supondo que a API espera todos os campos, mesmo para atualização
        const dados = {
            nome: editRow.querySelector('[data-field="nome"]').value,
            area_atuacao: editRow.querySelector('[data-field="area_atuacao"]').value,
            status: editRow.querySelector('[data-field="status"]').value,
            disponibilidade: disponibilidade,
            // Adicionando campos obrigatórios que podem não estar na UI de edição inline
            email: `instrutor${id || Date.now()}@fiemg.com.br`,
            telefone: '(00) 00000-0000'
        };

        const isEdicao = id && id !== '';
        const url = isEdicao ? `/api/instrutores/${id}` : '/api/instrutores';
        const method = isEdicao ? 'PUT' : 'POST';

        try {
            await chamarAPI(url, method, dados);
            exibirAlerta(`Instrutor ${isEdicao ? 'atualizado' : 'criado'} com sucesso!`, 'success');
            carregarInstrutores(); // Recarrega toda a lista
        } catch (error) {
            exibirAlerta(`Erro ao salvar: ${error.message}`, 'danger');
            carregarInstrutores(); // Restaura a tabela em caso de erro para evitar que a linha de edição fique presa
        }
    }

    // --- EVENT LISTENERS ---

    // CORREÇÃO DO BOTÃO ADICIONAR
    btnAdicionarNovo.addEventListener('click', () => {
        // Impede adicionar outra linha se uma já estiver a ser editada/criada
        if (tabelaBody.querySelector('.btn-save')) {
            exibirAlerta('Salve ou cancele a edição atual antes de adicionar um novo instrutor.', 'warning');
            return;
        }
        const newEditRow = createEditRow();
        tabelaBody.prepend(newEditRow);
    });

    // Event Delegation para toda a tabela
    tabelaBody.addEventListener('click', async (e) => {
        const editButton = e.target.closest('.btn-edit');
        const saveButton = e.target.closest('.btn-save');
        const cancelButton = e.target.closest('.btn-cancel');

        if (editButton) {
            const viewRow = editButton.closest('tr');
            const id = viewRow.dataset.id;
            const instrutor = instrutoresData.find(i => i.id == id);
            const editRow = createEditRow(instrutor);
            viewRow.replaceWith(editRow);
        }

        if (saveButton) {
            const editRow = saveButton.closest('tr');
            const id = editRow.dataset.id;
            await salvarDados(id, editRow);
        }

        if (cancelButton) {
            // Simplesmente recarrega a tabela para descartar as alterações
            renderizarTabela();
        }
    });

    // --- INICIALIZAÇÃO ---
    carregarInstrutores();
});
