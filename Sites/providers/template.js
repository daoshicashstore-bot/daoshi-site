// ============================================
// 🌐 DASHBOARD FORNECEDOR - DAOSHI STORE
// Template usado por todos os fornecedores
// Versão 2.1 - Pagination Added
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
    'romgoldenage': 'https://i.imgur.com/6DUJFH5.png'
};

let allOrders = {};
// Cofre efêmero (orderId -> senha). A senha saiu do orders/ (leitura pública)
// e vive em orderSecrets/{orderId} só durante a entrega. Injetamos no allOrders
// pra que copiar/render/busca leiam order.account.password normalmente.
let orderSecrets = {};
let notifiedOrders = new Set();
let currentLang = 'cn';
let providerOrderCounter = 0;
let alertInterval = null;
let audioAlert = null;
let audioEnabled = false;
// Gap entre repetições do alerta. O alerta toca uma vez (~1s do mp3), espera
// ALERT_INTERVAL_MS, repete. Antes era loop contínuo (sem gap) e ficava muito
// agressivo / contínuo.
const ALERT_INTERVAL_MS = 15000;
let replayTimer = null;
// Debounce do stopAlert: quando renderOrders alterna activeOrders entre
// vazio e não-vazio rapidamente (ex: itemOnline flickando no Firebase),
// queremos evitar que o áudio fique sendo resetado a cada 1-2s.
let _stopAlertTimer = null;
let currentSection = 'orders';
let currentPage = 1;
const ITEMS_PER_PAGE = 27;
// Mantem abertos apenas os pedidos em que o fornecedor escolheu ver as
// ferramentas completas. Assim a fila permanece compacta mesmo quando o
// Firebase re-renderiza os cards.
const expandedProviderOrders = new Set();
// Keep the number being typed when Firebase redraws the order card.
// Full-width digits are accepted for Chinese keyboards/IME as well.
const providerAuthNumberDrafts = new Map();

function normalizeProviderAuthNumber(value) {
    return String(value ?? '')
        .replace(/[\uFF10-\uFF19]/g, digit =>
            String(digit.charCodeAt(0) - 0xFF10)
        )
        .replace(/\D/g, '')
        .slice(0, 3);
}

function handleAuthNumberInput(orderId, input) {
    const key = String(orderId);
    const normalized = normalizeProviderAuthNumber(input?.value);
    if (input && input.value !== normalized) input.value = normalized;
    if (normalized) providerAuthNumberDrafts.set(key, normalized);
    else providerAuthNumberDrafts.delete(key);
}

function clearProviderAuthNumberDraft(orderId, input = null) {
    providerAuthNumberDrafts.delete(String(orderId));
    if (input) input.value = '';
}
// PROVIDER_NAME e IS_TOPUP_PROVIDER são definidos no HTML de cada dashboard

// Função para filtrar pedidos específicos por fornecedor
function shouldShowOrder(order) {
    if (!order) return false;
    if (order.assignedProvider !== PROVIDER_NAME) return false;

    return true;
}

// Estado visual separado do ciclo tecnico (status pending/completed/cancelled).
// Pedidos antigos, que ainda nao possuem workflowState, continuam funcionando.
function getWorkflowState(order) {
    if (!order) return 'active';
    if (order.status === 'cancelled') return 'cancelled';
    if (order.workflowState === 'problem_resolved') return 'problem_resolved';
    if (order.status === 'completed' || order.status === 'delivered') return 'completed';
    if (order.workflowState) return order.workflowState;
    if (order.problem && order.problem.status === 'resolved') return 'problem_resolved';
    if (order.problem && order.problem.status === 'pending') return 'problem_pending';
    if (order.skipped === true) return 'absent';
    return 'active';
}

function ensureWorkflowSections() {
    if (document.getElementById('nav-absent')) return;

    const navOrders = document.getElementById('nav-orders');
    const navHistory = document.getElementById('nav-history');
    const main = document.querySelector('.main-content');
    if (!navOrders || !navHistory || !main) return;

    const orderLabel = navOrders.querySelectorAll('span')[1];
    const historyLabel = navHistory.querySelectorAll('span')[1];
    if (orderLabel) orderLabel.textContent = '进行中 / Em andamento';
    if (historyLabel) historyLabel.textContent = '已完成 / Concluídos';

    navHistory.insertAdjacentHTML('beforebegin', `
        <div class="nav-item" onclick="showSection('absent')" id="nav-absent">
            <span class="nav-icon">⏸️</span><span>缺席 / Ausentes</span><span class="nav-badge" id="absent-badge">0</span>
        </div>`);
    navHistory.insertAdjacentHTML('afterend', `
        <div class="nav-item" onclick="showSection('cancelled')" id="nav-cancelled">
            <span class="nav-icon">❌</span><span>已取消 / Cancelados</span>
        </div>
        <div class="nav-item" onclick="showSection('problems')" id="nav-problems">
            <span class="nav-icon">⚠️</span><span>等待问题 / Problemas</span><span class="nav-badge" id="problems-badge">0</span>
        </div>
        <div class="nav-item" onclick="showSection('problems-resolved')" id="nav-problems-resolved">
            <span class="nav-icon">🛠️</span><span>已解决 / Resolvidos</span>
        </div>`);

    const sectionHtml = (id, container, title) => `
        <section class="content-section" id="section-${id}">
            <div class="workflow-section-title">${title}</div>
            <div id="${container}"></div>
        </section>`;
    main.insertAdjacentHTML('beforeend', sectionHtml('absent', 'absent-orders', '⏸️ 客户暂时不在线 / Clientes ausentes'));
    main.insertAdjacentHTML('beforeend', sectionHtml('cancelled', 'cancelled-orders', '❌ 已取消订单 / Histórico de cancelados'));
    main.insertAdjacentHTML('beforeend', sectionHtml('problems', 'problem-orders', '⚠️ 等待解决 / Problemas em espera'));
    main.insertAdjacentHTML('beforeend', sectionHtml('problems-resolved', 'resolved-problem-orders', '🛠️ 已解决问题 / Problemas resolvidos'));
}

function startProviderPresence() {
    const presenceRef = window.db.ref(`config/providerPresence/${PROVIDER_NAME}`);
    let lastActivityWrite = 0;

    const writeHeartbeat = (activity = false) => {
        const now = Date.now();
        const update = {
            provider: PROVIDER_NAME,
            connected: true,
            lastSeenAt: now,
            visibilityState: document.visibilityState
        };
        if (activity) {
            update.lastActivityAt = now;
            update.status = 'online';
            lastActivityWrite = now;
        }
        presenceRef.update(update).catch(err => console.warn('[PRESENCE]', err?.message || err));
    };

    const registerActivity = () => {
        if (Date.now() - lastActivityWrite < 20000) return;
        writeHeartbeat(true);
    };

    writeHeartbeat(true);
    const heartbeatTimer = setInterval(() => writeHeartbeat(false), 30000);
    ['pointerdown', 'keydown', 'touchstart', 'focus'].forEach(eventName => {
        window.addEventListener(eventName, registerActivity, { passive: true });
    });
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') writeHeartbeat(true);
        else writeHeartbeat(false);
    });
    try {
        presenceRef.onDisconnect().update({ connected: false, lastDisconnectedAt: firebase.database.ServerValue.TIMESTAMP });
    } catch (_) {}
    window.addEventListener('beforeunload', () => clearInterval(heartbeatTimer));
}

// ============================================
// 🆘 CHAMAR STAFF (ação global do painel)
// ============================================
// Apenas os dois painéis operados pelos fornecedores chineses exibem este
// botão. A solicitação não pertence a um pedido específico: fica no topo.
const STAFF_HELP_SITE_PROVIDERS = new Set(['DOG', 'DAODAO']);
let providerStaffRequestSending = false;

function ensureProviderStaffButton() {
    if (!STAFF_HELP_SITE_PROVIDERS.has(String(PROVIDER_NAME || '').toUpperCase())) return;
    if (document.getElementById('provider-staff-help-btn')) return;

    const header = document.querySelector('.page-header');
    if (!header) return;
    let actions = header.querySelector('.header-actions');
    if (!actions) {
        actions = document.createElement('div');
        actions.className = 'header-actions';
        header.appendChild(actions);
    }

    const button = document.createElement('button');
    button.id = 'provider-staff-help-btn';
    button.type = 'button';
    button.className = 'btn btn-danger';
    button.innerHTML = '🆘 Staff / &#21628;&#21483;&#23458;&#26381;';
    button.setAttribute('aria-label', 'Chamar staff');
    button.addEventListener('click', requestProviderStaffHelp);
    actions.appendChild(button);
}

async function requestProviderStaffHelp() {
    if (providerStaffRequestSending || !window.db) return;
    if (!window.confirm('需要联系工作人员吗？\nChamar a equipe agora?')) return;

    const button = document.getElementById('provider-staff-help-btn');
    const provider = String(PROVIDER_NAME || '').toUpperCase();
    const requestId = `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    providerStaffRequestSending = true;
    if (button) {
        button.disabled = true;
        button.textContent = '⏳ Enviando...';
    }

    try {
        await window.db.ref(`config/providerPresence/${provider}/supportRequest`).set({
            requestId,
            provider,
            source: 'provider_site',
            status: 'pending',
            createdAt: firebase.database.ServerValue.TIMESTAMP,
            page: window.location.pathname
        });
        showToast('✅ Staff notified / 已通知客服，请查看微信', 'success', 5000);
        if (button) button.textContent = '✅ Staff notified';

        // Evita cliques repetidos enquanto a equipe ainda está recebendo as DMs.
        setTimeout(() => {
            providerStaffRequestSending = false;
            if (button) {
                button.disabled = false;
                button.innerHTML = '🆘 Staff / &#21628;&#21483;&#23458;&#26381;';
            }
        }, 60000);
    } catch (error) {
        console.error('[STAFF HELP] Falha ao solicitar suporte:', error);
        showToast('❌ Error / Falha ao chamar staff', 'error', 5000);
        providerStaffRequestSending = false;
        if (button) {
            button.disabled = false;
            button.innerHTML = '🆘 Staff / &#21628;&#21483;&#23458;&#26381;';
        }
    }
}

// ============================================
// 📸 UPLOAD DE IMAGENS PARA COMPROVANTES
// ============================================
// Usa Firebase Storage ou Base64 direto no Firebase Realtime DB

// Armazenar comprovantes pendentes por pedido
const pendingProofs = new Map();

// Converter arquivo para Base64 Data URL
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// Comprimir imagem antes de salvar (reduz tamanho do base64)
function compressImage(file, maxWidth = 800, quality = 0.7) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = function (e) {
            const img = new Image();
            img.onload = function () {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                // Redimensionar se muito grande
                if (width > maxWidth) {
                    height = (height * maxWidth) / width;
                    width = maxWidth;
                }

                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                // Converter para base64 comprimido
                const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
                resolve(compressedBase64);
            };
            img.onerror = reject;
            img.src = e.target.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// Upload de imagem - salva como base64 (funciona em qualquer lugar)
async function uploadImage(file) {
    try {
        console.log(`📤 Comprimindo e convertendo imagem...`);

        // Comprimir imagem para reduzir tamanho
        const base64 = await compressImage(file, 800, 0.7);

        // Verificar tamanho (Firebase tem limite de ~10MB por nó)
        const sizeKB = Math.round(base64.length / 1024);
        console.log(`✅ Imagem convertida: ${sizeKB}KB`);

        if (sizeKB > 500) {
            // Se ainda muito grande, comprimir mais
            const smallerBase64 = await compressImage(file, 600, 0.5);
            console.log(`📦 Recomprimido para: ${Math.round(smallerBase64.length / 1024)}KB`);
            return smallerBase64;
        }

        return base64;
    } catch (error) {
        console.error('Erro ao processar imagem:', error);
        throw new Error('Erro ao processar imagem. Tente novamente.');
    }
}

// Alias para compatibilidade
const uploadToImgur = uploadImage;

// Armazenar múltiplos comprovantes por pedido (Array de URLs)
// pendingProofs agora guarda: orderId -> [url1, url2, ...]

// Processar arquivo de imagem (paste ou upload) - SUPORTA MÚLTIPLAS IMAGENS
async function handleProofImage(orderId, file) {
    const t = translations[currentLang];
    const previewContainer = document.getElementById(`proof-preview-${orderId}`);
    const uploadArea = document.getElementById(`proof-upload-${orderId}`);

    if (!file || !file.type.startsWith('image/')) {
        showToast('Arquivo inválido. Envie uma imagem.', 'error');
        return;
    }

    // Inicializar array se não existir
    if (!pendingProofs.has(orderId)) {
        pendingProofs.set(orderId, []);
    }

    // Criar ID único para esta imagem
    const imageId = `img_${Date.now()}`;

    // Mostrar preview local temporário
    const localReader = new FileReader();
    localReader.onload = function (e) {
        // Adicionar novo preview ao container (não substituir)
        previewContainer.style.display = 'grid';

        const newPreview = document.createElement('div');
        newPreview.className = 'proof-item';
        newPreview.id = `proof-item-${imageId}`;
        newPreview.innerHTML = `
            <img src="${e.target.result}" alt="Preview" class="proof-preview-img" onclick="openImageModal('${e.target.result}')">
            <div class="proof-uploading">${t.uploadingProof}</div>
        `;
        previewContainer.appendChild(newPreview);
    };
    localReader.readAsDataURL(file);

    try {
        // Upload para servidor de imagem
        const imgUrl = await uploadImage(file);

        // Adicionar URL ao array
        const proofs = pendingProofs.get(orderId);
        proofs.push(imgUrl);
        pendingProofs.set(orderId, proofs);

        // Atualizar preview desta imagem específica
        const proofItem = document.getElementById(`proof-item-${imageId}`);
        if (proofItem) {
            proofItem.innerHTML = `
                <img src="${imgUrl}" alt="Comprovante" class="proof-preview-img" onclick="openImageModal('${imgUrl}')">
                <button class="btn-remove-single-proof" onclick="removeSingleProof('${orderId}', '${imgUrl}', '${imageId}')">✕</button>
            `;
        }

        // Atualizar contador
        updateProofCounter(orderId);

        showToast(`${t.proofUploaded} (${proofs.length})`, 'success');
        console.log(`✅ Comprovante ${proofs.length} salvo para ${orderId}: ${imgUrl}`);

    } catch (error) {
        console.error('Erro ao fazer upload:', error);
        const errorMsg = error.message || 'Erro no upload. Tente novamente.';
        showToast(errorMsg, 'error');

        // Remover preview falho
        const proofItem = document.getElementById(`proof-item-${imageId}`);
        if (proofItem) proofItem.remove();

        // Se não tem nenhuma imagem, esconder container
        const proofs = pendingProofs.get(orderId) || [];
        if (proofs.length === 0) {
            previewContainer.style.display = 'none';
        }
    }
}

// Atualizar contador de imagens e botão de remover todas
function updateProofCounter(orderId) {
    const proofs = pendingProofs.get(orderId) || [];
    const counter = document.getElementById(`proof-counter-${orderId}`);
    const clearBtn = document.getElementById(`proof-clear-${orderId}`);

    if (counter) {
        counter.textContent = proofs.length > 0 ? `(${proofs.length})` : '';
    }
    if (clearBtn) {
        clearBtn.style.display = proofs.length > 1 ? 'block' : 'none';
    }
}

// Remover uma única imagem
function removeSingleProof(orderId, url, imageId) {
    const proofs = pendingProofs.get(orderId) || [];
    const index = proofs.indexOf(url);
    if (index > -1) {
        proofs.splice(index, 1);
        pendingProofs.set(orderId, proofs);
    }

    // Remover elemento visual
    const proofItem = document.getElementById(`proof-item-${imageId}`);
    if (proofItem) proofItem.remove();

    // Atualizar contador
    updateProofCounter(orderId);

    // Se não tem mais imagens, esconder preview container
    if (proofs.length === 0) {
        const previewContainer = document.getElementById(`proof-preview-${orderId}`);
        if (previewContainer) {
            previewContainer.style.display = 'none';
        }
    }

    showToast('Imagem removida', 'info');
}

// Variável para controlar qual pedido está ativo para paste
let activeProofOrderId = null;

// Função para definir pedido ativo (hover ou click na área)
function setActiveProofOrder(orderId) {
    activeProofOrderId = orderId;
    // Destacar visualmente a área ativa
    document.querySelectorAll('.proof-upload-area').forEach(el => el.classList.remove('active'));
    const currentArea = document.getElementById(`proof-upload-${orderId}`);
    if (currentArea) currentArea.classList.add('active');
}

// Função para limpar pedido ativo quando sai da área
function clearActiveProofOrder(orderId) {
    if (activeProofOrderId === orderId) {
        activeProofOrderId = null;
        const currentArea = document.getElementById(`proof-upload-${orderId}`);
        if (currentArea) currentArea.classList.remove('active');
    }
}

// Handler global para paste (Ctrl+V) - captura paste em qualquer lugar da página
document.addEventListener('paste', function (event) {
    // Se não tiver pedido ativo, ignorar
    if (!activeProofOrderId) return;

    // Verificar se a área de upload ainda existe (pedido não foi completado)
    const uploadArea = document.getElementById(`proof-upload-${activeProofOrderId}`);
    if (!uploadArea) {
        activeProofOrderId = null;
        return;
    }

    const items = event.clipboardData?.items;
    if (!items) return;

    for (const item of items) {
        if (item.type.startsWith('image/')) {
            event.preventDefault();
            const file = item.getAsFile();
            handleProofImage(activeProofOrderId, file);
            break;
        }
    }
});

// Handler para paste (Ctrl+V) - mantido para compatibilidade
function handlePaste(event, orderId) {
    const items = event.clipboardData?.items;
    if (!items) return;

    for (const item of items) {
        if (item.type.startsWith('image/')) {
            event.preventDefault();
            const file = item.getAsFile();
            handleProofImage(orderId, file);
            break;
        }
    }
}

// Handler para input file (suporta múltiplos arquivos)
function handleFileSelect(event, orderId) {
    const files = event.target.files;
    for (const file of files) {
        if (file) {
            handleProofImage(orderId, file);
        }
    }
    // Limpar input para permitir selecionar mesmos arquivos novamente
    event.target.value = '';
}

// Remover TODOS os comprovantes de um pedido
function removeProof(orderId) {
    pendingProofs.delete(orderId);
    const previewContainer = document.getElementById(`proof-preview-${orderId}`);
    const uploadArea = document.getElementById(`proof-upload-${orderId}`);

    if (previewContainer) {
        previewContainer.innerHTML = '';
        previewContainer.style.display = 'none';
    }
    if (uploadArea) {
        uploadArea.style.display = 'flex';
    }
    updateProofCounter(orderId);
}

// ============================================
// 🔔 TOAST NOTIFICATION SYSTEM
// ============================================
function showToast(message, type = 'success', duration = 3000) {
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

    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

// ============================================
// 🖼️ IMAGE MODAL SYSTEM (com suporte a galeria)
// ============================================
// Estado da galeria atual (compartilhado pelo modal aberto)
let _imageModalGallery = [];
let _imageModalIndex = 0;

// Aceita 2 formas:
//   openImageModal(url)              → modo single (sem setas)
//   openImageModal(urls, startIndex) → modo galeria (com setas + contador + teclado ←/→)
function openImageModal(urlOrUrls, startIndex) {
    // Normaliza entrada
    if (Array.isArray(urlOrUrls)) {
        _imageModalGallery = urlOrUrls.slice();
        _imageModalIndex = Math.max(0, Math.min(_imageModalGallery.length - 1, Number(startIndex) || 0));
    } else {
        _imageModalGallery = [urlOrUrls];
        _imageModalIndex = 0;
    }

    // Criar modal se não existir
    let modal = document.getElementById('image-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'image-modal';
        modal.innerHTML = `
            <div class="image-modal-backdrop" onclick="closeImageModal()"></div>
            <button class="image-modal-nav image-modal-prev" onclick="navigateImageModal(-1)" aria-label="Anterior">‹</button>
            <button class="image-modal-nav image-modal-next" onclick="navigateImageModal(1)" aria-label="Próxima">›</button>
            <div class="image-modal-content">
                <button class="image-modal-close" onclick="closeImageModal()">✕</button>
                <img id="image-modal-img" src="" alt="Imagem ampliada">
                <div id="image-modal-counter" class="image-modal-counter"></div>
            </div>
        `;

        // Adicionar estilos
        if (!document.getElementById('image-modal-styles')) {
            const style = document.createElement('style');
            style.id = 'image-modal-styles';
            style.textContent = `
                #image-modal {
                    display: none;
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    z-index: 20000;
                    animation: fadeIn 0.2s ease;
                }
                #image-modal.active {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .image-modal-backdrop {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0, 0, 0, 0.9);
                    cursor: pointer;
                }
                .image-modal-content {
                    position: relative;
                    max-width: 95vw;
                    max-height: 95vh;
                    z-index: 1;
                }
                .image-modal-close {
                    position: absolute;
                    top: -40px;
                    right: 0;
                    background: rgba(255, 255, 255, 0.2);
                    border: none;
                    color: white;
                    font-size: 24px;
                    width: 40px;
                    height: 40px;
                    border-radius: 50%;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .image-modal-close:hover {
                    background: rgba(255, 255, 255, 0.4);
                    transform: scale(1.1);
                }
                #image-modal-img {
                    max-width: 95vw;
                    max-height: 90vh;
                    object-fit: contain;
                    border-radius: 8px;
                    box-shadow: 0 10px 50px rgba(0,0,0,0.5);
                }
                .image-modal-nav {
                    position: absolute;
                    top: 50%;
                    transform: translateY(-50%);
                    background: rgba(255, 255, 255, 0.15);
                    border: none;
                    color: white;
                    font-size: 56px;
                    line-height: 1;
                    width: 64px;
                    height: 64px;
                    border-radius: 50%;
                    cursor: pointer;
                    z-index: 2;
                    display: none;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.2s ease;
                    user-select: none;
                    padding-bottom: 8px;
                }
                #image-modal.active.gallery .image-modal-nav {
                    display: flex;
                }
                .image-modal-nav:hover {
                    background: rgba(255, 255, 255, 0.35);
                    transform: translateY(-50%) scale(1.05);
                }
                .image-modal-nav:disabled {
                    opacity: 0.3;
                    cursor: not-allowed;
                }
                .image-modal-prev { left: 24px; }
                .image-modal-next { right: 24px; }
                .image-modal-counter {
                    position: absolute;
                    bottom: -36px;
                    left: 50%;
                    transform: translateX(-50%);
                    background: rgba(0, 0, 0, 0.6);
                    color: white;
                    padding: 6px 14px;
                    border-radius: 12px;
                    font-size: 13px;
                    font-weight: 500;
                    letter-spacing: 0.3px;
                    display: none;
                }
                #image-modal.active.gallery .image-modal-counter {
                    display: block;
                }
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
            `;
            document.head.appendChild(style);
        }

        document.body.appendChild(modal);
    }

    _renderImageModal();
    modal.classList.add('active');
    modal.classList.toggle('gallery', _imageModalGallery.length > 1);

    // Teclado: ESC fecha, ← e → navegam
    document.addEventListener('keydown', handleModalKey);
}

// Atualiza imagem, contador e estado dos botões pra _imageModalIndex atual.
function _renderImageModal() {
    const img = document.getElementById('image-modal-img');
    const counter = document.getElementById('image-modal-counter');
    const prevBtn = document.querySelector('.image-modal-prev');
    const nextBtn = document.querySelector('.image-modal-next');

    if (!img || !_imageModalGallery.length) return;
    img.src = _imageModalGallery[_imageModalIndex];

    if (counter) counter.textContent = `${_imageModalIndex + 1} / ${_imageModalGallery.length}`;
    if (prevBtn) prevBtn.disabled = _imageModalIndex === 0;
    if (nextBtn) nextBtn.disabled = _imageModalIndex === _imageModalGallery.length - 1;
}

// delta: -1 (anterior) | 1 (próxima)
function navigateImageModal(delta) {
    if (!_imageModalGallery.length) return;
    const next = _imageModalIndex + delta;
    if (next < 0 || next >= _imageModalGallery.length) return;
    _imageModalIndex = next;
    _renderImageModal();
}

function closeImageModal() {
    const modal = document.getElementById('image-modal');
    if (modal) {
        modal.classList.remove('active');
        modal.classList.remove('gallery');
        document.removeEventListener('keydown', handleModalKey);
    }
    _imageModalGallery = [];
    _imageModalIndex = 0;
}

function handleModalKey(e) {
    if (e.key === 'Escape') {
        closeImageModal();
    } else if (e.key === 'ArrowLeft') {
        navigateImageModal(-1);
    } else if (e.key === 'ArrowRight') {
        navigateImageModal(1);
    }
}

// Compatibilidade: alias antigo handleModalEsc (algum código pode estar referenciando)
function handleModalEsc(e) { handleModalKey(e); }

// ============================================
// 📱 SIDEBAR NAVIGATION
// ============================================
function toggleSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.querySelector('.sidebar-overlay');

    if (sidebar) {
        sidebar.classList.toggle('active');
    }
    if (overlay) {
        overlay.classList.toggle('active');
    }
}

function showSection(section) {
    currentSection = section;

    // Atualizar navegação ativa
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    const activeNav = document.querySelector(`.nav-item[onclick*="'${section}'"]`);
    if (activeNav) activeNav.classList.add('active');

    // Mostrar/esconder seções
    document.querySelectorAll('.content-section').forEach(el => {
        el.style.display = 'none';
        el.classList.remove('active');
    });
    const selected = document.getElementById(`section-${section}`);
    if (selected) {
        selected.style.display = 'block';
        selected.classList.add('active');
    }
    renderCurrentSection();

    // Fechar sidebar no mobile
    if (window.innerWidth <= 768) {
        toggleSidebar();
    }
}

function renderCurrentSection() {
    if (currentSection === 'orders') return renderOrders();
    if (currentSection === 'history') return loadHistory();
    return renderWorkflowSection(currentSection);
}

// Inicializar áudio
// O áudio toca uma vez (loop=false), espera ALERT_INTERVAL_MS via setTimeout
// quando o evento 'ended' dispara, e repete. O AudioContext keepalive +
// wake lock seguram a aba ativa pra timers não serem throttleados em background.
function initAudio() {
    if (!audioAlert) {
        audioAlert = new Audio('../sounds/alerta.mp3');
        audioAlert.volume = 0.7;
        audioAlert.loop = false;        // tocar 1x, esperar ALERT_INTERVAL_MS, repetir
        audioAlert.preload = 'auto';

        // Quando o áudio termina, agenda o próximo replay daqui ALERT_INTERVAL_MS.
        // Só agenda se o alerta continua ativo e ainda não há replay pendente.
        audioAlert.addEventListener('ended', () => {
            if (!alertInterval || !audioEnabled) return;
            if (replayTimer) return;
            replayTimer = setTimeout(() => {
                replayTimer = null;
                if (alertInterval && audioAlert && audioEnabled) {
                    audioAlert.currentTime = 0;
                    audioAlert.play().catch(() => {});
                }
            }, ALERT_INTERVAL_MS);
        });
    }
    // Inicializar Web Audio API como "keepalive" — garante que o AudioContext
    // permaneça ativo mesmo se a aba ficar muito tempo em background.
    // Um oscilador silencioso (gain=0) mantém o contexto responsivo.
    initAudioKeepalive();
}

// ════════════════════════════════════════════════════════════
// 🔊 KEEPALIVE: mantém AudioContext ativo mesmo com aba em background
// ════════════════════════════════════════════════════════════
let audioContext = null;
let keepaliveOscillator = null;

function initAudioKeepalive() {
    try {
        if (!audioContext) {
            const Ctx = window.AudioContext || window.webkitAudioContext;
            if (!Ctx) return;
            audioContext = new Ctx();
        }
        // Retomar se estiver suspenso (Chrome suspende AudioContext após inatividade)
        if (audioContext.state === 'suspended') {
            audioContext.resume().catch(() => {});
        }
        if (!keepaliveOscillator) {
            const osc = audioContext.createOscillator();
            const gain = audioContext.createGain();
            gain.gain.value = 0; // 100% silencioso
            osc.connect(gain);
            gain.connect(audioContext.destination);
            osc.start(0);
            keepaliveOscillator = osc;
            console.log('🔊 [KEEPALIVE] AudioContext oscilador silencioso iniciado');
        }
    } catch (e) {
        console.warn('⚠️ [KEEPALIVE] Falha ao iniciar keepalive de áudio:', e?.message);
    }
}

// ════════════════════════════════════════════════════════════
// 🔋 WAKE LOCK: impede a tela de dormir enquanto há alerta ativo
// ════════════════════════════════════════════════════════════
let wakeLockSentinel = null;

async function requestWakeLock() {
    try {
        if ('wakeLock' in navigator && !wakeLockSentinel) {
            wakeLockSentinel = await navigator.wakeLock.request('screen');
            wakeLockSentinel.addEventListener('release', () => {
                console.log('🔋 [WAKELOCK] Liberado');
                wakeLockSentinel = null;
            });
            console.log('🔋 [WAKELOCK] Ativado');
        }
    } catch (e) {
        console.warn('⚠️ [WAKELOCK] Falha ao ativar:', e?.message);
    }
}

async function releaseWakeLock() {
    try {
        if (wakeLockSentinel) {
            await wakeLockSentinel.release();
            wakeLockSentinel = null;
        }
    } catch (e) {
        // silenciar
    }
}

// Re-adquirir wake lock quando a aba voltar a ficar visível (browser libera automaticamente)
document.addEventListener('visibilitychange', async () => {
    if (document.visibilityState === 'visible') {
        console.log('👁️ [VISIBILITY] Aba visível novamente');
        // Re-ativar AudioContext se foi suspenso
        if (audioContext && audioContext.state === 'suspended') {
            try { await audioContext.resume(); } catch (_) {}
        }
        // Re-adquirir wake lock se o alerta ainda estiver ativo
        if (alertInterval && !wakeLockSentinel) {
            requestWakeLock();
        }
        // Forçar replay só se não há replay pendente (respeita o gap de 15s).
        // Se replayTimer está set, o gap normal está rolando — não interromper.
        if (alertInterval && audioAlert && audioEnabled && !replayTimer) {
            if (audioAlert.paused) {
                audioAlert.currentTime = 0;
                audioAlert.play().catch(() => {});
            }
        }
    }
});

// FUNÇÃO: OBTER PRÓXIMO ID DO FORNECEDOR
// ⚡ OTIMIZAÇÃO BANDA: usa o `allOrders` em memória (já populado pelo listener
// child_*) em vez de fazer once('value') na raiz orders (~11.5 MB por chamada).
async function getNextProviderId(orderId) {
    try {
        let maxId = -1;
        Object.values(allOrders).forEach(order => {
            if (shouldShowOrder(order) && order.providerId) {
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
// Preferencia: sombraDisplayNumber (atomico, server-side, sequencial global)
// Fallback: providerId (legado, alocado client-side por max+1 — race-prone)
function getProviderOrderId(order) {
    if (typeof order.providerDisplayNumber === 'number') {
        return String(order.providerDisplayNumber).padStart(5, '0');
    }
    if (PROVIDER_NAME === 'SOMBRA' && typeof order.sombraDisplayNumber === 'number') {
        return String(order.sombraDisplayNumber).padStart(5, '0');
    }
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
        // Navegação e UI
        title: '订单面板',
        subtitle: '实时订单管理系统',
        menuMain: '主菜单',
        orders: '订单',
        history: '历史记录',
        quickActions: '快捷操作',
        stopAlert: '停止提醒',
        changeLanguage: '切换语言',
        pending: '待处理',
        completed: '已完成',
        activeOrders: '活动订单',
        realTimeManagement: '实时管理系统',
        noOrders: '暂无订单',
        searchPlaceholder: '搜索订单号、Discord或登录凭据',
        enableSound: '点击启用声音',

        // Pedidos
        orderNumber: '订单号',
        orderId: '订单编号',
        cart: '购物车',
        totalOrder: '订单总额',
        account: '账户信息',
        attachments: '附件',
        comments: '评论',
        addComment: '添加评论...',

        // Tipos de pedido
        goldOrder: '金币订单',
        packOrder: '礼包订单',

        // Informações da conta
        loginMethod: '登录方式',
        login: '登录',
        password: '密码',
        server: '服务器',
        nickname: '昵称',

        // Status
        paused: '暂停',
        marketStatus: '市场状态',
        itemOnline: '物品在线',
        itemOffline: '物品离线',
        updatedAt: '更新于',

        // Ações
        complete: '完成订单',
        cancel: '取消订单',
        skip: '跳过',
        reactivate: '重新激活',
        delete: '删除',
        completedAt: '完成于',

        // Top Up específico
        sendCodeSection: '发送验证码给客户',
        sendNumber: '发送验证码',
        responseReceived: '客户确认收到',
        requestSMS: '请求短信验证码',
        smsCode: '短信验证码',
        clientSMSCode: '客户提供的短信验证码',
        waitingCode: '等待客户提供验证码...',
        requestGoogleAuth: '请求谷歌验证器验证码',
        googleAuthCode: '谷歌验证器验证码',
        clientGoogleAuthCode: '客户提供的谷歌验证器验证码',
        waitingGoogleAuth: '等待客户提供谷歌验证器验证码...',
        passwordWrongSection: '密码问题',
        passwordWrong: '密码错误',
        requestCorrectPassword: '请客户确认正确密码',
        clientProvidedPassword: '客户提供的正确密码',
        waitingPassword: '等待客户提供正确密码...',
        uidWrongSection: 'UID问题',
        uidWrong: 'UID错误',
        requestCorrectUid: '请客户提供正确的UID',
        clientProvidedUid: '客户提供的正确UID',
        waitingUid: '等待客户提供正确的UID...',
        gmailWrongSection: 'Gmail问题',
        gmailWrong: 'Gmail错误',
        requestCorrectGmail: '请客户提供正确的Gmail',
        clientProvidedGmail: '客户提供的正确Gmail',
        waitingGmail: '等待客户提供正确的Gmail...',
        phoneRequestSection: '电话号码',
        phoneRequest: '请求完整电话号码',
        requestPhone: '请客户发送完整电话号码',
        clientProvidedPhone: '客户提供的电话号码',
        waitingPhone: '等待客户提供电话号码...',
        emailCodeSection: '邮箱验证码',
        emailCode: '邮箱验证码错误',
        requestEmailCode: '请客户提供邮箱验证码',
        clientProvidedEmailCode: '客户提供的邮箱验证码',
        waitingEmailCode: '等待客户提供邮箱验证码...',
        requestAcceptance: '请求手机确认',
        sendRequest: '发送请求',
        clientAccepted: '客户已接受',

        // Código de segurança
        requestSecurityCode: '请求安全码',
        securityCode: '安全码',
        waitingSecurityCode: '等待客户提供安全码...',
        copyCodes: '复制代码',
        codesCopied: '代码已复制!',
        resendRequest: '重新发送请求',

        // Gold
        totalGold: '总金币',
        dividedInto: '分割为',
        announcements: '个市场公告',
        announcement: '公告',

        // Confirmações
        confirmComplete: '确定完成此订单吗？',
        confirmCancel: '确定要取消此订单吗？',
        confirmSkip: '确定要跳过此订单并询问客户是否在线吗？',
        confirmReactivate: '确定要重新激活此订单吗？',
        confirmDelete: '确定要从历史记录中删除此订单吗？',
        confirmSecurityCode: '确定要请求客户提供安全码吗？',

        // Mensagens
        orderSkipped: '订单已跳过，正在询问客户...',
        orderReactivated: '订单已重新激活',
        orderCompleted: '订单已完成！',
        orderCancelled: '订单已取消！',
        deleted: '已删除',
        resend: '重新激活',
        confirmResend: '确定要将此订单重新激活为待处理吗？\n\n它将返回到待处理订单列表。',
        resent: '订单已重新激活！',
        requestSent: '已发送请求',
        codeSent: '验证码已发送到客户',
        orderTransferred: '订单已转移到',
        soundStopped: '已停止提醒',
        soundAlert: '声音提醒',
        alertActivated: '提醒已开启',
        languageChanged: '语言已切换',

        // Validação de inputs
        enterCode: '请输入验证码',
        enterValidCode: '请输入有效的验证码 (0-99 或 000)',
        enterResponse: '请输入回复',
        enterComment: '请输入评论',

        // Histórico
        noHistory: '暂无历史记录',

        // Visualização
        markViewed: '标记已读',
        viewed: '已读',
        markedViewed: '已标记为已读',

        // Comprovante de Compra (Gold Providers)
        purchaseProof: '购买凭证',
        uploadProof: '上传凭证',
        pasteOrUpload: '粘贴图片 (Ctrl+V) 或点击上传',
        proofUploaded: '凭证已上传!',
        proofRequired: '请先上传购买凭证',
        uploadingProof: '正在上传凭证...',
        viewProof: '查看凭证',

        // Copiar Login
        copyLogin: '📋 复制登录信息',
        copyLoginTitle: '复制完整登录信息',
        copyLoginSuccess: '✅ 登录信息已成功复制！',
        item: '项目'
    },
    pt: {
        // Navegação e UI
        title: 'Painel de Pedidos',
        subtitle: 'Sistema de Gerenciamento em Tempo Real',
        menuMain: 'Menu Principal',
        orders: 'Pedidos',
        history: 'Histórico',
        quickActions: 'Ações Rápidas',
        stopAlert: 'Parar Alerta',
        changeLanguage: 'Mudar Idioma',
        pending: 'Pendentes',
        completed: 'Concluídos',
        activeOrders: 'Pedidos Ativos',
        realTimeManagement: 'Gerenciamento em tempo real',
        noOrders: 'Nenhum pedido',
        searchPlaceholder: 'Buscar por ID, Discord ou Credenciais',
        enableSound: 'Clique para ativar som',

        // Pedidos
        orderNumber: 'Número do Pedido',
        orderId: 'ID do Pedido',
        cart: 'Carrinho',
        totalOrder: 'Total do Pedido',
        account: 'Informações da Conta',
        attachments: 'Anexos',
        comments: 'Comentários',
        addComment: 'Adicionar comentário...',

        // Tipos de pedido
        goldOrder: 'Pedido de Gold',
        packOrder: 'Pedido de Pacote',

        // Informações da conta
        loginMethod: 'Método de Login',
        login: 'Login',
        password: 'Senha',
        server: 'Servidor',
        nickname: 'Apelido',

        // Status
        paused: 'PAUSADO',
        marketStatus: 'Status do Mercado',
        itemOnline: 'Item Online',
        itemOffline: 'Item Offline',
        updatedAt: 'Atualizado em',

        // Ações
        complete: 'Completar',
        cancel: 'Cancelar',
        skip: 'Skip',
        reactivate: 'Reativar',
        delete: 'Deletar',
        completedAt: 'Concluído em',

        // Top Up específico
        sendCodeSection: 'Enviar Código ao Cliente',
        sendNumber: 'Enviar',
        responseReceived: 'Cliente confirmou recebimento',
        requestSMS: 'Solicitar SMS',
        smsCode: 'Código SMS',
        clientSMSCode: 'Código SMS do Cliente',
        waitingCode: 'Aguardando código...',
        requestGoogleAuth: 'Solicitar Google Authenticator',
        googleAuthCode: 'Código Google Auth',
        clientGoogleAuthCode: 'Código Google Auth do Cliente',
        waitingGoogleAuth: 'Aguardando código do Google Auth...',
        passwordWrongSection: 'Senha',
        passwordWrong: 'Senha errada',
        requestCorrectPassword: 'Pedir senha correta ao cliente',
        clientProvidedPassword: 'Senha correta informada',
        waitingPassword: 'Aguardando senha correta...',
        uidWrongSection: 'UID',
        uidWrong: 'UID errado',
        requestCorrectUid: 'Pedir UID correto ao cliente',
        clientProvidedUid: 'UID correto informado',
        waitingUid: 'Aguardando UID correto...',
        gmailWrongSection: 'Gmail',
        gmailWrong: 'Gmail errado',
        requestCorrectGmail: 'Pedir Gmail correto ao cliente',
        clientProvidedGmail: 'Gmail correto informado',
        waitingGmail: 'Aguardando Gmail correto...',
        phoneRequestSection: 'Telefone',
        phoneRequest: 'Solicitar número de telefone',
        requestPhone: 'Pedir número de telefone completo ao cliente',
        clientProvidedPhone: 'Telefone informado',
        waitingPhone: 'Aguardando telefone...',
        emailCodeSection: 'Código no E-mail',
        emailCode: 'Código no e-mail',
        requestEmailCode: 'Pedir código do e-mail ao cliente',
        clientProvidedEmailCode: 'Código do e-mail informado',
        waitingEmailCode: 'Aguardando código do e-mail...',
        requestAcceptance: 'Solicitar Aceitação',
        sendRequest: 'Enviar Solicitação',
        clientAccepted: 'Cliente Aceitou',

        // Código de segurança
        requestSecurityCode: 'Pedir Código de Segurança',
        securityCode: 'Código de Segurança',
        waitingSecurityCode: 'Aguardando cliente enviar código...',
        copyCodes: 'Copiar Código',
        codesCopied: 'Código copiado!',
        resendRequest: 'Reenviar Solicitação',

        // Gold
        totalGold: 'Total Gold',
        dividedInto: 'Dividido em',
        announcements: 'anúncios',
        announcement: 'Anúncio',

        // Confirmações
        confirmComplete: 'Confirmar conclusão do pedido?',
        confirmCancel: 'Tem certeza que deseja cancelar?',
        confirmSkip: 'Tem certeza que deseja pular este pedido?',
        confirmReactivate: 'Tem certeza que deseja reativar este pedido?',
        confirmDelete: 'Tem certeza que deseja deletar este pedido do histórico?',
        confirmSecurityCode: 'Tem certeza que deseja solicitar o código de segurança?',

        // Mensagens
        orderSkipped: 'Pedido pulado, perguntando ao cliente...',
        orderReactivated: 'Pedido reativado!',
        orderCompleted: 'Pedido concluído!',
        orderCancelled: 'Pedido cancelado!',
        deleted: 'Deletado com sucesso',
        resend: 'Reenviar como Ativo',
        confirmResend: 'Tem certeza que deseja reenviar este pedido como ativo?\n\nEle voltará para a lista de pedidos pendentes.',
        resent: 'Pedido reenviado como ativo!',
        requestSent: 'Solicitação enviada!',
        codeSent: 'Código enviado ao cliente',
        orderTransferred: 'Pedido transferido para',
        soundStopped: 'Som parado',
        soundAlert: 'Alerta Sonoro',
        alertActivated: 'Alerta ativado',
        languageChanged: 'Idioma alterado',

        // Validação de inputs
        enterCode: 'Digite o código',
        enterValidCode: 'Digite um código válido (0-99 ou 000)',
        enterResponse: 'Digite uma resposta',
        enterComment: 'Digite um comentário',

        // Visualização
        markViewed: 'Marcar como Visto',
        viewed: 'Visualizado',
        markedViewed: 'Marcado como visualizado',

        // Histórico
        noHistory: 'Nenhum histórico',

        // Comprovante de Compra (Gold Providers)
        purchaseProof: 'Comprovante de Compra',
        uploadProof: 'Enviar Comprovante',
        pasteOrUpload: 'Cole uma imagem (Ctrl+V) ou clique para upload',
        proofUploaded: 'Comprovante enviado!',
        proofRequired: 'Envie o comprovante antes de completar',
        uploadingProof: 'Enviando comprovante...',
        viewProof: 'Ver Comprovante',

        // Copiar Login
        copyLogin: '📋 Copiar Login',
        copyLoginTitle: 'Copiar Login Completo',
        copyLoginSuccess: '✅ Login copiado com sucesso!',
        item: 'Item'
    }
};

// INICIALIZAÇÃO
document.addEventListener('DOMContentLoaded', async () => {
    await ensureAxios();

    if (window.db) {
        console.log(`✅ Firebase conectado ao dashboard ${PROVIDER_NAME}`);
        ensureWorkflowSections();
        ensureProviderStaffButton();
        startProviderPresence();
        loadOrders();
        loadOrderSecrets();
        setInterval(updateStats, 1000);

        // Aplicar tradução inicial
        updateFullUI();

        // Solicitar permissão para notificações
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }

        // Mostrar seção de pedidos por padrão
        showSection('orders');

        // 🔋 KEEPALIVE: tenta criar AudioContext desde o load (truque do
        // Spotify/YouTube — Chrome não suspende abas com áudio "ativo" mesmo
        // que silencioso). Sem isso, abas em background são descartadas em
        // ~5min e o WebSocket do Firebase fecha; quando o operador volta,
        // os pedidos chegam todos de uma vez (causa do "demora 15min").
        // Custo Firebase: ZERO. Custo CPU: oscilador silencioso (negligível).
        try {
            initAudioKeepalive();
        } catch (_) {}

        // Diagnóstico: logar quando o socket Firebase cai/volta. Se o problema
        // de delay reaparecer, esses logs no console do navegador confirmam
        // se foi desconexão ou outra coisa.
        try {
            window.db.ref('.info/connected').on('value', (snap) => {
                if (snap.val() === true) {
                    console.log(`🟢 [${new Date().toLocaleTimeString()}] Firebase conectado`);
                } else {
                    console.warn(`🔴 [${new Date().toLocaleTimeString()}] Firebase desconectado — pedidos novos podem atrasar até reconectar`);
                }
            });
        } catch (_) {}
    } else {
        console.error('❌ Firebase não disponível!');
    }
});

// Backup: se o browser bloquear AudioContext até o primeiro gesture (Chrome
// faz isso), captura QUALQUER interação e ressuscita. {once} pra não vazar.
['pointerdown', 'keydown', 'touchstart'].forEach(ev => {
    document.addEventListener(ev, () => {
        try {
            if (!audioContext) initAudioKeepalive();
            if (audioContext && audioContext.state === 'suspended') {
                audioContext.resume().catch(() => {});
            }
        } catch (_) {}
    }, { once: true, capture: true });
});

// CARREGAR PEDIDOS
// ⚡ OTIMIZAÇÃO BANDA: três consultas pequenas, todas em campos indexados.
// Não usar orderByKey(): pedidos atuais usam IDs aleatórios `ORDER_I_<hash>`,
// portanto a ordem alfabética da chave excluía pedidos recentes/ativos da janela.
// Medição em produção (28/07/2026): pending ~99 KB, cancelados ~1 MB e os 500
// concluídos mais recentes ~946 KB. Total inicial ~2 MB, depois apenas deltas.
const ORDERS_HISTORY_WINDOW = 500;
function loadOrders() {
    const orderQueries = [
        {
            name: 'pending',
            ref: window.db.ref('orders').orderByChild('status').equalTo('pending')
        },
        {
            name: 'recent-history',
            ref: window.db.ref('orders').orderByChild('completedAt').limitToLast(ORDERS_HISTORY_WINDOW)
        },
        {
            name: 'cancelled',
            ref: window.db.ref('orders').orderByChild('status').equalTo('cancelled')
        }
    ];
    const sourcesByOrder = new Map();
    let initialLoadDone = false;
    let pendingRender = null;

    const scheduleRender = () => {
        if (pendingRender) return;
        pendingRender = setTimeout(() => {
            pendingRender = null;
            renderCurrentSection();
            updateStats();
            if (initialLoadDone) checkNewOrders();
        }, 150);
    };

    // Marca initial load como concluído após settle period — evita disparar
    // notificação para pedidos pendentes pré-existentes ao abrir o painel.
    setTimeout(() => {
        initialLoadDone = true;
        console.log(`📦 Initial load completo: ${Object.keys(allOrders).length} pedidos`);
    }, 2000);

    // Handlers extraídos pra poder dar .off() depois (evitar vazamento Firebase).
    const addSource = (orderId, sourceName) => {
        const sources = sourcesByOrder.get(orderId) || new Set();
        sources.add(sourceName);
        sourcesByOrder.set(orderId, sources);
    };
    const removeSource = (orderId, sourceName) => {
        const sources = sourcesByOrder.get(orderId);
        if (!sources) return true;
        sources.delete(sourceName);
        if (sources.size > 0) return false;
        sourcesByOrder.delete(orderId);
        return true;
    };
    const addedHandler = (sourceName) => (snap) => {
        addSource(snap.key, sourceName);
        allOrders[snap.key] = snap.val();
        applySecretToOrder(snap.key); // reaplica senha do cofre (se já chegou)
        if (!initialLoadDone) notifiedOrders.add(snap.key);
        scheduleRender();
    };
    const changedHandler = (sourceName) => (snap) => {
        addSource(snap.key, sourceName);
        allOrders[snap.key] = snap.val();
        applySecretToOrder(snap.key); // o snap do orders/ vem sem senha — reaplica
        scheduleRender();
    };
    const removedHandler = (sourceName) => (snap) => {
        if (removeSource(snap.key, sourceName)) delete allOrders[snap.key];
        scheduleRender();
    };
    const listeners = orderQueries.map(({ name, ref }) => {
        const added = addedHandler(name);
        const changed = changedHandler(name);
        const removed = removedHandler(name);
        ref.on('child_added', added);
        ref.on('child_changed', changed);
        ref.on('child_removed', removed);
        return { ref, added, changed, removed };
    });

    // Cleanup ao fechar página (evita listeners vazando 24h/dia).
    window.addEventListener('beforeunload', () => {
        listeners.forEach(({ ref, added, changed, removed }) => {
            try {
                ref.off('child_added', added);
                ref.off('child_changed', changed);
                ref.off('child_removed', removed);
            } catch (_) {}
        });
    });
}

// Injeta a senha do cofre no order já carregado (all downstream lê account.password).
function applySecretToOrder(orderId) {
    const o = allOrders[orderId];
    const pw = orderSecrets[orderId];
    if (o && pw) {
        if (!o.account) o.account = {};
        o.account.password = pw;
    }
}

// Escuta o cofre efêmero orderSecrets/ (só senhas de pedidos EM ANDAMENTO —
// some na conclusão). Nó pequeno. Ao chegar/mudar, injeta no allOrders e
// re-renderiza. Pedidos legados sem cofre continuam usando a senha do order.
function loadOrderSecrets() {
    const secretsRef = window.db.ref('orderSecrets');
    const apply = (orderId, pw) => {
        if (pw) orderSecrets[orderId] = pw;
        else delete orderSecrets[orderId];
        applySecretToOrder(orderId);
        renderCurrentSection();
    };
    secretsRef.on('child_added', (snap) => apply(snap.key, (snap.val() || {}).password));
    secretsRef.on('child_changed', (snap) => apply(snap.key, (snap.val() || {}).password));
    secretsRef.on('child_removed', (snap) => apply(snap.key, null));
}

// CONTROLAR ALERTA SONORO
function startAlert() {
    // Se havia um stopAlert agendado (debounce), cancela: o pedido ativo
    // voltou dentro da janela de 5s, então não parou de verdade nada.
    if (_stopAlertTimer) {
        clearTimeout(_stopAlertTimer);
        _stopAlertTimer = null;
    }
    if (alertInterval) return;

    initAudio();

    // Toca uma vez. O listener 'ended' (em initAudio) agenda o próximo replay
    // em ALERT_INTERVAL_MS. Loop do <audio> fica desligado.
    audioAlert.loop = false;
    audioAlert.currentTime = 0;
    audioAlert.play().then(() => {
        audioEnabled = true;
        console.log(`🔊 Alerta iniciado — repete a cada ${ALERT_INTERVAL_MS / 1000}s`);
    }).catch(e => {
        console.log('⚠️ Áudio bloqueado - clique na tela para habilitar');
    });

    // Pedir Wake Lock para impedir que a tela/tab durma
    requestWakeLock();

    // Interval de backup: cobre o caso raro do 'ended' não disparar (browser
    // throttling agressivo em background). Só força replay se NÃO está tocando
    // E não há replayTimer pendente — assim respeita o gap normal de 15s.
    alertInterval = setInterval(() => {
        if (!audioEnabled) return;
        try {
            if (audioAlert.paused && !replayTimer) {
                audioAlert.currentTime = 0;
                audioAlert.play().catch(e => console.log('Áudio bloqueado'));
            }
            // Re-resume AudioContext se foi suspenso por inatividade
            if (audioContext && audioContext.state === 'suspended') {
                audioContext.resume().catch(() => {});
            }
        } catch (_) {}
    }, 30000);

    console.log('🔔 Alerta sonoro iniciado');
    updateAlertIndicator(true);
}

function stopAlert() {
    // Debounce de 5s: absorve flickers de activeOrders (itemOnline ou viewed
    // alternando rapidamente). Se startAlert for chamado dentro dos 5s,
    // ele cancela esse timer e o áudio segue tocando suavemente.
    if (_stopAlertTimer) return; // já agendado
    _stopAlertTimer = setTimeout(() => {
        _stopAlertTimer = null;
        _doStopAlert();
    }, 5000);
}

function _doStopAlert() {
    if (alertInterval) {
        clearInterval(alertInterval);
        alertInterval = null;
        console.log('🔇 Alerta sonoro parado');
        const t = translations[currentLang];
        showToast(`🔇 ${t.soundStopped}`, 'info');
    }
    // Cancelar replay agendado, se houver
    if (replayTimer) {
        clearTimeout(replayTimer);
        replayTimer = null;
    }
    // Parar o áudio
    if (audioAlert) {
        try {
            audioAlert.pause();
            audioAlert.currentTime = 0;
        } catch (_) {}
    }
    // Liberar wake lock
    releaseWakeLock();
    updateAlertIndicator(false);
}

// TOGGLE ALERTA SONORO (liga/desliga)
function toggleAlert() {
    const t = translations[currentLang];
    if (alertInterval) {
        // User pediu pra parar manualmente — para AGORA, sem debounce.
        if (_stopAlertTimer) {
            clearTimeout(_stopAlertTimer);
            _stopAlertTimer = null;
        }
        _doStopAlert();
    } else {
        // Alerta está inativo, ligar
        startAlert();
        showToast(`🔔 ${t.alertActivated}`, 'success');
    }
}

// ATUALIZAR INDICADOR VISUAL DO ALERTA
function updateAlertIndicator(isActive) {
    const indicator = document.getElementById('alert-indicator');
    const icon = document.getElementById('alert-icon');
    const text = document.getElementById('alert-text');
    const t = translations[currentLang];

    if (indicator) {
        indicator.textContent = isActive ? 'ON' : 'OFF';
        indicator.className = `alert-indicator ${isActive ? 'on' : 'off'}`;
    }

    if (icon) {
        icon.textContent = isActive ? '🔔' : '🔕';
    }

    if (text) {
        text.textContent = t.soundAlert;
    }
}

// FILTRAR HISTÓRICO (Busca Global em TODOS os pedidos)
function filterHistory(searchTerm) {
    // Resetar para página 1 ao buscar
    currentPage = 1;
    // Chamar loadHistory com o termo de busca
    loadHistory(searchTerm);
}

// SKIP DE PEDIDO
function skipOrder(orderId) {
    const t = translations[currentLang];
    // Guard contra race entre re-render do card e status no Firebase: se a
    // order ja esta completed/cancelled, o bot poll ignora o botCommand
    // (filtra pending/processing) e a mensagem "Voce esta disponivel?" nunca
    // chega no Discord. Bloqueia ANTES de gravar.
    const order = allOrders[orderId];
    if (order && (order.status === 'completed' || order.status === 'cancelled')) {
        showToast('⚠️ Pedido ja finalizado — Skip nao tem efeito.', 'warning');
        return;
    }
    if (!confirm(t.confirmSkip)) return;

    window.db.ref(`orders/${orderId}/botCommand`).set({
        type: 'askIfPresent',
        timestamp: Date.now(),
        provider: PROVIDER_NAME,
        processed: false
    })
        .then(() => {
            console.log(`⏭️ Comando Skip enviado para pedido ${orderId}`);
            return window.db.ref(`orders/${orderId}`).update({
                skipped: true,
                skippedAt: Date.now(),
                skippedBy: PROVIDER_NAME,
                workflowState: 'absent'
            });
        })
        .then(() => {
            showToast(t.orderSkipped, 'success');
        })
        .catch(error => {
            console.error('❌ Erro ao pular pedido:', error);
            showToast('Error', 'error');
        });
}

// REATIVAR PEDIDO
function reactivateOrder(orderId) {
    const t = translations[currentLang];
    if (!confirm(t.confirmReactivate)) return;

    window.db.ref(`orders/${orderId}`).update({
        skipped: false,
        skippedAt: null,
        skippedBy: null,
        customerUnavailable: false,
        workflowState: 'active',
        reactivatedAt: Date.now(),
        reactivatedBy: PROVIDER_NAME
    })
        .then(() => {
            console.log(`▶️ Pedido ${orderId} reativado`);
            showToast(t.orderReactivated, 'success');
        })
        .catch(error => {
            console.error('❌ Erro ao reativar pedido:', error);
            showToast('Error', 'error');
        });
}

// ============================================
// 👁️ MARCAR PEDIDO COMO VISUALIZADO (PARA PARAR SOM)
// ============================================
function markAsViewed(orderId) {
    const t = translations[currentLang];

    window.db.ref(`orders/${orderId}`).update({
        viewed: true,
        viewedAt: Date.now(),
        viewedBy: PROVIDER_NAME
    })
        .then(() => {
            console.log(`👁️ Pedido ${orderId} marcado como visualizado`);
            showToast(t.markedViewed, 'success');
        })
        .catch(error => {
            console.error('❌ Erro ao marcar como visualizado:', error);
            showToast('Error', 'error');
        });
}

// SOLICITAR CONFIRMAÇÃO DE LOGIN (PACOTES)
function requestLoginConfirmation(orderId) {
    const t = translations[currentLang];

    // Guard: pedido ja finalizado/cancelado — bot ignora botCommand stale,
    // evita confundir o provider com toast de sucesso falso.
    const orderRef = (allOrders && allOrders[orderId]) || null;
    if (orderRef && ['completed', 'delivered', 'cancelled'].includes(orderRef.status)) {
        showToast('Pedido ja finalizado - acao nao tem efeito.', 'warning');
        return;
    }

    window.db.ref(`orders/${orderId}/botCommand`).set({
        type: 'confirmLogin',
        timestamp: Date.now(),
        provider: PROVIDER_NAME,
        processed: false
    })
        .then(() => {
            console.log(`📱 Solicitação de confirmação enviada para ${orderId}`);
            showToast(t.requestSent, 'success');
        })
        .catch(error => {
            console.error('❌ Erro ao solicitar confirmação:', error);
            showToast('Error', 'error');
        });
}

// SOLICITAR ACEITAÇÃO NO CELULAR
function requestAcceptanceConfirmation(orderId) {
    const t = translations[currentLang];

    const orderRef = (allOrders && allOrders[orderId]) || null;
    if (orderRef && ['completed', 'delivered', 'cancelled'].includes(orderRef.status)) {
        showToast('Pedido ja finalizado - acao nao tem efeito.', 'warning');
        return;
    }

    window.db.ref(`orders/${orderId}/botCommand`).set({
        type: 'requestAcceptance',
        timestamp: Date.now(),
        provider: PROVIDER_NAME,
        processed: false
    })
        .then(() => {
            console.log(`📲 Solicitação de aceitação enviada para pedido ${orderId}`);
            showToast(t.requestSent, 'success');
        })
        .catch(error => {
            console.error('❌ Erro ao enviar solicitação:', error);
            showToast('Error', 'error');
        });
}

// ============================================
// 🔐 CÓDIGO DE SEGURANÇA (TOP UP PROVIDERS)
// ============================================
function requestSecurityCode(orderId) {
    const t = translations[currentLang];

    const orderRef = (allOrders && allOrders[orderId]) || null;
    if (orderRef && ['completed', 'delivered', 'cancelled'].includes(orderRef.status)) {
        showToast('Pedido ja finalizado - acao nao tem efeito.', 'warning');
        return;
    }

    if (!confirm(t.confirmSecurityCode)) return;

    // Enviar comando ao bot para pedir código de segurança
    window.db.ref(`orders/${orderId}/botCommand`).set({
        type: 'requestSecurityCode',
        timestamp: Date.now(),
        provider: PROVIDER_NAME,
        processed: false
    })
        .then(() => {
            // Marcar que foi solicitado
            return window.db.ref(`orders/${orderId}/securityCodeRequest`).set({
                requested: true,
                requestedAt: Date.now(),
                requestedBy: PROVIDER_NAME,
                code: null
            });
        })
        .then(() => {
            console.log(`🔐 Solicitação de código de segurança enviada para ${orderId}`);
            const t = translations[currentLang];
            showToast(t.requestSent, 'success');
        })
        .catch(error => {
            console.error('❌ Erro ao solicitar código de segurança:', error);
            showToast('Error', 'error');
        });
}

// COPIAR LOGIN COMPLETO FORMATADO
function copyFullLogin(orderId) {
    const order = allOrders[orderId];
    if (!order) return;

    const t = translations[currentLang];
    const gameName = currentLang === 'cn' ? (GAME_NAMES_CN[order.game] || order.gameName || order.game) : (order.gameName || order.game);
    const providerId = getProviderOrderId(order);
    const account = order.account || {};

    // Formatar itens do carrinho
    let cartText = '';
    if (order.cart && order.cart.length > 0) {
        cartText = order.cart.map(item => `${item.pack || item.gold || t.item} x${item.quantity || 1}`).join('\n');
    }

    // Calcular total USD (mesma lógica do card)
    let calculatedTotalUSD = 0;
    let hasFaceValue = false;
    if (order.cart && order.cart.length > 0) {
        order.cart.forEach(item => {
            if (item.totalFaceValueUSD) {
                calculatedTotalUSD += item.totalFaceValueUSD;
                hasFaceValue = true;
            } else {
                const packName = item.pack || '';
                const match = packName.match(/(\d+(?:\.\d+)?)\s*\$|\$\s*(\d+(?:\.\d+)?)/);
                if (match) {
                    const val = parseFloat(match[1] || match[2]);
                    calculatedTotalUSD += val * (item.quantity || 1);
                    hasFaceValue = true;
                } else {
                    calculatedTotalUSD += (item.totalUSD || item.priceUSD || 0);
                }
            }
        });
    }
    const totalUSD = hasFaceValue ? calculatedTotalUSD : (order.totalUSD || (order.cashbackData ? order.cashbackData.totalUSD : 0) || calculatedTotalUSD);

    // Montar o texto final
    let textToCopy = `${gameName}\n`;
    textToCopy += `${t.orderId}\n#${providerId}\n\n`;
    textToCopy += `${t.cart}:\n${cartText}\n`;
    textToCopy += `${t.totalOrder}: $${totalUSD.toFixed(2)}\n\n`;
    textToCopy += `${t.account}\n`;
    if (account.loginMethod) textToCopy += `${t.loginMethod}: ${account.loginMethod}\n`;
    if (account.login) textToCopy += `${t.login}: ${account.login}\n`;
    if (account.password) textToCopy += `${t.password}: ${account.password}\n`;
    if (account.server) textToCopy += `${t.server}: ${account.server}\n`;
    if (account.nickname) textToCopy += `${t.nickname}: ${account.nickname}\n`;
    if (account.uid) textToCopy += `UID: ${account.uid}\n`;

    navigator.clipboard.writeText(textToCopy).then(() => {
        showToast(t.copyLoginSuccess, 'success');
    }).catch(err => {
        console.error('Erro ao copiar:', err);
        const textarea = document.createElement('textarea');
        textarea.value = textToCopy;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        showToast(t.copyLoginSuccess, 'success');
    });
}

// EXPANDIR / RECOLHER FERRAMENTAS DO PEDIDO (DOG + DAODAO)
function toggleProviderOrderDetails(orderId) {
    const card = Array.from(document.querySelectorAll('.compact-provider-order'))
        .find(element => element.dataset.orderId === String(orderId));
    if (!card) return;

    const shouldOpen = !card.classList.contains('details-open');
    card.classList.toggle('details-open', shouldOpen);

    if (shouldOpen) expandedProviderOrders.add(String(orderId));
    else expandedProviderOrders.delete(String(orderId));

    const button = card.querySelector('.compact-toggle-details');
    if (button) button.setAttribute('aria-expanded', shouldOpen ? 'true' : 'false');
}

function restoreExpandedProviderOrders(scope = document) {
    scope.querySelectorAll('.compact-provider-order').forEach(card => {
        const shouldOpen = expandedProviderOrders.has(String(card.dataset.orderId));
        card.classList.toggle('details-open', shouldOpen);
        const button = card.querySelector('.compact-toggle-details');
        if (button) button.setAttribute('aria-expanded', shouldOpen ? 'true' : 'false');
    });
}

// COPIAR CÓDIGO DE SEGURANÇA
function copySecurityCodes(code) {
    const t = translations[currentLang];
    const textToCopy = `${code}`;
    navigator.clipboard.writeText(textToCopy).then(() => {
        showToast(`✅ ${t.codesCopied}`, 'success');
    }).catch(err => {
        console.error('Erro ao copiar:', err);
        // Fallback para navegadores mais antigos
        const textarea = document.createElement('textarea');
        textarea.value = textToCopy;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        showToast(`✅ ${t.codesCopied}`, 'success');
    });
}

// DELETAR DO HISTÓRICO
function deleteFromHistory(orderId) {
    const t = translations[currentLang];
    if (!confirm(t.confirmDelete)) return;

    window.db.ref(`orders/${orderId}`).remove()
        .then(() => {
            console.log(`✅ Pedido ${orderId} deletado do histórico`);
            showToast(t.deleted, 'success');
            loadHistory();
        })
        .catch(err => {
            console.error('❌ Erro ao deletar:', err);
            showToast('Error', 'error');
        });
}

// REENVIAR DO HISTÓRICO COMO ATIVO (volta para pending)
function resendFromHistory(orderId) {
    const t = translations[currentLang];
    if (!confirm(t.confirmResend)) return;

    // Reativar pedido concluído: o cofre da senha já foi apagado na conclusão.
    // Se o pedido usava login/senha e não há mais senha no cofre, avisa o
    // fornecedor pra pedir a senha ao cliente antes de reprocessar.
    const _o = allOrders[orderId] || {};
    const _acct = _o.account || {};
    if (_acct.login && !orderSecrets[orderId]) {
        const warn = currentLang === 'zh'
            ? '⚠️ 该订单的密码已不在保险库中（完成时已删除）。请先向客户索取密码，再重新激活。是否继续？'
            : '⚠️ A senha deste pedido não está mais no cofre (apagada na conclusão). Peça a senha ao cliente antes de reprocessar. Continuar mesmo assim?';
        if (!confirm(warn)) return;
    }

    window.db.ref(`orders/${orderId}`).update({
        status: 'pending',
        workflowState: 'active',
        skipped: false,
        skippedAt: null,
        skippedBy: null,
        completedAt: null,
        resentAt: Date.now(),
        resentBy: PROVIDER_NAME
    })
    .then(() => {
        console.log(`🔄 Pedido ${orderId} reenviado como ativo por ${PROVIDER_NAME}`);
        showToast(t.resent, 'success');
        loadHistory();
        loadOrders();
    })
    .catch(err => {
        console.error('❌ Erro ao reenviar:', err);
        showToast('Error', 'error');
    });
}

// NOTIFICAÇÕES
function checkNewOrders() {
    Object.keys(allOrders).forEach(async orderId => {
        const order = allOrders[orderId];
        if (order.status === 'pending' &&
            shouldShowOrder(order) &&
            !notifiedOrders.has(orderId)) {
            notifiedOrders.add(orderId);
            console.log('🔔 Novo pedido!');

            if (typeof order.providerDisplayNumber !== 'number' && (!order.providerId || order.providerId === '00000' || order.providerId === 'null')) {
                const providerId = await getNextProviderId(orderId);
                console.log(`✅ ID atribuído ao pedido: #${providerId}`);
            }

            if ('Notification' in window && Notification.permission === 'granted') {
                try {
                    const n = new Notification(`🎮 新订单！ - ${PROVIDER_NAME}`, {
                        body: `${GAME_NAMES_CN[order.game]} - ${order.cart.length} 项`,
                        requireInteraction: true,  // 🔔 fica visível até o fornecedor clicar
                        tag: `order-${orderId}`,    // evita duplicar notificação do mesmo pedido
                        silent: false
                    });
                    // Ao clicar, foca a aba
                    n.onclick = () => {
                        window.focus();
                        n.close();
                    };
                } catch (e) {
                    console.warn('⚠️ Erro ao criar notificação:', e?.message);
                }
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
        o.status === 'pending' && shouldShowOrder(o) && getWorkflowState(o) === 'active'
    );

    // ════════════════════════════════════════════════════════════
    // 🔊 CONTROLE DE ALERTA SONORO
    // ════════════════════════════════════════════════════════════
    // Para TOP UP: Som toca se não estiver visualizado (!viewed) e não pulado (!skipped)
    // Para GOLD: Som só toca se o item estiver online no mercado (itemOnline === true)
    let activeOrders;

    if (typeof IS_TOPUP_PROVIDER !== 'undefined' && IS_TOPUP_PROVIDER === true) {
        // TOP UP: som para quando marcar como visualizado
        activeOrders = myOrders.filter(o => !o.skipped && !o.viewed);
    } else {
        // GOLD: som só toca quando item está online no mercado
        activeOrders = myOrders.filter(o => !o.skipped && o.itemOnline === true);
    }

    if (activeOrders.length > 0) {
        startAlert();
    } else {
        stopAlert();
    }

    console.log(`✅ Pedidos filtrados para ${PROVIDER_NAME}: ${myOrders.length}`);

    if (myOrders.length === 0) {
        container.innerHTML = '';
        if (noOrdersMsg) noOrdersMsg.style.display = 'flex';
        return;
    }

    if (noOrdersMsg) noOrdersMsg.style.display = 'none';

    // Garantir que todos os pedidos tenham providerId válido
    for (const order of myOrders) {
        if (typeof order.providerDisplayNumber !== 'number' && (!order.providerId || order.providerId === '00000' || order.providerId === 'null')) {
            const newProviderId = await getNextProviderId(order.orderId);
            order.providerId = newProviderId;
        }
    }

    container.innerHTML = myOrders.map(order => renderOrderCard(order, t, false, 'active')).join('');
    restoreExpandedProviderOrders(container);
}

async function renderWorkflowSection(section) {
    const definitions = {
        absent: { container: 'absent-orders', state: 'absent', mode: 'absent', empty: 'Nenhum cliente ausente.' },
        cancelled: { container: 'cancelled-orders', state: 'cancelled', mode: 'cancelled', empty: 'Nenhum pedido cancelado.' },
        problems: { container: 'problem-orders', state: 'problem_pending', mode: 'problem_pending', empty: 'Nenhum problema em espera.' },
        'problems-resolved': { container: 'resolved-problem-orders', state: 'problem_resolved', mode: 'problem_resolved', empty: 'Nenhum problema resolvido.' }
    };
    const def = definitions[section];
    if (!def) return;
    const container = document.getElementById(def.container);
    if (!container) return;
    const t = translations[currentLang];
    const orders = Object.values(allOrders)
        .filter(order => shouldShowOrder(order) && getWorkflowState(order) === def.state)
        .sort((a, b) => Number(b.timestamp || 0) - Number(a.timestamp || 0));

    if (!orders.length) {
        container.innerHTML = `<div class="no-orders-msg"><div class="icon">📋</div><p>${def.empty}</p></div>`;
        return;
    }
    for (const order of orders) {
        if (typeof order.providerDisplayNumber !== 'number' && (!order.providerId || order.providerId === '00000' || order.providerId === 'null')) {
            order.providerId = await getNextProviderId(order.orderId);
        }
    }
    container.innerHTML = orders.map(order => renderOrderCard(order, t, false, def.mode)).join('');
    restoreExpandedProviderOrders(container);
}

// RENDERIZAR CARD DE PEDIDO (REUTILIZÁVEL)
function renderOrderCard(order, t, isCompleted = false, viewMode = null) {
    const mode = viewMode || (isCompleted ? 'completed' : getWorkflowState(order));
    const isLockedView = isCompleted || mode === 'cancelled' || mode === 'problem_resolved';
    const escapeHtml = (value) => {
        return String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    };

    const rawClientName = order?.client?.username || order?.clientUsername || order?.username || '';
    const clientName = escapeHtml(rawClientName);
    const isCompactProviderUi = ['DOG', 'DAODAO'].includes(String(PROVIDER_NAME || '').toUpperCase());
    const authNumberResendLabel = currentLang === 'cn'
        ? '\u5ba2\u6237\u672a\u6536\u5230\uff1f\u91cd\u65b0\u53d1\u9001'
        : 'Cliente n\u00e3o recebeu? Reenviar';
    const authNumberSentLabel = currentLang === 'cn'
        ? '\u5df2\u53d1\u9001\u53f7\u7801'
        : 'N\u00famero enviado';
    const authNumberHelp = currentLang === 'cn'
        ? '\u5982\u679c\u5ba2\u6237\u6ca1\u6709\u6536\u5230\uff0c\u8bf7\u70b9\u51fb\u4e0b\u65b9\u6309\u94ae\u91cd\u53d1\u3002'
        : 'Se o cliente n\u00e3o recebeu, use o bot\u00e3o abaixo para reenviar.';

    const hasAuthRequest = order.authRequest && order.authRequest.requested;
    const gameImage = GAME_IMAGES[order.game] || '';
    const isSkipped = order.skipped === true;
    const isViewed = order.viewed === true;
    const hasSecurityCodeRequest = order.securityCodeRequest && order.securityCodeRequest.requested;
    // Arquitetura unificada: .code (singular). Fallback legado: code1+code2 (ordens pre-deploy).
    const securityCodeData = order.securityCodeRequest || {};
    const unifiedSecurityCode = typeof securityCodeData.code === 'string'
        ? securityCodeData.code.trim()
        : '';
    const securityCodeParts = unifiedSecurityCode
        ? unifiedSecurityCode.split(/\s+/).filter(Boolean)
        : [securityCodeData.code1, securityCodeData.code2]
            .map(value => String(value || '').trim())
            .filter(Boolean);
    const securityCode = securityCodeParts.join(' ');
    const chineseCodeData = order.chineseCode || {};
    const lastChineseCode = /^\d{1,2}$/.test(String(chineseCodeData.code || '').trim())
        ? String(chineseCodeData.code).trim()
        : '';

    // Calcular total em USD se não existir no objeto do pedido
    // Calcular total em USD (Prioridade: Valor de Face extraído do nome do pacote)
    let calculatedTotalUSD = 0;
    let hasFaceValue = false;

    if (order.cart && order.cart.length > 0) {
        order.cart.forEach(item => {
            // Prioridade 1: Valor de face total já calculado pelo bot
            if (item.totalFaceValueUSD) {
                calculatedTotalUSD += item.totalFaceValueUSD;
                hasFaceValue = true;
            } else {
                // Prioridade 2: Tentar extrair valor numérico do nome (ex: "Pacote 10$", "$10", "10 USD")
                const packName = item.pack || '';
                const match = packName.match(/(\d+(?:\.\d+)?)\s*\$|\$\s*(\d+(?:\.\d+)?)/);

                if (match) {
                    const val = parseFloat(match[1] || match[2]);
                    calculatedTotalUSD += val * (item.quantity || 1);
                    hasFaceValue = true;
                } else {
                    // Fallback para o valor salvo no item
                    calculatedTotalUSD += (item.totalUSD || item.priceUSD || 0);
                }
            }
        });
    }

    // Se encontrou valores de face (ex: 10$, 50$), prioriza a soma deles para o fornecedor
    // Caso contrário, usa o total do pedido ou o cashbackData
    const totalUSD = hasFaceValue ? calculatedTotalUSD : (order.totalUSD || (order.cashbackData ? order.cashbackData.totalUSD : 0) || calculatedTotalUSD);
    const calculatedTotalBRL = Array.isArray(order.cart)
        ? order.cart.reduce((sum, item) => sum + (Number(item?.totalBRL) || 0), 0)
        : 0;
    const storedTotalBRL = Number(order.totalBRL || order.cashbackData?.totalBRL || 0);
    const totalBRL = storedTotalBRL > 0 ? storedTotalBRL : calculatedTotalBRL;
    const paymentMethod = escapeHtml(order.paymentMethod || order.cashbackData?.paymentMethod || '');
    const isProviderDetailsOpen = isCompactProviderUi && expandedProviderOrders.has(String(order.orderId));
    const hasProviderReply = Boolean(
        (hasAuthRequest && order.authRequest.response) || securityCode
    );
    const compactAccount = order.account || {};
    const compactLogin = escapeHtml(compactAccount.login || compactAccount.email || compactAccount.uid || '-');
    const compactPassword = escapeHtml(compactAccount.password || '');
    const compactServer = escapeHtml(compactAccount.server || '');
    const compactNickname = escapeHtml(compactAccount.nickname || '');
    const compactCartText = Array.isArray(order.cart) && order.cart.length
        ? order.cart.slice(0, 2).map(item => {
            const name = escapeHtml(item.pack || item.gold || 'Item');
            return `${name} x${Number(item.quantity) || 1}`;
        }).join(' + ')
        : '-';
    const compactCartExtra = Array.isArray(order.cart) ? Math.max(0, order.cart.length - 2) : 0;
    const compactAttachments = Array.isArray(order.attachments) ? order.attachments : [];

    return `
    <div class="order-card ${isCompactProviderUi ? 'compact-provider-order' : ''} ${order.account && Object.keys(order.account).length > 0 ? 'has-account' : ''} ${order.attachments && order.attachments.length > 0 ? 'has-attachments' : ''} ${isSkipped ? 'skipped' : ''} ${isLockedView ? 'completed' : ''} workflow-${mode} ${isViewed ? 'viewed' : ''}" data-order-id="${order.orderId}" data-provider-id="${order.providerId || ''}" data-user-id="${order.userId || ''}" data-login="${order.account?.login || ''}" data-password="${order.account?.password || ''}" data-email="${order.account?.email || ''}">
        ${isLockedView ? `
        <div class="order-completed-badge">
            ${mode === 'cancelled' ? '❌ 已取消 / Cancelado' : mode === 'problem_resolved' ? '🛠️ 已解决 / Problema resolvido' : `✅ ${t.completed}`}
        </div>
        ` : ''}
        ${(mode === 'problem_pending' || mode === 'problem_resolved') && order.problem ? `
        <div class="workflow-problem-banner">
            <strong>⚠️ 问题 / Problema:</strong> ${escapeHtml(order.problem.note || '')}
            ${order.problem.resolutionNote ? `<br><strong>✅ 解决方案 / Solução:</strong> ${escapeHtml(order.problem.resolutionNote)}` : ''}
        </div>
        ` : ''}
        ${mode === 'cancelled' && order.cancelReason ? `
        <div class="workflow-cancel-banner"><strong>Motivo:</strong> ${escapeHtml(order.cancelReason)}</div>
        ` : ''}
        
        ${/* BOTÃO MARCAR COMO VISUALIZADO - APENAS PARA TOP UP E NÃO COMPLETADOS */ ''}
        ${(typeof IS_TOPUP_PROVIDER !== 'undefined' && IS_TOPUP_PROVIDER) && !isLockedView && !isCompactProviderUi ? `
        <div class="order-view-section">
            ${isViewed ? `
                <div class="viewed-badge">
                    <span>👁️ ${t.viewed}</span>
                </div>
            ` : `
                <button onclick="markAsViewed('${order.orderId}')" class="btn btn-view">
                    👁️ ${t.markViewed}
                </button>
            `}
        </div>
        ` : ''}

        ${isCompactProviderUi ? `
        <div class="compact-order-summary">
            ${gameImage ? `<img src="${gameImage}" alt="${order.game}" class="game-icon-img">` : '<div class="game-icon-placeholder">🎮</div>'}
            <div class="compact-order-heading">
                <div class="compact-order-title">
                    <span class="compact-game-name">${GAME_NAMES_CN[order.game] || order.gameName || order.game}</span>
                    <span class="compact-title-separator">·</span>
                    <span class="compact-order-number">#${getProviderOrderId(order)}</span>
                    <span class="compact-title-separator">·</span>
                    <span class="compact-client-name">${clientName || 'Cliente'}</span>
                </div>
                <div class="compact-order-meta">
                    <span class="order-type ${order.gameType}">${order.gameType === 'gold' ? t.goldOrder : t.packOrder}</span>
                    ${hasProviderReply ? '<span class="compact-reply-alert">RESPOSTA / REPLY</span>' : ''}
                    ${isSkipped ? `<span class="order-status paused">⏸️ ${t.paused}</span>` : ''}
                </div>
            </div>
            <div class="compact-summary-actions">
                ${(typeof IS_TOPUP_PROVIDER !== 'undefined' && IS_TOPUP_PROVIDER) && !isLockedView ? (isViewed ? `
                    <span class="compact-viewed" title="${t.viewed}">OK</span>
                ` : `
                    <button onclick="markAsViewed('${order.orderId}')" class="btn btn-view compact-view-action" title="${t.markViewed}">
                        ${t.markViewed}
                    </button>
                `) : ''}
                <button onclick="copyFullLogin('${order.orderId}')" class="btn btn-copy-full compact-copy-login" title="${t.copyLoginTitle}">
                    ${t.copyLogin}
                </button>
                <button onclick="toggleProviderOrderDetails('${order.orderId}')" class="btn btn-secondary compact-toggle-details" aria-expanded="${isProviderDetailsOpen ? 'true' : 'false'}">
                    <span class="details-label-closed">工具 / Ferramentas</span>
                    <span class="details-label-open">收起 / Recolher</span>
                </button>
            </div>
        </div>
        ` : ''}

        ${isCompactProviderUi ? `
        <div class="compact-vertical-preview">
            <div class="compact-preview-row preview-login-row">
                <div class="compact-preview-label">登录 / Login</div>
                <div class="compact-preview-content">
                    <span class="compact-preview-chip preview-main">
                        <small>账号 / Conta</small><strong>${compactLogin}</strong>
                    </span>
                    ${compactPassword ? `<span class="compact-preview-chip"><small>密码 / Senha</small><strong>${compactPassword}</strong></span>` : ''}
                    ${compactServer ? `<span class="compact-preview-chip"><small>服务器 / Servidor</small><strong>${compactServer}</strong></span>` : ''}
                    ${compactNickname ? `<span class="compact-preview-chip"><small>角色 / Nick</small><strong>${compactNickname}</strong></span>` : ''}
                </div>
            </div>

            <div class="compact-preview-row preview-purchase-row">
                <div class="compact-preview-label">购买 / Compra</div>
                <div class="compact-preview-content">
                    <span class="compact-preview-item">${compactCartText}${compactCartExtra ? ` +${compactCartExtra}` : ''}</span>
                    ${totalUSD > 0 ? `<span class="compact-preview-total usd">$${totalUSD.toFixed(2)}</span>` : ''}
                    ${totalBRL > 0 ? `<span class="compact-preview-total brl">R$ ${totalBRL.toFixed(2)}</span>` : ''}
                    ${paymentMethod ? `<span class="compact-preview-method">${paymentMethod}</span>` : ''}
                </div>
            </div>

            ${compactAttachments.length ? `
            <div class="compact-preview-row preview-photos-row">
                <div class="compact-preview-label">图片 / Fotos</div>
                <div class="compact-preview-content compact-preview-photos">
                    ${compactAttachments.slice(0, 4).map((url, idx) => `
                        <button type="button" class="compact-preview-photo" onclick='openImageModal(${JSON.stringify(compactAttachments)}, ${idx})'>
                            <img src="${url}" alt="Foto ${idx + 1}">
                        </button>
                    `).join('')}
                    ${compactAttachments.length > 4 ? `<span class="compact-preview-more">+${compactAttachments.length - 4}</span>` : ''}
                </div>
            </div>
            ` : ''}
        </div>
        ` : ''}
        
        <div class="order-header">
            ${gameImage ? `<img src="${gameImage}" alt="${order.game}" class="game-icon-img">` : ''}
            <div class="order-title">
                <h3>${GAME_NAMES_CN[order.game] || order.gameName}${clientName ? ` - ${clientName}` : ''}</h3>
                <span class="order-type ${order.gameType}">${order.gameType === 'gold' ? t.goldOrder : t.packOrder}</span>
            </div>
            ${isSkipped ? `<div class="order-status paused">⏸️ ${t.paused}</div>` : ''}
        </div>
        
        <div class="order-id">
            <span class="label">${t.orderId}</span>
            <span class="value">#${getProviderOrderId(order)}</span>
            <button onclick="copyFullLogin('${order.orderId}')" class="btn btn-copy-full" title="${t.copyLoginTitle}">
                ${t.copyLogin}
            </button>
        </div>
        
        <div class="order-section cart">
            <h4>${isCompactProviderUi ? '🛒 购买与支付 / Compra e pagamento' : `🛒 ${t.cart}`}</h4>
            <div class="cart-items">
                ${order.cart && order.cart.length > 0 ? order.cart.map(item => `
                    <div class="cart-item">
                        <span class="item-name">${item.pack || item.gold || 'Item'}</span>
                        <span class="item-qty">x${item.quantity || 1}</span>
                    </div>
                `).join('') : `<div class="cart-item empty">⚠️ ${t.cart}</div>`}
            </div>

            ${isCompactProviderUi ? `
                <div class="compact-payment-summary">
                    ${totalUSD > 0 ? `
                    <div class="payment-metric purchase-value">
                        <span class="payment-label">购买 / Compra</span>
                        <strong>$${totalUSD.toFixed(2)}</strong>
                    </div>` : ''}
                    ${totalBRL > 0 ? `
                    <div class="payment-metric paid-value">
                        <span class="payment-label">支付 / Pago</span>
                        <strong>R$ ${totalBRL.toFixed(2)}</strong>
                    </div>` : ''}
                    ${paymentMethod ? `
                    <div class="payment-metric payment-method">
                        <span class="payment-label">方式 / Método</span>
                        <strong>${paymentMethod}</strong>
                    </div>` : ''}
                </div>
            ` : ''}
            
            ${/* Total do Pedido para Top Up */ ''}
            ${totalUSD > 0 ? `
                <div class="order-total-usd">
                    <span class="label">${t.totalOrder}:</span>
                    <span class="value">$${totalUSD.toFixed(2)}</span>
                </div>
            ` : ''}

            ${order.gameType === 'gold' && order.game === 'mir4' && order.goldDivisions && order.goldDivisions.length > 0 ? `
                <div class="gold-total">
                    <span class="label">${t.totalGold}</span>
                    <span class="value">${order.goldWithFee?.toLocaleString('pt-BR')}</span>
                </div>
                ${order.account && order.account.server ? `
                <div class="server-highlight">
                    <span class="server-label">🌍 ${t.server}:</span>
                    <span class="server-value">${order.account.server}</span>
                </div>
                ` : ''}
                <div class="gold-divisions">
                    <p class="division-title">📋 ${t.dividedInto} ${order.goldDivisions.length} ${t.announcements}</p>
                    ${order.goldDivisions.map((part, idx) => `
                        <div class="division-item">
                            <span>${t.announcement} ${idx + 1}</span>
                            <span>${part.toLocaleString('pt-BR')} Gold</span>
                        </div>
                    `).join('')}
                </div>
            ` : ''}
        </div>
        
        ${order.account && Object.keys(order.account).length > 0 ? `
        <div class="order-section account">
            <h4>${isCompactProviderUi ? '🔐 登录信息 / Informações de login' : `🔐 ${t.account}`}</h4>
            <div class="account-info">
                ${order.account.loginMethod ? `<div class="info-row"><span class="label">${t.loginMethod}:</span><span class="value">${order.account.loginMethod}</span></div>` : ''}
                ${order.account.login ? `<div class="info-row"><span class="label">${t.login}:</span><span class="value">${order.account.login}</span></div>` : ''}
                ${order.account.password ? `<div class="info-row"><span class="label">${t.password}:</span><span class="value">${order.account.password}</span></div>` : ''}
                ${order.account.server ? `<div class="info-row"><span class="label">${t.server}:</span><span class="value">${order.account.server}</span></div>` : ''}
                ${order.account.nickname ? `<div class="info-row"><span class="label">${t.nickname}:</span><span class="value">${order.account.nickname}</span></div>` : ''}
                ${order.account.uid ? `<div class="info-row"><span class="label">UID:</span><span class="value">${order.account.uid}</span></div>` : ''}
            </div>
        </div>
        ` : ''}
        
        ${order.gameType === 'gold' && !isLockedView ? `
        <div class="order-section item-status ${order.itemOnline ? 'online' : 'offline'}">
            <div class="status-icon">${order.itemOnline ? '✅' : '⏳'}</div>
            <div class="status-text">
                <strong>${t.marketStatus}</strong>
                <span>${order.itemOnline ? `🛒 ${t.itemOnline}` : `⏳ ${t.itemOffline}`}</span>
            </div>
            ${order.itemOnlineTimestamp ? `
                <div class="status-time">${t.updatedAt}: ${new Date(order.itemOnlineTimestamp).toLocaleString('pt-BR')}</div>
            ` : ''}
        </div>
        ` : ''}
        
        ${IS_TOPUP_PROVIDER && !isLockedView ? `
        <!-- SEÇÕES ESPECIAIS PARA TOP UP -->
        <div class="provider-code-tools">
        <div class="order-section auth-code">
            <h4>🔐 ${t.sendCodeSection}</h4>
            <div class="auth-input-group">
                <input type="text" id="auth-input-${order.orderId}"
                       placeholder="00"
                       maxlength="3"
                       inputmode="numeric"
                       pattern="[0-9]*"
                       autocomplete="off"
                       enterkeyhint="send"
                       value="${escapeHtml(providerAuthNumberDrafts.get(String(order.orderId)) || '')}"
                       class="auth-input"
                       oninput="handleAuthNumberInput('${order.orderId}', this)"
                       onkeydown="if (event.key === 'Enter') { event.preventDefault(); sendAuthNumber('${order.orderId}'); }">
                <button onclick="sendAuthNumber('${order.orderId}')" class="btn btn-primary">
                    📤 ${t.sendNumber}
                </button>
            </div>
            ${isCompactProviderUi && lastChineseCode ? `
                <div class="auth-delivery-reminder" role="status">
                    <span>${authNumberSentLabel}: <strong>${escapeHtml(lastChineseCode)}</strong></span>
                    <small>${authNumberHelp}</small>
                </div>
                <button onclick="resendAuthNumber('${order.orderId}')" class="btn btn-warning btn-resend-auth-number">
                    &#8635; ${authNumberResendLabel}
                </button>
            ` : ''}
            ${hasAuthRequest && order.authRequest.response === 'confirmed' ? `
                <div class="auth-confirmed">✅ ${t.responseReceived}</div>
            ` : ''}
        </div>
        
        <div class="order-section sms-request">
            <h4>📲 ${t.requestSMS}</h4>
            <button onclick="requestSMS('${order.orderId}')" class="btn btn-pink">
                📩 ${t.smsCode}
            </button>
            ${hasAuthRequest && order.authRequest.type === 'code' && order.authRequest.response ? `
                <div class="sms-code-display">
                    <span class="label">${t.clientSMSCode}:</span>
                    <span class="code">${order.authRequest.response}</span>
                </div>
                <button onclick="requestSMS('${order.orderId}')" class="btn btn-secondary btn-small" style="margin-top: 8px;">
                    🔄 ${t.resendRequest}
                </button>
            ` : hasAuthRequest && order.authRequest.type === 'code' ? `
                <div class="sms-waiting">⏳ ${t.waitingCode}</div>
                <button onclick="requestSMS('${order.orderId}')" class="btn btn-secondary btn-small" style="margin-top: 8px;">
                    🔄 ${t.resendRequest}
                </button>
            ` : ''}
        </div>

        ${['DOG', 'DAODAO'].includes(PROVIDER_NAME) ? `
        <div class="order-section google-auth-request">
            <h4>🔐 ${t.requestGoogleAuth}</h4>
            <button onclick="requestGoogleAuth('${order.orderId}')" class="btn btn-purple">
                🔐 ${t.googleAuthCode}
            </button>
            ${hasAuthRequest && order.authRequest.type === 'google_auth' && order.authRequest.response ? `
                <div class="sms-code-display">
                    <span class="label">${t.clientGoogleAuthCode}:</span>
                    <span class="code">${order.authRequest.response}</span>
                </div>
                <button onclick="requestGoogleAuth('${order.orderId}')" class="btn btn-secondary btn-small" style="margin-top: 8px;">
                    🔄 ${t.resendRequest}
                </button>
            ` : hasAuthRequest && order.authRequest.type === 'google_auth' ? `
                <div class="sms-waiting">⏳ ${t.waitingGoogleAuth}</div>
                <button onclick="requestGoogleAuth('${order.orderId}')" class="btn btn-secondary btn-small" style="margin-top: 8px;">
                    🔄 ${t.resendRequest}
                </button>
            ` : ''}
        </div>
        ` : ''}

        ${['DOG', 'DAODAO'].includes(PROVIDER_NAME) ? `
        <div class="order-section sms-request">
            <h4>🔑 ${t.passwordWrongSection}</h4>
            <button onclick="requestWrongPassword('${order.orderId}')" class="btn btn-danger">
                🔑 ${t.passwordWrong}
            </button>
            ${hasAuthRequest && order.authRequest.type === 'password' && order.authRequest.response ? `
                <div class="sms-code-display">
                    <span class="label">${t.clientProvidedPassword}:</span>
                    <span class="code">${order.authRequest.response}</span>
                </div>
                <button onclick="requestWrongPassword('${order.orderId}')" class="btn btn-secondary btn-small" style="margin-top: 8px;">
                    🔄 ${t.resendRequest}
                </button>
            ` : hasAuthRequest && order.authRequest.type === 'password' ? `
                <div class="sms-waiting">⏳ ${t.waitingPassword}</div>
                <button onclick="requestWrongPassword('${order.orderId}')" class="btn btn-secondary btn-small" style="margin-top: 8px;">
                    🔄 ${t.resendRequest}
                </button>
            ` : ''}
        </div>

        <div class="order-section sms-request">
            <h4>🆔 ${t.uidWrongSection}</h4>
            <button onclick="requestWrongUid('${order.orderId}')" class="btn btn-danger">
                🆔 ${t.uidWrong}
            </button>
            ${hasAuthRequest && order.authRequest.type === 'uid' && order.authRequest.response ? `
                <div class="sms-code-display">
                    <span class="label">${t.clientProvidedUid}:</span>
                    <span class="code">${order.authRequest.response}</span>
                </div>
                <button onclick="requestWrongUid('${order.orderId}')" class="btn btn-secondary btn-small" style="margin-top: 8px;">
                    🔄 ${t.resendRequest}
                </button>
            ` : hasAuthRequest && order.authRequest.type === 'uid' ? `
                <div class="sms-waiting">⏳ ${t.waitingUid}</div>
                <button onclick="requestWrongUid('${order.orderId}')" class="btn btn-secondary btn-small" style="margin-top: 8px;">
                    🔄 ${t.resendRequest}
                </button>
            ` : ''}
        </div>

        <div class="order-section sms-request">
            <h4>📧 ${t.gmailWrongSection}</h4>
            <button onclick="requestWrongGmail('${order.orderId}')" class="btn btn-danger">
                📧 ${t.gmailWrong}
            </button>
            ${hasAuthRequest && order.authRequest.type === 'gmail' && order.authRequest.response ? `
                <div class="sms-code-display">
                    <span class="label">${t.clientProvidedGmail}:</span>
                    <span class="code">${order.authRequest.response}</span>
                </div>
                <button onclick="requestWrongGmail('${order.orderId}')" class="btn btn-secondary btn-small" style="margin-top: 8px;">
                    🔄 ${t.resendRequest}
                </button>
            ` : hasAuthRequest && order.authRequest.type === 'gmail' ? `
                <div class="sms-waiting">⏳ ${t.waitingGmail}</div>
                <button onclick="requestWrongGmail('${order.orderId}')" class="btn btn-secondary btn-small" style="margin-top: 8px;">
                    🔄 ${t.resendRequest}
                </button>
            ` : ''}
        </div>

        <div class="order-section sms-request">
            <h4>📱 ${t.phoneRequestSection}</h4>
            <button onclick="requestPhone('${order.orderId}')" class="btn btn-warning">
                📱 ${t.phoneRequest}
            </button>
            ${hasAuthRequest && order.authRequest.type === 'phone' && order.authRequest.response ? `
                <div class="sms-code-display">
                    <span class="label">${t.clientProvidedPhone}:</span>
                    <span class="code">${order.authRequest.response}</span>
                </div>
                <button onclick="requestPhone('${order.orderId}')" class="btn btn-secondary btn-small" style="margin-top: 8px;">
                    🔄 ${t.resendRequest}
                </button>
            ` : hasAuthRequest && order.authRequest.type === 'phone' ? `
                <div class="sms-waiting">⏳ ${t.waitingPhone}</div>
                <button onclick="requestPhone('${order.orderId}')" class="btn btn-secondary btn-small" style="margin-top: 8px;">
                    🔄 ${t.resendRequest}
                </button>
            ` : ''}
        </div>

        <div class="order-section sms-request">
            <h4>📧 ${t.emailCodeSection}</h4>
            <button onclick="requestEmailCode('${order.orderId}')" class="btn btn-info">
                📧 ${t.emailCode}
            </button>
            ${hasAuthRequest && order.authRequest.type === 'email_code' && order.authRequest.response ? `
                <div class="sms-code-display">
                    <span class="label">${t.clientProvidedEmailCode}:</span>
                    <span class="code">${order.authRequest.response}</span>
                </div>
                <button onclick="requestEmailCode('${order.orderId}')" class="btn btn-secondary btn-small" style="margin-top: 8px;">
                    🔄 ${t.resendRequest}
                </button>
            ` : hasAuthRequest && order.authRequest.type === 'email_code' ? `
                <div class="sms-waiting">⏳ ${t.waitingEmailCode}</div>
                <button onclick="requestEmailCode('${order.orderId}')" class="btn btn-secondary btn-small" style="margin-top: 8px;">
                    🔄 ${t.resendRequest}
                </button>
            ` : ''}
        </div>
        ` : ''}

        <div class="order-section acceptance">
            <h4>📲 ${t.requestAcceptance}</h4>
            <button onclick="requestAcceptanceConfirmation('${order.orderId}')" 
                    class="btn ${order.clientAccepted ? 'btn-success' : 'btn-blue'}">
                ${order.clientAccepted ? `✅ ${t.clientAccepted}` : `📲 ${t.sendRequest}`}
            </button>
            ${order.clientAccepted ? `
                <button onclick="requestAcceptanceConfirmation('${order.orderId}')" class="btn btn-secondary btn-small" style="margin-top: 8px;">
                    🔄 ${t.resendRequest}
                </button>
            ` : ''}
        </div>
        
        <!-- BOTÃO DE CÓDIGO DE SEGURANÇA -->
        <div class="order-section security-code">
            <h4>🔐 ${t.requestSecurityCode}</h4>
            ${!hasSecurityCodeRequest ? `
                <button onclick="requestSecurityCode('${order.orderId}')" class="btn btn-security">
                    🔐 ${t.requestSecurityCode}
                </button>
            ` : `
                <div class="security-codes-display">
                    ${securityCode ? `
                        <div class="security-code-list">
                            ${securityCodeParts.map((code, index) => `
                                <div class="security-code-item">
                                    <span class="code-label">${t.securityCode}${securityCodeParts.length > 1 ? ` ${index + 1}` : ''}</span>
                                    <div class="security-code-value-row">
                                        <code class="security-code-value">${escapeHtml(code)}</code>
                                        <button type="button" onclick="copySecurityCodes(${escapeHtml(JSON.stringify(code))})" class="btn btn-secondary btn-copy-one-code" title="${t.copyCodes}">
                                            &#128203;
                                        </button>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                        <button type="button" onclick="copySecurityCodes(${escapeHtml(JSON.stringify(securityCode))})" class="btn btn-success btn-copy-codes">
                            📋 ${t.copyCodes}
                        </button>
                        <button onclick="requestSecurityCode('${order.orderId}')" class="btn btn-secondary btn-small" style="margin-top: 8px;">
                            🔄 ${t.resendRequest}
                        </button>
                    ` : `
                        <div class="codes-waiting">⏳ ${t.waitingSecurityCode}</div>
                        <button onclick="requestSecurityCode('${order.orderId}')" class="btn btn-security btn-small">
                            🔄 ${t.resendRequest}
                        </button>
                    `}
                </div>
            `}
        </div>
        </div>
        ` : ''}
        
        ${order.attachments && order.attachments.length > 0 ? `
        <div class="order-section attachments">
            <h4>${isCompactProviderUi ? '📸 商品图片 / Fotos do pack' : `📸 ${t.attachments}`}</h4>
            <div class="attachments-grid">
                ${order.attachments.map((url, idx) => `
                    <div class="attachment-link" onclick='openImageModal(${JSON.stringify(order.attachments)}, ${idx})' style="cursor: pointer;">
                        <img src="${url}" alt="attachment">
                    </div>
                `).join('')}
            </div>
        </div>
        ` : ''}
        
        <div class="order-section comments">
            <h4>💬 ${t.comments}</h4>
            ${isLockedView ? `
                ${order.comment ? `<div class="comment-display">${order.comment.text}</div>` : `<p class="no-comment">${t.addComment}</p>`}
            ` : `
                <textarea id="comment-input-${order.orderId}" class="comment-input" 
                    placeholder="${t.addComment}" 
                    oninput="autoSaveComment('${order.orderId}', this.value)">${order.comment ? order.comment.text : ''}</textarea>
            `}
        </div>
        
        ${/* SEÇÃO DE COMPROVANTE DE COMPRA - APENAS PARA GOLD PROVIDERS */ ''}
        ${!IS_TOPUP_PROVIDER && !isLockedView ? `
        <div class="order-section purchase-proof">
            <h4>📸 ${t.purchaseProof} <span id="proof-counter-${order.orderId}" class="proof-counter"></span></h4>
            <div id="proof-preview-${order.orderId}" class="proof-preview proof-grid" style="display: none;"></div>
            <div id="proof-upload-${order.orderId}" class="proof-upload-area" 
                 tabindex="0"
                 onmouseenter="setActiveProofOrder('${order.orderId}')"
                 onclick="setActiveProofOrder('${order.orderId}'); document.getElementById('proof-file-${order.orderId}').click()"
                 onfocus="setActiveProofOrder('${order.orderId}')">
                <div class="proof-upload-content">
                    <span class="proof-icon">📷</span>
                    <span class="proof-text">${t.pasteOrUpload}</span>
                    <span class="proof-hint">Passe o mouse e Ctrl+V (múltiplas imagens)</span>
                </div>
                <input type="file" 
                       id="proof-file-${order.orderId}" 
                       accept="image/*"
                       multiple
                       style="display: none;" 
                       onchange="handleFileSelect(event, '${order.orderId}')">
            </div>
            <button id="proof-clear-${order.orderId}" class="btn btn-remove-all-proofs" style="display: none;" onclick="removeProof('${order.orderId}')">
                🗑️ Remover todas
            </button>
        </div>
        ` : ''}
        
        ${/* EXIBIR COMPROVANTES NO HISTÓRICO - SUPORTA MÚLTIPLAS IMAGENS */ ''}
        ${!IS_TOPUP_PROVIDER && isCompleted && order.purchaseProof && order.purchaseProof.urls && order.purchaseProof.urls.length > 0 ? `
        <div class="order-section purchase-proof-history">
            <h4>📸 ${t.purchaseProof} (${order.purchaseProof.urls.length})</h4>
            <div class="proof-history-grid">
                ${order.purchaseProof.urls.map((url, idx) => `
                    <div class="proof-history-item" onclick='openImageModal(${JSON.stringify(order.purchaseProof.urls)}, ${idx})'>
                        <img src="${url}" alt="Comprovante ${idx + 1}" class="proof-history-img">
                        <span class="proof-view-overlay">🔍</span>
                    </div>
                `).join('')}
            </div>
        </div>
        ` : ''}
        ${/* COMPATIBILIDADE: Exibir formato antigo (url única) */ ''}
        ${!IS_TOPUP_PROVIDER && isCompleted && order.purchaseProof && order.purchaseProof.url && !order.purchaseProof.urls ? `
        <div class="order-section purchase-proof-history">
            <h4>📸 ${t.purchaseProof}</h4>
            <div class="proof-history-wrapper" onclick="openImageModal('${order.purchaseProof.url}')">
                <img src="${order.purchaseProof.url}" alt="Comprovante" class="proof-history-img">
                <span class="proof-view-text">🔍 ${t.viewProof}</span>
            </div>
        </div>
        ` : ''}
        
        ${mode === 'active' ? `
        <div class="order-actions">
            <button onclick="skipOrder('${order.orderId}')" class="btn btn-secondary">⏭️ ${t.skip}</button>
            <button onclick="markOrderProblem('${order.orderId}')" class="btn btn-warning">⚠️ 问题 / Problema</button>
            <button onclick="completeOrder('${order.orderId}')" class="btn btn-complete">✅ ${t.complete}</button>
            <button onclick="cancelOrder('${order.orderId}')" class="btn btn-danger">❌ ${t.cancel}</button>
        </div>
        ` : mode === 'absent' ? `
        <div class="order-actions">
            <button onclick="reactivateOrder('${order.orderId}')" class="btn btn-success">▶️ ${t.reactivate}</button>
            <button onclick="markOrderProblem('${order.orderId}')" class="btn btn-warning">⚠️ 问题 / Problema</button>
            <button onclick="cancelOrder('${order.orderId}')" class="btn btn-danger">❌ ${t.cancel}</button>
        </div>
        ` : mode === 'problem_pending' ? `
        <div class="order-actions">
            <button onclick="resolveOrderProblem('${order.orderId}')" class="btn btn-complete">✅ 解决 / Resolver</button>
            <button onclick="returnOrderToActive('${order.orderId}')" class="btn btn-success">▶️ 返回 / Voltar à fila</button>
            <button onclick="cancelOrder('${order.orderId}')" class="btn btn-danger">❌ ${t.cancel}</button>
        </div>
        ` : mode === 'cancelled' ? `
        <div class="order-actions">
            <button onclick="returnOrderToActive('${order.orderId}')" class="btn btn-success">♻️ 恢复 / Restaurar pedido</button>
        </div>
        ` : mode === 'problem_resolved' ? `
        <div class="order-actions">
            <button onclick="reopenOrderProblem('${order.orderId}')" class="btn btn-warning">⚠️ 重新打开 / Reabrir</button>
            <button onclick="returnOrderToActive('${order.orderId}')" class="btn btn-success">▶️ 返回 / Voltar à fila</button>
        </div>
        ` : `
        <div class="order-footer">
            <div class="completed-date">
                📅 ${t.completedAt}: ${new Date(order.completedAt || order.timestamp).toLocaleString('pt-BR')}
            </div>
            <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                <button onclick="resendFromHistory('${order.orderId}')" class="btn btn-resend" style="background: linear-gradient(135deg, #3498db 0%, #2980b9 100%); color: white; border: none; padding: 10px 16px; border-radius: 8px; cursor: pointer; font-weight: bold;">
                    🔄 ${t.resend}
                </button>
                <button onclick="deleteFromHistory('${order.orderId}')" class="btn btn-danger btn-delete">
                    🗑️ ${t.delete}
                </button>
            </div>
        </div>
        `}
    </div>
    `;
}

// CARREGAR HISTÓRICO COM PAGINAÇÃO
function loadHistory(searchTerm = null) {
    const container = document.getElementById('history-orders');
    const t = translations[currentLang];

    if (!container) return;

    // Pedidos finalizados: 'completed' (DOG/DAODAO) ou 'delivered' (SOMBRA).
    // Sem 'delivered', pedidos SOMBRA entregues nao aparecem no historico.
    let completedOrders = Object.values(allOrders).filter(o =>
        (o.status === 'completed' || o.status === 'delivered') && shouldShowOrder(o) && getWorkflowState(o) === 'completed'
    ).sort((a, b) => b.timestamp - a.timestamp);

    // Se há termo de busca, filtrar TODOS os pedidos
    if (searchTerm && searchTerm.trim()) {
        const term = searchTerm.toLowerCase().trim();
        const numericTerm = term.replace(/\D/g, '');
        completedOrders = completedOrders.filter(order => {
            const orderId = (order.orderId || '').toLowerCase();
            const providerId = (order.providerId || '').toLowerCase();
            const providerDisplayNumber = typeof order.providerDisplayNumber === 'number'
                ? String(order.providerDisplayNumber).padStart(5, '0')
                : '';
            const userId = (order.client?.userId || order.userId || '').toLowerCase();
            const login = (order.account?.login || '').toLowerCase();
            const password = (order.account?.password || '').toLowerCase();
            const email = (order.account?.email || '').toLowerCase();
            const gameName = (order.gameName || order.game || '').toLowerCase();

            return orderId.includes(term) ||
                providerId.includes(term) ||
                providerDisplayNumber.includes(term) ||
                (numericTerm && providerDisplayNumber.includes(numericTerm)) ||
                userId.includes(term) ||
                login.includes(term) ||
                password.includes(term) ||
                email.includes(term) ||
                gameName.includes(term);
        });
    }

    if (completedOrders.length === 0) {
        container.innerHTML = `
            <div class="no-orders-msg">
                <div class="icon">📋</div>
                <p>${searchTerm ? 'Nenhum resultado encontrado' : t.noHistory}</p>
            </div>
        `;
        return;
    }

    // Calcular paginação
    const totalPages = Math.ceil(completedOrders.length / ITEMS_PER_PAGE);

    // Garantir página válida
    if (currentPage > totalPages) currentPage = totalPages;
    if (currentPage < 1) currentPage = 1;

    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    const itemsToShow = completedOrders.slice(start, end);

    // Gerar HTML dos controles de paginação
    const paginationControlsHtml = totalPages > 1 ? `
        <div class="pagination-controls" style="display: flex; justify-content: center; gap: 15px; margin: 15px 0; padding: 15px; align-items: center; background: var(--bg-card); border-radius: 12px;">
            <button onclick="changePage(-1)" class="btn btn-secondary" ${currentPage === 1 ? 'disabled' : ''} style="padding: 10px 20px; cursor: pointer;">
                ⬅️ Anterior
            </button>
            <span style="font-weight: bold; color: var(--text-primary); font-size: 1.1em;">
                Página ${currentPage} de ${totalPages} (${completedOrders.length} pedidos)
            </span>
            <button onclick="changePage(1)" class="btn btn-secondary" ${currentPage === totalPages ? 'disabled' : ''} style="padding: 10px 20px; cursor: pointer;">
                Próximo ➡️
            </button>
        </div>
    ` : '';

    // Renderizar itens com controles no TOPO e no FUNDO
    let html = paginationControlsHtml;
    html += itemsToShow.map(order => renderOrderCard(order, t, true)).join('');
    html += paginationControlsHtml;

    container.innerHTML = html;
    restoreExpandedProviderOrders(container);
}

function changePage(delta) {
    currentPage += delta;
    // Preservar termo de busca se existir
    const searchInput = document.getElementById('history-search');
    const searchTerm = searchInput ? searchInput.value : null;
    loadHistory(searchTerm);
    // Rolar para o topo da lista
    const historySection = document.querySelector('.history-section');
    if (historySection) historySection.scrollIntoView({ behavior: 'smooth' });
}

// ATUALIZAR ESTATÍSTICAS
function updateStats() {
    const myOrders = Object.values(allOrders).filter(o => shouldShowOrder(o));
    const pending = myOrders.filter(o => o.status === 'pending' && getWorkflowState(o) === 'active').length;
    const absent = myOrders.filter(o => getWorkflowState(o) === 'absent').length;
    const problems = myOrders.filter(o => getWorkflowState(o) === 'problem_pending').length;
    // 'completed' (DOG/DAODAO) ou 'delivered' (SOMBRA) contam como finalizados
    const completed = myOrders.filter(o => o.status === 'completed' || o.status === 'delivered').length;

    const pendingEl = document.getElementById('stat-pending');
    const completedEl = document.getElementById('stat-completed');

    if (pendingEl) pendingEl.textContent = pending;
    if (completedEl) completedEl.textContent = completed;

    // Atualizar badge na sidebar
    const pendingBadge = document.getElementById('pending-badge');
    if (pendingBadge) pendingBadge.textContent = pending;
    const absentBadge = document.getElementById('absent-badge');
    if (absentBadge) absentBadge.textContent = absent;
    const problemsBadge = document.getElementById('problems-badge');
    if (problemsBadge) problemsBadge.textContent = problems;
}

// ALTERNAR IDIOMA
function toggleLanguage() {
    currentLang = currentLang === 'cn' ? 'pt' : 'cn';

    // Atualizar toda a UI
    updateFullUI();

    // Re-renderizar seção atual
    renderCurrentSection();

    showToast(translations[currentLang].languageChanged, 'info');
}

// ATUALIZAR TODA A UI COM TRADUÇÃO
function updateFullUI() {
    const t = translations[currentLang];

    // === SIDEBAR ===
    // Seção de menu
    const menuTitle = document.querySelector('.nav-section-title');
    if (menuTitle) menuTitle.textContent = t.menuMain;

    // Nav items - Pedidos
    const ordersNavText = document.querySelector('#nav-orders span:nth-child(2)');
    if (ordersNavText) ordersNavText.textContent = currentLang === 'cn' ? '进行中' : 'Em andamento';

    // Nav items - Histórico  
    const historyNavText = document.querySelector('#nav-history span:nth-child(2)');
    if (historyNavText) historyNavText.textContent = currentLang === 'cn' ? '已完成' : 'Concluídos';

    // Seção de ações rápidas
    const quickActionsTitle = document.querySelectorAll('.nav-section-title')[1];
    if (quickActionsTitle) quickActionsTitle.textContent = t.quickActions;

    // Atualizar texto do alerta sonoro
    const alertText = document.getElementById('alert-text');
    if (alertText) alertText.textContent = t.soundAlert;

    // Botão idioma na sidebar
    const langNavText = document.querySelector('.nav-item[onclick*="toggleLanguage"] span:nth-child(2)');
    if (langNavText) langNavText.textContent = currentLang === 'cn' ? 'PT-BR' : '中文';

    // Stats labels na sidebar
    const pendingLabel = document.querySelector('.sidebar-stat.pending .stat-label');
    const completedLabel = document.querySelector('.sidebar-stat.completed .stat-label');
    if (pendingLabel) pendingLabel.textContent = t.pending;
    if (completedLabel) completedLabel.textContent = t.completed;

    // === HEADER ===
    const pageTitle = document.getElementById('page-title-text');
    const pageSubtitle = document.getElementById('page-subtitle');
    if (pageTitle) pageTitle.textContent = `📦 ${t.activeOrders}`;
    if (pageSubtitle) pageSubtitle.textContent = t.realTimeManagement;

    // Botão de idioma no header
    const langBtn = document.querySelector('.header-actions .btn-secondary');
    if (langBtn) langBtn.textContent = currentLang === 'cn' ? '🌐 PT-BR' : '🌐 中文';

    // === CONTEÚDO ===
    // Mensagem sem pedidos
    const noOrders = document.getElementById('no-orders');
    if (noOrders) noOrders.textContent = t.noOrders;

    // Placeholder de busca
    const searchInput = document.getElementById('history-search');
    if (searchInput) searchInput.placeholder = `🔍 ${t.searchPlaceholder}`;

    // Permissão de áudio
    const audioPermission = document.querySelector('#audio-permission span');
    if (audioPermission) audioPermission.textContent = `🔊 ${t.enableSound}`;
}

// AÇÕES DE PEDIDO
function sendAuthNumber(orderId) {
    const t = translations[currentLang];
    const input = document.getElementById(`auth-input-${orderId}`);
    const code = normalizeProviderAuthNumber(input?.value);

    if (!code) {
        showToast(t.enterCode, 'warning');
        return;
    }

    if (!/^\d{1,3}$/.test(code)) {
        showToast(t.enterValidCode, 'warning');
        return;
    }

    // Código especial "000": transferir pedido para o fornecedor oposto
    if (code === '000') {
        const oppositeProvider = PROVIDER_NAME === 'DOG' ? 'DAODAO' : 'DOG';
        console.log(`🔄 Transferindo pedido ${orderId} de ${PROVIDER_NAME} para ${oppositeProvider}`);
        // Reseta o estado "visto": ao cair no painel do outro fornecedor o
        // pedido deve aparecer como NÃO visto de novo (toca alerta, mostra o
        // botão "Marcar como Visto"). Senão chegava lá já como "Visualizado".
        window.db.ref(`orders/${orderId}`).update({
            assignedProvider: oppositeProvider,
            viewed: false,
            viewedAt: null,
            viewedBy: null
        }).then(() => {
            console.log(`✅ Pedido ${orderId} transferido para ${oppositeProvider} (estado "visto" resetado)`);
            showToast(`${t.orderTransferred} ${oppositeProvider}`, 'success');
            clearProviderAuthNumberDraft(orderId, input);
        }).catch(err => {
            console.error('❌ Erro ao transferir pedido:', err);
            showToast('Error', 'error');
        });
        return;
    }

    // Código normal (1-2 dígitos): enviar ao cliente
    if (code.length > 2) {
        showToast(t.enterValidCode, 'warning');
        return;
    }

    console.log(`📤 Enviando código ${code} para ${orderId}`);
    window.db.ref(`orders/${orderId}/chineseCode`).set({
        code: code,
        timestamp: Date.now()
    }).then(() => {
        console.log(`✅ Código ${code} salvo no Firebase`);
        showToast(`${t.codeSent}: ${code}`, 'success');
        clearProviderAuthNumberDraft(orderId, input);
    }).catch(err => {
        console.error('❌ Erro ao enviar código:', err);
        showToast('Error', 'error');
    });
}

// Reenvia o ultimo numero sem depender de uma nova digitacao do fornecedor.
// O bot publicado identifica um novo envio pela mudanca de timestamp.
const AUTH_NUMBER_RESEND_COOLDOWN_MS = 15 * 1000;

function resendAuthNumber(orderId) {
    const order = allOrders && allOrders[orderId];
    const isChinese = currentLang === 'cn';
    const terminalStatuses = ['completed', 'delivered', 'cancelled', 'canceled', 'refunded'];

    if (!['DOG', 'DAODAO'].includes(String(PROVIDER_NAME || '').toUpperCase())) {
        showToast('Acao disponivel apenas nos paineis de recarga.', 'warning');
        return;
    }

    if (!order || terminalStatuses.includes(String(order.status || '').toLowerCase())) {
        showToast(
            isChinese ? '\u8ba2\u5355\u5df2\u7ed3\u675f\uff0c\u65e0\u6cd5\u91cd\u53d1\u3002' : 'Pedido finalizado; n\u00e3o \u00e9 poss\u00edvel reenviar.',
            'warning'
        );
        return;
    }

    const current = order.chineseCode || {};
    const code = String(current.code || '').trim();
    if (!/^\d{1,2}$/.test(code)) {
        showToast(
            isChinese ? '\u6ca1\u6709\u53ef\u91cd\u53d1\u7684\u53f7\u7801\u3002' : 'Ainda n\u00e3o existe um n\u00famero para reenviar.',
            'warning'
        );
        return;
    }

    const now = Date.now();
    const lastSentAt = Number(current.timestamp || 0);
    const remainingMs = AUTH_NUMBER_RESEND_COOLDOWN_MS - (now - lastSentAt);
    if (lastSentAt > 0 && remainingMs > 0) {
        const seconds = Math.ceil(remainingMs / 1000);
        showToast(
            isChinese
                ? `\u8bf7\u7b49\u5f85 ${seconds} \u79d2\u540e\u518d\u91cd\u53d1\uff0c\u907f\u514d\u91cd\u590d\u6d88\u606f\u3002`
                : `Aguarde ${seconds}s para reenviar e evitar mensagens duplicadas.`,
            'warning'
        );
        return;
    }

    const confirmed = confirm(
        isChinese
            ? `\u786e\u8ba4\u5411\u5ba2\u6237\u91cd\u65b0\u53d1\u9001\u53f7\u7801 ${code} \u5417\uff1f`
            : `Reenviar o n\u00famero ${code} ao cliente?`
    );
    if (!confirmed) return;

    window.db.ref(`orders/${orderId}/chineseCode`).set({
        code,
        timestamp: now
    }).then(() => {
        showToast(
            isChinese ? '\u53f7\u7801\u5df2\u91cd\u65b0\u53d1\u9001\u7ed9\u5ba2\u6237\u3002' : 'N\u00famero reenviado ao cliente.',
            'success'
        );
    }).catch(error => {
        console.error('Falha ao solicitar reenvio do numero:', error?.message || error);
        showToast(
            isChinese ? '\u91cd\u65b0\u53d1\u9001\u5931\u8d25\u3002' : 'Falha ao reenviar. Tente novamente.',
            'error'
        );
    });
}

// Helper: escreve authRequest e mostra toast apenas se write deu certo.
// Antes era fire-and-forget — toast verde aparecia antes do write completar e
// erros (network, permission_denied) ficavam silenciosos. Fornecedor via "✅"
// mas o bot nunca recebia o request.
function _writeAuthRequest(orderId, type, label) {
    const t = translations[currentLang];
    return window.db.ref(`orders/${orderId}/authRequest`).set({
        requested: true,
        type: type,
        response: null,
        timestamp: Date.now()
    })
        .then(() => {
            showToast(`✅ ${t.requestSent}`, 'success');
        })
        .catch(err => {
            console.error(`❌ Erro ao solicitar ${label || type}:`, err);
            showToast('Error', 'error');
        });
}

function requestSMS(orderId) {
    _writeAuthRequest(orderId, 'code', 'SMS');
}

function requestWrongPassword(orderId) {
    _writeAuthRequest(orderId, 'password', 'senha');
}

function requestWrongUid(orderId) {
    _writeAuthRequest(orderId, 'uid', 'UID');
}

function requestWrongGmail(orderId) {
    _writeAuthRequest(orderId, 'gmail', 'gmail');
}

function requestPhone(orderId) {
    _writeAuthRequest(orderId, 'phone', 'telefone');
}

function requestEmailCode(orderId) {
    _writeAuthRequest(orderId, 'email_code', 'email code');
}

function requestGoogleAuth(orderId) {
    _writeAuthRequest(orderId, 'google_auth', 'google auth');
}

function sendAuthResponse(orderId) {
    const t = translations[currentLang];
    const input = document.getElementById(`auth-response-${orderId}`);
    const response = input.value.trim();

    if (!response) {
        showToast(`❌ ${t.enterResponse}`, 'warning');
        return;
    }

    window.db.ref(`orders/${orderId}/authRequest/response`).set(response)
        .then(() => {
            showToast(`✅ ${t.requestSent}`, 'success');
            input.value = '';
        })
        .catch(err => {
            console.error('❌ Erro ao enviar resposta de auth:', err);
            showToast('Error', 'error');
        });
}

function completeOrder(orderId) {
    const t = translations[currentLang];
    const order = allOrders[orderId];

    // Guard contra race: se ha botCommand/authRequest recem-escrito ainda nao
    // processado pelo bot, marcar status='completed' agora faria o comando
    // virar no-op silencioso (o bot poll filtra completed/cancelled). Espera
    // ate WAIT_MS pelo bot processar antes de liberar — se passou desse tempo
    // e ainda esta pendente, o bot provavelmente nao vai pegar mesmo, libera.
    // Reduzido de 15s pra 6s acompanhando reducao do polling do bot
    // (commandCheckInterval 5s->3s, monitorAuth/Code 10s->4s) — 6s cobre o
    // pior caso (~4s poll + ~1s processing + margem).
    const WAIT_MS = 6000;
    if (order && order.botCommand && order.botCommand.processed === false) {
        const ageMs = Date.now() - (order.botCommand.timestamp || 0);
        if (ageMs < WAIT_MS) {
            const sec = Math.max(1, Math.ceil((WAIT_MS - ageMs) / 1000));
            showToast(`⏳ Solicitação enviada há ${Math.round(ageMs/1000)}s — aguarde ${sec}s antes de concluir, senão o cliente não recebe a mensagem no Discord`, 'warning');
            return;
        }
    }
    if (order && order.authRequest && order.authRequest.requested && !order.authRequest.response) {
        const ageMs = Date.now() - (order.authRequest.timestamp || 0);
        if (ageMs < WAIT_MS) {
            const sec = Math.max(1, Math.ceil((WAIT_MS - ageMs) / 1000));
            showToast(`⏳ Solicitação enviada há ${Math.round(ageMs/1000)}s — aguarde ${sec}s, senão o cliente não recebe`, 'warning');
            return;
        }
    }

    if (confirm(t.confirmComplete)) {
        // Se é o SOMBRA e tem carrinho, adicionar à calculadora
        if (PROVIDER_NAME === 'SOMBRA' && order && order.cart && order.cart.length > 0) {
            addToSombraCalculator(order);
        }

        window.db.ref(`orders/${orderId}`).update({
            status: 'completed',
            workflowState: 'completed',
            completedAt: Date.now(),
            completedBy: PROVIDER_NAME
        });
        showToast(`✅ ${t.orderCompleted}`, 'success');
    }
}

// ============================================
// 📊 ADICIONAR À CALCULADORA SOMBRA
// ============================================
async function addToSombraCalculator(order) {
    // Mapeamento de labels para IDs da calculadora
    // A ordem importa! Os mais específicos devem vir primeiro
    const PACKAGE_MAPPING = {
        genshin: [
            { keyword: 'benção', id: 'genshin_bencao' },
            { keyword: 'bencao', id: 'genshin_bencao' },
            { keyword: '6480+1600', id: 'genshin_6480' },
            { keyword: '6400+1600', id: 'genshin_6480' },
            { keyword: '3280+600', id: 'genshin_3280' },
            { keyword: '3200+600', id: 'genshin_3280' },
            { keyword: '1980+260', id: 'genshin_1980' },
            { keyword: '980+110', id: 'genshin_980' },
            { keyword: '300+30', id: 'genshin_300' }
        ],
        honkaistarrail: [
            { keyword: 'passe', id: 'honkai_passe' },
            { keyword: 'suprimento', id: 'honkai_passe' },
            { keyword: '6400+1600', id: 'honkai_6400' },
            { keyword: '3200+600', id: 'honkai_3200' },
            { keyword: '1980+260', id: 'honkai_1980' },
            { keyword: '980+110', id: 'honkai_980' },
            { keyword: '300+30', id: 'honkai_300' }
        ],
        zzz: [
            { keyword: 'assinatura', id: 'zzz_assinatura' },
            { keyword: 'interlaço', id: 'zzz_assinatura' },
            { keyword: 'interlaco', id: 'zzz_assinatura' },
            { keyword: '6400+1600', id: 'zzz_6400' },
            { keyword: '3200+600', id: 'zzz_3200' },
            { keyword: '1980+260', id: 'zzz_1980' },
            { keyword: '980+110', id: 'zzz_980' },
            { keyword: '300+30', id: 'zzz_300' }
        ],
        wutheringwaves: [
            { keyword: 'subscription', id: 'wuva_subscription' },
            { keyword: 'lunite', id: 'wuva_subscription' },
            { keyword: '6480', id: 'wuva_6480' },
            { keyword: '3280', id: 'wuva_3280' },
            { keyword: '1980', id: 'wuva_1980' },
            { keyword: '980', id: 'wuva_980' },
            { keyword: 'insider', id: 'wuva_bp_insider' },
            { keyword: 'connoisseur', id: 'wuva_bp_connoisseur' }
        ],
        aion2: [
            { keyword: '1900', id: 'aion2_1900' },
            { keyword: '1080', id: 'aion2_1080' },
            { keyword: '980', id: 'aion2_980' },
            { keyword: '950', id: 'aion2_950' },
            { keyword: '750', id: 'aion2_750' },
            { keyword: '645', id: 'aion2_645' },
            { keyword: '640', id: 'aion2_640' },
            { keyword: '475', id: 'aion2_475' },
            { keyword: '430', id: 'aion2_430' },
            { keyword: '190', id: 'aion2_190' },
            { keyword: '145', id: 'aion2_145' }
        ],
        summonerswar: [
            { keyword: '549,90', id: 'sw_549' },
            { keyword: '299,90', id: 'sw_299' },
            { keyword: '279,90', id: 'sw_279' },
            { keyword: '169,90', id: 'sw_169' },
            { keyword: '109,90', id: 'sw_109' },
            { keyword: '54,90', id: 'sw_54' },
            { keyword: '27,90', id: 'sw_27' }
        ]
    };

    const gameId = order.game;
    const gameMapping = PACKAGE_MAPPING[gameId];

    if (!gameMapping) {
        console.log(`📊 [SOMBRA CALC] Jogo ${gameId} não encontrado no mapeamento`);
        return;
    }

    // Buscar quantidades atuais
    let currentQuantities = {};
    try {
        const snapshot = await window.db.ref('calculadoraSombra/quantities').once('value');
        currentQuantities = snapshot.val() || {};
    } catch (err) {
        console.error('Erro ao buscar quantidades:', err);
    }

    let addedItems = 0;

    // Adicionar os itens do carrinho
    for (const item of order.cart) {
        const itemLabel = (item.pack || item.label || item.gold || '').toLowerCase();
        const quantity = item.quantity || 1;

        // Buscar no array de mapeamento (ordem já é por prioridade)
        for (const mapping of gameMapping) {
            if (itemLabel.includes(mapping.keyword)) {
                currentQuantities[mapping.id] = (currentQuantities[mapping.id] || 0) + quantity;
                console.log(`📊 Calculadora Sombra: +${quantity}x ${mapping.id} (de "${itemLabel}")`);
                addedItems++;
                break;
            }
        }
    }

    if (addedItems === 0) {
        console.log(`📊 [SOMBRA CALC] Nenhum item mapeado para o jogo ${gameId}`);
        return;
    }

    // Salvar no Firebase
    try {
        await window.db.ref('calculadoraSombra/quantities').set(currentQuantities);
        console.log('📊 Calculadora Sombra atualizada com sucesso!');
        showToast(`📊 Calculadora Sombra: ${addedItems} item(s) adicionado(s)!`, 'success');
    } catch (err) {
        console.error('Erro ao salvar quantidades:', err);
    }
}

function markOrderProblem(orderId) {
    const note = prompt('请说明问题 / Descreva o problema:');
    if (!note || !note.trim()) {
        showToast('A observação do problema é obrigatória.', 'warning');
        return;
    }
    const now = Date.now();
    window.db.ref(`orders/${orderId}`).update({
        workflowState: 'problem_pending',
        problem: {
            status: 'pending',
            note: note.trim(),
            openedAt: now,
            openedBy: PROVIDER_NAME,
            resolvedAt: null,
            resolvedBy: null,
            resolutionNote: null
        }
    }).then(() => showToast('⚠️ Pedido movido para problemas em espera.', 'success'))
      .catch(err => showToast(err.message || 'Error', 'error'));
}

function resolveOrderProblem(orderId) {
    const resolutionNote = prompt('解决说明 / Como o problema foi resolvido? (opcional):') || '';
    const order = allOrders[orderId] || {};
    window.db.ref(`orders/${orderId}`).update({
        status: 'completed',
        workflowState: 'problem_resolved',
        problem: {
            ...(order.problem || {}),
            status: 'resolved',
            resolvedAt: Date.now(),
            resolvedBy: PROVIDER_NAME,
            resolutionNote: resolutionNote.trim() || null
        }
    }).then(() => showToast('✅ Problema resolvido e arquivado.', 'success'))
      .catch(err => showToast(err.message || 'Error', 'error'));
}

function returnOrderToActive(orderId) {
    window.db.ref(`orders/${orderId}`).update({
        status: 'pending',
        workflowState: 'active',
        skipped: false,
        customerUnavailable: false,
        returnedToActiveAt: Date.now(),
        returnedToActiveBy: PROVIDER_NAME
    }).then(() => showToast('▶️ Pedido devolvido para em andamento.', 'success'))
      .catch(err => showToast(err.message || 'Error', 'error'));
}

function reopenOrderProblem(orderId) {
    const order = allOrders[orderId] || {};
    window.db.ref(`orders/${orderId}`).update({
        status: 'pending',
        workflowState: 'problem_pending',
        problem: {
            ...(order.problem || {}),
            status: 'pending',
            reopenedAt: Date.now(),
            reopenedBy: PROVIDER_NAME
        }
    }).then(() => showToast('⚠️ Problema reaberto.', 'success'))
      .catch(err => showToast(err.message || 'Error', 'error'));
}

function cancelOrder(orderId) {
    const t = translations[currentLang];
    if (confirm(t.confirmCancel)) {
        const reason = prompt('取消原因 / Motivo do cancelamento (opcional):') || '';
        window.db.ref(`orders/${orderId}`).update({
            status: 'cancelled',
            workflowState: 'cancelled',
            cancelledAt: Date.now(),
            cancelledBy: PROVIDER_NAME,
            cancelReason: reason.trim() || null
        }).then(() => showToast(t.orderCancelled, 'info'))
          .catch(err => {
              console.error('Erro ao cancelar:', err);
              showToast('Error', 'error');
          });
    }
}

// SALVAR COMENTÁRIO
function saveComment(orderId) {
    const t = translations[currentLang];
    const textarea = document.getElementById(`comment-input-${orderId}`);
    const comment = textarea.value.trim();

    if (!comment) {
        showToast(t.enterComment, 'warning');
        return;
    }

    window.db.ref(`orders/${orderId}/comment`).set({
        text: comment,
        timestamp: Date.now()
    }).then(() => {
        console.log(`✅ Comentário salvo para ${orderId}`);
    }).catch(err => {
        console.error('❌ Erro ao salvar comentário:', err);
    });
}

// AUTO-SALVAR COMENTÁRIO
let commentTimeout = null;
function autoSaveComment(orderId, text) {
    if (commentTimeout) clearTimeout(commentTimeout);

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

// Habilitar áudio com primeiro clique
document.addEventListener('click', () => {
    if (!audioEnabled) {
        initAudio();
        audioAlert.play().then(() => {
            audioEnabled = true;
            audioAlert.pause();
            audioAlert.currentTime = 0;
            console.log('✅ Áudio habilitado');
        }).catch(() => { });
    }
}, { once: true });
