document.addEventListener('DOMContentLoaded', async () => {
    // Garante que o usuário está autenticado
    if (!verificarAutenticacao()) {
        window.location.href = '/admin-login.html';
        return;
    }

    // --- VARIÁVEIS DE ESTADO GLOBAIS ---
    let laboratorios = []; // Garante que a variável seja acessível por todas as funções no escopo
    let labSelecionadoId = null;
    let dataSelecionada = new Date();
    let miniCalendar;

    // --- ELEMENTOS DO DOM ---
    const loadingEl = document.getElementById('loading-page');
    const contentEl = document.getElementById('agenda-content');
    const emptyStateEl = document.getElementById('empty-state-container');
    const seletorContainer = document.getElementById('seletor-laboratorios');
    
    // --- FUNÇÕES ---

    // Função para carregar e ARMAZENAR os laboratórios
    async function carregarLaboratorios() {
        try {
            const dadosApi = await chamarAPI('/laboratorios');
            laboratorios = dadosApi || []; // **CORREÇÃO CRÍTICA: Atribui o resultado à variável de escopo superior**
            
            if (seletorContainer) {
                // A lógica de renderização que você já tem
            }
        } catch (error) {
            exibirAlerta('Erro ao carregar laboratórios.', 'danger');
            laboratorios = []; // Em caso de erro, garante que a lista esteja vazia
        }
    }
    
    // Função de inicialização principal
    async function inicializarPagina() {
        contentEl.style.display = 'none';
        emptyStateEl.style.display = 'none';
        loadingEl.style.display = 'block';

        await carregarLaboratorios();
        
        // A verificação agora funciona porque a variável 'laboratorios' foi atualizada
        if (laboratorios && laboratorios.length > 0) {
            // ... (resto da sua lógica para mostrar a agenda) ...
            loadingEl.style.display = 'none';
            contentEl.style.display = 'block';
        } else {
            loadingEl.style.display = 'none';
            emptyStateEl.style.display = 'block';
        }
    }

    // Chame a inicialização
    inicializarPagina();
    // ... (cole o resto das suas funções aqui: inicializarMiniCalendario, etc.)
});
