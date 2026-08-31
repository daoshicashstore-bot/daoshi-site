// ============================================
// 🌐 DASHBOARD FORNECEDOR - DAOSHI STORE
// Template usado por todos os fornecedores
// ============================================

// Garantir que axios está disponível
function ensureAxios() {
    return new Promise((resolve) => {
        if (typeof axios !== 'undefined') {
            resolve();
        } else {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/axios/dist/axios.min.js';
            script.onload = () => resolve();
            document.head.appendChild(script);
        }
    });
}

// Aguardar axios carregar
(async () => {
    await ensureAxios();
    console.log('✅ Axios carregado');
})();

// MAPEAMENTO DE JOGOS
const GAME_NAMES_CN = {
    'mir4': 'MIR4 (传奇4)',
    'nightcrows': 'Nightcrows (夜鸦)',
    'odin': 'Odin Valhalla Rising (奥丁)',
    'wemix': 'Wemix (维米克斯)',
    'raven2': 'Raven II (乌鸦2)',
    'rohan2': 'Rohan II (罗汉2)',
    'genshin': 'Genshin Impact (原神)',
    'summonerswar': 'Summoners War (魔灵召唤)',
    'aion2': 'AION 2 (永恒之塔2)',
    'wutheringwaves': 'Wuthering Waves (鸣潮)',
    'honkaistarrail': 'Honkai Star Rail (崩坏：星穹铁道)',
    'zzz': 'Zenless Zone Zero (绝区零)',
    'romgoldenage': 'ROM Golden Age (仙境传说)'
};

const GAME_ICONS = {
    'mir4': '⚔️', 'nightcrows': '🦅', 'odin': '🛡️',
    'wemix': '💎', 'raven2': '🐦', 'rohan2': '🗡️', 'genshin': '🌸',
    'summonerswar': '👹', 'aion2': '🦋', 'wutheringwaves': '🌊',
    'honkaistarrail': '🚂', 'zzz': '🎮', 'romgoldenage': '🏰'
};

const GAME_IMAGES = {
    'mir4': 'https://i.imgur.com/XrXphs0.png',
    'nightcrows': 'https://i.imgur.com/LLGJGNI.png',
    'odin': 'https://i.imgur.com/aLsQf6y.png',
    'wemix': 'https://i.imgur.com/YTGq40y.png',
    'raven2': 'https://i.imgur.com/jgNSgdY.png',
    'rohan2': 'https://i.imgur.com/nZg3UYE.png',
    'genshin': 'https://i.imgur.com/Q1T1tta.png',
    'summonerswar': 'https://i.imgur.com/kav5I7I.png',
    'aion2': 'https://i.imgur.com/tX10TIL.png',
    'wutheringwaves': 'https://i.imgur.com/zfzGI4x.png',
    'honkaistarrail': 'https://i.imgur.com/1XB7OhJ.png',
    'zzz': 'https://i.imgur.com/c82IUtg.png',
    'romgoldenage': 'https://i.imgur.com/tgdkTPb.png'
};

let allOrders = {};
let notifiedOrders = new Set();
let currentLang = 'cn';
let providerOrderCounter = 0;
let alertInterval = null;
let audioAlert = null;
// PROVIDER_NAME é definido no HTML de cada dashboard

// ============================================
// 🔔 TOAST NOTIFICATION SYSTEM
// ============================================
function showToast(message, type = 'success', duration = 3000) {
    // Criar container se não existir
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10000;
            display: flex;
            flex-direction: column;
            gap: 10px;
            pointer-events: none;
        `;
        document.body.appendChild(container);
    }
    
    // Criar toast
    const toast = document.createElement('div');
    const icons = {
        success: '✅',
        error: '❌',
        warning: '⚠️',
        info: 'ℹ️'
    };
    const colors = {
        success: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
        error: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
        warning: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
        info: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)'
    };
    
    toast.style.cssText = `
        background: ${colors[type] || colors.info};
        color: white;
        padding: 12px 20px;
        border-radius: 10px;
        box-shadow: 0 4px 15px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        gap: 10px;
        font-size: 14px;
        font-weight: 500;
        pointer-events: auto;
        animation: slideIn 0.3s ease;
        max-width: 350px;
    `;
    
    toast.innerHTML = `<span style="font-size: 18px;">${icons[type] || icons.info}</span><span>${message}</span>`;
    
    // Adicionar animação CSS se não existir
    if (!document.getElementById('toast-styles')) {
        const style = document.createElement('style');
        style.id = 'toast-styles';
        style.textContent = `
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            @keyframes slideOut {
                from { transform: translateX(0); opacity: 1; }
                to { transform: translateX(100%); opacity: 0; }
            }
        `;
        document.head.appendChild(style);
    }
    
    container.appendChild(toast);
    
    // Remover após duração
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

// Inicializar áudio
function initAudio() {
    if (!audioAlert) {
        audioAlert = new Audio('../sounds/alerta.mp3');
        audioAlert.volume = 0.7;
    }
}

// FUNÇÃO: OBTER PRÓXIMO ID DO FORNECEDOR
// ⚡ OTIMIZAÇÃO BANDA: usa o `allOrders` em memória (já populado pelo listener
// child_*) em vez de fazer once('value') na raiz orders (~11.5 MB por chamada).
async function getNextProviderId(orderId) {
    try {
        let maxId = -1;
        Object.values(allOrders).forEach(order => {
            if (order && order.assignedProvider === PROVIDER_NAME && order.providerId) {
                const numericId = parseInt(order.providerId);
                if (!isNaN(numericId) && numericId > maxId) {
                    maxId = numericId;
                }
            }
        });

        const nextId = maxId + 1;
        const providerId = String(nextId).padStart(5, '0');

        await window.db.ref('orders').child(orderId).update({ providerId });

        console.log(`🏷️ ID gerado para ${PROVIDER_NAME}: ${providerId}`);

        return providerId;
    } catch (error) {
        console.error('❌ Erro ao obter próximo ID:', error);
        return '00000';
    }
}

// FUNÇÃO: OBTER ID DO PEDIDO PARA ESTE FORNECEDOR
function getProviderOrderId(order) {
    // Retornar providerId se existir, senão retornar placeholder
    return order.providerId || '00000';
}

// FUNÇÃO: DIVIDIR GOLD EM PARTES ALEATÓRIAS
function divideGoldIntoParts(totalGold) {
    if (totalGold < 10000) {
        return [totalGold];
    }
    
    const numParts = Math.floor(totalGold / 10000) * 2;
    const parts = [];
    let remaining = totalGold;
    
    for (let i = 0; i < numParts - 1; i++) {
        const half = remaining / (numParts - i);
        const variation = half * 0.03;
        const randomVariation = (Math.random() * 2 - 1) * variation;
        const partAmount = Math.floor(half + randomVariation);
        
        parts.push(partAmount);
        remaining -= partAmount;
    }
    
    parts.push(remaining);
    return parts;
}

const translations = {
    cn: {
        title: '订单面板',
        subtitle: '实时订单管理系统',
        pending: '待处理',
        processing: '处理中',
        completed: '已完成',
        orderNumber: '订单号',
        cart: '购物车',
        account: '账户信息',
        attachments: '附件',
        requestPhone: '请求身份验证',
        requestCode: '请求短信验证码',
        complete: '完成订单',
        cancel: '取消订单',
        goldOrder: '金币订单',
        packOrder: '礼包订单',
        login: '登录',
        password: '密码',
        server: '服务器',
        nickname: '昵称',
        sendNumber: '发送验证码',
        sendCodeSection: '发送验证码给客户',
        responseReceived: '客户确认收到',
        authNumber: '验证器号码',
        smsCode: '短信验证码',
        goldDivision: '金币分配',
        totalWithFee: '总计（含手续费）',
        announcement: '公告',
        uid: 'UID',
        loginMethod: '登录方式'
    },
    pt: {
        title: 'Painel de Pedidos',
        subtitle: 'Sistema de Gerenciamento em Tempo Real',
        pending: 'Pendente',
        processing: 'Processando',
        completed: 'Concluído',
        orderNumber: 'Número do Pedido',
        cart: 'Carrinho',
        account: 'Informações da Conta',
        attachments: 'Anexos',
        requestPhone: 'Solicitar Autenticação',
        requestCode: 'Solicitar Código SMS',
        complete: 'Completar Pedido',
        cancel: 'Cancelar Pedido',
        goldOrder: 'Pedido de Gold',
        packOrder: 'Pedido de Pacote',
        login: 'Login',
        password: 'Senha',
        server: 'Servidor',
        nickname: 'Apelido',
        sendNumber: 'Enviar Código',
        sendCodeSection: 'Enviar Código ao Cliente',
        responseReceived: 'Cliente confirmou recebimento',
        authNumber: 'Número do Autenticador',
        smsCode: 'Código SMS',
        goldDivision: 'Divisão de Gold',
        totalWithFee: 'Total (com taxa)',
        announcement: 'Anúncio',
        uid: 'UID',
        loginMethod: 'Método de Login'
    }
};

// INICIALIZAÇÃO
document.addEventListener('DOMContentLoaded', async () => {
    // Garantir que axios está carregado
    await ensureAxios();
    
    if (window.db) {
        console.log(`✅ Firebase conectado ao dashboard ${PROVIDER_NAME}`);
        loadOrders();
        loadProviderGames(); // Carregar jogos habilitados/desabilitados
        setInterval(updateStats, 1000);
        
        // Ativar botão de idioma
        const langToggleBtn = document.getElementById('lang-toggle-btn');
        if (langToggleBtn) {
            langToggleBtn.addEventListener('click', toggleLanguage);
        }
        
        // Solicitar permissão para notificações
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }
    } else {
        console.error('❌ Firebase não disponível!');
    }
});

// CARREGAR PEDIDOS
// ⚡ OTIMIZAÇÃO BANDA: usa listeners child_* em vez de on('value') na raiz.
// Antes: cada mudança em qualquer pedido baixava o nó orders inteiro (~11.5 MB).
// Agora: load inicial baixa tudo uma vez, updates só trazem o pedido alterado.
function loadOrders() {
    const ordersRef = window.db.ref('orders');
    let initialLoadDone = false;
    let pendingRender = null;

    const scheduleRender = () => {
        if (pendingRender) return;
        pendingRender = setTimeout(() => {
            pendingRender = null;
            renderOrders();
            updateStats();
            if (initialLoadDone) checkNewOrders();
        }, 150);
    };

    setTimeout(() => {
        initialLoadDone = true;
        console.log(`📦 Initial load completo: ${Object.keys(allOrders).length} pedidos`);
    }, 2000);

    ordersRef.on('child_added', (snap) => {
        allOrders[snap.key] = snap.val();
        if (!initialLoadDone) notifiedOrders.add(snap.key);
        scheduleRender();
    });

    ordersRef.on('child_changed', (snap) => {
        allOrders[snap.key] = snap.val();
        scheduleRender();
    });

    ordersRef.on('child_removed', (snap) => {
        delete allOrders[snap.key];
        scheduleRender();
    });
}

// CONTROLAR ALERTA SONORO
function startAlert() {
    if (alertInterval) return; // Já está tocando
    
    initAudio();
    
    // Tentar tocar áudio
    audioAlert.play().then(() => {
        audioEnabled = true;
        console.log('🔊 Áudio tocando');
    }).catch(e => {
        // Se falhar, mostrar botão para usuário habilitar
        if (!audioEnabled) {
            const permBtn = document.getElementById('audio-permission');
            if (permBtn) permBtn.style.display = 'block';
        }
        console.log('⚠️ Áudio bloqueado - clique no botão para habilitar');
    });
    
    // Tocar a cada 5 segundos
    alertInterval = setInterval(() => {
        if (audioEnabled) {
            audioAlert.play().catch(e => console.log('Áudio bloqueado'));
        }
    }, 5000);
    
    console.log('🔔 Alerta sonoro iniciado');
}

function stopAlert() {
    if (alertInterval) {
        clearInterval(alertInterval);
        alertInterval = null;
        console.log('🔇 Alerta sonoro parado');
    }
}

// FILTRAR HISTÓRICO
function filterHistory(searchTerm) {
    const ordersContainer = document.getElementById('history-orders');
    if (!ordersContainer) {
        console.warn('⚠️ history-orders não encontrado');
        return;
    }
    
    const cards = ordersContainer.querySelectorAll('.order-card');
    const term = searchTerm.toLowerCase().trim();
    
    if (!term) {
        // Se vazio, mostrar todos
        cards.forEach(card => card.style.display = 'block');
        return;
    }
    
    cards.forEach(card => {
        const orderId = card.getAttribute('data-order-id') || '';
        const providerId = card.getAttribute('data-provider-id') || '';
        const userId = card.getAttribute('data-user-id') || '';
        const login = card.getAttribute('data-login') || '';
        const password = card.getAttribute('data-password') || '';
        const email = card.getAttribute('data-email') || '';
        
        if (orderId.toLowerCase().includes(term) || 
            providerId.toLowerCase().includes(term) || 
            userId.toLowerCase().includes(term) ||
            login.toLowerCase().includes(term) ||
            password.toLowerCase().includes(term) ||
            email.toLowerCase().includes(term)) {
            card.style.display = 'block';
        } else {
            card.style.display = 'none';
        }
    });
}

// SKIP DE PEDIDO (PERGUNTAR CLIENTE SE ESTÁ AÍ)
function skipOrder(orderId) {
    const confirmMsg = currentLang === 'cn' ? 
        '确定要跳过此订单并询问客户是否在线吗？' : 
        'Tem certeza que deseja pular este pedido e perguntar ao cliente se está aí?';
    
    if (!confirm(confirmMsg)) return;
    
    // Enviar comando ao bot usando o mesmo padrão de botCommand
    window.db.ref(`orders/${orderId}/botCommand`).set({
        type: 'askIfPresent',
        timestamp: Date.now(),
        provider: PROVIDER_NAME,
        processed: false
    })
    .then(() => {
        console.log(`⏭️ Comando Skip enviado para pedido ${orderId}`);
        
        // Também marcar como skipped
        return window.db.ref(`orders/${orderId}`).update({ 
            skipped: true,
            skippedAt: Date.now(),
            skippedBy: PROVIDER_NAME
        });
    })
    .then(() => {
        showToast(currentLang === 'cn' ? '订单已跳过，正在询问客户...' : 'Pedido pulado, perguntando ao cliente...', 'success');
    })
    .catch(error => {
        console.error('❌ Erro ao pular pedido:', error);
        showToast('Erro ao pular pedido', 'error');
    });
}

// REATIVAR PEDIDO
function reactivateOrder(orderId) {
    const confirmMsg = currentLang === 'cn' ? 
        '确定要重新激活此订单吗？' : 
        'Tem certeza que deseja reativar este pedido?';
    
    if (!confirm(confirmMsg)) return;
    
    window.db.ref(`orders/${orderId}`).update({ 
        skipped: false,
        skippedAt: null,
        skippedBy: null,
        reactivatedAt: Date.now(),
        reactivatedBy: PROVIDER_NAME
    })
    .then(() => {
        console.log(`▶️ Pedido ${orderId} reativado`);
        showToast(currentLang === 'cn' ? '订单已重新激活' : 'Pedido reativado!', 'success');
    })
    .catch(error => {
        console.error('❌ Erro ao reativar pedido:', error);
        showToast('Erro ao reativar pedido', 'error');
    });
}

// SOLICITAR CONFIRMAÇÃO DE LOGIN (PACOTES)
function requestLoginConfirmation(orderId) {
    const confirmMsg = currentLang === 'cn' ? 
        '确定要请求客户确认登录吗？' : 
        'Tem certeza que deseja solicitar confirmação de login ao cliente?';
    
    if (!confirm(confirmMsg)) return;
    
    // Enviar comando ao bot do Discord via pedido
    window.db.ref(`orders/${orderId}/botCommand`).set({
        type: 'confirmLogin',
        timestamp: Date.now(),
        provider: PROVIDER_NAME,
        processed: false
    })
    .then(() => {
        console.log(`📱 Solicitação de confirmação enviada para ${orderId}`);
        showToast(currentLang === 'cn' ? '已发送确认请求' : 'Solicitação enviada ao cliente!', 'success');
    })
    .catch(error => {
        console.error('❌ Erro ao solicitar confirmação:', error);
        showToast('Erro ao enviar solicitação', 'error');
    });
}

// SOLICITAR ACEITAÇÃO NO CELULAR
function requestAcceptanceConfirmation(orderId) {
    const confirmMsg = currentLang === 'cn' ? 
        '确定要请求客户在手机上点击接受吗？' : 
        'Tem certeza que deseja solicitar que o cliente clique em aceitar no celular?';
    
    if (!confirm(confirmMsg)) return;
    
    // Enviar comando ao bot usando o mesmo padrão de botCommand
    window.db.ref(`orders/${orderId}/botCommand`).set({
        type: 'requestAcceptance',
        timestamp: Date.now(),
        provider: PROVIDER_NAME,
        processed: false
    })
    .then(() => {
        console.log(`📲 Solicitação de aceitação enviada para pedido ${orderId}`);
        showToast(currentLang === 'cn' ? '已发送请求给客户' : 'Solicitação enviada ao cliente!', 'success');
    })
    .catch(error => {
        console.error('❌ Erro ao enviar solicitação:', error);
        showToast('Erro ao enviar solicitação', 'error');
    });
}

// REENVIAR PEDIDO CONCLUÍDO COMO ATIVO (volta para pending)
function resendFromHistory(orderId) {
    const confirmMsg = currentLang === 'cn' ?
        '确定要将此订单重新激活为待处理吗？' :
        'Tem certeza que deseja reenviar este pedido como ativo?\n\nEle voltará para a lista de pedidos pendentes.';

    if (!confirm(confirmMsg)) return;

    window.db.ref(`orders/${orderId}`).update({
        status: 'pending',
        skipped: false,
        skippedAt: null,
        skippedBy: null,
        resentAt: Date.now(),
        resentBy: PROVIDER_NAME
    })
    .then(() => {
        console.log(`🔄 Pedido ${orderId} reenviado como ativo por ${PROVIDER_NAME}`);
        showToast(currentLang === 'cn' ? '订单已重新激活' : 'Pedido reenviado como ativo!', 'success');
        loadHistory();
        loadOrders();
    })
    .catch(error => {
        console.error('❌ Erro ao reenviar pedido:', error);
        showToast('Erro ao reenviar pedido', 'error');
    });
}

// DELETAR DO HISTÓRICO
function deleteFromHistory(orderId) {
    const confirmMsg = currentLang === 'cn' ? 
        '确定要从历史记录中删除此订单吗？' : 
        'Tem certeza que deseja deletar este pedido do histórico?';
    
    if (!confirm(confirmMsg)) return;
    
    window.db.ref(`orders/${orderId}`).remove()
        .then(() => {
            console.log(`✅ Pedido ${orderId} deletado do histórico`);
            showToast(currentLang === 'cn' ? '已删除' : 'Deletado com sucesso', 'success');
            loadHistory(); // Recarregar histórico
            loadOrders(); // Atualizar estatísticas
        })
        .catch(err => {
            console.error('❌ Erro ao deletar:', err);
            showToast(currentLang === 'cn' ? '删除失败' : 'Erro ao deletar', 'error');
        });
}

// NOTIFICAÇÕES
function checkNewOrders() {
    Object.keys(allOrders).forEach(async orderId => {
        const order = allOrders[orderId];
        if (order.status === 'pending' && 
            order.assignedProvider === PROVIDER_NAME && 
            !notifiedOrders.has(orderId)) {
            notifiedOrders.add(orderId);
            console.log('🔔 Novo pedido!');
            
            // Atribuir providerId se não tiver ou for inválido
            if (!order.providerId || order.providerId === '00000' || order.providerId === 'null') {
                const providerId = await getNextProviderId(orderId);
                console.log(`✅ ID atribuído ao pedido: #${providerId}`);
            }
            
            if ('Notification' in window && Notification.permission === 'granted') {
                new Notification(`🎮 新订单！ - ${PROVIDER_NAME}`, {
                    body: `${GAME_NAMES_CN[order.game]} - ${order.cart.length} 项`
                });
            }
        }
    });
}

// RENDERIZAR PEDIDOS
async function renderOrders() {
    const container = document.getElementById('orders-container');
    const noOrdersMsg = document.getElementById('no-orders');
    const t = translations[currentLang];
    
    if (!container) return;
    
    // Filtrar apenas pedidos deste fornecedor que estão pendentes
    const myOrders = Object.values(allOrders).filter(o => 
        o.status === 'pending' && o.assignedProvider === PROVIDER_NAME
    );
    
    // Controlar alerta sonoro baseado em pedidos pendentes COM ITEM ONLINE
    // O áudio só toca quando o item do pedido estiver marcado como online no mercado
    const activeOrders = myOrders.filter(o => !o.skipped && o.itemOnline === true);
    if (activeOrders.length > 0) {
        startAlert();
    } else {
        stopAlert();
    }
    
    console.log(`✅ Pedidos filtrados para ${PROVIDER_NAME}: ${myOrders.length}`);
    myOrders.forEach(o => {
        console.log(`  ✓ ${o.orderId} - ${o.game} - ${o.gameType}`);
    });
    
    if (myOrders.length === 0) {
        container.innerHTML = '';
        if (noOrdersMsg) noOrdersMsg.style.display = 'block';
        return;
    }
    
    if (noOrdersMsg) noOrdersMsg.style.display = 'none';
    
    // Garantir que todos os pedidos tenham providerId válido
    for (const order of myOrders) {
        if (!order.providerId || order.providerId === '00000' || order.providerId === 'null') {
            const newProviderId = await getNextProviderId(order.orderId);
            order.providerId = newProviderId;
            console.log(`🏷️ Novo providerId gerado: ${newProviderId} para pedido ${order.orderId}`);
        }
    }
    
    container.innerHTML = myOrders.map(order => {
        const hasAuthRequest = order.authRequest && order.authRequest.requested;
        const gameImage = GAME_IMAGES[order.game] || '';
        const isTopUpProvider = ['DOG', 'DAODAO', 'SOMBRA'].includes(PROVIDER_NAME);
        const isSkipped = order.skipped === true;
        
        return `
        <div class="order-card" data-order-id="${order.orderId}" style="${isSkipped ? 'opacity: 0.4; filter: grayscale(70%);' : ''}">
            <div class="order-header">
                ${gameImage ? `<img src="${gameImage}" alt="${order.game}" class="game-icon-img">` : ''}
                <h3>${GAME_NAMES_CN[order.game] || order.gameName}</h3>
                <span class="order-type">${order.gameType === 'gold' ? t.goldOrder : t.packOrder}</span>
                ${isSkipped ? `<div style="background: #e74c3c; color: white; padding: 8px; border-radius: 8px; margin-top: 10px; font-weight: bold; text-align: center;">⏸️ ${currentLang === 'cn' ? '订单已暂停' : 'PEDIDO PAUSADO'}</div>` : ''}
            </div>
            
            <div class="order-info">
                <strong>${currentLang === 'cn' ? '订单编号' : 'ID do Pedido'}:</strong> 
                <span style="font-size: 1.5em; font-weight: bold; color: #667eea;">#${getProviderOrderId(order)}</span>
            </div>
            
            <div class="cart-section">
                <h4>🛒 ${t.cart}</h4>
                ${order.cart && order.cart.length > 0 ? order.cart.map(item => {
                    return `
                    <div class="cart-item">
                        <span>${item.pack || item.gold || 'Item desconhecido'}</span>
                        <span class="quantity">x${item.quantity || 1}</span>
                    </div>
                `;
                }).join('') : '<div class="cart-item">⚠️ Carrinho vazio</div>'}
                ${order.gameType === 'gold' && order.game === 'mir4' && order.goldDivisions && order.goldDivisions.length > 0 ? `
                    <div style="margin-top: 10px; padding: 15px; background: linear-gradient(135deg, #ffd700 0%, #ffbf00 100%); border-radius: 8px; border: 3px solid #ff8c00; text-align: center;">
                        <p style="color: #000; margin: 0 0 5px 0; font-size: 0.9em; font-weight: bold;">${currentLang === 'cn' ? '总金币' : 'Total Gold'}</p>
                        <p style="color: #8b0000; margin: 0; font-size: 2em; font-weight: bold; text-shadow: 1px 1px 2px rgba(0,0,0,0.3);">${order.goldWithFee?.toLocaleString('pt-BR')}</p>
                    </div>
                    <div style="margin-top: 15px; padding: 15px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 8px; border: 2px solid #fff;">
                        <p style="color: #fff; margin: 0 0 10px 0; font-size: 1em; font-weight: bold; text-align: center;">${currentLang === 'cn' ? '📋 分割为 ' + order.goldDivisions.length + ' 个市场公告' : '📋 Dividido em ' + order.goldDivisions.length + ' anúncios'}</p>
                        <div style="display: grid; gap: 8px;">
                            ${order.goldDivisions.map((part, idx) => `
                                <div style="background: rgba(255,255,255,0.95); padding: 12px; border-radius: 6px; display: flex; justify-content: space-between; align-items: center;">
                                    <span style="color: #667eea; font-weight: bold;">${currentLang === 'cn' ? '公告' : 'Anúncio'} ${idx + 1}:</span>
                                    <span style="color: #333; font-size: 1.2em; font-weight: bold;">${part.toLocaleString('pt-BR')} Gold</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}
            </div>
            
            ${order.account && Object.keys(order.account).length > 0 ? `
            <div class="account-section">
                <h4>🔐 ${t.account}</h4>
                ${order.account.loginMethod ? `<div><strong>${currentLang === 'cn' ? '登录方式' : 'Método de Login'}:</strong> ${order.account.loginMethod}</div>` : ''}
                ${order.account.login ? `<div><strong>${t.login}:</strong> ${order.account.login}</div>` : ''}
                ${order.account.password ? `<div><strong>${t.password}:</strong> ${order.account.password}</div>` : ''}
                ${order.account.server ? `<div><strong>${t.server}:</strong> ${order.account.server}</div>` : ''}
                ${order.account.nickname ? `<div><strong>${t.nickname}:</strong> ${order.account.nickname}</div>` : ''}
                ${order.account.uid ? `<div><strong>UID:</strong> ${order.account.uid}</div>` : ''}
            </div>
            ` : ''}
            
            ${order.gameType === 'gold' ? `
            <div class="item-status-section" style="background: ${order.itemOnline ? 'linear-gradient(135deg, #00b894 0%, #00a378 100%)' : 'linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)'}; padding: 15px; border-radius: 12px; margin: 15px 0; text-align: center;">
                <strong style="color: white; display: block; font-size: 1.2em; margin-bottom: 5px;">
                    ${order.itemOnline ? '✅' : '⏳'} ${currentLang === 'cn' ? '市场状态' : 'Status do Mercado'}
                </strong>
                <p style="color: white; margin: 0; font-size: 1.1em; font-weight: bold;">
                    ${order.itemOnline 
                        ? (currentLang === 'cn' ? '🛒 物品在线' : '🛒 Item Online')
                        : (currentLang === 'cn' ? '⏳ 物品离线' : '⏳ Item Offline')
                    }
                </p>
                ${order.itemOnlineTimestamp ? `
                    <p style="color: rgba(255,255,255,0.8); margin: 5px 0 0 0; font-size: 0.9em;">
                        ${currentLang === 'cn' ? '更新于' : 'Atualizado em'}: ${new Date(order.itemOnlineTimestamp).toLocaleString('pt-BR')}
                    </p>
                ` : ''}
            </div>
            ` : ''}
            
            ${isTopUpProvider ? `
            <div class="auth-input-section" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 15px; border-radius: 12px; margin: 15px 0;">
                <strong style="color: white; display: block; margin-bottom: 10px;">🔐 ${t.sendCodeSection || 'Enviar Código de Verificação'}</strong>
                <div style="display: flex; gap: 10px; align-items: center;">
                    <input type="text" id="auth-input-${order.orderId}" 
                           placeholder="00" 
                           maxlength="2"
                           style="width: 80px; padding: 12px; border: 2px solid white; border-radius: 8px; font-size: 1.5em; text-align: center; font-weight: bold;"
                           onkeypress="return event.charCode >= 48 && event.charCode <= 57">
                    <button onclick="sendAuthNumber('${order.orderId}')" style="flex: 1; padding: 12px; background: white; color: #667eea; border: none; border-radius: 8px; cursor: pointer; font-weight: bold; transition: all 0.3s;" onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
                        📤 ${t.sendNumber}
                    </button>
                </div>
                ${hasAuthRequest && order.authRequest.response === 'confirmed' ? `
                    <p style="color: #d4edda; font-size: 0.9em; margin-top: 10px; background: rgba(255,255,255,0.2); padding: 8px; border-radius: 6px;">✅ ${t.responseReceived}</p>
                ` : ''}
            </div>
            
            <div class="sms-section" style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); padding: 15px; border-radius: 12px; margin: 15px 0;">
                <strong style="color: white; display: block; margin-bottom: 10px;">📲 ${currentLang === 'cn' ? '请求短信验证码' : 'Solicitar SMS'}</strong>
                <button onclick="requestSMS('${order.orderId}')" style="width: 100%; padding: 12px; background: white; color: #f5576c; border: none; border-radius: 8px; cursor: pointer; font-weight: bold; transition: all 0.3s;" onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
                    📩 ${t.requestCode}
                </button>
                ${hasAuthRequest && order.authRequest.type === 'code' && order.authRequest.response ? `
                    <div style="margin-top: 15px; background: white; padding: 15px; border-radius: 8px; border: 3px solid #f5576c;">
                        <p style="color: #f5576c; font-size: 0.85em; margin: 0 0 5px 0; font-weight: bold;">📲 ${currentLang === 'cn' ? '客户提供的短信验证码' : 'Código SMS do Cliente'}:</p>
                        <p style="color: #333; font-size: 2em; margin: 0; font-weight: bold; text-align: center; letter-spacing: 3px;">${order.authRequest.response}</p>
                    </div>
                ` : hasAuthRequest && order.authRequest.type === 'code' ? `
                    <p style="color: white; font-size: 0.9em; margin-top: 10px; background: rgba(255,255,255,0.2); padding: 8px; border-radius: 6px;">⏳ ${currentLang === 'cn' ? '等待客户提供验证码...' : 'Aguardando código...'}</p>
                ` : ''}
            </div>

            ${['DOG', 'DAODAO'].includes(PROVIDER_NAME) ? `
            <div class="sms-section" style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); padding: 15px; border-radius: 12px; margin: 15px 0;">
                <strong style="color: white; display: block; margin-bottom: 10px;">🔑 ${currentLang === 'cn' ? '密码问题' : 'Senha'}</strong>
                <button onclick="requestWrongPassword('${order.orderId}')" style="width: 100%; padding: 12px; background: white; color: #dc2626; border: none; border-radius: 8px; cursor: pointer; font-weight: bold; transition: all 0.3s;" onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
                    🔑 ${currentLang === 'cn' ? '密码错误' : 'Senha errada'}
                </button>
                ${hasAuthRequest && order.authRequest.type === 'password' && order.authRequest.response ? `
                    <div style="margin-top: 15px; background: white; padding: 15px; border-radius: 8px; border: 3px solid #dc2626;">
                        <p style="color: #dc2626; font-size: 0.85em; margin: 0 0 5px 0; font-weight: bold;">🔑 ${currentLang === 'cn' ? '客户提供的正确密码' : 'Senha correta informada'}:</p>
                        <p style="color: #333; font-size: 1.3em; margin: 0; font-weight: bold; text-align: center;">${order.authRequest.response}</p>
                    </div>
                ` : hasAuthRequest && order.authRequest.type === 'password' ? `
                    <p style="color: white; font-size: 0.9em; margin-top: 10px; background: rgba(255,255,255,0.2); padding: 8px; border-radius: 6px;">⏳ ${currentLang === 'cn' ? '等待客户提供正确密码...' : 'Aguardando senha correta...'}...</p>
                ` : ''}
            </div>
            ` : ''}
            
            <div class="acceptance-section" style="background: linear-gradient(135deg, #00d2ff 0%, #3a7bd5 100%); padding: 15px; border-radius: 12px; margin: 15px 0;">
                <strong style="color: white; display: block; margin-bottom: 10px;">📲 ${currentLang === 'cn' ? '请客户在手机上点击接受' : 'Solicitar Aceitação no Celular'}</strong>
                <button onclick="${order.clientAccepted ? '' : 'requestAcceptanceConfirmation'}('${order.orderId}')" style="width: 100%; padding: 12px; background: ${order.clientAccepted ? '#00b894' : 'white'}; color: ${order.clientAccepted ? 'white' : '#3a7bd5'}; border: none; border-radius: 8px; cursor: ${order.clientAccepted ? 'default' : 'pointer'}; font-weight: bold; transition: all 0.3s; opacity: ${order.clientAccepted ? '0.9' : '1'};" ${order.clientAccepted ? '' : "onmouseover=\"this.style.transform='scale(1.05)'\" onmouseout=\"this.style.transform='scale(1)'\""}>
                    ${order.clientAccepted ? '✅ ' + (currentLang === 'cn' ? '客户已接受' : 'Cliente Aceitou') : '📲 ' + (currentLang === 'cn' ? '发送请求' : 'Enviar Solicitação')}
                </button>
            </div>
            ` : ''}
            
            ${order.attachments && order.attachments.length > 0 ? `
                <div class="attachments-section">
                    <h4>📸 ${t.attachments}</h4>
                    <div class="attachments-grid">
                        ${order.attachments.map(url => `
                            <a href="${url}" target="_blank">
                                <img src="${url}" alt="attachment">
                            </a>
                        `).join('')}
                    </div>
                </div>
            ` : ''}
            
            <div class="comments-section">
                <h4>💬 ${currentLang === 'cn' ? '评论 / Comentários' : 'Comentários / 评论'}</h4>
                <textarea id="comment-input-${order.orderId}" class="comment-input" 
                    placeholder="${currentLang === 'cn' ? '添加评论...' : 'Adicionar comentário...'}" 
                    oninput="autoSaveComment('${order.orderId}', this.value)">${order.comment ? order.comment.text : ''}</textarea>
            </div>
            
            <div class="order-actions" style="display: flex; gap: 10px; flex-wrap: wrap;">
                <button onclick="stopAlert()" style="flex: 1; min-width: 120px; padding: 12px; background: linear-gradient(135deg, #ffa500 0%, #ff8c00 100%); color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: bold;">
                    🔇 ${currentLang === 'cn' ? '停止提醒' : 'Parar Som'}
                </button>
                <button onclick="${isSkipped ? 'reactivateOrder' : 'skipOrder'}('${order.orderId}')" style="flex: 1; min-width: 120px; padding: 12px; background: linear-gradient(135deg, ${isSkipped ? '#27ae60, #229954' : '#95a5a6, #7f8c8d'}); color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: bold;">
                    ${isSkipped ? ('▶️ ' + (currentLang === 'cn' ? '重新激活' : 'Reativar')) : ('⏭️ ' + (currentLang === 'cn' ? '跳过' : 'Skip'))}
                </button>
                <button onclick="completeOrder('${order.orderId}')" class="complete-btn" style="flex: 2; min-width: 150px;">✅ ${t.complete}</button>
                <button onclick="cancelOrder('${order.orderId}')" class="cancel-btn" style="flex: 1; min-width: 100px;">❌ ${t.cancel}</button>
            </div>
        </div>
        `;
    }).join('');
}

// ATUALIZAR ESTATÍSTICAS
function updateStats() {
    const myOrders = Object.values(allOrders).filter(o => o.assignedProvider === PROVIDER_NAME);
    const pending = myOrders.filter(o => o.status === 'pending').length;
    const completed = myOrders.filter(o => o.status === 'completed').length;

    document.getElementById('stat-pending').textContent = pending;
    document.getElementById('stat-completed').textContent = completed;
}

// ALTERNAR IDIOMA
function toggleLanguage() {
    currentLang = currentLang === 'cn' ? 'pt' : 'cn';
    renderOrders();
    updateUILanguage();
}

function updateUILanguage() {
    const t = translations[currentLang];
    
    // Atualizar título do header
    const providerIcons = {
        'AMARELO': '🟡',
        'VACA': '🐄',
        'DW': '🔴',
        'LBW': '🔵',
        'DOG': '🐶',
        'DAODAO': '🟢',
        'SOMBRA': '🌑'
    };
    
    const icon = providerIcons[PROVIDER_NAME] || '📦';
    const providerType = ['AMARELO', 'LBW', 'VACA', 'DW'].includes(PROVIDER_NAME) ? 'Gold' : 'Top Up';
    
    document.querySelector('h1').textContent = `${icon} ${PROVIDER_NAME} - ${t.title}`;
    document.querySelector('.subtitle').textContent = `${t.subtitle} (${providerType})`;
    
    // Atualizar labels dos stats
    const statLabels = document.querySelectorAll('.stat-label');
    if (statLabels[0]) statLabels[0].textContent = t.pending;
    if (statLabels[1]) statLabels[1].textContent = t.completed;
    
    // Atualizar título da seção de pedidos
    const ordersTitle = document.querySelector('.orders-section h2');
    if (ordersTitle) ordersTitle.textContent = `📦 ${currentLang === 'cn' ? '订单列表' : 'Lista de Pedidos'}`;
    
    // Atualizar mensagem "sem pedidos"
    const noOrdersMsg = document.getElementById('no-orders');
    if (noOrdersMsg) {
        noOrdersMsg.textContent = currentLang === 'cn' ? 
            '暂无订单 / Nenhum pedido' : 
            'Nenhum pedido / 暂无订单';
    }
}

// AÇÕES DE PEDIDO
function sendAuthNumber(orderId) {
    const input = document.getElementById(`auth-input-${orderId}`);
    const code = input.value.trim();
    
    if (!code) {
        showToast(currentLang === 'cn' ? '请输入验证码' : 'Digite o código', 'warning');
        return;
    }
    
    if (!/^\d{1,2}$/.test(code)) {
        showToast(currentLang === 'cn' ? '请输入有效的验证码 (0-99)' : 'Digite um código válido (0-99)', 'warning');
        return;
    }
    
    console.log(`📤 Enviando código ${code} para ${orderId}`);
    window.db.ref(`orders/${orderId}/chineseCode`).set({
        code: code,
        timestamp: Date.now()
    }).then(() => {
        console.log(`✅ Código ${code} salvo no Firebase`);
        showToast(currentLang === 'cn' ? `验证码已发送到客户: ${code}` : `Código enviado ao cliente: ${code}`, 'success');
        input.value = '';
    }).catch(err => {
        console.error('❌ Erro ao enviar código:', err);
        showToast('Erro ao enviar código', 'error');
    });
}

function requestSMS(orderId) {
    window.db.ref(`orders/${orderId}/authRequest`).set({
        requested: true,
        type: 'code',
        response: null,
        timestamp: Date.now()
    });
    showToast('✅ Solicitação enviada ao bot! / 已发送请求！', 'success');
}

function requestWrongPassword(orderId) {
    window.db.ref(`orders/${orderId}/authRequest`).set({
        requested: true,
        type: 'password',
        response: null,
        timestamp: Date.now()
    });
    showToast('✅ Solicitação enviada ao bot! / 已发送请求！', 'success');
}

function sendAuthResponse(orderId) {
    const input = document.getElementById(`auth-response-${orderId}`);
    const response = input.value.trim();
    
    if (!response) {
        showToast('❌ Digite uma resposta! / 请输入回复！', 'warning');
        return;
    }
    
    window.db.ref(`orders/${orderId}/authRequest/response`).set(response);
    showToast('✅ Resposta enviada! / 已发送！', 'success');
    input.value = '';
}

function completeOrder(orderId) {
    if (confirm('确定完成此订单吗？ / Confirmar conclusão do pedido?')) {
        window.db.ref(`orders/${orderId}/status`).set('completed');
        showToast('✅ Pedido concluído! / 订单已完成！', 'success');
    }
}

function cancelOrder(orderId) {
    if (confirm('确定要取消此订单吗？ / Tem certeza que deseja cancelar?')) {
        window.db.ref(`orders/${orderId}`).remove();
        showToast('Pedido cancelado! / 订单已取消！', 'info');
    }
}

// SALVAR COMENTÁRIO
function saveComment(orderId) {
    const textarea = document.getElementById(`comment-input-${orderId}`);
    const comment = textarea.value.trim();
    
    if (!comment) {
        showToast(currentLang === 'cn' ? '请输入评论' : 'Digite um comentário', 'warning');
        return;
    }
    
    window.db.ref(`orders/${orderId}/comment`).set({
        text: comment,
        timestamp: Date.now()
    }).then(() => {
        console.log(`✅ Comentário salvo para ${orderId}`);
        renderOrders();
    }).catch(err => {
        console.error('❌ Erro ao salvar comentário:', err);
    });
}

// AUTO-SALVAR COMENTÁRIO (sem botão)
let commentTimeout = null;
function autoSaveComment(orderId, text) {
    // Limpar timeout anterior
    if (commentTimeout) clearTimeout(commentTimeout);
    
    // Salvar após 1 segundo sem digitar
    commentTimeout = setTimeout(() => {
        if (text.trim()) {
            window.db.ref(`orders/${orderId}/comment`).set({
                text: text.trim(),
                timestamp: Date.now()
            }).then(() => {
                console.log(`✅ Comentário auto-salvo para ${orderId}`);
            }).catch(err => {
                console.error('❌ Erro ao auto-salvar comentário:', err);
            });
        }
    }, 1000);
}

// TOGGLE HISTÓRICO
function toggleHistory() {
    const container = document.getElementById('history-container');
    const icon = document.getElementById('history-icon');
    
    if (container.style.display === 'none') {
        container.style.display = 'block';
        icon.textContent = '📖';
        loadHistory();
    } else {
        container.style.display = 'none';
        icon.textContent = '📋';
    }
}

// CARREGAR HISTÓRICO
function loadHistory() {
    const ordersContainer = document.getElementById('history-orders');
    const mainContainer = document.getElementById('history-container');
    const t = translations[currentLang];
    
    // Usar history-orders se existir, senão usar history-container
    const container = ordersContainer || mainContainer;
    
    // Filtrar pedidos completados deste fornecedor
    const completedOrders = Object.values(allOrders).filter(o => 
        o.status === 'completed' && o.assignedProvider === PROVIDER_NAME
    ).sort((a, b) => b.timestamp - a.timestamp);
    
    if (completedOrders.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #999; padding: 40px;">暂无历史记录 / Nenhum histórico</p>';
        return;
    }
    
    const isTopUpProvider = ['DOG', 'DAODAO', 'SOMBRA'].includes(PROVIDER_NAME);
    
    // Renderizar pedidos completos (mesma estrutura dos ativos)
    container.innerHTML = '<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(400px, 1fr)); gap: 25px;">' +
    completedOrders.map(order => {
        const hasAuthRequest = order.authRequest && order.authRequest.requested;
        const gameImage = GAME_IMAGES[order.game] || '';
        
        return `
        <div class="order-card" style="border: 3px solid #00b894; opacity: 0.95;" data-order-id="${order.orderId}" data-provider-id="${order.providerId || ''}" data-user-id="${order.userId || ''}" data-login="${order.account?.login || ''}" data-password="${order.account?.password || ''}" data-email="${order.account?.email || ''}">
            <div style="background: linear-gradient(135deg, #00b894 0%, #00a378 100%); color: white; padding: 10px 15px; margin: -25px -25px 20px -25px; border-radius: 20px 20px 0 0; text-align: center; font-weight: bold;">
                ✅ ${currentLang === 'cn' ? '已完成' : 'CONCLUÍDO'}
            </div>
            
            <div class="order-header">
                ${gameImage ? `<img src="${gameImage}" alt="${order.game}" class="game-icon-img">` : ''}
                <h3>${GAME_NAMES_CN[order.game] || order.gameName}</h3>
                <span class="order-type">${order.gameType === 'gold' ? t.goldOrder : t.packOrder}</span>
            </div>
            
            <div class="order-info">
                <strong>${currentLang === 'cn' ? '订单编号' : 'ID do Pedido'}:</strong> 
                <span style="font-size: 1.5em; font-weight: bold; color: #00b894;">#${getProviderOrderId(order)}</span>
            </div>
            
            <div class="cart-section">
                <h4>🛒 ${t.cart}</h4>
                ${order.cart && order.cart.length > 0 ? order.cart.map(item => {
                    return `
                    <div class="cart-item">
                        <span>${item.pack || item.gold || 'Item desconhecido'}</span>
                        <span class="quantity">x${item.quantity || 1}</span>
                    </div>
                `;
                }).join('') : '<div class="cart-item">⚠️ Carrinho vazio</div>'}
                ${order.gameType === 'gold' && order.game === 'mir4' && order.goldDivisions && order.goldDivisions.length > 0 ? `
                    <div style="margin-top: 10px; padding: 15px; background: linear-gradient(135deg, #ffd700 0%, #ffbf00 100%); border-radius: 8px; border: 3px solid #ff8c00; text-align: center;">
                        <p style="color: #000; margin: 0 0 5px 0; font-size: 0.9em; font-weight: bold;">${currentLang === 'cn' ? '总金币' : 'Total Gold'}</p>
                        <p style="color: #8b0000; margin: 0; font-size: 2em; font-weight: bold; text-shadow: 1px 1px 2px rgba(0,0,0,0.3);">${order.goldWithFee?.toLocaleString('pt-BR')}</p>
                    </div>
                    <div style="margin-top: 15px; padding: 15px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 8px; border: 2px solid #fff;">
                        <p style="color: #fff; margin: 0 0 10px 0; font-size: 1em; font-weight: bold; text-align: center;">${currentLang === 'cn' ? '📋 分割为 ' + order.goldDivisions.length + ' 个市场公告' : '📋 Dividido em ' + order.goldDivisions.length + ' anúncios'}</p>
                        <div style="display: grid; gap: 8px;">
                            ${order.goldDivisions.map((part, idx) => `
                                <div style="background: rgba(255,255,255,0.95); padding: 12px; border-radius: 6px; display: flex; justify-content: space-between; align-items: center;">
                                    <span style="color: #667eea; font-weight: bold;">${currentLang === 'cn' ? '公告' : 'Anúncio'} ${idx + 1}:</span>
                                    <span style="color: #333; font-size: 1.2em; font-weight: bold;">${part.toLocaleString('pt-BR')} Gold</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}
            </div>
            
            ${order.account && Object.keys(order.account).length > 0 ? `
            <div class="account-section">
                <h4>🔐 ${t.account}</h4>
                ${order.account.loginMethod ? `<div><strong>${currentLang === 'cn' ? '登录方式' : 'Método de Login'}:</strong> ${order.account.loginMethod}</div>` : ''}
                ${order.account.login ? `<div><strong>${t.login}:</strong> ${order.account.login}</div>` : ''}
                ${order.account.password ? `<div><strong>${t.password}:</strong> ${order.account.password}</div>` : ''}
                ${order.account.server ? `<div><strong>${t.server}:</strong> ${order.account.server}</div>` : ''}
                ${order.account.nickname ? `<div><strong>${t.nickname}:</strong> ${order.account.nickname}</div>` : ''}
                ${order.account.uid ? `<div><strong>UID:</strong> ${order.account.uid}</div>` : ''}
            </div>
            ` : ''}
            
            ${order.gameType === 'gold' ? `
            <div class="item-status-section" style="background: linear-gradient(135deg, #00b894 0%, #00a378 100%); padding: 15px; border-radius: 12px; margin: 15px 0; text-align: center;">
                <strong style="color: white; display: block; font-size: 1.2em; margin-bottom: 5px;">
                    ✅ ${currentLang === 'cn' ? '市场状态' : 'Status do Mercado'}
                </strong>
                <p style="color: white; margin: 0; font-size: 1.1em; font-weight: bold;">
                    ${order.itemOnline 
                        ? (currentLang === 'cn' ? '🛍️ 物品在线' : '🛍️ Item Online')
                        : (currentLang === 'cn' ? '⏳ 物品离线' : '⏳ Item Offline')
                    }
                </p>
                ${order.itemOnlineTimestamp ? `
                    <p style="color: rgba(255,255,255,0.8); margin: 5px 0 0 0; font-size: 0.9em;">
                        ${currentLang === 'cn' ? '更新于' : 'Atualizado em'}: ${new Date(order.itemOnlineTimestamp).toLocaleString('pt-BR')}
                    </p>
                ` : ''}
            </div>
            ` : ''}
            
            ${order.attachments && order.attachments.length > 0 ? `
                <div class="attachments-section">
                    <h4>📸 ${t.attachments}</h4>
                    <div class="attachments-grid">
                        ${order.attachments.map(url => `
                            <a href="${url}" target="_blank">
                                <img src="${url}" alt="attachment">
                            </a>
                        `).join('')}
                    </div>
                </div>
            ` : ''}
            
            ${order.comment ? `
            <div class="comments-section">
                <h4>💬 ${currentLang === 'cn' ? '评论 / Comentários' : 'Comentários / 评论'}</h4>
                <div class="comment-display">${order.comment.text}</div>
            </div>
            ` : ''}
            
            <div style="text-align: center; padding: 15px; background: #f0f0f0; border-radius: 10px; margin-top: 15px;">
                <p style="margin: 0; color: #666; font-size: 0.9em;">
                    📅 ${currentLang === 'cn' ? '完成于' : 'Concluído em'}: ${new Date(order.timestamp).toLocaleString('pt-BR')}
                </p>
            </div>
            
            <!-- Botões Reativar / Deletar -->
            <div style="margin-top: 15px; display: flex; gap: 10px;">
                <button onclick="resendFromHistory('${order.orderId}')" style="flex: 1; padding: 12px; background: linear-gradient(135deg, #3498db 0%, #2980b9 100%); color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: bold; transition: all 0.3s;" onmouseover="this.style.transform='scale(1.02)'" onmouseout="this.style.transform='scale(1)'">
                    🔄 ${currentLang === 'cn' ? '重新激活订单' : 'Reenviar como Ativo'}
                </button>
                <button onclick="deleteFromHistory('${order.orderId}')" style="flex: 1; padding: 12px; background: linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%); color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: bold; transition: all 0.3s;" onmouseover="this.style.transform='scale(1.02)'" onmouseout="this.style.transform='scale(1)'">
                    🗑️ ${currentLang === 'cn' ? '从历史中删除' : 'Deletar do Histórico'}
                </button>
            </div>
        </div>
    `;
    }).join('') + '</div>';
}

// ============================================
// 🎮 SISTEMA DE JOGOS HABILITADOS/DESABILITADOS
// ============================================

let providerDisabledGames = [];

// Carregar configuração de jogos do Firebase
async function loadProviderGames() {
    try {
        const snapshot = await window.db.ref(`config/providerDisabledGames/${PROVIDER_NAME}`).once('value');
        providerDisabledGames = snapshot.val() || [];
        console.log(`🎮 Jogos desabilitados para ${PROVIDER_NAME}:`, providerDisabledGames);
        renderGamesPanel();
    } catch (error) {
        console.error('❌ Erro ao carregar jogos:', error);
        providerDisabledGames = [];
        renderGamesPanel();
    }
}

// Renderizar painel de jogos
function renderGamesPanel() {
    const container = document.getElementById('games-panel-container');
    if (!container) return;
    
    const allGames = Object.keys(GAME_IMAGES);
    const t = translations[currentLang];
    
    const gamesHtml = allGames.map(gameId => {
        const isEnabled = !providerDisabledGames.includes(gameId);
        const gameName = GAME_NAMES_CN[gameId] || gameId;
        const gameImage = GAME_IMAGES[gameId];
        
        return `
            <div class="game-toggle-item" onclick="toggleGame('${gameId}')" style="
                display: flex;
                flex-direction: column;
                align-items: center;
                padding: 10px;
                background: ${isEnabled ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'};
                border-radius: 12px;
                cursor: pointer;
                transition: all 0.3s ease;
                min-width: 80px;
                position: relative;
            " onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
                <img src="${gameImage}" alt="${gameName}" style="
                    width: 50px;
                    height: 50px;
                    border-radius: 8px;
                    border: 2px solid ${isEnabled ? '#fff' : 'rgba(255,255,255,0.5)'};
                    object-fit: cover;
                ">
                <span style="
                    position: absolute;
                    top: 5px;
                    right: 5px;
                    width: 12px;
                    height: 12px;
                    border-radius: 50%;
                    background: ${isEnabled ? '#00ff00' : '#ff0000'};
                    border: 2px solid #fff;
                    box-shadow: 0 0 5px ${isEnabled ? '#00ff00' : '#ff0000'};
                "></span>
                <span style="
                    margin-top: 5px;
                    font-size: 0.65em;
                    color: white;
                    text-align: center;
                    font-weight: 500;
                    max-width: 70px;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                ">${gameId.toUpperCase()}</span>
            </div>
        `;
    }).join('');
    
    container.innerHTML = `
        <div style="
            background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
            border-radius: 16px;
            padding: 20px;
            margin-top: 30px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        ">
            <h3 style="
                color: #fff;
                margin: 0 0 15px 0;
                font-size: 1.1em;
                display: flex;
                align-items: center;
                gap: 10px;
            ">
                🎮 ${currentLang === 'cn' ? '游戏接单设置 / Configuração de Jogos' : 'Configuração de Jogos / 游戏接单设置'}
            </h3>
            <p style="
                color: #94a3b8;
                font-size: 0.8em;
                margin: 0 0 15px 0;
            ">
                ${currentLang === 'cn' 
                    ? '点击切换：🟢 接单 | 🔴 不接单' 
                    : 'Clique para alternar: 🟢 Aceita | 🔴 Não aceita'}
            </p>
            <div style="
                display: flex;
                flex-wrap: wrap;
                gap: 10px;
                justify-content: flex-start;
            ">
                ${gamesHtml}
            </div>
        </div>
    `;
}

// Alternar estado do jogo
async function toggleGame(gameId) {
    try {
        const isCurrentlyDisabled = providerDisabledGames.includes(gameId);
        
        if (isCurrentlyDisabled) {
            // Habilitar (remover da lista de desabilitados)
            providerDisabledGames = providerDisabledGames.filter(g => g !== gameId);
            showToast(`✅ ${gameId.toUpperCase()} ${currentLang === 'cn' ? '已启用' : 'habilitado'}`, 'success');
        } else {
            // Desabilitar (adicionar à lista de desabilitados)
            providerDisabledGames.push(gameId);
            showToast(`🔴 ${gameId.toUpperCase()} ${currentLang === 'cn' ? '已禁用' : 'desabilitado'}`, 'warning');
        }
        
        // Salvar no Firebase
        await window.db.ref(`config/providerDisabledGames/${PROVIDER_NAME}`).set(providerDisabledGames);
        console.log(`🎮 Jogos desabilitados para ${PROVIDER_NAME} atualizados:`, providerDisabledGames);
        
        // Re-renderizar painel
        renderGamesPanel();
        
    } catch (error) {
        console.error('❌ Erro ao alternar jogo:', error);
        showToast('❌ Erro ao salvar', 'error');
    }
}
