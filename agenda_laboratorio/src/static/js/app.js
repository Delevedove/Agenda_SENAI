// Arquivo JavaScript global para o Sistema de Agenda de Laboratório
// Contém funções de autenticação, manipulação de localStorage e utilitários

// Constantes globais
const API_URL = '/api';

// Funções de autenticação
/**
 * Realiza o login do usuário
 * @param {string} username - Nome de usuário
 * @param {string} senha - Senha do usuário
 * @returns {Promise} - Promise com o resultado do login
 */
async function realizarLogin(username, senha) {
    try {
        const response = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, senha })
        });

        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.erro || 'Erro ao realizar login');
        }
        
        // Armazena os dados do usuário no localStorage
        localStorage.setItem('token', data.token);
        localStorage.setItem('usuario', JSON.stringify(data.usuario));
        
        // Se for admin, redireciona para a tela de seleção de sistema
        if (data.usuario.tipo === 'admin') {
            window.location.href = '/selecao-sistema.html';
        } else {
            // Se for usuário comum, redireciona direto para o dashboard
            window.location.href = '/index.html';
        }
        
        return data;
    } catch (error) {
        console.error('Erro no login:', error);
        throw error;
    }
}

/**
 * Realiza o logout do usuário
 */
function realizarLogout() {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    window.location.href = '/admin-login.html';
}

/**
 * Verifica se o usuário está autenticado
 * @returns {boolean} - True se autenticado, false caso contrário
 */
function estaAutenticado() {
    return localStorage.getItem('token') !== null;
}

/**
 * Obtém os dados do usuário logado
 * @returns {Object|null} - Objeto com os dados do usuário ou null se não estiver autenticado
 */
function getUsuarioLogado() {
    const usuarioJSON = localStorage.getItem('usuario');
    return usuarioJSON ? JSON.parse(usuarioJSON) : null;
}

/**
 * Verifica se o usuário logado é administrador
 * @returns {boolean} - True se for administrador, false caso contrário
 */
function isAdmin() {
    const usuario = getUsuarioLogado();
    return usuario && usuario.tipo === 'admin';
}

/**
 * Redireciona para a página de login se o usuário não estiver autenticado
 */
function verificarAutenticacao() {
    if (!estaAutenticado()) {
        window.location.href = '/admin-login.html';
    }
}

/**
 * Verifica se o usuário tem permissão de administrador
 * Redireciona para o dashboard se não tiver
 */
function verificarPermissaoAdmin() {
    verificarAutenticacao();
    if (!isAdmin()) {
        window.location.href = '/index.html';
    }
}

// Funções para chamadas à API
/**
 * Realiza uma chamada à API com autenticação
 * @param {string} endpoint - Endpoint da API
 * @param {string} method - Método HTTP (GET, POST, PUT, DELETE)
 * @param {Object} body - Corpo da requisição (opcional)
 * @returns {Promise} - Promise com o resultado da chamada
 */
async function chamarAPI(endpoint, method = 'GET', body = null) {
    const token = localStorage.getItem('token');
    
    const headers = {
        'Content-Type': 'application/json'
    };
    
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    
    const options = {
        method,
        headers
    };
    
    if (body && (method === 'POST' || method === 'PUT')) {
        options.body = JSON.stringify(body);
    }
    
    try {
        const response = await fetch(`${API_URL}${endpoint}`, options);
        const data = await response.json();
        
        if (!response.ok) {
            // Se o erro for de autenticação, faz logout
            if (response.status === 401) {
                realizarLogout();
            }
            throw new Error(data.erro || `Erro ${response.status}`);
        }
        
        return data;
    } catch (error) {
        console.error(`Erro na chamada à API ${endpoint}:`, error);
        throw error;
    }
}

// Funções de formatação e utilidades
/**
 * Formata uma data no padrão brasileiro
 * @param {string} dataISO - Data em formato ISO
 * @returns {string} - Data formatada (DD/MM/YYYY)
 */
function formatarData(dataISO) {
    if (!dataISO) return '';
    const data = new Date(dataISO);
    return data.toLocaleDateString('pt-BR');
}

/**
 * Formata um horário no padrão 24h
 * @param {string} horario - Horário em formato HH:MM
 * @returns {string} - Horário formatado
 */
function formatarHorario(horario) {
    return horario;
}

/**
 * Exibe uma mensagem de alerta na página
 * @param {string} mensagem - Mensagem a ser exibida
 * @param {string} tipo - Tipo de alerta (success, danger, warning, info)
 * @param {string} containerId - ID do container onde o alerta será exibido
 */
function exibirAlerta(mensagem, tipo = 'info', containerId = 'alertContainer') {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${tipo} alert-dismissible fade show`;
    alertDiv.role = 'alert';
    
    alertDiv.innerHTML = `
        ${mensagem}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Fechar"></button>
    `;
    
    container.appendChild(alertDiv);
    
    // Remove o alerta após 5 segundos
    setTimeout(() => {
        alertDiv.classList.remove('show');
        setTimeout(() => alertDiv.remove(), 150);
    }, 5000);
}

/**
 * Adiciona o link para a página de Laboratórios e Turmas no menu
 * @param {string} containerSelector - Seletor CSS do container do menu
 * @param {boolean} isNavbar - Indica se é o menu da navbar ou sidebar
 */
function adicionarLinkLabTurmas(containerSelector, isNavbar = false) {
    const container = document.querySelector(containerSelector);
    if (!container) return;
    
    // Verifica se o link já existe para evitar duplicação
    const linkExistente = container.querySelector('a[href="/laboratorios-turmas.html"]');
    if (linkExistente) return;
    
    // Cria o elemento do link baseado no tipo de menu
    if (isNavbar) {
        // Para navbar (menu superior)
        const navItem = document.createElement('li');
        navItem.className = 'nav-item admin-only';
        
        const link = document.createElement('a');
        link.className = 'nav-link';
        link.href = '/laboratorios-turmas.html';
        link.innerHTML = '<i class="bi bi-building-gear me-1"></i> Laboratórios e Turmas';
        
        navItem.appendChild(link);
        
        // Insere antes do último item (dropdown do usuário)
        const lastItem = container.querySelector('.dropdown');
        if (lastItem) {
            container.insertBefore(navItem, lastItem);
        } else {
            container.appendChild(navItem);
        }
    } else {
        // Para sidebar (menu lateral)
        const link = document.createElement('a');
        link.className = 'nav-link admin-only';
        link.href = '/laboratorios-turmas.html';
        link.innerHTML = '<i class="bi bi-building-gear"></i> Laboratórios e Turmas';
        
        // Insere antes do último item (Meu Perfil)
        const lastItem = container.querySelector('a[href="/perfil.html"]');
        if (lastItem) {
            container.insertBefore(link, lastItem);
        } else {
            container.appendChild(link);
        }
    }
}

// Inicialização da página
document.addEventListener('DOMContentLoaded', function() {
    // Verifica autenticação em todas as páginas exceto login e registro
    const paginaAtual = window.location.pathname;
    if (paginaAtual !== '/admin-login.html' && paginaAtual !== '/register.html' && paginaAtual !== '/selecao-sistema.html') {
        verificarAutenticacao();
        
        // Páginas que requerem permissão de administrador
        if (paginaAtual === '/usuarios.html' || paginaAtual === '/laboratorios-turmas.html') {
            verificarPermissaoAdmin();
        }
        
        // Atualiza a interface com os dados do usuário
        atualizarInterfaceUsuario();
        
        // Adiciona o link para Laboratórios e Turmas nos menus se for admin
        if (isAdmin()) {
            // Adiciona no menu da navbar
            adicionarLinkLabTurmas('.navbar-nav.me-auto', true);
            
            // Adiciona no menu lateral (sidebar)
            adicionarLinkLabTurmas('.sidebar .nav.flex-column', false);
        }
    } else if (paginaAtual === '/selecao-sistema.html') {
        // Verifica se é admin para a tela de seleção de sistema
        verificarAutenticacao();
        verificarPermissaoAdmin();
    }
    
    // Configura o botão de logout
    const btnLogout = document.getElementById('btnLogout');
    if (btnLogout) {
        btnLogout.addEventListener('click', function(e) {
            e.preventDefault();
            realizarLogout();
        });
    }
});

/**
 * Atualiza elementos da interface com os dados do usuário logado
 */
function atualizarInterfaceUsuario() {
    const usuario = getUsuarioLogado();
    if (!usuario) return;
    
    // Atualiza o nome do usuário na navbar
    const userNameElement = document.getElementById('userName');
    if (userNameElement) {
        userNameElement.textContent = usuario.nome;
    }
    
    // Exibe ou oculta elementos baseado no tipo de usuário
    const adminElements = document.querySelectorAll('.admin-only');
    adminElements.forEach(element => {
        element.style.display = isAdmin() ? '' : 'none';
    });
    
    // Carrega notificações no dashboard
    if (window.location.pathname === '/index.html') {
        carregarNotificacoes();
    }
}

/**
 * Carrega notificações do usuário para exibição no dashboard
 */
async function carregarNotificacoes() {
    const notificacoesContainer = document.getElementById('notificacoesContainer');
    if (!notificacoesContainer) return;
    
    try {
        const notificacoes = await chamarAPI('/notificacoes');
        
        if (notificacoes.length === 0) {
            notificacoesContainer.innerHTML = '<p class="text-muted">Nenhuma notificação disponível.</p>';
            return;
        }
        
        let html = '';
        notificacoes.forEach(notificacao => {
            const classeNotificacao = notificacao.lida ? 'bg-light' : 'bg-info bg-opacity-10';
            html += `
                <div class="card mb-2 ${classeNotificacao}">
                    <div class="card-body">
                        <p class="card-text">${notificacao.mensagem}</p>
                        <p class="card-text"><small class="text-muted">
                            ${formatarData(notificacao.data_criacao)}
                        </small></p>
                        ${!notificacao.lida ? `
                            <button class="btn btn-sm btn-outline-primary marcar-lida" 
                                data-id="${notificacao.id}">Marcar como lida</button>
                        ` : ''}
                    </div>
                </div>
            `;
        });
        
        notificacoesContainer.innerHTML = html;
        
        // Adiciona event listeners para os botões de marcar como lida
        document.querySelectorAll('.marcar-lida').forEach(btn => {
            btn.addEventListener('click', async function() {
                const id = this.getAttribute('data-id');
                try {
                    await chamarAPI(`/notificacoes/${id}/marcar-lida`, 'PUT');
                    // Recarrega as notificações
                    carregarNotificacoes();
                } catch (error) {
                    exibirAlerta('Erro ao marcar notificação como lida', 'danger');
                }
            });
        });
    } catch (error) {
        notificacoesContainer.innerHTML = '<p class="text-danger">Erro ao carregar notificações.</p>';
    }
}

/**
 * Carrega laboratórios do sistema para uso em filtros e formulários
 * @returns {Promise<Array>} - Promise com a lista de laboratórios
 */
async function carregarLaboratoriosParaFiltro(seletorElemento) {
    const selectElement = document.querySelector(seletorElemento);
    if (!selectElement) return [];
    
    try {
        const laboratorios = await chamarAPI('/laboratorios');
        
        // Mantém a opção "Todos"
        let html = '<option value="">Todos</option>';
        
        // Adiciona as opções de laboratórios
        laboratorios.forEach(lab => {
            html += `<option value="${lab.nome}">${lab.nome}</option>`;
        });
        
        selectElement.innerHTML = html;
        return laboratorios;
    } catch (error) {
        console.error('Erro ao carregar laboratórios para filtro:', error);
        return [];
    }
}

// Adiciona um observador de mutação para garantir que os links admin sejam adicionados
// mesmo quando o DOM é modificado dinamicamente
document.addEventListener('DOMContentLoaded', function() {
    if (isAdmin()) {
        // Configura o observador para a navbar
        const navbarObserver = new MutationObserver(function(mutations) {
            adicionarLinkLabTurmas('.navbar-nav.me-auto', true);
        });
        
        const navbar = document.querySelector('.navbar-nav.me-auto');
        if (navbar) {
            navbarObserver.observe(navbar, { childList: true, subtree: true });
        }
        
        // Configura o observador para a sidebar
        const sidebarObserver = new MutationObserver(function(mutations) {
            adicionarLinkLabTurmas('.sidebar .nav.flex-column', false);
        });
        
        const sidebar = document.querySelector('.sidebar .nav.flex-column');
        if (sidebar) {
            sidebarObserver.observe(sidebar, { childList: true, subtree: true });
        }
    }
});
