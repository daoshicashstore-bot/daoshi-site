// ============================================
// ⚙️ DASHBOARD CONFIG - DAOSHI STORE
// ============================================

// Sistema de Toast Notifications
function showToast(message, type = 'info') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.style.cssText = 'position:fixed;top:20px;right:20px;z-index:10000;display:flex;flex-direction:column;gap:10px;pointer-events:none;';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    const colors = {
        success: { bg: '#10b981', icon: '✓' },
        error: { bg: '#ef4444', icon: '✕' },
        warning: { bg: '#f59e0b', icon: '⚠' },
        info: { bg: '#3b82f6', icon: 'ℹ' }
    };
    const { bg, icon } = colors[type] || colors.info;

    toast.style.cssText = `
        background: ${bg}; color: white; padding: 12px 20px; border-radius: 8px;
        font-size: 14px; font-weight: 500; display: flex; align-items: center; gap: 10px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3); animation: slideIn 0.3s ease; pointer-events: auto;
    `;
    toast.innerHTML = `<span style="font-size:16px;">${icon}</span><span>${message}</span>`;

    if (!document.getElementById('toast-style')) {
        const style = document.createElement('style');
        style.id = 'toast-style';
        style.textContent = `
            @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
            @keyframes slideOut { from { transform: translateX(0); opacity: 1; } to { transform: translateX(100%); opacity: 0; } }
        `;
        document.head.appendChild(style);
    }

    container.appendChild(toast);
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease forwards';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

const GOLD_PROVIDERS = ['AMARELO', 'LBW', 'VACA', 'DW'];
const TOPUP_PROVIDERS = ['DOG', 'DAODAO', 'SOMBRA'];

let goldPriority = [];
let topupPriority = [];
let allOrders = {};
let providerLimits = {}; // Limites de pedidos por fornecedor

const DEFAULT_LIMIT = 3; // Limite padrão

// INICIALIZAÇÃO
document.addEventListener('DOMContentLoaded', async () => {
    if (window.db) {
        console.log('🔥 Firebase conectado com sucesso!');
        console.log('📍 Database URL:', window.db.ref().toString());

        // Carregar limites primeiro (aguardar)
        await loadProviderLimits();

        // Depois carregar prioridades e pedidos
        loadPriorities();
        loadOrders();

        // Carregar jogos desativados por fornecedor
        loadProviderDisabledGames();

        // Carregar configurações de rodízio
        loadRotationSettings();

        // Verificar conexão em tempo real
        window.db.ref('.info/connected').on('value', (snapshot) => {
            if (snapshot.val() === true) {
                console.log('✅ Conectado ao Firebase em tempo real');
            } else {
                console.log('❌ Desconectado do Firebase');
            }
        });
    } else {
        console.error('❌ Firebase não disponível!');
        showToast('ERRO: Firebase não carregou. Verifique sua conexão.', 'error');
    }
});

// ============================================
// 📊 CARREGAR LIMITES DOS FORNECEDORES
// ============================================
function loadProviderLimits() {
    return new Promise((resolve) => {
        window.db.ref('config/providerLimits').once('value', (snapshot) => {
            if (snapshot.exists()) {
                providerLimits = snapshot.val();
                console.log('✅ Limites carregados:', providerLimits);
            } else {
                // Criar limites padrão para todos os fornecedores
                const allProviders = [...GOLD_PROVIDERS, ...TOPUP_PROVIDERS];
                allProviders.forEach(p => providerLimits[p] = DEFAULT_LIMIT);
                window.db.ref('config/providerLimits').set(providerLimits);
                console.log('⚠️ Limites criados com padrão:', providerLimits);
            }
            resolve();
        }).catch(() => {
            // Se erro, usar padrões
            const allProviders = [...GOLD_PROVIDERS, ...TOPUP_PROVIDERS];
            allProviders.forEach(p => providerLimits[p] = DEFAULT_LIMIT);
            resolve();
        });
    });
}

function getProviderLimit(provider) {
    return providerLimits[provider] || DEFAULT_LIMIT;
}

function updateProviderLimit(provider, newLimit) {
    if (newLimit < 1) newLimit = 1;
    if (newLimit > 100) newLimit = 100;

    providerLimits[provider] = newLimit;

    window.db.ref(`config/providerLimits/${provider}`).set(newLimit)
        .then(() => {
            console.log(`✅ Limite de ${provider} atualizado para ${newLimit}`);
            showSuccessMessage(`Limite de ${provider}: ${newLimit} pedidos`);
            updateProviderStats();
        })
        .catch((error) => {
            console.error('❌ Erro ao salvar limite:', error);
        });
}

function loadPriorities() {
    console.log('📥 Carregando prioridades do Firebase...');

    // Carregar prioridade de Gold
    window.db.ref('config/goldPriority').once('value', (snapshot) => {
        if (snapshot.exists()) {
            goldPriority = snapshot.val();
            console.log('✅ Prioridade de Gold carregada:', goldPriority);
        } else {
            // Prioridade padrão
            goldPriority = ['AMARELO', 'LBW', 'VACA', 'DW'];
            console.log('⚠️ Prioridade de Gold não existe, criando padrão:', goldPriority);
            window.db.ref('config/goldPriority').set(goldPriority)
                .then(() => console.log('✅ Prioridade padrão de Gold salva'))
                .catch((error) => console.error('❌ Erro ao salvar padrão de Gold:', error));
        }
        renderGoldProviders();
    }).catch((error) => {
        console.error('❌ Erro ao carregar prioridade de Gold:', error);
        showToast('Erro ao carregar prioridades de Gold: ' + error.message, 'error');
    });

    // Carregar prioridade de Top Up
    window.db.ref('config/topupPriority').once('value', (snapshot) => {
        if (snapshot.exists()) {
            topupPriority = snapshot.val();
            console.log('✅ Prioridade de Top Up carregada:', topupPriority);
        } else {
            // Prioridade padrão
            topupPriority = ['DOG', 'DAODAO', 'SOMBRA'];
            console.log('⚠️ Prioridade de Top Up não existe, criando padrão:', topupPriority);
            window.db.ref('config/topupPriority').set(topupPriority)
                .then(() => console.log('✅ Prioridade padrão de Top Up salva'))
                .catch((error) => console.error('❌ Erro ao salvar padrão de Top Up:', error));
        }
        renderTopUpProviders();
    }).catch((error) => {
        console.error('❌ Erro ao carregar prioridade de Top Up:', error);
        showToast('Erro ao carregar prioridades de Top Up: ' + error.message, 'error');
    });
}

// ⚡ OTIMIZAÇÃO BANDA: usa listeners child_* em vez de on('value') na raiz.
// Antes: cada mudança em qualquer pedido baixava o nó orders inteiro (~11.5 MB).
// Agora: a consulta acompanha somente os pedidos pendentes usados neste painel.
function loadOrders() {
    // Este painel usa `allOrders` somente para contar pedidos pendentes por
    // fornecedor. Escutar a raiz baixava todo o historico (incluindo milhares
    // de concluidos) em cada abertura; a consulta filtrada preserva exatamente
    // a estatistica usada pela tela.
    const ordersRef = window.db.ref('orders').orderByChild('status').equalTo('pending');
    let pendingUpdate = null;

    const scheduleStats = () => {
        if (pendingUpdate) return;
        pendingUpdate = setTimeout(() => {
            pendingUpdate = null;
            updateProviderStats();
        }, 150);
    };

    // Handlers extraídos pra poder dar .off() depois (evitar vazamento Firebase).
    const addedHandler = (snap) => {
        allOrders[snap.key] = snap.val();
        scheduleStats();
    };
    const changedHandler = (snap) => {
        allOrders[snap.key] = snap.val();
        scheduleStats();
    };
    const removedHandler = (snap) => {
        delete allOrders[snap.key];
        scheduleStats();
    };
    ordersRef.on('child_added', addedHandler);
    ordersRef.on('child_changed', changedHandler);
    ordersRef.on('child_removed', removedHandler);

    // Cleanup ao fechar/recarregar a página.
    window.addEventListener('beforeunload', () => {
        try {
            ordersRef.off('child_added', addedHandler);
            ordersRef.off('child_changed', changedHandler);
            ordersRef.off('child_removed', removedHandler);
        } catch (_) {}
    });
}

// ============================================
// 🎨 RENDERIZAR FORNECEDORES
// ============================================
function renderGoldProviders() {
    const container = document.getElementById('gold-providers');
    container.innerHTML = '';

    console.log('🎨 Renderizando Gold Providers...');
    console.log('📊 Limites atuais:', providerLimits);

    goldPriority.forEach((provider, index) => {
        const pendingCount = countPendingOrders(provider, 'gold');
        const limit = getProviderLimit(provider);
        const isFirst = index === 0;
        const isFull = pendingCount >= limit;

        console.log(`  → ${provider}: ${pendingCount}/${limit}`);

        const item = document.createElement('div');
        item.className = 'provider-item' + (isFirst ? ' priority-first' : '');
        item.draggable = true;
        item.dataset.provider = provider;
        item.dataset.type = 'gold';

        item.innerHTML = `
            <div class="provider-left">
                <div class="provider-rank">${index + 1}</div>
                <span class="provider-name">${getProviderIcon(provider)} ${provider}</span>
                ${isFirst ? '<span class="provider-badge first">1ª PRIORIDADE</span>' : ''}
            </div>
            <div class="provider-right">
                <div class="status-badge ${isFull ? 'full' : 'available'}">
                    <span class="status-dot"></span>
                    ${pendingCount}/${limit} ${isFull ? 'CHEIO' : 'disponível'}
                </div>
                <div class="limit-control">
                    <button class="limit-btn minus" onclick="event.stopPropagation(); updateProviderLimit('${provider}', ${limit - 1})">−</button>
                    <span class="limit-value">${limit}</span>
                    <button class="limit-btn plus" onclick="event.stopPropagation(); updateProviderLimit('${provider}', ${limit + 1})">+</button>
                </div>
                <div class="drag-handle">☰</div>
            </div>
        `;

        setupDragAndDrop(item, 'gold');
        container.appendChild(item);
    });
}

function renderTopUpProviders() {
    const container = document.getElementById('topup-providers');
    container.innerHTML = '';

    topupPriority.forEach((provider, index) => {
        const pendingCount = countPendingOrders(provider, 'packs');
        const limit = getProviderLimit(provider);
        const isFirst = index === 0;
        const isFull = pendingCount >= limit;

        const item = document.createElement('div');
        item.className = 'provider-item topup-item' + (isFirst ? ' priority-first' : '');
        item.draggable = true;
        item.dataset.provider = provider;
        item.dataset.type = 'topup';

        // Gerar ícones de jogos exclusivos
        let exclusiveGamesHtml = '';
        EXCLUSIVE_TOPUP_GAMES.forEach(gameId => {
            const owner = getExclusiveOwner(gameId);
            const isOwner = owner === provider;
            const isLocked = owner && owner !== provider;
            const gameImg = GAME_IMAGES[gameId] || '';

            exclusiveGamesHtml += `
                <div class="exclusive-game-icon ${isOwner ? 'active' : ''} ${isLocked ? 'locked' : ''}" 
                     onclick="event.stopPropagation(); toggleExclusiveGame('${provider}', '${gameId}')"
                     title="${gameId.toUpperCase()}${isOwner ? ' (EXCLUSIVO)' : isLocked ? ` (com ${owner})` : ' (clique para ativar)'}">
                    <img src="${gameImg}" alt="${gameId}" onerror="this.src='https://i.imgur.com/7Dmdj3I.png'">
                    <div class="exclusive-dot ${isOwner ? 'enabled' : isLocked ? 'disabled' : 'available'}"></div>
                </div>
            `;
        });

        item.innerHTML = `
            <div class="provider-left">
                <div class="provider-rank">${index + 1}</div>
                <span class="provider-name">${getProviderIcon(provider)} ${provider}</span>
                ${isFirst ? '<span class="provider-badge first">1ª PRIORIDADE</span>' : ''}
                <div class="exclusive-games-row">${exclusiveGamesHtml}</div>
            </div>
            <div class="provider-right">
                <div class="status-badge ${isFull ? 'full' : 'available'}">
                    <span class="status-dot"></span>
                    ${pendingCount}/${limit} ${isFull ? 'CHEIO' : 'disponível'}
                </div>
                <div class="limit-control">
                    <button class="limit-btn minus" onclick="event.stopPropagation(); updateProviderLimit('${provider}', ${limit - 1})">−</button>
                    <span class="limit-value">${limit}</span>
                    <button class="limit-btn plus" onclick="event.stopPropagation(); updateProviderLimit('${provider}', ${limit + 1})">+</button>
                </div>
                <div class="drag-handle">☰</div>
            </div>
        `;

        setupDragAndDrop(item, 'topup');
        container.appendChild(item);
    });
}

function getProviderIcon(provider) {
    const icons = {
        'AMARELO': '🟡',
        'VACA': '🐄',
        'DW': '🔴',
        'LBW': '🔵',
        'DOG': '🐶',
        'DAODAO': '🟢',
        'SOMBRA': '🌑'
    };
    return icons[provider] || '📦';
}

function countPendingOrders(provider, type) {
    return Object.values(allOrders).filter(order =>
        order.status === 'pending' &&
        order.assignedProvider === provider &&
        order.gameType === type
    ).length;
}

function updateProviderStats() {
    renderGoldProviders();
    renderTopUpProviders();
}

// ============================================
// 🖱️ DRAG AND DROP
// ============================================
let draggedItem = null;

function setupDragAndDrop(item, type) {
    item.addEventListener('dragstart', (e) => {
        draggedItem = item;
        item.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
    });

    item.addEventListener('dragend', () => {
        item.classList.remove('dragging');
        draggedItem = null;
    });

    item.addEventListener('dragover', (e) => {
        e.preventDefault();
        const draggingItem = document.querySelector('.dragging');
        if (draggingItem && draggingItem.dataset.type === type) {
            const container = type === 'gold' ?
                document.getElementById('gold-providers') :
                document.getElementById('topup-providers');

            const afterElement = getDragAfterElement(container, e.clientY);
            if (afterElement == null) {
                container.appendChild(draggingItem);
            } else {
                container.insertBefore(draggingItem, afterElement);
            }
        }
    });
}

function getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('.provider-item:not(.dragging)')];

    return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;

        if (offset < 0 && offset > closest.offset) {
            return { offset: offset, element: child };
        } else {
            return closest;
        }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}

// ============================================
// 💾 SALVAR PRIORIDADES
// ============================================
function saveGoldPriority() {
    const container = document.getElementById('gold-providers');
    const items = container.querySelectorAll('.provider-item');

    goldPriority = Array.from(items).map(item => item.dataset.provider);

    console.log('💾 Salvando prioridade de Gold:', goldPriority);

    // Mostrar loading no botão
    const button = event.target;
    const originalText = button.innerHTML;
    button.innerHTML = '⏳ Salvando...';
    button.disabled = true;

    window.db.ref('config/goldPriority').set(goldPriority)
        .then(() => {
            console.log('✅ Prioridade de Gold salva com sucesso!');
            button.innerHTML = '✅ Salvo!';
            button.style.background = '#10b981';
            showSuccessMessage('Prioridade de Gold salva!');

            setTimeout(() => {
                button.innerHTML = originalText;
                button.disabled = false;
                button.style.background = '';
            }, 2000);

            renderGoldProviders();
        })
        .catch((error) => {
            console.error('❌ Erro ao salvar:', error);
            button.innerHTML = '❌ Erro';
            button.style.background = '#ef4444';
            showToast('Erro ao salvar: ' + error.message, 'error');

            setTimeout(() => {
                button.innerHTML = originalText;
                button.disabled = false;
                button.style.background = '';
            }, 2000);
        });
}

function saveTopUpPriority() {
    const container = document.getElementById('topup-providers');
    const items = container.querySelectorAll('.provider-item');

    topupPriority = Array.from(items).map(item => item.dataset.provider);

    console.log('💾 Salvando prioridade de Top Up:', topupPriority);

    // Mostrar loading no botão
    const button = event.target;
    const originalText = button.innerHTML;
    button.innerHTML = '⏳ Salvando...';
    button.disabled = true;

    window.db.ref('config/topupPriority').set(topupPriority)
        .then(() => {
            console.log('✅ Prioridade de Top Up salva com sucesso!');
            button.innerHTML = '✅ Salvo!';
            button.style.background = '#10b981';
            showSuccessMessage('Prioridade de Top Up salva!');

            setTimeout(() => {
                button.innerHTML = originalText;
                button.disabled = false;
                button.style.background = '';
            }, 2000);

            renderTopUpProviders();
        })
        .catch((error) => {
            console.error('❌ Erro ao salvar:', error);
            button.innerHTML = '❌ Erro';
            button.style.background = '#ef4444';
            showToast('Erro ao salvar: ' + error.message, 'error');

            setTimeout(() => {
                button.innerHTML = originalText;
                button.disabled = false;
                button.style.background = '';
            }, 2000);
        });
}

function showSuccessMessage(message) {
    const toast = document.getElementById('success-message');
    toast.textContent = '✅ ' + message;
    toast.classList.add('show');

    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// ============================================
// 🎮 SISTEMA DE JOGOS POR FORNECEDOR
// ============================================

// Imagens dos jogos (do constants.js do bot)
const GAME_IMAGES = {
    'mir4': 'https://i.imgur.com/XrXphs0.png',
    'nightcrows': 'https://i.imgur.com/LLGJGNI.png',
    'odin': 'https://i.imgur.com/aLsQf6y.png',
    'ymirpoints': 'https://i.imgur.com/Bna4U0c.png',
    'ymirloginesenha': 'https://i.imgur.com/Bna4U0c.png',
    'wemix': 'https://i.imgur.com/YTGq40y.png',
    'raven2': 'https://i.imgur.com/jgNSgdY.png',
    'rohan2': 'https://i.imgur.com/nZg3UYE.png',
    'genshin': 'https://i.imgur.com/Q1T1tta.png',
    'genshinloginesenha': 'https://i.imgur.com/Q1T1tta.png',
    'summonerswar': 'https://i.imgur.com/kav5I7I.png',
    'aion2': 'https://imgur.com/FIgYwIg.png',
    'wutheringwaves': 'https://imgur.com/Wtvw62C.png',
    'honkaistarrail': 'https://imgur.com/PfxqUwd.png',
    'zzz': 'https://imgur.com/O7eRfcx.png',
    'romgoldenage': 'https://imgur.com/6DUJFH5.png',
    'arknights': 'https://i.imgur.com/HLExT4R.png',
    'tsdsorigin': 'https://i.imgur.com/IMg7Z0p.png',
    'nteloginesenha': 'https://i.imgur.com/i9eTUHM.png',
    'rfonline': 'https://i.imgur.com/hud6OwA.png'
};

// Lista de todos os jogos REAIS do sistema (baseado em gameConfigs.js)
const ALL_GAMES = [
    { id: 'mir4', name: 'MIR4', types: ['gold', 'topup'] },
    { id: 'nightcrows', name: 'Nightcrows', types: ['topup', 'twd'] },
    { id: 'odin', name: 'Odin Valhalla Rising', types: ['topup'] },
    { id: 'ymirpoints', name: 'Ymir', types: ['topup', 'twd'] },
    { id: 'ymirloginesenha', name: 'Ymir Login e Senha', types: ['topup'] },
    { id: 'wemix', name: 'Wemix', types: ['conversion'] },
    { id: 'raven2', name: 'Raven II', types: ['topup'] },
    { id: 'rohan2', name: 'Rohan II', types: ['topup'] },
    { id: 'genshin', name: 'Genshin Impact', types: ['topup'] },
    { id: 'genshinloginesenha', name: 'GENSHIN LOGIN e SENHA', types: ['topup'] },
    { id: 'aion2', name: 'AION 2', types: ['topup'] },
    { id: 'wutheringwaves', name: 'Wuthering Waves UID', types: ['topup'] },
    { id: 'honkaistarrail', name: 'Honkai Star Rail', types: ['topup'] },
    { id: 'zzz', name: 'Zenless Zone Zero', types: ['topup'] },
    { id: 'romgoldenage', name: 'ROM Golden Age', types: ['topup'] },
    { id: 'summonerswar', name: 'Summoners War', types: ['topup'] },
    { id: 'arknights', name: 'Arknights Endfield', types: ['topup'] },
    { id: 'tsdsorigin', name: 'The Seven Deadly Sins: Origin', types: ['topup'] },
    { id: 'nteloginesenha', name: 'NTE: Neverness to Everness (login e senha)', types: ['topup'] },
    { id: 'rfonline', name: 'RF Online', types: ['topup'] }
];

// Jogos com EXCLUSIVIDADE para Top Up (apenas 1 fornecedor pode ter cada)
const EXCLUSIVE_TOPUP_GAMES = ['mir4', 'nightcrows', 'ymirpoints'];

// Jogos para fornecedores de GOLD (vendem gold/moeda)
const GOLD_GAMES = ALL_GAMES.filter(g => g.types.includes('gold'));

// Jogos para fornecedores de TOPUP (vendem packs/recarga)
const TOPUP_GAMES = ALL_GAMES.filter(g =>
    g.types.includes('topup') || g.types.includes('twd') || g.types.includes('conversion')
);

let providerDisabledGames = {};
let exclusiveGameAssignments = {}; // { mir4: 'DOG', nightcrows: 'DAODAO', ymirpoints: 'DAODAO' }

// Carregar jogos desativados do Firebase
function loadProviderDisabledGames() {
    // Refs e handlers extraídos pra poder dar .off() depois.
    const disabledGamesRef = window.db.ref('config/providerDisabledGames');
    const disabledGamesHandler = (snapshot) => {
        providerDisabledGames = snapshot.val() || {};
        console.log('🎮 Jogos desativados carregados:', providerDisabledGames);
        renderProviderGamesPanel();
    };
    disabledGamesRef.on('value', disabledGamesHandler);

    // Carregar exclusividades
    const exclusiveRef = window.db.ref('config/exclusiveGameAssignments');
    const exclusiveHandler = (snapshot) => {
        exclusiveGameAssignments = snapshot.val() || {};
        console.log('🔒 Exclusividades carregadas:', exclusiveGameAssignments);
        renderTopUpProviders(); // Re-renderizar para mostrar ícones
        renderProviderGamesPanel();
    };
    exclusiveRef.on('value', exclusiveHandler);

    // Cleanup ao fechar página
    window.addEventListener('beforeunload', () => {
        try {
            disabledGamesRef.off('value', disabledGamesHandler);
            exclusiveRef.off('value', exclusiveHandler);
        } catch (_) {}
    });
}

// Verificar se um jogo está habilitado para um provider
function isGameEnabledForProvider(provider, gameId) {
    const disabledGames = providerDisabledGames[provider] || [];
    return !disabledGames.includes(gameId);
}

// Verificar se um jogo exclusivo está atribuído a um fornecedor
function getExclusiveOwner(gameId) {
    return exclusiveGameAssignments[gameId] || null;
}

// Verificar se fornecedor pode ativar jogo exclusivo
function canProviderClaimExclusive(provider, gameId) {
    const currentOwner = getExclusiveOwner(gameId);
    // Pode se não tem dono ou se ele mesmo é o dono
    return !currentOwner || currentOwner === provider;
}

// Alternar exclusividade de jogo para fornecedor Top Up
function toggleExclusiveGame(provider, gameId) {
    const currentOwner = getExclusiveOwner(gameId);

    if (currentOwner === provider) {
        // Desativar exclusividade
        delete exclusiveGameAssignments[gameId];
        showSuccessMessage(`${gameId.toUpperCase()} removido de ${provider}`);
    } else if (!currentOwner) {
        // Ativar exclusividade
        exclusiveGameAssignments[gameId] = provider;
        showSuccessMessage(`${gameId.toUpperCase()} agora é exclusivo de ${provider}!`);
    } else {
        // Já tem dono, não pode pegar
        showToast(`${gameId.toUpperCase()} já está com ${currentOwner}!`, 'warning');
        return;
    }

    // Salvar no Firebase
    window.db.ref('config/exclusiveGameAssignments').set(exclusiveGameAssignments)
        .then(() => {
            console.log('✅ Exclusividades salvas:', exclusiveGameAssignments);
        })
        .catch((error) => {
            console.error('❌ Erro ao salvar exclusividades:', error);
            showToast('Erro ao salvar: ' + error.message, 'error');
        });
}

// Alternar estado do jogo para um provider
function toggleGameForProvider(provider, gameId) {
    let disabledGames = providerDisabledGames[provider] || [];

    if (disabledGames.includes(gameId)) {
        // Remover da lista de desativados (LIGAR)
        disabledGames = disabledGames.filter(g => g !== gameId);
        showSuccessMessage(`${gameId.toUpperCase()} LIGADO para ${provider}`);
    } else {
        // Adicionar à lista de desativados (DESLIGAR)
        disabledGames.push(gameId);
        showSuccessMessage(`${gameId.toUpperCase()} DESLIGADO para ${provider}`);
    }

    // Salvar no Firebase
    window.db.ref(`config/providerDisabledGames/${provider}`).set(disabledGames)
        .then(() => {
            console.log(`✅ Jogos de ${provider} atualizados:`, disabledGames);
        })
        .catch((error) => {
            console.error('❌ Erro ao salvar jogos:', error);
            showToast('Erro ao salvar: ' + error.message, 'error');
        });
}

// Renderizar painel de jogos por fornecedor
function renderProviderGamesPanel() {
    const container = document.getElementById('provider-games-grid');
    if (!container) return;

    container.innerHTML = '';

    // Renderizar fornecedores de Gold
    GOLD_PROVIDERS.forEach(provider => {
        const card = createProviderGamesCard(provider, 'gold');
        container.appendChild(card);
    });

    // Renderizar fornecedores de TopUp
    TOPUP_PROVIDERS.forEach(provider => {
        const card = createProviderGamesCard(provider, 'topup');
        container.appendChild(card);
    });
}

// Criar card de jogos para um fornecedor
function createProviderGamesCard(provider, type) {
    const card = document.createElement('div');
    card.className = 'provider-games-card';

    // Usar a lista correta baseada no tipo de fornecedor
    const games = type === 'gold' ? GOLD_GAMES : TOPUP_GAMES;

    let gamesHtml = '';
    games.forEach(game => {
        const isEnabled = isGameEnabledForProvider(provider, game.id);
        const gameImage = GAME_IMAGES[game.id] || 'https://i.imgur.com/7Dmdj3I.png';
        gamesHtml += `
            <div class="game-toggle" onclick="toggleGameForProvider('${provider}', '${game.id}')">
                <div class="game-info">
                    <img class="game-img" src="${gameImage}" alt="${game.name}" onerror="this.src='https://i.imgur.com/7Dmdj3I.png'">
                    <span class="game-name">${game.name}</span>
                </div>
                <div class="status-indicator ${isEnabled ? 'enabled' : 'disabled'}"></div>
            </div>
        `;
    });

    card.innerHTML = `
        <div class="provider-games-header">
            <span class="icon">${getProviderIcon(provider)}</span>
            <span class="name">${provider}</span>
            <span class="type-badge ${type === 'topup' ? 'topup' : ''}">${type === 'gold' ? 'GOLD' : 'TOP UP'}</span>
        </div>
        <div class="games-list">
            ${gamesHtml}
        </div>
    `;

    return card;
}

// ============================================
// 🔄 SISTEMA DE RODÍZIO (DOG/DAODAO)
// ============================================

function loadRotationSettings() {
    const rotationRef = window.db.ref('config/supplierRotationEnabled');
    const rotationHandler = (snapshot) => {
        const isEnabled = snapshot.val() === true;
        const toggle = document.getElementById('rotation-toggle');
        if (toggle) {
            toggle.checked = isEnabled;
            console.log('🔄 Rodízio carregado:', isEnabled);
        }
    };
    rotationRef.on('value', rotationHandler);
    window.addEventListener('beforeunload', () => {
        try { rotationRef.off('value', rotationHandler); } catch (_) {}
    });
}

function toggleRotation() {
    const toggle = document.getElementById('rotation-toggle');
    const isEnabled = toggle.checked;

    window.db.ref('config/supplierRotationEnabled').set(isEnabled)
        .then(() => {
            console.log('✅ Rodízio atualizado:', isEnabled);
            showSuccessMessage(isEnabled ? 'Rodízio ATIVADO' : 'Rodízio DESATIVADO');
        })
        .catch((error) => {
            console.error('❌ Erro ao atualizar rodízio:', error);
            showToast('Erro ao atualizar: ' + error.message, 'error');
            // Reverter em caso de erro
            toggle.checked = !isEnabled;
        });
}
