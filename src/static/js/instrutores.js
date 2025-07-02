class GerenciadorInstrutores {
    constructor() {
        this.instrutoresData = [];
        this.instrutorEditando = null;
        this.capacidadesInstrutor = [];
        this.inicializar();
    }

    inicializar() {
        document.addEventListener('DOMContentLoaded', () => {
            this.carregarInstrutores();
        });

        const form = document.getElementById('formInstrutor');
        if (form) {
            form.addEventListener('submit', e => {
                e.preventDefault();
                this.salvarInstrutor();
            });
        }

        const btnConfirmar = document.getElementById('confirmarExcluirInstrutor');
        if (btnConfirmar) {
            btnConfirmar.addEventListener('click', () => this.confirmarExclusaoInstrutor());
        }

        const btnAddCap = document.getElementById('btnAdicionarCapacidade');
        if (btnAddCap) {
            btnAddCap.addEventListener('click', () => this.adicionarCapacidade(document.getElementById('inputCapacidade').value));
        }
    }

    // ----- Capacidades -----
    adicionarCapacidade(cap) {
        const capacidade = cap.trim();
        if (!capacidade) return;
        this.capacidadesInstrutor.push(capacidade);
        document.getElementById('inputCapacidade').value = '';
        this.renderizarCapacidades();
    }

    renderizarCapacidades() {
        const container = document.getElementById('containerCapacidades');
        container.innerHTML = '';
        this.capacidadesInstrutor.forEach((cap, index) => {
            const span = document.createElement('span');
            span.className = 'badge bg-primary me-2 mb-2';
            span.innerHTML = `${escapeHTML(cap)} <button type="button" class="btn-close btn-close-white ms-1" data-index="${index}"></button>`;
            container.appendChild(span);
        });
        container.querySelectorAll('button.btn-close').forEach(btn => {
            btn.addEventListener('click', e => {
                const idx = parseInt(e.target.getAttribute('data-index'), 10);
                if (!isNaN(idx)) {
                    this.capacidadesInstrutor.splice(idx, 1);
                    this.renderizarCapacidades();
                }
            });
        });
    }

    // ----- Carregamento de dados -----
    async carregarInstrutores() {
        const tbody = document.getElementById('tabelaInstrutores');
        const loading = document.getElementById('loadingInstrutores');
        const lista = document.getElementById('listaInstrutores');
        loading.style.display = 'block';
        lista.style.display = 'none';
        try {
            const response = await fetch(`${API_URL}/instrutores`, {
                headers: { 'Authorization': `Bearer ${getToken()}` }
            });
            if (response.ok) {
                this.instrutoresData = await response.json();
                this.renderizarTabelaInstrutores(this.instrutoresData);
            } else {
                throw new Error('Erro ao carregar instrutores');
            }
        } catch (err) {
            console.error(err);
            tbody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-danger">${escapeHTML(err.message)}</td></tr>`;
        } finally {
            loading.style.display = 'none';
            lista.style.display = 'block';
        }
    }

    renderizarTabelaInstrutores(instrutores) {
        const tbody = document.getElementById('tabelaInstrutores');
        tbody.innerHTML = '';
        if (!instrutores || instrutores.length === 0) {
            const colCount = tbody.closest('table').querySelector('thead tr').childElementCount;
            tbody.innerHTML = `<tr><td colspan="${colCount}" class="text-center py-4">Nenhum instrutor encontrado.</td></tr>`;
            return;
        }
        instrutores.forEach(instrutor => {
            const capacidades = Array.isArray(instrutor.capacidades) ? instrutor.capacidades.join(', ') : '-';
            const statusBadge = this.getStatusBadge(instrutor.status);
            const row = `
                <tr>
                    <td><strong>${escapeHTML(instrutor.nome)}</strong></td>
                    <td>${escapeHTML(instrutor.email || '')}</td>
                    <td>${escapeHTML(instrutor.area_atuacao || '')}</td>
                    <td>${statusBadge}</td>
                    <td><small class="text-muted">${escapeHTML(capacidades)}</small></td>
                    <td>
                        <div class="btn-group btn-group-sm" role="group">
                            <button type="button" class="btn btn-outline-primary" title="Editar" onclick="gerenciadorInstrutores.editarInstrutor(${instrutor.id})">
                                <i class="bi bi-pencil"></i>
                            </button>
                            <button type="button" class="btn btn-outline-danger" title="Excluir" onclick="gerenciadorInstrutores.excluirInstrutor(${instrutor.id}, '${escapeHTML(instrutor.nome)}')">
                                <i class="bi bi-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>`;
            tbody.insertAdjacentHTML('beforeend', row);
        });
    }

    getStatusBadge(status) {
        const badges = {
            'ativo': '<span class="badge bg-success">Ativo</span>',
            'inativo': '<span class="badge bg-secondary">Inativo</span>',
            'licenca': '<span class="badge bg-warning text-dark">Licença</span>'
        };
        return badges[status] || '<span class="badge bg-secondary">-</span>';
    }

    // ----- Formulário -----
    novaInstrutor() {
        this.instrutorEditando = null;
        this.capacidadesInstrutor = [];
        document.getElementById('modalInstrutorLabel').textContent = 'Adicionar Instrutor';
        document.getElementById('btnSalvarTexto').textContent = 'Salvar';
        document.getElementById('formInstrutor').reset();
        document.getElementById('instrutorId').value = '';
        this.renderizarCapacidades();
        document.querySelectorAll('#formInstrutor input[name="disponibilidade"]').forEach(cb => cb.checked = false);
    }

    async editarInstrutor(id) {
        try {
            const response = await fetch(`${API_URL}/instrutores/${id}`, {
                headers: { 'Authorization': `Bearer ${getToken()}` }
            });
            if (!response.ok) throw new Error('Erro ao carregar dados do instrutor');
            const instrutor = await response.json();
            this.instrutorEditando = instrutor;
            document.getElementById('modalInstrutorLabel').textContent = 'Editar Instrutor';
            document.getElementById('btnSalvarTexto').textContent = 'Atualizar';
            document.getElementById('instrutorId').value = instrutor.id;
            document.getElementById('instrutorNome').value = instrutor.nome || '';
            document.getElementById('instrutorEmail').value = instrutor.email || '';
            document.getElementById('instrutorTelefone').value = instrutor.telefone || '';
            document.getElementById('instrutorStatus').value = instrutor.status || 'ativo';
            document.getElementById('instrutorAreaAtuacao').value = instrutor.area_atuacao || '';
            document.getElementById('instrutorObservacoes').value = instrutor.observacoes || '';

            this.capacidadesInstrutor = Array.isArray(instrutor.capacidades) ? instrutor.capacidades : [];
            this.renderizarCapacidades();

            document.querySelectorAll('#formInstrutor input[name="disponibilidade"]').forEach(cb => {
                cb.checked = Array.isArray(instrutor.disponibilidade) && instrutor.disponibilidade.includes(cb.value);
            });

            const modal = new bootstrap.Modal(document.getElementById('modalInstrutor'));
            modal.show();
        } catch (err) {
            console.error(err);
            exibirAlerta('Erro ao carregar dados do instrutor.', 'danger');
        }
    }

    coletarDisponibilidade() {
        const disp = [];
        document.querySelectorAll('#formInstrutor input[name="disponibilidade"]:checked').forEach(cb => disp.push(cb.value));
        return disp;
    }

    async salvarInstrutor() {
        const btn = document.getElementById('btnSalvarInstrutor');
        const spinner = btn.querySelector('.spinner-border');
        btn.disabled = true;
        spinner.classList.remove('d-none');
        try {
            const dados = {
                nome: document.getElementById('instrutorNome').value.trim(),
                email: document.getElementById('instrutorEmail').value.trim(),
                telefone: document.getElementById('instrutorTelefone').value.trim(),
                status: document.getElementById('instrutorStatus').value,
                area_atuacao: document.getElementById('instrutorAreaAtuacao').value,
                observacoes: document.getElementById('instrutorObservacoes').value.trim(),
                capacidades: this.capacidadesInstrutor,
                disponibilidade: this.coletarDisponibilidade()
            };

            if (!dados.nome) {
                exibirAlerta('Nome é obrigatório.', 'warning');
                return;
            }

            const instrutorId = document.getElementById('instrutorId').value;
            const isEdicao = instrutorId !== '';
            const response = await fetch(`${API_URL}/instrutores${isEdicao ? `/${instrutorId}` : ''}`, {
                method: isEdicao ? 'PUT' : 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${getToken()}`
                },
                body: JSON.stringify(dados)
            });
            const result = await response.json();
            if (response.ok) {
                exibirAlerta(`Instrutor ${isEdicao ? 'atualizado' : 'criado'} com sucesso!`, 'success');
                const modal = bootstrap.Modal.getInstance(document.getElementById('modalInstrutor'));
                modal.hide();
                this.novaInstrutor();
                this.carregarInstrutores();
            } else {
                throw new Error(result.erro || 'Erro ao salvar instrutor');
            }
        } catch (err) {
            console.error(err);
            exibirAlerta(err.message, 'danger');
        } finally {
            btn.disabled = false;
            spinner.classList.add('d-none');
        }
    }

    excluirInstrutor(id, nome) {
        document.getElementById('nomeInstrutorExcluir').textContent = nome;
        document.getElementById('modalExcluirInstrutor').setAttribute('data-instrutor-id', id);
        const modal = new bootstrap.Modal(document.getElementById('modalExcluirInstrutor'));
        modal.show();
    }

    async confirmarExclusaoInstrutor() {
        try {
            const id = document.getElementById('modalExcluirInstrutor').getAttribute('data-instrutor-id');
            const response = await fetch(`${API_URL}/instrutores/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${getToken()}` }
            });
            const result = await response.json();
            if (response.ok) {
                exibirAlerta('Instrutor excluído com sucesso!', 'success');
                const modal = bootstrap.Modal.getInstance(document.getElementById('modalExcluirInstrutor'));
                modal.hide();
                this.carregarInstrutores();
            } else {
                throw new Error(result.erro || 'Erro ao excluir instrutor');
            }
        } catch (err) {
            console.error(err);
            exibirAlerta(err.message, 'danger');
        }
    }
}

window.gerenciadorInstrutores = new GerenciadorInstrutores();
