document.addEventListener('DOMContentLoaded', () => {
    verificarAutenticacao();
    verificarPermissaoAdmin();

    const tabelaBody = document.getElementById('tabelaCorpoDocente');
    const editRowTemplate = document.getElementById('edit-row-template');
    let instrutoresData = [];

    function renderizarTabela() {
        tabelaBody.innerHTML = '';
        instrutoresData.forEach(instrutor => {
            const disp = instrutor.disponibilidade || [];
            const dispBadges = `
                <span class="badge ${disp.includes('manha') ? 'bg-success' : 'bg-light text-dark'}">M</span>
                <span class="badge ${disp.includes('tarde') ? 'bg-success' : 'bg-light text-dark'}">T</span>
                <span class="badge ${disp.includes('noite') ? 'bg-success' : 'bg-light text-dark'}">N</span>
            `;

            const row = document.createElement('tr');
            row.dataset.id = instrutor.id;
            row.innerHTML = `
                <td><strong>${escapeHTML(instrutor.nome)}</strong><br><small class="text-muted">${escapeHTML(instrutor.email)}</small></td>
                <td>${escapeHTML(instrutor.area_atuacao)}</td>
                <td><span class="badge ${instrutor.status === 'ativo' ? 'bg-success' : 'bg-secondary'}">${instrutor.status}</span></td>
                <td><div class="d-flex gap-1">${dispBadges}</div></td>
                <td class="text-end">
                    <button class="btn btn-sm btn-outline-primary btn-edit"><i class="bi bi-pencil"></i></button>
                    <button class="btn btn-sm btn-outline-danger btn-delete"><i class="bi bi-trash"></i></button>
                </td>
            `;
            tabelaBody.appendChild(row);
        });
    }

    async function carregarInstrutores() {
        try {
            instrutoresData = await chamarAPI('/api/instrutores', 'GET');
            renderizarTabela();
        } catch (error) {
            exibirAlerta(`Erro ao carregar instrutores: ${error.message}`, 'danger');
        }
    }

    tabelaBody.addEventListener('click', (e) => {
        if (e.target.closest('.btn-edit')) {
            const viewRow = e.target.closest('tr');
            const id = viewRow.dataset.id;
            const instrutor = instrutoresData.find(i => i.id == id);

            const editRow = document.importNode(editRowTemplate.content, true).firstElementChild;
            editRow.dataset.id = id;

            editRow.querySelector('[data-field="nome"]').value = instrutor.nome;
            editRow.querySelector('[data-field="area_atuacao"]').value = instrutor.area_atuacao;
            editRow.querySelector('[data-field="status"]').value = instrutor.status;
            const disp = instrutor.disponibilidade || [];
            editRow.querySelector('[data-field="disp-manha"]').checked = disp.includes('manha');
            editRow.querySelector('[data-field="disp-tarde"]').checked = disp.includes('tarde');
            editRow.querySelector('[data-field="disp-noite"]').checked = disp.includes('noite');

            viewRow.replaceWith(editRow);
        }
    });

    tabelaBody.addEventListener('click', async (e) => {
        const editRow = e.target.closest('tr');
        if (!editRow || !editRow.querySelector('.btn-save')) return;

        const id = editRow.dataset.id;

        if (e.target.closest('.btn-save')) {
            const disponibilidade = [];
            if (editRow.querySelector('[data-field="disp-manha"]').checked) disponibilidade.push('manha');
            if (editRow.querySelector('[data-field="disp-tarde"]').checked) disponibilidade.push('tarde');
            if (editRow.querySelector('[data-field="disp-noite"]').checked) disponibilidade.push('noite');

            const dadosAtualizados = {
                nome: editRow.querySelector('[data-field="nome"]').value,
                area_atuacao: editRow.querySelector('[data-field="area_atuacao"]').value,
                status: editRow.querySelector('[data-field="status"]').value,
                disponibilidade: disponibilidade,
            };

            try {
                await chamarAPI(`/api/instrutores/${id}`, 'PUT', dadosAtualizados);
                exibirAlerta('Instrutor atualizado com sucesso!', 'success');
                carregarInstrutores();
            } catch (error) {
                exibirAlerta(`Erro ao salvar: ${error.message}`, 'danger');
            }
        }

        if (e.target.closest('.btn-cancel')) {
            renderizarTabela();
        }
    });

    carregarInstrutores();
});
