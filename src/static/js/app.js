// Arquivo JavaScript global para o Sistema de Agenda de Laboratório
// Contém funções de autenticação, manipulação de localStorage e utilitários

// Constantes globais
const API_URL = '/api';

/**
 * Escapes HTML special characters to prevent XSS attacks.
 * @param {string} str - Text to escape
 * @returns {string} - Escaped HTML string
 */
function escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = String(str);
    return div.innerHTML;
}

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
        if (data.refresh_token) {
            localStorage.setItem('refresh_token', data.refresh_token);
        }
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
    const refresh = localStorage.getItem('refresh_token');
    if (refresh) {
        fetch(`${API_URL}/logout`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refresh_token: refresh })
        }).catch(() => {});
    }
    localStorage.removeItem('token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('usuario');
    window.location.href = '/admin-login.html';
}

/**
 * Verifica se o usuário está autenticado
 * @returns {boolean} - True se autenticado, false caso contrário
 */
function getToken() {
    return localStorage.getItem('token');
}

function getRefreshToken() {
    return localStorage.getItem('refresh_token');
}

async function tentarAtualizarToken() {
    const refresh = getRefreshToken();
    if (!refresh) return false;
    try {
        const resp = await fetch(`${API_URL}/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refresh_token: refresh })
        });
        if (!resp.ok) {
            return false;
        }
        const data = await resp.json();
        if (data.token) {
            localStorage.setItem('token', data.token);
            return true;
        }
        return false;
    } catch (e) {
        return false;
    }
}

function estaAutenticado() {
    return getToken() !== null;
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
        return false;
    }
    return true;
}

/**
 * Verifica se o usuário tem permissão de administrador
 * Redireciona para o dashboard se não tiver
 */
function verificarPermissaoAdmin() {
    if (!verificarAutenticacao()) return false;

    if (!isAdmin()) {
        alert('Acesso não autorizado');
        window.location.href = '/index.html';
        return false;
    }
    return true;
}

// Funções para chamadas à API
/**
 * Realiza uma chamada à API com autenticação
 * @param {string} endpoint - Endpoint da API
 * @param {string} method - Método HTTP (GET, POST, PUT, DELETE)
 * @param {Object} body - Corpo da requisição (opcional)
 * @returns {Promise} - Promise com o resultado da chamada
 */
async function chamarAPI(endpoint, method = 'GET', body = null, requerAuth = true) {
    const headers = {
        'Content-Type': 'application/json'
    };

    if (requerAuth) {
        const token = getToken();
        if (!token) {
            console.error('Token não encontrado. Redirecionando para login...');
            realizarLogout();
            throw new Error('Não autenticado');
        }
        headers['Authorization'] = `Bearer ${token}`;
    }
    
    // Garante que o endpoint comece com /
    const endpointFormatado = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const url = `${API_URL}${endpointFormatado}`;
    
    console.log(`Chamando API: ${url}`);
    
    const options = {
        method,
        headers
    };
    
    if (body && (method === 'POST' || method === 'PUT')) {
        options.body = JSON.stringify(body);
    }
    
    try {
        let response = await fetch(url, options);

        if (response.status === 401 && requerAuth) {
            const atualizado = await tentarAtualizarToken();
            if (atualizado) {
                headers['Authorization'] = `Bearer ${getToken()}`;
                response = await fetch(url, { ...options, headers });
            }
        }

        if (response.status === 401) {
            console.error('Usuário não está logado. Redirecionando para login...');
            realizarLogout();
            throw new Error('Não autenticado');
        }
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.erro || `Erro ${response.status}`);
        }
        
        return data;
    } catch (error) {
        console.error(`Erro na chamada à API ${url}:`, error);
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
    if (!horario) return '';

    // Se já estiver no formato correto HH:MM, apenas normaliza zeros à esquerda
    const partes = horario.split(':');
    if (partes.length === 2) {
        const horas = parseInt(partes[0], 10);
        const minutos = parseInt(partes[1], 10);

        if (!isNaN(horas) && !isNaN(minutos)) {
            const h = String(horas).padStart(2, '0');
            const m = String(minutos).padStart(2, '0');
            return `${h}:${m}`;
        }
    }

    // Caso não seja possível formatar, retorna original
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

    alertDiv.textContent = mensagem;
    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'btn-close';
    closeBtn.setAttribute('data-bs-dismiss', 'alert');
    closeBtn.setAttribute('aria-label', 'Fechar');
    alertDiv.appendChild(closeBtn);

    container.appendChild(alertDiv);
    
    // Remove o alerta após 5 segundos
    setTimeout(() => {
        alertDiv.classList.remove('show');
        setTimeout(() => alertDiv.remove(), 150);
    }, 5000);
}

/**
 * Retorna a classe CSS correspondente ao turno
 * @param {string} turno - Nome do turno (Manhã, Tarde, Noite)
 * @returns {string} - Nome da classe CSS
 */
function getClasseTurno(turno) {
    switch (turno) {
        case 'Manhã':
            return 'agendamento-manha';
        case 'Tarde':
            return 'agendamento-tarde';
        case 'Noite':
            return 'agendamento-noite';
        default:
            return '';
    }
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
        link.innerHTML = '<i class="bi bi-building me-1"></i> Laboratórios e Turmas';
        
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
        link.innerHTML = '<i class="bi bi-building"></i> Laboratórios e Turmas';
        
        // Insere antes do último item (Meu Perfil)
        const lastItem = container.querySelector('a[href="/perfil.html"], a[href="/perfil-salas.html"], a[href="/perfil-usuarios.html"]');
        if (lastItem) {
            container.insertBefore(link, lastItem);
        } else {
            container.appendChild(link);
        }
    }
}

/**
 * Adiciona ao menu do usuário um botão para retornar à tela de seleção de sistema
 */
function adicionarBotaoSelecaoSistema() {
    if (!isAdmin()) return;

    document.querySelectorAll('.dropdown-menu').forEach(menu => {
        // Evita duplicação do botão
        if (menu.querySelector('a[href="/selecao-sistema.html"]')) return;

        const li = document.createElement('li');
        li.className = 'admin-only';

        const link = document.createElement('a');
        link.className = 'dropdown-item';
        link.href = '/selecao-sistema.html';
        link.innerHTML = '<i class="bi bi-arrow-return-left me-2"></i> Retornar à tela de seleção de sistema';

        li.appendChild(link);

        const logoutLink = menu.querySelector('#btnLogout') || menu.querySelector('a[onclick="realizarLogout()"]');
        if (logoutLink && logoutLink.parentElement) {
            menu.insertBefore(li, logoutLink.parentElement);
        } else {
            menu.appendChild(li);
        }
    });
}

// Inicialização da página
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM carregado. Página atual:', window.location.pathname);
    
    // Verifica autenticação em todas as páginas exceto login e registro
    const paginaAtual = window.location.pathname;
    
    // Configura o botão de logout em todas as páginas
    const btnLogout = document.getElementById('btnLogout');
    if (btnLogout) {
        btnLogout.addEventListener('click', function(e) {
            e.preventDefault();
            realizarLogout();
        });
    }
    
    if (paginaAtual === '/admin-login.html' || paginaAtual === '/register.html') {
        console.log('Página de login ou registro. Não verificando autenticação.');
        return;
    }
    
    // Verifica se o usuário está autenticado
    if (!verificarAutenticacao()) {
        console.log('Usuário não autenticado. Redirecionando para login...');
        return;
    }
    
    // Verifica se é a página de seleção de sistema
    if (paginaAtual === '/selecao-sistema.html') {
        console.log('Página de seleção de sistema. Verificando permissão de admin...');
        if (!verificarPermissaoAdmin()) {
            console.log('Usuário não é admin. Redirecionando para dashboard...');
            return;
        }
        console.log('Usuário é admin. Permanecendo na página de seleção de sistema.');
        return;
    }
    
    // Páginas que requerem permissão de administrador
    if (paginaAtual === '/usuarios.html' || paginaAtual === '/laboratorios-turmas.html') {
        console.log('Página restrita a administradores. Verificando permissão...');
        if (!verificarPermissaoAdmin()) {
            console.log('Usuário não é admin. Redirecionando para dashboard...');
            return;
        }
    }
    
    console.log('Atualizando interface do usuário...');
    // Adiciona o botão de retorno para admins
    adicionarBotaoSelecaoSistema();

    // Atualiza a interface com os dados do usuário
    atualizarInterfaceUsuario();
    
    // Adiciona o link para Laboratórios e Turmas somente no módulo de Agenda
    if (isAdmin()) {
        const paginasOcupacao = [
            '/dashboard-salas.html',
            '/calendario-salas.html',
            '/gerenciar-salas.html',
            '/gerenciar-instrutores.html',
            '/novo-agendamento-sala.html',
            '/perfil-salas.html',
            '/usuarios.html',
            '/perfil.html',
            '/perfil-usuarios.html',
            '/gerenciar-turmas.html'
        ];

        if (!paginasOcupacao.includes(paginaAtual)) {
            console.log('Usuário é admin. Adicionando links para Laboratórios e Turmas...');
            // Adiciona no menu da navbar
            adicionarLinkLabTurmas('.navbar-nav.me-auto', true);

            // Adiciona no menu lateral (sidebar)
            adicionarLinkLabTurmas('.sidebar .nav.flex-column', false);

            // Configura observadores para garantir que os links sejam adicionados mesmo após modificações no DOM
            configurarObservadoresMenu();
        }
    }
});

/**
 * Configura observadores de mutação para garantir que os links admin sejam adicionados
 * mesmo quando o DOM é modificado dinamicamente
 */
function configurarObservadoresMenu() {
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

// Exporta dados genéricos (CSV, PDF ou XLSX)
async function exportarDados(endpoint, formato, nomeArquivo) {
    try {
        const response = await fetch(`${API_URL}${endpoint}?formato=${formato}`, {
            headers: { 'Authorization': `Bearer ${getToken()}` }
        });
        if (!response.ok) {
            throw new Error('Erro ao exportar dados');
        }
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${nomeArquivo}.${formato}`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
    } catch (error) {
        console.error('Erro ao exportar dados:', error);
        exibirAlerta('Falha ao exportar dados', 'danger');
    }
}
