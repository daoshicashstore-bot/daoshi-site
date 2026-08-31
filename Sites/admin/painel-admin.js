// ═══════════════════════════════════════════════════════════════
// 🎮 DASHBOARD ADMIN - DAOSHI STORE BOT
// ═══════════════════════════════════════════════════════════════

let allSales = [];
let allCoupons = [];
let allPrices = {};
let allClientes = [];
let _clientesLoaded = false; // lazy-load guard: clientes só baixa ao abrir a aba

const DASHBOARD_SALES_LIMIT = 500;
const LOGS_RECENT_LIMIT = 500;
const INTERMED_TICKETS_LIMIT = 500;
const DATA_LOAD_TIMEOUT_MS = 20_000;
let dashboardGlobalSummary = null;

function onDashboardDomReady(callback) {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', callback, { once: true });
        return;
    }
    queueMicrotask(callback);
}

function withTimeout(promise, timeoutMs = DATA_LOAD_TIMEOUT_MS, label = 'dados') {
    let timeoutId;
    const timeout = new Promise((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error(`Tempo esgotado ao carregar ${label}. Tente novamente.`)), timeoutMs);
    });
    return Promise.race([Promise.resolve(promise), timeout]).finally(() => clearTimeout(timeoutId));
}

function setTableState(tbodyId, colspan, message, type = 'loading') {
    const tbody = document.getElementById(tbodyId);
    if (!tbody) return;
    const color = type === 'error' ? 'var(--danger)' : 'var(--text-secondary)';
    const icon = type === 'error' ? '⚠️' : '⏳';
    tbody.innerHTML = `<tr><td colspan="${colspan}" style="text-align:center; padding:32px; color:${color};">${icon} ${message}</td></tr>`;
}

// Uma venda conta nos totais/receita/cashback apenas se NÃO estiver
// cancelada ou reembolsada. Essas ficam visíveis nas tabelas, mas não
// inflam stats (inclui `refunded`, que no Firebase marca reembolsos).
const INACTIVE_SALE_STATUSES = new Set([
    'cancelado', 'cancelled',
    'refunded', 'reembolsado', 'estornado'
]);
function isSaleActive(sale) {
    const s = (sale?.status || '').toLowerCase();
    return !INACTIVE_SALE_STATUSES.has(s);
}

// Paginação de clientes
let clientesCurrentPage = 1;
const clientesItemsPerPage = 25;

// Paginação de vendas
let salesCurrentPage = 1;
const salesItemsPerPage = 15;
let filteredSalesData = [];

// Placeholder neutro pro card quando não há imagem cadastrada. Antes o
// fallback era a URL do MIR4 (XrXphs0.png) — admin via "Genshin UID Block"
// com a foto do MIR4 e ficava confuso. SVG inline = sem dependência de
// rede, sem cache stale, e o admin enxerga claro que falta cadastrar
// imagem nesse jogo.
const PLACEHOLDER_GAME_IMG = "data:image/svg+xml;utf8," + encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80">` +
    `<rect width="80" height="80" rx="12" fill="#1a1a2e"/>` +
    `<text x="40" y="38" text-anchor="middle" font-size="28" fill="#9333ff" font-family="Arial">🎮</text>` +
    `<text x="40" y="62" text-anchor="middle" font-size="9" fill="#666" font-family="Arial">sem imagem</text>` +
    `</svg>`
);

// Lista de jogos disponíveis no sistema
const JOGOS_DISPONIVEIS = {
    'mir4': { name: 'MIR4', emoji: '⚔️', icon: 'https://i.imgur.com/XrXphs0.png' },
    'nightcrows': { name: 'Night Crows', emoji: '🦅', icon: 'https://i.imgur.com/LLGJGNI.png' },
    'tsdsorigin': { name: 'The Seven Deadly Sins: Origin', emoji: '🗡️', icon: 'https://i.imgur.com/IMg7Z0p.png' },
    'odin': { name: 'Odin Valhalla Rising', emoji: '🛡️', icon: 'https://i.imgur.com/aLsQf6y.png' },
    'wemix': { name: 'Wemix', emoji: '💎', icon: 'https://i.imgur.com/YTGq40y.png' },
    'raven2': { name: 'Raven II', emoji: '🐦', icon: 'https://i.imgur.com/jgNSgdY.png' },
    'rohan2': { name: 'Rohan II', emoji: '🗡️', icon: 'https://i.imgur.com/nZg3UYE.png' },
    'genshin': { name: 'Genshin Impact', emoji: '🌸', icon: 'https://i.imgur.com/Q1T1tta.png' },
    'genshinloginesenha': { name: 'GENSHIN LOGIN e SENHA', emoji: '⭐', icon: 'https://i.imgur.com/Q1T1tta.png' },
    'summonerswar': { name: 'Summoners War', emoji: '👹', icon: 'https://i.imgur.com/kav5I7I.png' },
    'aion2': { name: 'AION 2', emoji: '🦋', icon: 'https://i.imgur.com/FIgYwIg.png' },
    'wutheringwaves': { name: 'Wuthering Waves', emoji: '🌊', icon: 'https://i.imgur.com/Wtvw62C.png' },
    'wutheringwavesloginesenha': { name: 'WUTHERING LOGIN e SENHA', emoji: '🔑', icon: 'https://i.imgur.com/Wtvw62C.png' },
    'honkaistarrail': { name: 'Honkai Star Rail', emoji: '🚂', icon: 'https://i.imgur.com/PfxqUwd.png' },
    'honkailoginesenha': { name: 'HONKAI LOGIN e SENHA', emoji: '🔑', icon: 'https://i.imgur.com/PfxqUwd.png' },
    'zzz': { name: 'Zenless Zone Zero', emoji: '🎮', icon: 'https://i.imgur.com/O7eRfcx.png' },
    'zzzloginesenha': { name: 'ZZZ LOGIN e SENHA', emoji: '🔑', icon: 'https://i.imgur.com/O7eRfcx.png' },
    'ymirpoints': { name: 'Ymir', emoji: '❄️', icon: 'https://i.imgur.com/Bna4U0c.png' },
    'ymirloginesenha': { name: 'Ymir Login e Senha', emoji: '🔐', icon: 'https://i.imgur.com/Bna4U0c.png' },
    'romgoldenage': { name: 'ROM Golden Age', emoji: '🏰', icon: 'https://i.imgur.com/6DUJFH5.png' },
    'arknights': { name: 'Arknights Endfield', emoji: '🏰', icon: 'https://i.imgur.com/HLExT4R.png' },
    'nteloginesenha': { name: 'NTE: Neverness to Everness (login e senha)', emoji: '🔑', icon: 'https://i.imgur.com/i9eTUHM.png' },
    'rfonline': { name: 'RF Online', emoji: '🚀', icon: 'https://i.imgur.com/hud6OwA.png' }
};

// Labels canônicos pros pacotes de cada jogo legado. Espelha PACK_LABELS
// que está hardcoded em discord-bot/index.js:17208 — sem emojis (o painel
// já mostra o emoji do produto separadamente).
// Usado pelo _migrateLegacyToRegistry pra evitar labels feios tipo
// "pack 300", "subscription", "bp insider" no primeiro save do jogo.
const LEGACY_PACK_LABELS = {
    wutheringwaves: {
        subscription: 'Lunite Subscription',
        pack_300: 'Lunite 300',
        pack_980: '980 Lunite',
        pack_1980: '1980 Lunite',
        pack_3200: '3200 Lunite',
        pack_3280: '3200 Lunite',
        pack_6480: '6480 Lunite',
        bp_insider: 'BP Insider Channel',
        bp_connoisseur: 'BP Connoisseur Channel'
    },
    wutheringwavesloginesenha: {
        subscription: 'Lunite Subscription',
        pack_300: 'Lunite 300',
        pack_980: '980 Lunite',
        pack_1980: '1980 Lunite',
        pack_3200: '3200 Lunite',
        pack_3280: '3200 Lunite',
        pack_6480: '6480 Lunite',
        bp_insider: 'BP Insider Channel',
        bp_connoisseur: 'BP Connoisseur Channel'
    },
    genshin: {
        bencao: 'Benção da Lua',
        pack_330: '300+30 Crystals',
        pack_1090: '980+110 Crystals',
        pack_2240: '1980+260 Crystals',
        pack_3800: '3280+600 Crystals',
        pack_8000: '6480+1600 Crystals'
    },
    genshinloginesenha: {
        bencao: 'Benção da Lua',
        passe_gnostico: 'Passe de Batalha do Gnóstico',
        cancao_perola: 'Canção da Pérola',
        upgrade_passe: 'Fazer Upgrade no Passe',
        pack_330: 'Cristais 300+30',
        pack_1090: 'Cristais 980+110',
        pack_2240: 'Cristais 1980+260',
        pack_3800: 'Cristais 3200+600',
        pack_8000: 'Cristais 6400+1600'
    },
    nteloginesenha: {
        pack_300: 'Riftcrystal 300',
        pack_980: 'Riftcrystal 980',
        pack_1980: 'Riftcrystal 1980',
        pack_3280: 'Riftcrystal 3280',
        pack_6480: 'Riftcrystal 6480',
        pack_50: 'Passe de Batalha R$50',
        pack_100: 'Passe de Batalha R$100',
        mining_permit: 'Riftcrystal Mining Permit'
    },
    honkaistarrail: {
        passe: 'Passe de Suprimento',
        pack_330: '300+30 Fragmento',
        pack_1090: '980+110 Fragmento',
        pack_2240: '1980+260 Fragmento',
        pack_3800: '3200+600 Fragmento',
        pack_8000: '6400+1600 Fragmento'
    },
    honkailoginesenha: {
        passe: 'Passe de Suprimento',
        pack_50: 'Passe de Batalha 50$',
        pack_100: 'Passe de Batalha 100$',
        pack_330: '300+30 Fragmento',
        pack_1090: '980+110 Fragmento',
        pack_2240: '1980+260 Fragmento',
        pack_3800: '3200+600 Fragmento',
        pack_8000: '6400+1600 Fragmento'
    },
    zzz: {
        passe_suprimento: 'Passe de Suprimento',
        assinatura: 'Assinatura do Interlaço',
        pack_330: '300+30 Monocromo',
        pack_1090: '980+110 Monocromo',
        pack_2240: '1980+260 Monocromo',
        pack_3800: '3200+600 Monocromo',
        pack_8000: '6400+1600 Monocromo'
    },
    zzzloginesenha: {
        passe_suprimento: 'Passe de Suprimento',
        assinatura: 'Assinatura do Interlaço',
        pack_50: 'Passe de Batalha 50$',
        pack_100: 'Passe de Batalha 100$',
        pack_330: '300+30 Monocromo',
        pack_1090: '980+110 Monocromo',
        pack_2240: '1980+260 Monocromo',
        pack_3800: '3200+600 Monocromo',
        pack_8000: '6400+1600 Monocromo'
    },
    tsdsorigin: {
        topup_4: 'Suprimentos de Liones',
        topup_120: '120 Memórias da Estrela + 120 Bônus',
        topup_600: '600 Memórias da Estrela + 600 Bônus',
        topup_1900: '1900 Memórias da Estrela + 1900 Bônus',
        topup_3800: '3800 Memórias da Estrela + 3800 Bônus',
        topup_6200: '6200 Memórias da Estrela + 6200 Bônus',
        topup_121200: '12200 Memórias da Estrela + 12200 Bônus'
    },
    summonerswar: {
        pack_2790: 'Pack R$27,90',
        pack_5490: 'Pack R$54,90',
        pack_10990: 'Pack R$109,90',
        pack_16990: 'Pack R$169,90',
        pack_27990: 'Pack R$279,90',
        pack_54990: 'Pack R$549,90',
        pack_29990: 'Pack R$299,90'
    },
    aion2: {
        pack_145: 'Pack N$145',
        pack_190: 'Pack N$190',
        pack_430: 'Pack N$430',
        pack_475: 'Pack N$475',
        pack_640: 'Pack N$640',
        pack_645: 'Pack N$645',
        pack_750: 'Pack N$750',
        pack_950: 'Pack N$950',
        pack_980: 'Pack N$980',
        pack_1080: 'Pack N$1080',
        pack_1900: 'Pack N$1900'
    },
    romgoldenage: {
        pack_3: 'Pack 3$',
        pack_5: 'Pacote 5$',
        pack_7: 'Pacote 7$',
        pack_10: 'Pacote 10$',
        pack_30: 'Pacote 30$',
        pack_37: 'Pacote Diamante 37$',
        pack_50: 'Pacote 50$',
        pack_74: 'Pacote 74$',
        pack_100: 'Pacote 100$'
    },
    rohan2: {
        pack_10: 'Pack $10',
        pack_12: 'Pack $12',
        pack_20: 'Pack $20',
        pack_50: 'Pack $50',
        pack_100: 'Pack $100'
    },
    raven2: {
        pack_3: 'Pack de R$18,50 / 3,00 USD',
        pack_4: 'Pack de R$24,90 / 4,00 USD',
        pack_7: 'Pack de R$43,50 / 7,00 USD',
        pack_22: 'Pack de R$135,90 / 22,00 USD',
        pack_36: 'Pack de R$224,90 / 36,00 USD',
        pack_70: 'Pack de R$435,00 / 70,00 USD'
    },
    odin: {
        pack_4: 'Pack $4',
        pack_9: 'Pack $9',
        pack_23: 'Pack $23',
        pack_30: 'Pack $30',
        pack_40: 'Pack $40',
        pack_80: 'Pack $80'
    },
    ymirpoints: {
        pack_525: '525 Ymir Points',
        pack_1050: '1050 Ymir Points',
        pack_3150: '3150 Ymir Points',
        pack_5250: '5250 Ymir Points',
        pack_10500: '10500 Ymir Points',
        twd_5000: '5000 TWD',
        twd_10000: '10000 TWD',
        twd_30000: '30000 TWD'
    },
    ymirloginesenha: {
        pack_499: 'Pack 499',
        pack_999: 'Pack 999',
        pack_2999: 'Pack 2999',
        pack_4999: 'Pack 4999',
        pack_9999: 'Pack 9999'
    },
    ymirtwd: {
        twd_4500: '4500 TWD',
        twd_5000: '5000 TWD',
        twd_9000: '9000 TWD',
        twd_10000: '10000 TWD',
        twd_30000: '30000 TWD'
    },
    nightcrows: {
        twd_3500: '3500 TWD',
        twd_5000: '5000 TWD',
        twd_7000: '7000 TWD',
        twd_10000: '10000 TWD',
        topup_5: 'Pack $5',
        topup_8: 'Pack $8',
        topup_10: 'Pack $10',
        topup_20: 'Pack $20',
        topup_30: 'Pack $30',
        topup_50: 'Pack $50',
        topup_100: 'Pack $100'
    },
    arknights: {
        pack_1: 'Pacote arsenal econômico',
        pack_2: 'Origeometria 21+5',
        pack_3: 'Origeometria 34+6',
        pack_4: 'Origeometria 57+11',
        pack_5: 'Origeometria 92+20',
        pack_6: 'Origeometria 194+48',
        pack_7: 'Pacote CT do patch atual',
        pack_8: 'Pacote apoio a RH',
        pack_9: 'Passe mensal',
        pack_10: 'Pacote completo',
        pack_11: 'Pacote fluxo de protocolo',
        pack_12: 'Pacote de materiais mensais',
        pack_13: 'Pacote tiquete arsenal promo',
        pack_14: 'Passe de batalha'
    }
};

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
            top: 30px;
            right: 30px;
            z-index: 10000;
            display: flex;
            flex-direction: column;
            gap: 15px;
            pointer-events: none;
        `;
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    const icons = { success: '✨', error: '💥', warning: '⚠️', info: '📡' };
    const colors = {
        success: 'linear-gradient(135deg, #9933ff 0%, #ff1493 100%)',
        error: 'linear-gradient(135deg, #ff3366 0%, #dc2626 100%)',
        warning: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
        info: 'linear-gradient(135deg, #00d4ff 0%, #2563eb 100%)'
    };

    toast.style.cssText = `
        background: ${colors[type] || colors.info};
        color: white;
        padding: 15px 25px;
        border-radius: 15px;
        box-shadow: 0 10px 30px rgba(0,0,0,0.5), 0 0 15px rgba(153, 51, 255, 0.3);
        display: flex;
        align-items: center;
        gap: 15px;
        font-size: 15px;
        font-weight: 600;
        pointer-events: auto;
        animation: slideInToast 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        max-width: 400px;
        border: 1px solid rgba(255,255,255,0.2);
        backdrop-filter: blur(10px);
    `;

    toast.innerHTML = `<span style="font-size: 22px;">${icons[type] || icons.info}</span><span>${message}</span>`;

    if (type === 'success') playSound('success');
    if (type === 'error' || type === 'warning') playSound('alert');

    if (!document.getElementById('toast-styles')) {
        const style = document.createElement('style');
        style.id = 'toast-styles';
        style.textContent = `
            @keyframes slideInToast { from { transform: translateX(120%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
            @keyframes slideOutToast { from { transform: translateX(0); opacity: 1; } to { transform: translateX(120%); opacity: 0; } }
        `;
        document.head.appendChild(style);
    }

    container.appendChild(toast);
    setTimeout(() => {
        toast.style.animation = 'slideOutToast 0.5s ease forwards';
        setTimeout(() => toast.remove(), 500);
    }, duration);
}

// ============================================
// 📡 LIVE FEED SYSTEM
// ============================================
function addLiveFeedItem(message, type = 'info') {
    const feedList = document.getElementById('live-feed-list');
    if (!feedList) return;

    const item = document.createElement('div');
    item.className = `feed-item feed-${type}`;

    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    item.innerHTML = `<span style="color: var(--text-secondary); font-family: monospace;">[${timeStr}]</span> ${message}`;

    feedList.insertBefore(item, feedList.firstChild);

    // Manter apenas os últimos 20 itens
    if (feedList.children.length > 20) {
        feedList.removeChild(feedList.lastChild);
    }
}

// ============================================
// INICIALIZAÇÃO
// ============================================
onDashboardDomReady(() => {
    if (!window.db) {
        console.error('❌ Firebase não foi inicializado!');
        showToast('Erro: Firebase não inicializado!', 'error', 5000);
        return;
    }

    initParticleSystem();
    initCommandPalette();

    const hour = new Date().getHours();
    let greeting = 'Bom dia';
    if (hour >= 12 && hour < 18) greeting = 'Boa tarde';
    if (hour >= 18 || hour < 5) greeting = 'Boa noite';

    console.log('✅ Dashboard Admin inicializado');
    showToast(`${greeting}, Admin! Bem-vindo ao Daoshi Control.`, 'success', 4000);

    loadAllData();
    setupEventListeners();
    setupPriceSyncIndicator();

    // Simulação de atividade do sistema para o Live Feed
    setInterval(() => {
        const activities = [
            'Monitorando transações em tempo real...',
            'Sincronizando banco de dados Firebase...',
            'Verificando status dos servidores de pagamento...',
            'Atualizando cache de preços dos jogos...',
            'Otimizando performance do dashboard...',
            'Verificando integridade dos cupons...',
            'Analisando métricas de conversão...'
        ];
        const randomActivity = activities[Math.floor(Math.random() * activities.length)];
        addLiveFeedItem(randomActivity, 'info');
    }, 30000); // A cada 30 segundos
});

// ============================================
// ✨ PARTICLE SYSTEM (HIGH-TECH BACKGROUND)
// ============================================
function initParticleSystem() {
    const canvas = document.getElementById('particle-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let particles = [];
    const particleCount = 60;

    function resize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }

    window.addEventListener('resize', resize);
    resize();

    class Particle {
        constructor() {
            this.reset();
        }

        reset() {
            this.x = Math.random() * canvas.width;
            this.y = Math.random() * canvas.height;
            this.vx = (Math.random() - 0.5) * 0.5;
            this.vy = (Math.random() - 0.5) * 0.5;
            this.size = Math.random() * 2;
            this.alpha = Math.random() * 0.5;
        }

        update() {
            this.x += this.vx;
            this.y += this.vy;

            if (this.x < 0 || this.x > canvas.width) this.vx *= -1;
            if (this.y < 0 || this.y > canvas.height) this.vy *= -1;
        }

        draw() {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(153, 51, 255, ${this.alpha})`;
            ctx.fill();
        }
    }

    for (let i = 0; i < particleCount; i++) particles.push(new Particle());

    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        particles.forEach((p, i) => {
            p.update();
            p.draw();

            // Draw lines between close particles
            for (let j = i + 1; j < particles.length; j++) {
                const p2 = particles[j];
                const dx = p.x - p2.x;
                const dy = p.y - p2.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < 150) {
                    ctx.beginPath();
                    ctx.strokeStyle = `rgba(153, 51, 255, ${0.1 * (1 - dist / 150)})`;
                    ctx.lineWidth = 0.5;
                    ctx.moveTo(p.x, p.y);
                    ctx.lineTo(p2.x, p2.y);
                    ctx.stroke();
                }
            }
        });

        requestAnimationFrame(animate);
    }

    animate();
}

// ============================================
// ⌨️ COMMAND PALETTE (CTRL+K)
// ============================================
function initCommandPalette() {
    const palette = document.getElementById('command-palette');
    const input = document.getElementById('cmd-input');
    const list = document.getElementById('cmd-list');

    const commands = [
        { label: '📊 Ver Vendas', action: () => switchTab('vendas'), shortcut: 'G V' },
        { label: '🎫 Gerenciar Cupons', action: () => switchTab('cupons'), shortcut: 'G C' },
        { label: '💰 Ajustar Preços', action: () => switchTab('precos'), shortcut: 'G P' },
        { label: '👥 Lista de Clientes', action: () => switchTab('clientes'), shortcut: 'G L' },
        { label: '📈 Estatísticas Avançadas', action: () => switchTab('estatisticas'), shortcut: 'G E' },
        { label: '📋 Abrir CRM', action: () => switchTab('crm'), shortcut: 'G R' },
        { label: '📜 Logs de Tickets', action: () => switchTab('logs'), shortcut: 'G T' },
        { label: '🔄 Atualizar Dados', action: () => loadAllData(), shortcut: 'R' },
        { label: '➕ Novo Cupom', action: () => openCouponModal(), shortcut: 'N C' }
    ];

    let selectedIndex = 0;

    function renderCommands(filter = '') {
        const filtered = commands.filter(c => c.label.toLowerCase().includes(filter.toLowerCase()));
        list.innerHTML = filtered.map((c, i) => `
            <div class="cmd-item ${i === selectedIndex ? 'selected' : ''}" data-index="${i}">
                <span class="cmd-label">${c.label}</span>
                <span class="cmd-shortcut">${c.shortcut}</span>
            </div>
        `).join('');

        // Add click events
        document.querySelectorAll('.cmd-item').forEach(item => {
            item.onclick = () => {
                const cmd = filtered[item.dataset.index];
                if (cmd) {
                    cmd.action();
                    closePalette();
                }
            };
        });
    }

    function openPalette() {
        palette.classList.add('active');
        palette.style.display = 'flex';
        input.value = '';
        selectedIndex = 0;
        renderCommands();
        setTimeout(() => input.focus(), 10);
    }

    function closePalette() {
        palette.classList.remove('active');
        palette.style.display = 'none';
    }

    window.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.key === 'k') {
            e.preventDefault();
            openPalette();
        }

        if (palette.style.display === 'flex') {
            if (e.key === 'Escape') closePalette();
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                selectedIndex = (selectedIndex + 1) % list.children.length;
                renderCommands(input.value);
            }
            if (e.key === 'ArrowUp') {
                e.preventDefault();
                selectedIndex = (selectedIndex - 1 + list.children.length) % list.children.length;
                renderCommands(input.value);
            }
            if (e.key === 'Enter') {
                const selected = list.querySelector('.selected');
                if (selected) selected.click();
            }
        }
    });

    input.oninput = () => {
        selectedIndex = 0;
        renderCommands(input.value);
    };
}

// ============================================
// 🔊 SOUND FEEDBACK SYSTEM
// ============================================
const sounds = {
    click: new Audio('../sounds/botão.mp3'),
    success: new Audio('../sounds/start.mp3'),
    alert: new Audio('../sounds/alerta.mp3'),
    hover: new Audio('../sounds/botão.mp3') // Reusing for now
};

function playSound(name) {
    const sound = sounds[name];
    if (sound) {
        sound.volume = 0.2;
        sound.currentTime = 0;
        sound.play().catch(e => console.log('Audio play blocked'));
    }
}

function setupEventListeners() {
    // Navegação
    document.querySelectorAll('.nav-item').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            playSound('click');
            const tab = link.getAttribute('data-tab');
            switchTab(tab);
        });

        link.addEventListener('mouseenter', () => {
            // playSound('hover'); // Optional: can be annoying if too frequent
        });
    });

    // Filtro de cupons
    const searchCupons = document.getElementById('search-cupons');
    if (searchCupons) {
        searchCupons.addEventListener('input', () => renderCoupons());
    }

    const filterCupomStatus = document.getElementById('filter-cupom-status');
    if (filterCupomStatus) {
        filterCupomStatus.addEventListener('change', () => renderCoupons());
    }

    const filterCupomPeriod = document.getElementById('filter-cupom-period');
    if (filterCupomPeriod) {
        filterCupomPeriod.addEventListener('change', () => {
            const customDateDiv = document.getElementById('cupom-custom-date');
            if (customDateDiv) {
                customDateDiv.style.display = filterCupomPeriod.value === 'custom' ? 'flex' : 'none';
            }
            renderCoupons();
        });
    }

    const cupomDateStart = document.getElementById('cupom-date-start');
    const cupomDateEnd = document.getElementById('cupom-date-end');
    if (cupomDateStart) cupomDateStart.addEventListener('change', () => renderCoupons());
    if (cupomDateEnd) cupomDateEnd.addEventListener('change', () => renderCoupons());

    // Filtros de vendas
    const filterElements = ['filter-period', 'filter-status', 'filter-payment', 'search-vendas', 'filter-search-type'];
    filterElements.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener('change', () => {
                salesCurrentPage = 1; // Reset para página 1 ao filtrar
                updateSalesTable();
            });
            if (id === 'search-vendas') {
                element.addEventListener('input', () => {
                    salesCurrentPage = 1;
                    updateSalesTable();
                });
            }
        }
    });

    // Filtro de clientes
    const searchClientes = document.getElementById('search-clientes');
    if (searchClientes) {
        searchClientes.addEventListener('input', () => { clientesCurrentPage = 1; updateClientesTable(); });
    }
    const filterSaldo = document.getElementById('filter-clientes-saldo');
    const filterCupom = document.getElementById('filter-clientes-cupom');
    const filterOrder = document.getElementById('filter-clientes-order');
    if (filterSaldo) filterSaldo.addEventListener('change', () => { clientesCurrentPage = 1; updateClientesTable(); });
    if (filterCupom) filterCupom.addEventListener('change', () => { clientesCurrentPage = 1; updateClientesTable(); });
    if (filterOrder) filterOrder.addEventListener('change', () => { clientesCurrentPage = 1; updateClientesTable(); });

    // Botões de ação são chamados via onclick no HTML
    // Expor funções globalmente
    window.exportarVendas = exportSalesToCSV;
    window.saveAllPrices = saveAllPrices;
    window.resetPricesToDefault = resetPricesToDefault;
    window.updatePriceValue = updatePriceValue;
    window.updateLimitValue = updateLimitValue;
    window.updateGlobalLimit = updateGlobalLimit;
    window.openGameEditor = openGameEditor;
    window.closeGameEditor = closeGameEditor;
    window.openCupomModal = openCouponModal;
    window.closeCouponModal = closeCouponModal;
    window.saveCoupon = saveCoupon;
    window.toggleCoupon = toggleCoupon;
    window.editCoupon = editCoupon;
    window.deleteCoupon = deleteCoupon;
    window.refreshData = async () => {
        _invalidateOfficialSalesCache();
        await Promise.all([
            loadSalesData(true),
            loadDashboardGlobalSummary(),
            loadCouponsData(),
            loadPricesData()
        ]);
        showToast('Dados recentes atualizados!', 'success', 2500);
    };
    window.addSaldoManual = addSaldoManual;
    window.removeSaldoManual = removeSaldoManual;
    window.viewClienteHistory = viewClienteHistory;
    window.viewAffiliateInfo = viewAffiliateInfo;
    window.removeReferralCoupon = removeReferralCoupon;
    window.viewClienteDetails = viewClienteDetails;
    window.exportClientesCSV = exportClientesCSV;
    window.goToClientesPage = goToClientesPage;
    window.copyDiscordId = copyDiscordId;
    window.nextPage = nextPage;
    window.previousPage = previousPage;
    window.editSale = editSale;
    window.deleteSale = deleteSale;
    window.loadIntermedioData = loadIntermedioData;
    window.deleteIntermedio = deleteIntermedio;
}

function switchTab(tabName) {
    // Remover active de todas as tabs
    document.querySelectorAll('.nav-item').forEach(link => link.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

    // Ativar tab selecionada
    document.querySelector(`[data-tab="${tabName}"]`)?.classList.add('active');
    document.getElementById(`tab-${tabName}`)?.classList.add('active');

    // Atualizar título
    const titles = {
        'vendas': 'Vendas',
        'cupons': 'Cupons',
        'precos': 'Preços dos Jogos',
        'clientes': 'Clientes',
        'estatisticas': 'Estatísticas',
        'relatorio': 'Relatório de Compras',
        'relatorios': 'Relatórios Mensais',
        'crm': 'CRM - Vendas Oficiais',
        'intermedio': 'Intermédio',
        'faq': 'FAQ',
        'indicacoes': 'Indicações',
        'logs': 'Logs de Tickets',
        'blacklist': 'Blacklist WEMIX',
        'clans': 'Clãs / Organizações'
    };
    const pageTitle = document.getElementById('page-title');
    if (pageTitle) pageTitle.textContent = titles[tabName] || 'Dashboard';

    // Carregar relatórios quando abrir a aba (o HTML usa "relatorio" no singular).
    if (tabName === 'relatorio' || tabName === 'relatorios') {
        initializeMonthlyReports();
    }

    // Carregar CRM quando abrir a aba
    if (tabName === 'crm') {
        setupCRMListeners();
        loadOfficialSalesData();
    }

    // Carregar Intermédio quando abrir a aba
    if (tabName === 'intermedio') {
        loadIntermedioData();
        loadIntermedTickets();
        setupIntermedioListeners();
    }

    // Carregar FAQ quando abrir a aba
    if (tabName === 'faq') {
        loadFaqData();
    }

    // Carregar Indicações quando abrir a aba
    if (tabName === 'indicacoes') {
        loadIndicacoesData();
    }

    // Carregar Logs quando abrir a aba
    if (tabName === 'logs') {
        loadTicketLogs();
    }

    // Carregar Blacklist quando abrir a aba
    if (tabName === 'blacklist') {
        loadBlacklistData();
    }

    // Carregar Clãs quando abrir a aba
    if (tabName === 'clans') {
        loadClansData();
    }

    // Carregar Clientes só na 1ª vez que abrir a aba (lazy — evita baixar a
    // árvore inteira de clientes em toda abertura do painel). Refresh manual
    // (botão da aba) chama loadClientesData() direto e ignora esse guard.
    if (tabName === 'clientes' && !_clientesLoaded) {
        _clientesLoaded = true;
        loadClientesData();
    }

    // Re-renderizar picker de jogos toda vez que entrar na aba Preços
    // (garante que o "modal selecione um jogo" sempre apareça como primeira coisa)
    if (tabName === 'precos') {
        const search = document.getElementById('game-picker-search-input');
        if (search) search.value = '';
        renderPrices();
    }
}

async function loadAllData() {
    addLiveFeedItem('Iniciando sincronização global de dados...', 'info');
    await Promise.all([
        loadSalesData(),
        loadDashboardGlobalSummary(),
        loadCouponsData(),
        loadPricesData()
        // Clientes, CRM, relatórios, intermédio e logs são carregados apenas
        // quando a respectiva aba é aberta. Isso mantém a abertura leve.
    ]);
    addLiveFeedItem('Sincronização concluída com sucesso.', 'success');
}

// ═══════════════════════════════════════════════════════════════
// 📊 VENDAS
// ═══════════════════════════════════════════════════════════════

// Cache por ESCOPO. O painel não baixa mais vendasOficiais inteiro na abertura.
// A tabela inicial recebe só as últimas 500; CRM/relatórios fazem queries por data.
const OFFICIAL_SALES_CACHE_TTL = 300_000;
const _officialSalesCache = new Map();
const _officialSalesInflight = new Map();

async function _fetchOfficialSalesQuery(cacheKey, queryFactory, forceRefresh = false, timeoutMs = DATA_LOAD_TIMEOUT_MS) {
    const cached = _officialSalesCache.get(cacheKey);
    if (!forceRefresh && cached && (Date.now() - cached.at) < OFFICIAL_SALES_CACHE_TTL) return cached.data;
    if (_officialSalesInflight.has(cacheKey)) return _officialSalesInflight.get(cacheKey);

    const inflight = (async () => {
        try {
            const baseRef = window.db.ref('vendasOficiais');
            const snapshot = await withTimeout(queryFactory(baseRef).once('value'), timeoutMs, 'vendas');
            const data = snapshot.val() || {};
            _officialSalesCache.set(cacheKey, { data, at: Date.now() });
            return data;
        } finally {
            _officialSalesInflight.delete(cacheKey);
        }
    })();
    _officialSalesInflight.set(cacheKey, inflight);
    return inflight;
}

function _fetchRecentOfficialSales(forceRefresh = false) {
    return _fetchOfficialSalesQuery(
        `recent:${DASHBOARD_SALES_LIMIT}`,
        ref => ref.orderByChild('createdAt').limitToLast(DASHBOARD_SALES_LIMIT),
        forceRefresh
    );
}

function _fetchOfficialSalesRange(startAt, endAt, forceRefresh = false) {
    const start = Math.max(0, Number(startAt) || 0);
    const end = Number.isFinite(Number(endAt)) ? Number(endAt) : Date.now();
    const cacheStart = Math.floor(start / 60_000);
    const cacheEnd = Math.floor(end / 60_000);
    return _fetchOfficialSalesQuery(
        `range:${cacheStart}:${cacheEnd}`,
        ref => ref.orderByChild('createdAt').startAt(start).endAt(end),
        forceRefresh,
        45_000
    );
}

function _fetchAllOfficialSales(forceRefresh = false) {
    return _fetchOfficialSalesQuery('all', ref => ref, forceRefresh, 120_000);
}

function _invalidateOfficialSalesCache() {
    _officialSalesCache.clear();
}

async function loadDashboardGlobalSummary() {
    try {
        const [geralSnap, jogosSnap] = await Promise.all([
            withTimeout(window.db.ref('estatisticas/geral').once('value'), 10_000, 'resumo geral'),
            withTimeout(window.db.ref('estatisticas/jogos').once('value'), 10_000, 'resumo por jogo')
        ]);
        dashboardGlobalSummary = {
            geral: geralSnap.val() || {},
            jogos: jogosSnap.val() || {}
        };
        if (allSales.length) updateStatistics(allSales);
    } catch (error) {
        console.warn('⚠️ Resumo global indisponível; usando apenas vendas recentes:', error.message);
    }
}

async function loadSalesData(forceRefresh = false) {
    try {
        console.log('📡 Iniciando carregamento de vendas...');
        addLiveFeedItem('Buscando dados de vendas no Firebase...', 'info');
        setTableState('vendas-tbody', 12, `Carregando as últimas ${DASHBOARD_SALES_LIMIT} vendas...`);

        // Consulta indexada e limitada: evita baixar dezenas de MB na abertura.
        const oficiaisData = await _fetchRecentOfficialSales(forceRefresh);

        allSales = [];

        // Adicionar vendas oficiais
        const oficiaisKeys = Object.keys(oficiaisData || {});
        if (oficiaisKeys.length > 0) {
            console.log('📦 Dados de "vendasOficiais" encontrados:', oficiaisKeys.length);
            oficiaisKeys.forEach((key) => {
                allSales.push({
                    id: key,
                    source: 'vendasOficiais',
                    ...oficiaisData[key]
                });
            });
        } else {
            console.log('⚠️ Caminho "vendasOficiais" está vazio ou não existe.');
        }

        console.log(`📊 Total de vendas processadas: ${allSales.length}`);

        // Ordenar por data (mais recentes primeiro) de forma robusta
        allSales.sort((a, b) => {
            const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return (isNaN(timeB) ? 0 : timeB) - (isNaN(timeA) ? 0 : timeA);
        });

        updateSalesTable();
        updateStatistics(allSales); // Atualizar estatísticas iniciais
        renderCoupons(); // Atualizar estatísticas dos cupons com os dados de vendas
        addLiveFeedItem(`${allSales.length} vendas recentes sincronizadas.`, 'success');
    } catch (error) {
        console.error('❌ Erro ao carregar vendas:', error);
        setTableState('vendas-tbody', 12, error.message, 'error');
        showToast('Erro ao carregar vendas: ' + error.message, 'error');
        addLiveFeedItem('Erro ao carregar vendas: ' + error.message, 'error');
    }
}

function updateSalesTable() {
    const tbody = document.getElementById('vendas-tbody');
    if (!tbody) {
        console.error('❌ Elemento vendas-tbody não encontrado');
        return;
    }
    console.log('🔄 Atualizando tabela de vendas...');
    tbody.innerHTML = '';

    // Aplicar filtros
    let filteredSales = [...allSales];

    // Filtro de período
    const periodFilter = document.getElementById('filter-period')?.value || 'all';
    console.log('📅 Filtro de período:', periodFilter);
    if (periodFilter !== 'all') {
        const now = new Date();
        let startDate;

        if (periodFilter === 'today') {
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        } else if (periodFilter === 'custom') {
            // Implementar futuramente
            startDate = new Date(0);
        } else {
            const days = parseInt(periodFilter);
            startDate = new Date(now.getTime() - (days * 24 * 60 * 60 * 1000));
        }

        filteredSales = filteredSales.filter(sale => {
            if (!sale.createdAt) return false;
            // Aceita tanto timestamp numérico quanto string ISO
            const saleDate = typeof sale.createdAt === 'number' ? new Date(sale.createdAt) : new Date(sale.createdAt);
            return saleDate >= startDate;
        });
    }

    // Filtro de status
    const statusFilter = document.getElementById('filter-status')?.value;
    if (statusFilter) {
        filteredSales = filteredSales.filter(sale => sale.status === statusFilter);
    }

    // Filtro de método de pagamento
    const paymentFilter = document.getElementById('filter-payment')?.value;
    if (paymentFilter) {
        filteredSales = filteredSales.filter(sale => sale.paymentMethod === paymentFilter);
    }

    // Filtro de pesquisa
    const searchType = document.getElementById('filter-search-type')?.value || 'id';
    const searchValue = document.getElementById('search-vendas')?.value.toLowerCase();
    if (searchValue) {
        filteredSales = filteredSales.filter(sale => {
            switch (searchType) {
                case 'id':
                    return sale.userId?.toLowerCase().includes(searchValue);
                case 'cupom':
                    // Buscar em referralCode (bot) e couponCode (legado)
                    const cupom = (sale.referralCode || sale.couponCode || '').toLowerCase();
                    return cupom.includes(searchValue);
                case 'usuario':
                    return sale.username?.toLowerCase().includes(searchValue);
                case 'nome-pacote':
                    return sale.cart?.some(item =>
                        item.packageLabel?.toLowerCase().includes(searchValue) ||
                        item.productName?.toLowerCase().includes(searchValue)
                    );
                case 'nome-jogo':
                    return sale.game?.toLowerCase().includes(searchValue);
                default:
                    return true;
            }
        });
    }

    // Atualizar estatísticas
    updateStatistics(filteredSales);

    // Guardar para paginação
    filteredSalesData = filteredSales.reverse();

    if (filteredSalesData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="12" style="text-align:center;">Nenhuma venda encontrada</td></tr>';
        updateSalesPagination();
        return;
    }

    // Aplicar paginação
    const startIndex = (salesCurrentPage - 1) * salesItemsPerPage;
    const endIndex = startIndex + salesItemsPerPage;
    const paginatedSales = filteredSalesData.slice(startIndex, endIndex);

    paginatedSales.forEach(sale => {
        const row = document.createElement('tr');
        const gameInfo = JOGOS_DISPONIVEIS[sale.game?.toLowerCase()] || { name: sale.game || 'N/A', emoji: '🎮' };

        row.innerHTML = `
            <td>
                <div class="action-buttons">
                    <button class="btn-icon btn-edit" onclick="editSale('${sale.id}')" title="Editar">✏️</button>
                    <button class="btn-icon btn-view" onclick="viewSaleDetails('${sale.id}')" title="Ver Detalhes">📄</button>
                    <button class="btn-icon btn-delete" onclick="deleteSale('${sale.id}')" title="Deletar">🗑️</button>
                </div>
            </td>
            <td style="font-family: monospace; font-size: 12px; color: var(--text-secondary);">${sale.userId || 'N/A'}</td>
            <td>
                <div style="display: flex; align-items: center; gap: 10px;">
                    <div style="width: 30px; height: 30px; background: var(--bg-hover); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px;">
                        ${(sale.username || 'A').charAt(0).toUpperCase()}
                    </div>
                    <span>${sale.username || 'N/A'}</span>
                </div>
            </td>
            <td>
                <span style="display: flex; align-items: center; gap: 8px;">
                    <span>${gameInfo.emoji}</span>
                    <span>${gameInfo.name}</span>
                </span>
            </td>
            <td><span class="status-badge status-${sale.status}">${sale.status}</span></td>
            <td style="font-weight: 700; color: var(--success);">R$ ${(sale.totalBRL || 0).toFixed(2)}</td>
            <td style="color: var(--info);">$ ${(sale.totalUSD || 0).toFixed(2)}</td>
            <td style="font-size: 12px; color: var(--text-secondary);">${(sale.exchangeRate || 0).toFixed(4)}</td>
            <td>
                <span class="payment-method-badge">${sale.paymentMethod || 'PIX'}</span>
            </td>
            <td style="font-size: 12px;">${formatDate(sale.createdAt)}</td>
            <td style="font-size: 12px;">${formatDate(sale.updatedAt)}</td>
            <td>
                <span class="cupom-tag">${sale.referralCode || sale.couponCode || '-'}</span>
            </td>
        `;
        tbody.appendChild(row);
    });

    updateSalesPagination();
}

// Funções de paginação para vendas
function updateSalesPagination() {
    const totalPages = Math.ceil(filteredSalesData.length / salesItemsPerPage) || 1;
    const pageInfo = document.getElementById('page-info');
    if (pageInfo) pageInfo.textContent = `Página ${salesCurrentPage} de ${totalPages}`;

    const btnPrev = document.getElementById('btn-prev');
    const btnNext = document.getElementById('btn-next');
    if (btnPrev) btnPrev.disabled = salesCurrentPage === 1;
    if (btnNext) btnNext.disabled = salesCurrentPage >= totalPages;
}

function nextPage() {
    const totalPages = Math.ceil(filteredSalesData.length / salesItemsPerPage);
    if (salesCurrentPage < totalPages) {
        salesCurrentPage++;
        updateSalesTable();
    }
}

function previousPage() {
    if (salesCurrentPage > 1) {
        salesCurrentPage--;
        updateSalesTable();
    }
}

// Função para escapar campos CSV corretamente
function escapeCSVField(field) {
    if (field === null || field === undefined) return '';
    const str = String(field);
    // Se contém aspas, ponto-e-vírgula, vírgula ou quebra de linha, precisa escapar
    if (str.includes('"') || str.includes(';') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
        return '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
}

function exportSalesToCSV() {
    if (allSales.length === 0) {
        showToast('Não há vendas para exportar!', 'warning');
        return;
    }

    // Usar ponto-e-vírgula como separador (padrão Excel/Brasil)
    let csv = 'ID;User ID;Status;Total BRL;Total USD;Taxa Câmbio;Método;Cupom;Criado;Atualizado\n';

    allSales.forEach(sale => {
        const fields = [
            sale.id,
            sale.userId,
            sale.status,
            sale.totalBRL,
            sale.totalUSD,
            sale.exchangeRate,
            sale.paymentMethod,
            sale.couponCode || '',
            sale.createdAt,
            sale.updatedAt || ''
        ];
        csv += fields.map(f => escapeCSVField(f)).join(';') + '\n';
    });

    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vendas_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
}

function editSale(saleId) {
    const sale = allSales.find(s => s.id === saleId);
    if (!sale) return;

    const newStatus = prompt('Status da venda (pending/completed/cancelled):', sale.status);
    if (!newStatus) return;

    // Determinar o caminho correto baseado na fonte da venda
    const path = sale.source === 'vendasOficiais' ? `vendasOficiais/${saleId}` : `sales/${saleId}`;

    window.db.ref(path).update({
        status: newStatus,
        updatedAt: new Date().toISOString()
    }).then(() => {
        showToast('Venda atualizada!', 'success');
        loadSalesData();
    }).catch(err => {
        showToast('Erro: ' + err.message, 'error');
    });
}

function deleteSale(saleId) {
    if (!confirm('Deseja realmente deletar esta venda?')) return;

    const sale = allSales.find(s => s.id === saleId);
    // Determinar o caminho correto baseado na fonte da venda
    const path = sale?.source === 'vendasOficiais' ? `vendasOficiais/${saleId}` : `sales/${saleId}`;

    window.db.ref(path).remove()
        .then(() => {
            showToast('Venda deletada!', 'success');
            loadSalesData();
        })
        .catch(err => showToast('Erro: ' + err.message, 'error'));
}

function viewSaleDetails(saleId) {
    const sale = allSales.find(s => s.id === saleId);
    if (!sale) return;

    const content = document.getElementById('sale-details-content');
    const gameInfo = JOGOS_DISPONIVEIS[sale.game?.toLowerCase()] || { name: sale.game || 'N/A', emoji: '🎮' };

    let cartHtml = '';
    if (sale.cart && sale.cart.length > 0) {
        cartHtml = `
            <div style="margin-top: 20px; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 15px;">
                <p style="font-size: 10px; color: var(--text-secondary); text-transform: uppercase; margin-bottom: 10px;">Itens do Carrinho</p>
                ${sale.cart.map(item => `
                    <div class="receipt-item">
                        <span class="receipt-label">${item.packageLabel || item.productName || 'Item'}</span>
                        <span class="receipt-value">R$ ${(item.priceBRL || 0).toFixed(2)}</span>
                    </div>
                `).join('')}
            </div>
        `;
    }

    content.innerHTML = `
        <div class="receipt-item">
            <span class="receipt-label">ID DA TRANSAÇÃO</span>
            <span class="receipt-value" style="font-size: 10px;">${sale.id}</span>
        </div>
        <div class="receipt-item">
            <span class="receipt-label">CLIENTE</span>
            <span class="receipt-value">${sale.username || 'N/A'}</span>
        </div>
        <div class="receipt-item">
            <span class="receipt-label">DISCORD ID</span>
            <span class="receipt-value">${sale.userId || 'N/A'}</span>
        </div>
        <div class="receipt-item">
            <span class="receipt-label">JOGO</span>
            <span class="receipt-value">${gameInfo.emoji} ${gameInfo.name}</span>
        </div>
        <div class="receipt-item">
            <span class="receipt-label">MÉTODO</span>
            <span class="receipt-value">${sale.paymentMethod || 'PIX'}</span>
        </div>
        <div class="receipt-item">
            <span class="receipt-label">DATA</span>
            <span class="receipt-value">${formatDate(sale.createdAt)}</span>
        </div>
        <div class="receipt-item">
            <span class="receipt-label">STATUS</span>
            <span class="receipt-value" style="color: var(--${sale.status === 'completed' ? 'success' : (sale.status === 'pending' ? 'warning' : 'danger')})">${sale.status.toUpperCase()}</span>
        </div>
        
        ${cartHtml}

        <div class="receipt-total">
            <span>TOTAL</span>
            <span>R$ ${(sale.totalBRL || 0).toFixed(2)}</span>
        </div>
        <p style="font-size: 10px; color: #555; text-align: center; margin-top: 20px;">Obrigado por comprar na Daoshi Store!</p>
    `;

    document.getElementById('modal-sale-details').classList.add('active');
    playSound('click');
}

function closeSaleDetailsModal() {
    document.getElementById('modal-sale-details').classList.remove('active');
}

// ═══════════════════════════════════════════════════════════════
// 🎟️ CUPONS
// ═══════════════════════════════════════════════════════════════

async function loadCouponsData() {
    try {
        const snapshot = await window.db.ref('coupons').once('value');
        allCoupons = [];

        snapshot.forEach((child) => {
            allCoupons.push({
                id: child.key,
                ...child.val()
            });
        });

        renderCoupons();
        console.log(`✅ ${allCoupons.length} cupons carregados`);
    } catch (error) {
        console.error('❌ Erro ao carregar cupons:', error);
    }
}

function renderCoupons() {
    const list = document.getElementById('cupons-grid');
    if (!list) return;

    const searchTerm = document.getElementById('search-cupons')?.value.toLowerCase() || '';
    const statusFilter = document.getElementById('filter-cupom-status')?.value || 'all';
    const periodFilter = document.getElementById('filter-cupom-period')?.value || 'all';

    // 1. Filtrar vendas pelo período selecionado para calcular estatísticas reais
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    
    const filteredSalesForStats = allSales.filter(sale => {
        if (periodFilter === 'all') return true;
        
        const saleTime = sale.timestamp || (sale.createdAt ? new Date(sale.createdAt).getTime() : 0);
        if (!saleTime) return false;

        switch (periodFilter) {
            case 'today': return (now - saleTime) < dayMs;
            case '7': return (now - saleTime) < (7 * dayMs);
            case '30': return (now - saleTime) < (30 * dayMs);
            case '90': return (now - saleTime) < (90 * dayMs);
            case 'year': return new Date(saleTime).getFullYear() === new Date().getFullYear();
            case 'custom':
                const start = document.getElementById('cupom-date-start')?.value;
                const end = document.getElementById('cupom-date-end')?.value;
                if (start && end) {
                    const startTime = new Date(start).getTime();
                    const endTime = new Date(end).getTime() + dayMs;
                    return saleTime >= startTime && saleTime <= endTime;
                }
                return true;
            default: return true;
        }
    });

    // 2. Calcular estatísticas por cupom (canceladas não contam)
    const couponStats = {};
    filteredSalesForStats.forEach(sale => {
        if (!isSaleActive(sale)) return;
        const code = (sale.referralCode || sale.couponCode || sale.referral?.code || '').toUpperCase().trim();
        if (!code) return;

        if (!couponStats[code]) {
            couponStats[code] = { count: 0, totalValue: 0 };
        }
        couponStats[code].count++;
        couponStats[code].totalValue += (parseFloat(sale.totalBRL) || 0);
    });

    // 3. Filtrar e preparar lista de cupons
    const filteredCoupons = allCoupons.filter(coupon => {
        const matchesSearch = coupon.code.toLowerCase().includes(searchTerm);
        const matchesStatus = statusFilter === 'all' ||
            (statusFilter === 'active' && coupon.active) ||
            (statusFilter === 'expired' && !coupon.active);
        return matchesSearch && matchesStatus;
    }).map(coupon => {
        const stats = couponStats[coupon.code.toUpperCase()] || { count: 0, totalValue: 0 };
        return {
            ...coupon,
            periodCount: stats.count,
            periodTotalValue: stats.totalValue
        };
    });

    // 4. Renderizar Top 20
    renderTop20Coupons(filteredCoupons);

    list.innerHTML = '';

    if (filteredCoupons.length === 0) {
        list.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 50px; background: var(--bg-card); border-radius: 20px; border: 1px dashed var(--border);">
                <span style="font-size: 40px; display: block; margin-bottom: 15px;">🔍</span>
                <p style="color: var(--text-secondary);">Nenhum cupom encontrado para sua busca.</p>
            </div>
        `;
        return;
    }

    filteredCoupons.forEach(coupon => {
        const card = document.createElement('div');
        card.className = 'cupom-card';

        // Usar o usedCount total do Firebase para o progresso, mas mostrar o do período no card
        const totalUsedCount = coupon.usedCount || 0;
        const usedPercent = coupon.maxUses > 0 ? (totalUsedCount / coupon.maxUses) * 100 : 0;
        const isFull = coupon.maxUses > 0 && totalUsedCount >= coupon.maxUses;

        card.innerHTML = `
            <div class="cupom-header">
                <div class="cupom-code-wrapper">
                    <span class="cupom-code">${coupon.code}</span>
                    <span class="cupom-type">${coupon.type === 'percentage' ? 'Cashback' : 'Desconto Fixo'}</span>
                </div>
                <div class="cupom-value-badge">
                    ${coupon.type === 'percentage' ? coupon.value + '%' : 'R$ ' + coupon.value}
                </div>
            </div>
            
            <div class="cupom-stats">
                <div class="stat-item">
                    <span class="stat-label">Usos (Período)</span>
                    <span class="stat-val">${coupon.periodCount}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Total (Período)</span>
                    <span class="stat-val" style="color: var(--success);">R$ ${coupon.periodTotalValue.toFixed(2)}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Usos Totais</span>
                    <span class="stat-val">${totalUsedCount} / ${coupon.maxUses || '∞'}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Status</span>
                    <span class="stat-val" style="color: ${coupon.active && !isFull ? 'var(--success)' : 'var(--danger)'}">
                        ${isFull ? 'Esgotado' : (coupon.active ? 'Ativo' : 'Inativo')}
                    </span>
                </div>
            </div>
            
            <div class="cupom-progress-container">
                <div style="display: flex; justify-content: space-between; font-size: 10px; margin-bottom: 5px; color: var(--text-secondary);">
                    <span>PROGRESSO TOTAL DE USO</span>
                    <span>${Math.round(usedPercent)}%</span>
                </div>
                <div class="cupom-progress-bar">
                    <div class="cupom-progress-fill" style="width: ${usedPercent > 100 ? 100 : usedPercent}%; background: ${usedPercent > 80 ? 'var(--danger)' : 'var(--success)'}"></div>
                </div>
            </div>
            
            <div class="cupom-actions">
                <button class="btn-cupom-action btn-cupom-edit" onclick="editCoupon('${coupon.id}')">
                    <span>✏️ Editar</span>
                </button>
                <button class="btn-cupom-action btn-cupom-delete" onclick="deleteCoupon('${coupon.id}')">
                    <span>🗑️ Excluir</span>
                </button>
            </div>
        `;
        list.appendChild(card);
    });
}

function renderTop20Coupons(coupons) {
    const container = document.getElementById('top-cupons-container');
    if (!container) return;

    // Ordenar por usos no período
    const top20 = [...coupons]
        .filter(c => c.periodCount > 0)
        .sort((a, b) => b.periodCount - a.periodCount)
        .slice(0, 20);

    if (top20.length === 0) {
        container.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 20px; background: rgba(255,255,255,0.03); border-radius: 10px; color: var(--text-secondary); font-size: 13px;">
                Nenhum cupom utilizado no período selecionado.
            </div>
        `;
        return;
    }

    container.innerHTML = top20.map((coupon, idx) => `
        <div class="top-cupom-mini-card" style="background: var(--card-bg); border: 1px solid var(--border); border-radius: 12px; padding: 15px; position: relative; overflow: hidden; border-left: 4px solid ${idx === 0 ? '#ffd700' : idx === 1 ? '#c0c0c0' : idx === 2 ? '#cd7f32' : 'var(--primary)'};">
            <div style="position: absolute; right: -10px; top: -10px; font-size: 40px; opacity: 0.05; font-weight: 900;">#${idx + 1}</div>
            <div style="font-weight: 800; color: var(--text-primary); margin-bottom: 5px; font-family: monospace;">${coupon.code}</div>
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="font-size: 12px; color: var(--text-secondary);">${coupon.periodCount} usos</span>
                <span style="font-size: 13px; font-weight: bold; color: var(--success);">R$ ${coupon.periodTotalValue.toFixed(0)}</span>
            </div>
        </div>
    `).join('');
}

function openCouponModal(couponId = null) {
    const modal = document.getElementById('modal-cupom');
    if (!modal) {
        console.error('❌ Modal não encontrado');
        return;
    }

    const titleEl = document.getElementById('modal-cupom-title');
    const btnEl = document.getElementById('modal-cupom-btn');

    // Resetar formulário - apenas 3 campos
    document.getElementById('cupom-code').value = '';
    document.getElementById('cupom-value').value = '';
    document.getElementById('cupom-max-uses').value = '';

    if (couponId) {
        const coupon = allCoupons.find(c => c.id === couponId);
        if (!coupon) return;

        document.getElementById('cupom-code').value = coupon.code;
        document.getElementById('cupom-value').value = coupon.value;
        document.getElementById('cupom-max-uses').value = coupon.maxUses !== null && coupon.maxUses !== undefined ? coupon.maxUses : 0;

        // Armazenar ID para edição
        modal.dataset.couponId = couponId;

        // Atualizar título e botão para modo edição
        if (titleEl) titleEl.textContent = '✏️ Editar Cupom';
        if (btnEl) btnEl.textContent = '💾 Salvar Alterações';
    } else {
        delete modal.dataset.couponId;

        // Título e botão para criar novo
        if (titleEl) titleEl.textContent = '🎫 Criar Novo Cupom';
        if (btnEl) btnEl.textContent = '🎫 Criar Cupom';
    }

    modal.classList.add('active');
}

function closeCouponModal() {
    const modal = document.getElementById('modal-cupom');
    if (modal) modal.classList.remove('active');
}

function saveCoupon() {
    try {
        const modal = document.getElementById('modal-cupom');
        if (!modal) {
            console.error('❌ Modal não encontrado');
            showToast('Erro: Modal não encontrado!', 'error');
            return;
        }

        const id = modal.dataset.couponId || null;
        console.log('📝 Salvando cupom, ID:', id);

        const codeEl = document.getElementById('cupom-code');
        const valueEl = document.getElementById('cupom-value');
        const maxUsesEl = document.getElementById('cupom-max-uses');

        if (!codeEl || !valueEl || !maxUsesEl) {
            console.error('❌ Campos do formulário não encontrados');
            showToast('Erro: Campos do formulário não encontrados!', 'error');
            return;
        }

        const code = codeEl.value.toUpperCase().trim();
        const value = parseFloat(valueEl.value);
        const maxUsesInput = maxUsesEl.value.trim();
        const maxUses = maxUsesInput === '' ? 0 : parseInt(maxUsesInput);

        console.log('📝 Dados:', { code, value, maxUses });

        // Validações
        if (!code) {
            showToast('Digite o código do cupom!', 'warning');
            return;
        }

        if (!value || value < 1 || value > 100) {
            showToast('Digite um cashback válido entre 1% e 100%!', 'warning');
            return;
        }

        if (isNaN(maxUses) || maxUses < 0) {
            showToast('Digite a quantidade máxima de usos (0 = ilimitado)!', 'warning');
            return;
        }

        // Buscar cupom existente para preservar dados
        const existingCoupon = id ? allCoupons.find(c => c.id === id) : null;
        console.log('📝 Cupom existente:', existingCoupon);

        const couponData = {
            code,
            type: 'percentage',
            value,
            maxUses: maxUses === 0 ? null : maxUses,
            active: existingCoupon ? (existingCoupon.active !== false) : true,
            usedCount: existingCoupon ? (existingCoupon.usedCount || 0) : 0,
            minPurchase: existingCoupon ? (existingCoupon.minPurchase || 0) : 0,
            expiresAt: (existingCoupon && existingCoupon.expiresAt) ? existingCoupon.expiresAt : null,
            description: maxUses === 0
                ? `Cupom de ${value}% de cashback (ilimitado)`
                : `Cupom de ${value}% de cashback`,
            createdAt: (existingCoupon && existingCoupon.createdAt) ? existingCoupon.createdAt : new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        console.log('📝 Dados a salvar:', couponData);

        const ref = id ? window.db.ref(`coupons/${id}`) : window.db.ref('coupons').push();

        ref.set(couponData)
            .then(() => {
                const action = id ? 'atualizado' : 'criado';
                console.log(`✅ Cupom ${code} ${action}!`);
                showToast(`Cupom ${code} ${action}! ${value}% de cashback`, 'success');
                closeCouponModal();
                loadCouponsData();
            })
            .catch(err => {
                console.error('❌ Erro ao salvar no Firebase:', err);
                showToast('Erro ao salvar cupom: ' + err.message, 'error');
            });
    } catch (error) {
        console.error('❌ Erro na função saveCoupon:', error);
        showToast('Erro ao salvar cupom: ' + error.message, 'error');
    }
}

function toggleCoupon(couponId, newState) {
    window.db.ref(`coupons/${couponId}`).update({ active: newState })
        .then(() => {
            showToast('Cupom atualizado!', 'success');
            loadCouponsData();
        })
        .catch(err => showToast('Erro: ' + err.message, 'error'));
}

function editCoupon(couponId) {
    openCouponModal(couponId);
}

// ═══════════════════════════════════════════════════════════════
// 🏰 CLÃS / ORGANIZAÇÕES
// Um clã é um cupom (coupons/{id}) com isClan:true + clanChannelId. As
// contribuições por pessoa ficam em clanContributions/{id}/members/{userId}
// (totalContributed = vitalício → rank; currentBalance = utilizável → zera no
// resgate). O bot escuta clanUpdateTrigger e re-renderiza o painel no Discord.
// ═══════════════════════════════════════════════════════════════
let allClans = [];

function clanEscape(s) {
    return String(s == null ? '' : s)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function clanParseNum(v) {
    if (v == null) return NaN;
    return parseFloat(String(v).trim().replace(',', '.'));
}

// Soma os totais do pote a partir dos membros (calculado na hora, não armazenado)
function clanTotals(members) {
    let usable = 0, total = 0, count = 0;
    Object.values(members || {}).forEach(m => {
        usable += Number(m.currentBalance || 0);
        total += Number(m.totalContributed || 0);
        count++;
    });
    return { usable, total, count };
}

async function loadClansData() {
    try {
        const [coupSnap, contribSnap] = await Promise.all([
            window.db.ref('coupons').once('value'),
            window.db.ref('clanContributions').once('value')
        ]);
        const contribs = contribSnap.val() || {};
        allClans = [];
        coupSnap.forEach(child => {
            const c = child.val();
            if (c && c.isClan) {
                allClans.push({
                    id: child.key,
                    ...c,
                    contributions: contribs[child.key] || { members: {} }
                });
            }
        });
        renderClans();
        console.log(`✅ ${allClans.length} clã(s) carregado(s)`);
    } catch (error) {
        console.error('❌ Erro ao carregar clãs:', error);
    }
}

function renderClans() {
    const list = document.getElementById('clans-grid');
    if (!list) return;

    const search = (document.getElementById('search-clans')?.value || '').toLowerCase();
    const filtered = allClans.filter(c =>
        (c.clanName || '').toLowerCase().includes(search) ||
        (c.code || '').toLowerCase().includes(search)
    );

    list.innerHTML = '';

    if (!filtered.length) {
        list.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 50px; background: var(--bg-card); border-radius: 20px; border: 1px dashed var(--border);">
                <span style="font-size: 40px; display: block; margin-bottom: 15px;">🏰</span>
                <p style="color: var(--text-secondary);">Nenhum clã ainda. Clique em <strong>Novo Clã</strong> pra criar.</p>
            </div>`;
        return;
    }

    const medals = ['🥇', '🥈', '🥉'];

    filtered.forEach(clan => {
        const members = clan.contributions?.members || {};
        const { usable, total, count } = clanTotals(members);
        // Rank = contribuição VITALÍCIA desc (resgate não muda a ordem)
        const ranked = Object.entries(members)
            .sort((a, b) => (Number(b[1].totalContributed) || 0) - (Number(a[1].totalContributed) || 0));

        const rowsHtml = ranked.length ? ranked.map((e, i) => {
            const m = e[1];
            const pos = medals[i] || `#${i + 1}`;
            return `
                <div style="display:flex; align-items:center; gap:8px; padding:6px 8px; border-bottom:1px solid var(--border); font-size:13px;">
                    <span style="width:34px; font-weight:700;">${pos}</span>
                    <span style="flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${clanEscape(m.username || 'Cliente')}</span>
                    <span style="color: var(--info); font-weight:700;">R$ ${Number(m.currentBalance || 0).toFixed(2)}</span>
                    <span style="color: var(--text-secondary); min-width:90px; text-align:right;">total R$ ${Number(m.totalContributed || 0).toFixed(2)}</span>
                </div>`;
        }).join('') : `<div style="padding:12px; text-align:center; color: var(--text-secondary); font-size:13px;">Nenhuma contribuição ainda.</div>`;

        const card = document.createElement('div');
        card.className = 'cupom-card';
        card.style.cssText = 'background: var(--bg-card); border:1px solid var(--border); border-radius:16px; padding:16px; display:flex; flex-direction:column; gap:12px;';
        card.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                <div>
                    <div style="font-size:18px; font-weight:800;">🏰 ${clanEscape(clan.clanName || clan.code)}</div>
                    <div style="font-family:monospace; color: var(--text-secondary); font-size:12px;">Cupom: ${clanEscape(clan.code)} • ${count} membro(s)</div>
                    <div style="font-family:monospace; color: var(--text-secondary); font-size:11px;">Canal: ${clanEscape(clan.clanChannelId || '—')}</div>
                </div>
                <span style="background: rgba(241,196,15,.15); color:#f1c40f; padding:4px 10px; border-radius:20px; font-weight:700; font-size:13px;">${Number(clan.value || 0)}%</span>
            </div>

            <div style="display:flex; gap:10px;">
                <div style="flex:1; background: rgba(46,204,113,.08); border-radius:10px; padding:10px; text-align:center;">
                    <div style="font-size:11px; color: var(--text-secondary);">SALDO UTILIZÁVEL</div>
                    <div style="font-size:18px; font-weight:800; color: var(--success);">R$ ${usable.toFixed(2)}</div>
                </div>
                <div style="flex:1; background: rgba(52,152,219,.08); border-radius:10px; padding:10px; text-align:center;">
                    <div style="font-size:11px; color: var(--text-secondary);">TOTAL CONTRIBUÍDO</div>
                    <div style="font-size:18px; font-weight:800; color: var(--info);">R$ ${total.toFixed(2)}</div>
                </div>
            </div>

            <div style="max-height:240px; overflow-y:auto; background: rgba(255,255,255,.02); border-radius:10px;">
                ${rowsHtml}
            </div>

            <div style="display:flex; gap:8px;">
                <button class="btn-cupom-action btn-cupom-edit" style="flex:1;" onclick="openClanModal('${clan.id}')">✏️ Editar</button>
                <button class="btn-cupom-action" style="flex:1; background: rgba(231,126,34,.2); color:#e67e22;" onclick="openReduceClanModal('${clan.id}')">💸 Reduzir</button>
                <button class="btn-cupom-action btn-cupom-delete" style="flex:1;" onclick="deleteClan('${clan.id}')">🗑️ Excluir</button>
            </div>
        `;
        list.appendChild(card);
    });
}

function openClanModal(couponId = null) {
    const modal = document.getElementById('modal-clan');
    if (!modal) return;
    const titleEl = document.getElementById('modal-clan-title');
    const btnEl = document.getElementById('modal-clan-btn');

    document.getElementById('clan-name').value = '';
    document.getElementById('clan-code').value = '';
    document.getElementById('clan-value').value = '';
    document.getElementById('clan-channel').value = '';

    if (couponId) {
        const clan = allClans.find(c => c.id === couponId);
        if (!clan) return;
        document.getElementById('clan-name').value = clan.clanName || '';
        document.getElementById('clan-code').value = clan.code || '';
        document.getElementById('clan-value').value = clan.value || '';
        document.getElementById('clan-channel').value = clan.clanChannelId || '';
        modal.dataset.couponId = couponId;
        if (titleEl) titleEl.textContent = '✏️ Editar Clã';
        if (btnEl) btnEl.textContent = '💾 Salvar Alterações';
    } else {
        delete modal.dataset.couponId;
        if (titleEl) titleEl.textContent = '🏰 Novo Clã';
        if (btnEl) btnEl.textContent = '🏰 Criar Clã';
    }
    modal.classList.add('active');
}

function closeClanModal() {
    const modal = document.getElementById('modal-clan');
    if (modal) modal.classList.remove('active');
}

function saveClan() {
    try {
        const modal = document.getElementById('modal-clan');
        const id = modal?.dataset.couponId || null;

        const clanName = document.getElementById('clan-name').value.trim();
        const code = document.getElementById('clan-code').value.toUpperCase().trim();
        const value = parseFloat(document.getElementById('clan-value').value);
        const channelId = document.getElementById('clan-channel').value.trim();

        if (!clanName) { showToast('Digite o nome do clã!', 'warning'); return; }
        if (!code) { showToast('Digite o código do cupom!', 'warning'); return; }
        if (!value || value < 1 || value > 100) { showToast('Cashback inválido (1 a 100%)!', 'warning'); return; }
        if (!channelId || !/^\d{5,25}$/.test(channelId)) { showToast('ID do canal/tópico inválido (só números)!', 'warning'); return; }

        const existing = id ? allClans.find(c => c.id === id) : null;

        const couponData = {
            code,
            type: 'percentage',
            value,
            isClan: true,
            clanName,
            clanChannelId: channelId,
            maxUses: null,
            active: existing ? (existing.active !== false) : true,
            usedCount: existing ? (existing.usedCount || 0) : 0,
            description: `Cupom de organização (${clanName}) — ${value}% de cashback pro pote`,
            createdAt: (existing && existing.createdAt) ? existing.createdAt : new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        const ref = id ? window.db.ref(`coupons/${id}`) : window.db.ref('coupons').push();
        const newId = id || ref.key;

        ref.set(couponData)
            .then(() => {
                // Inicializa contribuições; na EDIÇÃO só atualiza o canal (não apaga membros)
                if (id) {
                    return window.db.ref(`clanContributions/${newId}/channelId`).set(channelId);
                }
                return window.db.ref(`clanContributions/${newId}`).set({ channelId, members: {} });
            })
            .then(() => window.db.ref('clanUpdateTrigger').set(Date.now()))
            .then(() => {
                showToast(`Clã ${clanName} ${id ? 'atualizado' : 'criado'}!`, 'success');
                closeClanModal();
                loadClansData();
            })
            .catch(err => showToast('Erro ao salvar clã: ' + err.message, 'error'));
    } catch (error) {
        console.error('❌ Erro em saveClan:', error);
        showToast('Erro ao salvar clã: ' + error.message, 'error');
    }
}

function openReduceClanModal(couponId) {
    const clan = allClans.find(c => c.id === couponId);
    if (!clan) return;
    const { usable } = clanTotals(clan.contributions?.members || {});
    const modal = document.getElementById('modal-clan-reduce');
    modal.dataset.couponId = couponId;
    modal.dataset.max = String(usable);
    document.getElementById('clan-reduce-max').textContent = 'R$ ' + usable.toFixed(2);
    document.getElementById('clan-reduce-value').value = '';
    modal.classList.add('active');
}

function closeReduceClanModal() {
    const modal = document.getElementById('modal-clan-reduce');
    if (modal) modal.classList.remove('active');
}

function confirmReduceClan() {
    const modal = document.getElementById('modal-clan-reduce');
    const id = modal?.dataset.couponId;
    const max = parseFloat(modal?.dataset.max || '0');
    const amount = clanParseNum(document.getElementById('clan-reduce-value').value);

    if (!id) return;
    if (isNaN(amount) || amount <= 0) { showToast('Digite um valor maior que 0!', 'warning'); return; }
    if (amount > max + 0.001) { showToast(`Máximo é R$ ${max.toFixed(2)} (saldo utilizável)!`, 'warning'); return; }

    // Desconta do MENOR contribuidor (vitalício) pro maior. Transaction evita
    // corrida com o bot creditando contribuições ao mesmo tempo. totalContributed
    // NÃO muda — só currentBalance — então o ranking é preservado.
    window.db.ref(`clanContributions/${id}/members`).transaction(members => {
        if (!members) return members;
        let remaining = Math.round(amount * 100) / 100;
        const ordered = Object.keys(members).sort((a, b) =>
            (Number(members[a].totalContributed) || 0) - (Number(members[b].totalContributed) || 0)
        );
        for (const uid of ordered) {
            if (remaining <= 0) break;
            const bal = Number(members[uid].currentBalance || 0);
            if (bal <= 0) continue;
            const take = Math.min(remaining, bal);
            members[uid].currentBalance = Math.round((bal - take) * 100) / 100;
            remaining = Math.round((remaining - take) * 100) / 100;
        }
        return members;
    })
        .then(() => window.db.ref('clanUpdateTrigger').set(Date.now()))
        .then(() => {
            showToast(`Saldo reduzido em R$ ${amount.toFixed(2)}!`, 'success');
            closeReduceClanModal();
            loadClansData();
        })
        .catch(err => showToast('Erro ao reduzir: ' + err.message, 'error'));
}

function deleteClan(couponId) {
    const clan = allClans.find(c => c.id === couponId);
    const name = clan ? (clan.clanName || clan.code) : couponId;
    if (typeof confirm === 'function' && !confirm(`Excluir o clã "${name}"? O cupom e o histórico de contribuições serão removidos.`)) return;
    Promise.all([
        window.db.ref(`coupons/${couponId}`).remove(),
        window.db.ref(`clanContributions/${couponId}`).remove()
    ])
        .then(() => window.db.ref('clanUpdateTrigger').set(Date.now()))
        .then(() => {
            showToast(`Clã ${name} excluído!`, 'success');
            loadClansData();
        })
        .catch(err => showToast('Erro ao excluir: ' + err.message, 'error'));
}

// Expor pro onclick (defensivo; declarações de topo já são globais neste arquivo)
window.loadClansData = loadClansData;
window.renderClans = renderClans;
window.openClanModal = openClanModal;
window.closeClanModal = closeClanModal;
window.saveClan = saveClan;
window.openReduceClanModal = openReduceClanModal;
window.closeReduceClanModal = closeReduceClanModal;
window.confirmReduceClan = confirmReduceClan;
window.deleteClan = deleteClan;

function deleteCoupon(couponId) {
    if (!confirm('Deseja realmente deletar este cupom?')) return;

    window.db.ref(`coupons/${couponId}`).remove()
        .then(() => {
            showToast('Cupom deletado!', 'success');
            loadCouponsData();
        })
        .catch(err => showToast('Erro: ' + err.message, 'error'));
}

// ═══════════════════════════════════════════════════════════════
// 💰 PREÇOS DOS JOGOS
// ═══════════════════════════════════════════════════════════════

async function loadPricesData() {
    try {
        // Carregar gamePrices e gameRegistry em paralelo
        // loadRegistryGames tem try/catch interno — se falhar, registryGames fica {}
        const [priceSnap] = await Promise.all([
            window.db.ref('gamePrices').once('value'),
            loadRegistryGames().catch(e => { registryGames = {}; console.warn('Registry indisponível:', e.message); })
        ]);

        const savedPrices = priceSnap.val() || {};
        const defaultPrices = getDefaultPrices();

        // Merge: usa valores salvos, mas preenche campos faltantes com padrões
        allPrices = {};
        Object.keys(defaultPrices).forEach(gameId => {
            allPrices[gameId] = {
                ...defaultPrices[gameId],
                ...(savedPrices[gameId] || {})
            };
        });

        // Incluir jogos que estão no registry mas não nos defaults (jogos criados via painel)
        Object.keys(registryGames).forEach(gameId => {
            if (!allPrices[gameId]) {
                allPrices[gameId] = savedPrices[gameId] || {};
            }
        });

        // Se estava completamente vazio, salvar os padrões no Firebase
        if (Object.keys(savedPrices).length === 0) {
            await window.db.ref('gamePrices').set(allPrices);
            console.log('✅ Preços padrão salvos no Firebase');
        }

        renderPrices();
        console.log('✅ Preços carregados (' + Object.keys(registryGames).length + ' no registry)');
    } catch (error) {
        console.error('❌ Erro ao carregar preços:', error);
    }
}

function getDefaultPrices() {
    return {
        mir4: {
            gold_usd: 3.50,          // Preço FIXO em USD por 1k (todas faixas)
            goldBase: 20.00,         // Preço em BRL por 1k (1k-4999)
            gold5k: 20.00,           // Preço em BRL por 1k (5k-9999)
            gold10k: 20.00,          // Preço em BRL por 1k (10k-19999)
            gold20k: 18.40,          // Preço em BRL por 1k (20k+)
            topup_1: 0.90,
            topup_3: 2.55,
            topup_5: 4.20,
            topup_10: 7.49,
            topup_30: 22.50,
            topup_50: 38.99,
            topup_100: 74.98
        },
        nightcrows: {
            twd_3500: 95.89,
            twd_5000: 137.00,
            twd_7000: 191.80,
            twd_10000: 274.00,
            topup_5: 4.00,
            topup_8: 6.40,
            topup_10: 8.00,
            topup_20: 16.00,
            topup_30: 24.00,
            topup_50: 40.00,
            topup_100: 80.00
        },
        tsdsorigin: {
            topup_4: 4.30,
            topup_120: 0.90,
            topup_600: 4.30,
            topup_1900: 12.75,
            topup_3800: 21.25,
            topup_6200: 42.50,
            topup_121200: 85.00
        },
        odin: {
            pack_4: 3.65,
            pack_9: 8.01,
            pack_23: 19.78,
            pack_30: 25.80,
            pack_40: 34.40,
            pack_80: 68.80
        },
        wemix: {
            margem_1_9: 55,       // 1-9 WEMIX: Cotação + 55%
            margem_10_99: 15,     // 10-99 WEMIX: Cotação + 15%
            margem_100: 6.5       // 100+ WEMIX: Cotação + 6.5%
        },
        ymirpoints: {
            // Ymir Points (UID)
            pack_525: 4.80,
            pack_1050: 9.58,
            pack_3150: 28.80,
            pack_5250: 48.00,
            pack_10500: 96.00,
            twd_5000: 135.00,
            twd_10000: 270.00,
            twd_30000: 807.00
        },
        ymirtwd: {
            // Ymir TWD (UID) — variante hidden só com pacotes TWD
            twd_4500: 119.00,
            twd_5000: 135.00,
            twd_9000: 234.00,
            twd_10000: 270.00,
            twd_30000: 807.00
        },
        ymirloginesenha: {
            // Ymir YMP (Login e Senha) - DOG
            pack_499: 4.40,
            pack_999: 8.80,
            pack_2999: 26.40,
            pack_4999: 44.00,
            pack_9999: 88.00
        },
        raven2: {
            pack_3: 2.85,
            pack_4: 3.80,
            pack_7: 6.65,
            pack_22: 20.90,
            pack_36: 34.20,
            pack_70: 66.50
        },
        rohan2: {
            pack_10: 9.00,
            pack_12: 10.80,
            pack_20: 18.00,
            pack_50: 45.00,
            pack_100: 90.00
        },
        genshin: {
            bencao: 4.20,
            pack_330: 4.20,
            pack_1090: 13.50,
            pack_2240: 26.00,
            pack_3800: 40.00,
            pack_8000: 76.00
        },
        genshinloginesenha: {
            bencao: 3.80,
            passe_gnostico: 7.50,
            cancao_perola: 14.00,
            pack_330: 3.80,
            pack_1090: 11.00,
            pack_2240: 24.00,
            pack_3800: 35.00,
            pack_8000: 70.00,
            upgrade_passe: 9.50
        },
        zzzloginesenha: {
            passe_suprimento: 4.50,
            assinatura: 4.50,
            pack_50: 8.75,
            pack_100: 17.50,
            pack_330: 4.50,
            pack_1090: 13.00,
            pack_2240: 25.50,
            pack_3800: 44.00,
            pack_8000: 88.00
        },
        honkailoginesenha: {
            passe: 4.50,
            pack_50: 8.75,
            pack_100: 17.50,
            pack_330: 4.50,
            pack_1090: 13.00,
            pack_2240: 25.50,
            pack_3800: 44.00,
            pack_8000: 88.00
        },
        nteloginesenha: {
            pack_300: 4.50,
            pack_980: 13.50,
            pack_1980: 27.00,
            pack_3280: 45.00,
            pack_6480: 87.00,
            pack_50: 9.00,    // Passe de Batalha R$50
            pack_100: 18.00,  // Passe de Batalha R$100
            mining_permit: 4.50
        },
        summonerswar: {
            pack_2790: 4.03,
            pack_5490: 8.00,
            pack_10990: 16.98,
            pack_16990: 27.00,
            pack_27990: 44.39,
            pack_54990: 85.00,
            pack_29990: 46.00
        },
        aion2: {
            pack_145: 5.30,
            pack_190: 6.32,
            pack_430: 15.00,
            pack_475: 16.50,
            pack_640: 22.40,
            pack_645: 22.50,
            pack_750: 26.00,
            pack_950: 30.50,
            pack_980: 32.00,
            pack_1080: 36.00,
            pack_1900: 60.00
        },
        wutheringwaves: {
            subscription: 4.50,
            pack_300: 4.50,
            pack_980: 14.00,
            pack_1980: 26.50,
            pack_3280: 43.99,
            pack_6480: 85.00,
            bp_insider: 9.00,
            bp_connoisseur: 17.78
        },
        wutheringwavesloginesenha: {
            // Wuthering Waves Login e Senha — variante hidden com mesmo shape
            // de pacotes do UID. Admin pode editar pros valores que preferir.
            subscription: 4.50,
            pack_300: 4.50,
            pack_980: 14.00,
            pack_1980: 26.50,
            pack_3280: 43.99,
            pack_6480: 85.00,
            bp_insider: 9.00,
            bp_connoisseur: 17.78
        },
        honkaistarrail: {
            passe: 14.80,
            pack_330: 14.80,
            pack_1090: 114.00,
            pack_2240: 128.00,
            pack_3800: 146.50,
            pack_8000: 193.00
        },
        zzz: {
            passe_suprimento: 14.80,
            assinatura: 14.80,
            pack_330: 14.80,
            pack_1090: 114.00,
            pack_2240: 128.00,
            pack_3800: 146.50,
            pack_8000: 193.00
        },
        romgoldenage: {
            pack_3: 2.90,
            pack_5: 4.75,
            pack_7: 6.65,
            pack_10: 9.50,
            pack_30: 28.50,
            pack_37: 35.15,
            pack_50: 47.50,
            pack_74: 70.30,
            pack_100: 95.00
        },
        arknights: {
            pack_1: 16.99,   // Pacote arsenal economico
            pack_2: 9.00,    // Origiometria 21+5
            pack_3: 12.35,   // Origeometria 34+6
            pack_4: 19.99,   // Origeometria 57+11
            pack_5: 32.50,   // Origeometria 92+20
            pack_6: 65.00,   // Origeometria 194+48
            pack_7: 14.25,   // CT do patch atual
            pack_8: 14.25,   // Apoio a RH
            pack_9: 4.80,    // Passe mensal
            pack_10: 19.00,  // Pacote completo
            pack_11: 28.50,  // Fluxo de protocolo
            pack_12: 14.25,  // Materiais mensais
            pack_13: 13.30,  // Tiquete arsenal promo
            pack_14: 9.50    // Passe de batalha
        }
    };
}

// Atualiza config.diamondsRefUnit/diamondsUsdPerRef de ymirdiamonds em memória.
// Persistência: ao clicar "Salvar" no modal, _syncGameToRegistry escreve o
// registryGames[gameId] inteiro (incluindo config) no Firebase.
function updateDiamondsConfigField(gameId, field, value) {
    if (!registryGames[gameId]) return;
    if (!registryGames[gameId].config) registryGames[gameId].config = {};
    const num = parseFloat(value);
    if (Number.isFinite(num) && num >= 0) {
        registryGames[gameId].config[field] = num;
    }
}
window.updateDiamondsConfigField = updateDiamondsConfigField;

function updatePriceValue(gameId, fieldKey, value) {
    if (!allPrices[gameId]) allPrices[gameId] = {};
    allPrices[gameId][fieldKey] = parseFloat(value) || 0;
}

function updateCashbackValue(gameId, fieldKey, value) {
    if (!allPrices[gameId]) allPrices[gameId] = {};
    const cashbackKey = `cashback_${fieldKey}`;
    allPrices[gameId][cashbackKey] = parseFloat(value) || 0;
}

function updateLimitValue(gameId, fieldKey, value) {
    if (!allPrices[gameId]) allPrices[gameId] = {};
    if (!allPrices[gameId].couponLimits) allPrices[gameId].couponLimits = {};
    allPrices[gameId].couponLimits[fieldKey] = parseFloat(value) || 0;
}

function updateGlobalLimit(gameId, value) {
    if (!allPrices[gameId]) allPrices[gameId] = {};
    allPrices[gameId].defaultCashbackLimit = parseFloat(value) || 0;
}

async function saveGamePrices(gameId) {
    // Salva em 3 etapas. As 2 primeiras (gamePrices + registry) sao a fonte de
    // verdade — se elas der OK, os preços ja estão salvos. A 3ª (trigger) so
    // notifica o bot pra atualizar embeds; se falhar, dados estão salvos mas
    // canal de preços fica stale por ate 15min (safety-net no bot). Tratamos
    // separado pra nao mostrar "Erro ao salvar" quando os dados ja foram.
    try {
        await window.db.ref(`gamePrices/${gameId}`).set(allPrices[gameId]);
        await _syncGameToRegistry(gameId);
    } catch (error) {
        showToast('Erro ao salvar: ' + error.message, 'error');
        return;
    }

    try {
        await window.db.ref('priceUpdateTrigger').set({
            timestamp: Date.now(),
            updatedBy: 'dashboard',
            game: gameId
        });
        showToast(`Preços de ${gameId.toUpperCase()} salvos!`, 'success');
        playSound('success');
    } catch (error) {
        // Dados persistidos, so a notificação ao bot falhou.
        console.warn('Trigger falhou apos salvar precos:', error);
        showToast(`Preços salvos, mas embeds podem demorar até 15min para atualizar (notificação ao bot falhou).`, 'warning');
        playSound('success');
    }
}

// Sincroniza edições (preços, emoji, imagem, provider, items) de volta pro gameRegistry
async function _syncGameToRegistry(gameId, options = {}) {
    // Só gravamos metadata (emoji, imagem, requiresScreenshot, suppliers...)
    // quando estamos salvando O JOGO ABERTO no editor (fromModal). Em
    // saveAllPrices (batch) ou save de preço avulso, o gameId do loop não é o
    // jogo do editor — então NÃO se mexe em metadata, só em preço.
    const isCurrentlyEditing = options.fromModal === true && _editingGameId === gameId;

    let reg;
    if (isCurrentlyEditing) {
        // Editor aberto NESTE jogo: usa o cache local como base, porque ele
        // carrega as mutações estruturais do editor (packs adicionados/removidos,
        // ids renomeados) que ainda não estão no Firebase. Refetch só se faltar.
        reg = registryGames[gameId];
        if (!reg) {
            try {
                const snap = await window.db.ref(`gameRegistry/${gameId}`).once('value');
                reg = snap.val();
                if (reg) registryGames[gameId] = reg;
            } catch (_) { /* offline */ }
        }
    } else {
        // ⚠️ SAVE DE PREÇO / BATCH: relê o registry AO VIVO e mexe SÓ nos preços
        // abaixo. NUNCA reescreve metadata a partir do cache local — senão um
        // "Salvar Tudo" com a página aberta há um tempo REVERTE emoji/imagem/
        // requiresScreenshot/suppliers de TODOS os jogos pro estado de quando a
        // página carregou, desfazendo o que o bot ou outra pessoa mudou depois.
        // (Era a causa do "entrei/ativei o site e os emojis e o 'pedir imagem'
        // voltaram sozinhos".)
        try {
            const snap = await window.db.ref(`gameRegistry/${gameId}`).once('value');
            reg = snap.val();
        } catch (e) {
            console.warn(`⚠️ Não consegui reler registry de ${gameId} — pulando sync pra não arriscar:`, e.message);
            return;
        }
    }
    if (!reg) return; // Jogo não está no registry — nada a fazer

    try {
        if (isCurrentlyEditing) {
            // Editor unificado novo (modal-game-editor)
            const nameEl = document.getElementById('game-editor-name');
            const emojiEl = document.getElementById('game-editor-emoji');
            const channelEmojiEl = document.getElementById('game-editor-channel-emoji');
            const imageEl = document.getElementById('game-editor-image');
            const descEl = document.getElementById('game-editor-description');
            const hiddenEl = document.getElementById('game-editor-hidden');
            const supplierEls = document.querySelectorAll('input[name="game-editor-supplier"]:checked');
            const screenshotEl = document.getElementById('game-editor-requires-screenshot');
            const twofaEl = document.getElementById('game-editor-requires-2fa');

            if (nameEl && nameEl.value.trim()) reg.name = nameEl.value.trim();
            if (emojiEl) reg.emoji = emojiEl.value.trim() || reg.emoji;
            // channelEmoji = unicode usado pro nome do canal Discord (custom emojis
            // não renderizam em nomes de canal/thread). Lido pelo bot via registry.
            if (channelEmojiEl) reg.channelEmoji = channelEmojiEl.value.trim() || '';
            if (imageEl) reg.image = normalizeImageUrl(imageEl.value) || '';
            if (descEl) reg.description = descEl.value.trim();
            if (hiddenEl) reg.hidden = !!hiddenEl.checked;
            // Fornecedores marcados (1+). 2+ = SPLIT (bot alterna entre eles).
            // Nenhum = fluxo manual interno (gold/wemix/twd/MIHOYO custom).
            // Guarda suppliers[] (lista) + supplier (1º, p/ compat de leitura).
            // preferredProvider/providerLocked foram removidos — limpamos.
            const supList = Array.from(supplierEls).map(el => el.value).filter(Boolean);
            reg.suppliers = supList;
            reg.supplier = supList[0] || null;
            reg.preferredProvider = null;
            reg.providerLocked = null;
            if (screenshotEl) reg.requiresScreenshot = !!screenshotEl.checked;
            if (twofaEl) reg.requires2FA = !!twofaEl.checked;

            // credentialsSchema é montado a partir dos checkboxes em outra função
            // (collectCredentialsSchemaFromEditor) — chamada antes deste sync.
            if (Array.isArray(options.credentialsSchema)) {
                reg.credentialsSchema = options.credentialsSchema;
            }

            // accountType derivado do schema (UID-only, login_password, etc.)
            if (reg.credentialsSchema && reg.credentialsSchema.length) {
                const keys = reg.credentialsSchema.map(c => c.key);
                if (keys.includes('login') || keys.includes('password')) reg.accountType = 'login_password';
                else if (keys.includes('uid')) reg.accountType = 'uid';
            }
        }

        // Sincronizar preços nos items dos products
        // engineSimplePacks lê item.priceUSD — sem isso, o ticket fica com preço
        // velho mesmo após edição no painel (gamePrices/ atualizado mas o engine
        // do bot resolve a partir do registry). Mantemos item.price por compat.
        const prices = allPrices[gameId] || {};
        for (const product of (reg.products || [])) {
            if (product.engine === 'simple_packs' && product.items) {
                for (const item of product.items) {
                    if (prices[item.id] !== undefined) {
                        const newPrice = Number(prices[item.id]) || 0;
                        item.price = newPrice;
                        item.priceUSD = newPrice;
                    }
                    // Site daoshi-loja lê item.cashback do registry pra exibir o
                    // % na UI do cliente; bot lê prices.cashback_<id> direto de
                    // gamePrices/. Sem este sync, o site mostrava 0 mesmo com
                    // cashback configurado no painel.
                    const cashbackKey = `cashback_${item.id}`;
                    if (prices[cashbackKey] !== undefined) {
                        item.cashback = Number(prices[cashbackKey]) || 0;
                    }
                }
            } else if (product.engine === 'mir4_gold_brackets') {
                // Reescreve params.usdPerK + brackets a partir dos fields do painel.
                // Sem isso, edições de gold_usd/goldBase/gold5k/gold10k/gold20k ficavam
                // só em gamePrices/ e o bot (que lê do registry) não enxergava.
                product.params = product.params || {};
                if (prices.gold_usd !== undefined) {
                    product.params.usdPerK = Number(prices.gold_usd);
                }
                const goldBase = Number(prices.goldBase ?? 20.00);
                product.params.brackets = [
                    { min: 0,     brl: goldBase },
                    { min: 1000,  brl: goldBase },
                    { min: 5000,  brl: Number(prices.gold5k  ?? goldBase) },
                    { min: 10000, brl: Number(prices.gold10k ?? goldBase) },
                    { min: 20000, brl: Number(prices.gold20k ?? goldBase) }
                ];
            } else if (product.engine === 'wemix_margin') {
                // Reescreve params.margins a partir dos fields do painel.
                product.params = product.params || {};
                product.params.margins = [
                    { min: 1,   max: 9,    marginPct: Number(prices.margem_1_9   ?? 55) },
                    { min: 10,  max: 99,   marginPct: Number(prices.margem_10_99 ?? 15) },
                    { min: 100, max: null, marginPct: Number(prices.margem_100   ?? 6.5) }
                ];
            }
        }

        reg.defaultCashbackLimit = prices.defaultCashbackLimit ?? reg.defaultCashbackLimit ?? 1.0;
        reg.updatedAt = Date.now();
        reg.updatedBy = 'painel-admin';

        await window.db.ref(`gameRegistry/${gameId}`).set(reg);
        console.log(`✅ Registry sync: ${gameId}`);
    } catch (e) {
        console.warn('⚠️ Erro ao sincronizar registry:', e.message);
    }
}

// Deriva fields editáveis a partir de uma entrada do gameRegistry
function _registryToFields(regEntry) {
    const fields = [];
    if (!regEntry || !regEntry.products) return fields;

    for (const product of regEntry.products) {
        if (product.engine === 'simple_packs' && product.items) {
            for (const item of product.items) {
                fields.push({ key: item.id, label: `${item.emoji || '📦'} ${item.label}` });
            }
        } else if (product.engine === 'mir4_gold_brackets') {
            // Campos especiais do MIR4 gold
            fields.push({ key: 'gold', label: '💰 Gold (limite cupom)' });
            fields.push({ key: 'gold_usd', label: '💵 Gold USD/1k' });
            fields.push({ key: 'goldBase', label: '💰 Gold 1k-4999' });
            fields.push({ key: 'gold5k', label: '💰 Gold 5k-9999' });
            fields.push({ key: 'gold10k', label: '💰 Gold 10k-19999' });
            fields.push({ key: 'gold20k', label: '💰 Gold 20k+' });
        } else if (product.engine === 'wemix_margin') {
            fields.push({ key: 'margem_1_9', label: '📊 1-9 WEMIX (%)' });
            fields.push({ key: 'margem_10_99', label: '📊 10-99 WEMIX (%)' });
            fields.push({ key: 'margem_100', label: '📊 100+ WEMIX (%)' });
        }
    }
    return fields;
}

// Renderiza o "game picker" — o overlay sempre visível na aba Preços.
// Camada única: registry primeiro, depois fallback hardcoded (JOGOS_DISPONIVEIS).
// Jogos legados aparecem no picker e são MIGRADOS pro registry no primeiro save.
// ─────────────────────────────────────────────────────────────
// 🔢 ORDEM DOS JOGOS NO DISCORD (arrastar pra reordenar)
// Espelha a ordenação do bot (getAllGamesAsync): displayOrder primeiro,
// senão priorityOrder, senão nome. Salvar grava displayOrder=índice em
// gameRegistry/<id> e dispara priceUpdateTrigger.
// ─────────────────────────────────────────────────────────────
const GAME_ORDER_PRIORITY = ['mir4', 'nightcrows', 'wemix', 'genshin', 'ymirpoints'];

function _gameOrderKey(id, reg) {
    if (reg && Number.isFinite(reg.displayOrder)) return reg.displayOrder;
    const p = GAME_ORDER_PRIORITY.indexOf(id);
    return p !== -1 ? p : 100000; // sem ordem definida → fim
}

function toggleGameOrderPanel() {
    const body = document.getElementById('game-order-body');
    const caret = document.getElementById('game-order-caret');
    if (!body) return;
    const show = body.style.display === 'none';
    body.style.display = show ? '' : 'none';
    if (caret) caret.textContent = show ? '▲' : '▼';
    if (show) renderGameOrderList();
}

function _gameOrderEmojiHtml(raw) {
    // previewEmojiHtml renderiza emoji custom via CDN do Discord; fallback texto.
    if (typeof previewEmojiHtml === 'function') return previewEmojiHtml(raw);
    return escapeHtml(String(raw || '🎮'));
}

function renderGameOrderList() {
    const list = document.getElementById('game-order-list');
    if (!list) return;

    // Jogos NÃO-ocultos do registry, na ordem atual do Discord.
    const games = Object.entries(registryGames)
        .filter(([id, reg]) => reg && reg.hidden !== true && (reg.name || (Array.isArray(reg.products) && reg.products.length)))
        .map(([id, reg]) => ({
            id,
            name: reg.name || (JOGOS_DISPONIVEIS[id] && JOGOS_DISPONIVEIS[id].name) || id,
            emoji: reg.emoji || (JOGOS_DISPONIVEIS[id] && JOGOS_DISPONIVEIS[id].emoji) || '🎮',
            _k: _gameOrderKey(id, reg)
        }))
        .sort((a, b) => a._k - b._k || a.name.localeCompare(b.name, 'pt-BR'));

    list.innerHTML = games.map((g, i) => `
        <div class="game-order-item" draggable="true" data-game-id="${g.id}">
            <span class="game-order-handle">⠿</span>
            <span class="game-order-pos">${i + 1}</span>
            <span class="game-order-emoji">${_gameOrderEmojiHtml(g.emoji)}</span>
            <span class="game-order-name">${escapeHtml(g.name)}</span>
        </div>
    `).join('');

    // Drag & drop: reposiciona ao vivo durante o dragover.
    let dragged = null;
    const renumber = () => {
        list.querySelectorAll('.game-order-item').forEach((el, idx) => {
            const pos = el.querySelector('.game-order-pos');
            if (pos) pos.textContent = idx + 1;
        });
    };
    list.querySelectorAll('.game-order-item').forEach(item => {
        item.addEventListener('dragstart', () => { dragged = item; setTimeout(() => item.classList.add('dragging'), 0); });
        item.addEventListener('dragend', () => { item.classList.remove('dragging'); dragged = null; renumber(); });
    });
    list.addEventListener('dragover', (e) => {
        e.preventDefault();
        if (!dragged) return;
        const after = _getDragAfterElement(list, e.clientY);
        if (after == null) list.appendChild(dragged);
        else list.insertBefore(dragged, after);
    });
}

function _getDragAfterElement(container, y) {
    const els = [...container.querySelectorAll('.game-order-item:not(.dragging)')];
    let closest = { offset: -Infinity, element: null };
    for (const child of els) {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        if (offset < 0 && offset > closest.offset) closest = { offset, element: child };
    }
    return closest.element;
}

async function saveGameOrder() {
    const list = document.getElementById('game-order-list');
    if (!list) return;
    const ids = [...list.querySelectorAll('.game-order-item')].map(el => el.dataset.gameId).filter(Boolean);
    if (!ids.length) { showToast('Nada pra salvar.', 'warning'); return; }
    try {
        // Atualiza cache local + grava displayOrder=índice em cada jogo.
        await Promise.all(ids.map((id, i) => {
            if (registryGames[id]) registryGames[id].displayOrder = i;
            return window.db.ref(`gameRegistry/${id}/displayOrder`).set(i);
        }));
        await window.db.ref('priceUpdateTrigger').set({
            timestamp: Date.now(), updatedBy: 'dashboard', action: 'reorder-games'
        });
        showToast(`✅ Ordem salva (${ids.length} jogos)! O bot atualiza em ~1-2 min.`, 'success');
        if (typeof playSound === 'function') playSound('success');
    } catch (e) {
        console.error('❌ Erro ao salvar ordem dos jogos:', e);
        showToast('Erro ao salvar ordem: ' + e.message, 'error');
    }
}

function renderPrices() {
    const grid = document.getElementById('game-picker-grid');
    if (!grid) return; // aba ainda não renderizou
    grid.innerHTML = '';

    const cards = [];
    const seen = new Set();

    // Camada 1: registry (fonte de verdade do bot)
    // Filtra stubs incompletos (sem name nem products) — scripts de migração
    // como restore-game-images criavam entries só com image/emoji, e o painel
    // listava esses como "duplicatas" do jogo real (ex: mir4gold vs mir4).
    Object.entries(registryGames).forEach(([id, reg]) => {
        const hasProducts = Array.isArray(reg.products) && reg.products.length > 0;
        if (!reg.name && !hasProducts) return;
        cards.push({
            id,
            name: reg.name || id,
            emoji: reg.emoji || JOGOS_DISPONIVEIS[id]?.emoji || '🎮',
            image: reg.image || JOGOS_DISPONIVEIS[id]?.icon || '',
            accountType: reg.accountType || 'uid',
            supplier: reg.supplier || null,
            suppliers: (Array.isArray(reg.suppliers) && reg.suppliers.length) ? reg.suppliers : (reg.supplier ? [reg.supplier] : []),
            isLegacy: false
        });
        seen.add(id);
    });

    // Camada 2: jogos hardcoded em JOGOS_DISPONIVEIS que ainda não migraram
    Object.entries(JOGOS_DISPONIVEIS).forEach(([id, info]) => {
        if (seen.has(id)) return;
        cards.push({
            id,
            name: info.name || id,
            emoji: info.emoji || '🎮',
            image: info.icon || '',
            accountType: 'uid',
            supplier: null,
            isLegacy: true
        });
        seen.add(id);
    });

    // Camada 3: jogos só no gamePrices (sem entrada nem em registry nem em JOGOS_DISPONIVEIS)
    Object.keys(allPrices).forEach(id => {
        if (seen.has(id)) return;
        cards.push({
            id,
            name: id,
            emoji: '🎮',
            image: '',
            accountType: 'uid',
            supplier: null,
            isLegacy: true
        });
        seen.add(id);
    });

    cards.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));

    cards.forEach(g => {
        const card = document.createElement('div');
        card.className = 'game-picker-card';
        card.dataset.gameId = g.id;
        card.dataset.searchKey = (g.name + ' ' + g.id).toLowerCase();
        card.onclick = () => openGameEditor(g.id);

        const typeBadge = renderTypeBadge(g);

        // Badge do fornecedor no card do game picker. Sem supplier setado,
        // mostra "Manual" pra deixar claro que esse jogo não tem provider externo.
        const SUPPLIER_LABELS = { dog: 'Dog', daodao: 'DaoDao', sombra: 'Sombra' };
        const supList = (Array.isArray(g.suppliers) && g.suppliers.length) ? g.suppliers : (g.supplier ? [g.supplier] : []);
        const supplierBadge = supList.length
            ? supList.map(s => `<span class="game-picker-card-badge ${s}">${SUPPLIER_LABELS[s] || s}</span>`).join('')
            : '<span class="game-picker-card-badge manual">Manual</span>';

        // Aceita só URL absoluta http(s) ou data:. Paths relativos como
        // /gifs/dungeoncross-cover.png existem só na public/ do daoshi-loja
        // e quebram aqui — o painel admin é estático, não serve /gifs.
        const isAbsoluteImg = /^(https?:|data:)/.test(g.image || '');
        const imgSrc = isAbsoluteImg ? g.image : PLACEHOLDER_GAME_IMG;
        card.innerHTML = `
            <img src="${imgSrc}" alt="${g.name}" class="game-picker-card-img" onerror="this.style.opacity=0.2;">
            <div class="game-picker-card-name">${g.name}</div>
            <div class="game-picker-card-meta">
                ${typeBadge}
                ${supplierBadge}
            </div>
        `;
        grid.appendChild(card);
    });

    if (cards.length === 0) {
        grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--text-secondary); padding: 40px;">Nenhum jogo cadastrado. Clique em <strong>➕ Criar Novo Jogo</strong> pra começar.</p>';
    }
}

// Decide qual badge de tipo mostrar pro card. Pra jogos no registry,
// usa accountType. Pra legados (sem registry), infere pelo gameId — assim
// "*loginesenha" mostra LOGIN, wemix mostra CARTEIRA, aion2 mostra GOLD,
// etc. Sem isso, todo legado virava "UID" no card mesmo sendo login/wemix.
function renderTypeBadge(g) {
    const id = (g.id || '').toLowerCase();

    // Carteira (wemix-like)
    if (id === 'wemix') {
        return '<span class="game-picker-card-badge wallet">CARTEIRA</span>';
    }

    // Gold-like (AION 2 e MIR4 — fluxo gold + screenshot do QR)
    if (id === 'aion2' || id === 'mir4') {
        return '<span class="game-picker-card-badge gold">GOLD</span>';
    }

    // Login e senha — pelo accountType do registry OU pelo padrão de nome
    if (g.accountType === 'login_password' || /loginesenha$/i.test(id)) {
        return '<span class="game-picker-card-badge login">LOGIN</span>';
    }

    // Default: UID
    return '<span class="game-picker-card-badge uid">UID</span>';
}

// Filtra cards do picker por nome/id
function filterGamePicker(query) {
    const q = (query || '').toLowerCase().trim();
    document.querySelectorAll('#game-picker-grid .game-picker-card').forEach(c => {
        c.style.display = !q || c.dataset.searchKey.includes(q) ? '' : 'none';
    });
}

// ─── EDITOR DE JOGO (modal único com tabs) ────────────────────────────

const CREDENTIAL_FIELDS_CATALOG = [
    { key: 'uid',         label: 'UID',                description: 'Identificador único do jogador no jogo.', required: true },
    { key: 'login',       label: 'Login / Email',      description: 'Email ou nome de usuário pra logar na conta.', required: true },
    { key: 'password',    label: 'Senha',              description: 'Senha da conta.', required: true, type: 'password' },
    { key: 'server',      label: 'Servidor',           description: 'Ex: SA-01, Global, Steam.', required: true },
    { key: 'nickname',    label: 'Nickname',           description: 'Nome do personagem no jogo.', required: true },
    { key: 'loginMethod', label: 'Método de Login',    description: 'Google / Facebook / Apple / Steam / Email.', required: false },
    { key: 'twofa',       label: 'Código 2FA',         description: 'Código do Google Authenticator (sombra).', required: false },
    { key: 'wallet',      label: 'Carteira (WEMIX)',   description: 'Endereço da wallet pra recebimento.', required: true }
];

let _activeEditorTab = 'packs';
// Snapshot do registryGames[gameId] + allPrices[gameId] capturado ao abrir
// o editor. Restaurado em closeGameEditor se o admin clicou Cancelar (sem
// salvar). Limpo em saveGameFromEditor/deleteGameFromEditor.
let _editorSnapshot = null;

// Migra um jogo legado (JOGOS_DISPONIVEIS-only) pro gameRegistry.
// Cria um registryEntry minimal usando os defaults do hardcoded e abre o editor
// como se o jogo já existisse no registry. Não grava ainda — só prepara em
// memória; o save de fato acontece quando o admin clica "Salvar tudo".
function _migrateLegacyToRegistry(gameId) {
    if (registryGames[gameId]) return registryGames[gameId];

    const info = JOGOS_DISPONIVEIS[gameId] || { name: gameId, emoji: '🎮', icon: '' };
    const defaults = getDefaultPrices()[gameId] || allPrices[gameId] || {};

    // Detectar engine pelo shape dos dados
    let engine = 'simple_packs';
    if (gameId === 'mir4' || (defaults.gold_usd !== undefined && defaults.goldBase !== undefined)) {
        engine = 'mir4_gold_brackets';
    } else if (gameId === 'wemix' || (defaults.margem_1_9 !== undefined)) {
        engine = 'wemix_margin';
    }

    const labelMap = LEGACY_PACK_LABELS[gameId] || {};
    const labelFor = (k) => labelMap[k] || k.replace(/_/g, ' ');

    let products;
    if (engine === 'simple_packs') {
        const items = Object.keys(defaults)
            .filter(k => k !== 'defaultCashbackLimit' && k !== 'couponLimits' && !k.startsWith('cashback_'))
            .map(k => ({ id: k, label: labelFor(k), emoji: '📦', price: defaults[k] }));
        products = [{ id: 'topup', name: 'Pacotes', emoji: '📦', engine: 'simple_packs', items }];
    } else if (engine === 'mir4_gold_brackets') {
        const goldBase = Number(defaults.goldBase ?? 20.0);
        products = [
            {
                id: 'gold',
                name: 'Gold MIR4',
                emoji: '💰',
                engine: 'mir4_gold_brackets',
                params: {
                    usdPerK: Number(defaults.gold_usd ?? 3.50),
                    brackets: [
                        { min: 0,     brl: goldBase },
                        { min: 1000,  brl: goldBase },
                        { min: 5000,  brl: Number(defaults.gold5k  ?? goldBase) },
                        { min: 10000, brl: Number(defaults.gold10k ?? goldBase) },
                        { min: 20000, brl: Number(defaults.gold20k ?? goldBase) }
                    ]
                }
            },
            {
                id: 'topup',
                name: 'Top Up',
                emoji: '📦',
                engine: 'simple_packs',
                items: Object.keys(defaults)
                    .filter(k => k.startsWith('topup_'))
                    .map(k => ({ id: k, label: labelFor(k), emoji: '📦', price: defaults[k] }))
            }
        ];
    } else if (engine === 'wemix_margin') {
        products = [{
            id: 'conversion',
            name: 'Conversão WEMIX',
            emoji: '💱',
            engine: 'wemix_margin',
            params: {
                margins: [
                    { min: 1,   max: 9,    marginPct: Number(defaults.margem_1_9   ?? 55) },
                    { min: 10,  max: 99,   marginPct: Number(defaults.margem_10_99 ?? 15) },
                    { min: 100, max: null, marginPct: Number(defaults.margem_100   ?? 6.5) }
                ]
            }
        }];
    }

    const reg = {
        id: gameId,
        name: info.name,
        emoji: info.emoji,
        description: '',
        image: info.icon || '',
        hidden: false,
        accountType: 'uid',
        supplier: null,
        requiresScreenshot: false,
        requires2FA: false,
        credentialsSchema: [],
        products,
        defaultCashbackLimit: defaults.defaultCashbackLimit ?? 1.0,
        createdAt: Date.now(),
        createdBy: 'painel-admin (migration)',
        updatedAt: Date.now(),
        updatedBy: 'painel-admin (migration)',
        _migratedFromLegacy: true
    };

    registryGames[gameId] = reg;
    if (!allPrices[gameId]) allPrices[gameId] = { ...defaults };
    return reg;
}

async function openGameEditor(gameId) {
    const modal = document.getElementById('modal-game-editor');
    if (!modal) return;

    // Reler ESTE jogo do registry AO VIVO antes de abrir. Sem isso, se a página
    // estiver aberta há um tempo, o editor mostraria (e ao Salvar gravaria de
    // volta) metadata velha do cache — revertendo o que o bot/outra pessoa mudou
    // depois. Refetch só do jogo aberto, então não tem custo relevante.
    try {
        const snap = await window.db.ref(`gameRegistry/${gameId}`).once('value');
        const fresh = snap.val();
        if (fresh) registryGames[gameId] = fresh;
    } catch (_) { /* offline — usa o cache que tiver */ }

    // Se for legado, migra em memória (não grava ainda)
    if (!registryGames[gameId]) {
        _migrateLegacyToRegistry(gameId);
    }

    const reg = registryGames[gameId];
    if (!reg) {
        showToast('Jogo não encontrado!', 'error');
        return;
    }

    _editingGameId = gameId;
    _activeEditorTab = 'packs';

    // Snapshot do cache local pra permitir Cancelar sem persistir mutações.
    // Edições no editor (delete/add/rename pacote, emoji etc.) mutam
    // registryGames[gameId] direto. Se o admin clicar Cancelar, o snapshot
    // restaura. Se clicar Salvar, saveGameFromEditor limpa o snapshot.
    _editorSnapshot = {
        reg: JSON.parse(JSON.stringify(reg)),
        prices: JSON.parse(JSON.stringify(allPrices[gameId] || {}))
    };

    // Header
    const iconEl = document.getElementById('game-editor-icon');
    const titleEl = document.getElementById('game-editor-title');
    const idEl = document.getElementById('game-editor-id');
    const imgUrl = reg.image || JOGOS_DISPONIVEIS[gameId]?.icon || '';
    iconEl.innerHTML = imgUrl
        ? `<img src="${imgUrl}" alt="${reg.name}" onerror="this.parentElement.innerHTML='${(reg.emoji || '🎮').replace(/'/g, '')}';">`
        : (reg.emoji || '🎮');
    titleEl.textContent = reg.name || gameId;
    idEl.textContent = `ID: ${gameId}` + (reg._migratedFromLegacy ? ' · ⚠️ Será migrado pro registry ao salvar' : '');

    // Tab: Pacotes
    renderEditorPacksTab(reg);

    // Tab: Credenciais
    renderEditorCredentialsTab(reg);

    // Tab: Verificação
    document.getElementById('game-editor-requires-screenshot').checked = !!reg.requiresScreenshot;
    document.getElementById('game-editor-requires-2fa').checked = !!reg.requires2FA;

    // Tab: Fornecedor — checkboxes (1+). Marca os de reg.suppliers (ou o
    // supplier único legado). Nenhum marcado = manual/interno.
    const supSel = (Array.isArray(reg.suppliers) && reg.suppliers.length)
        ? reg.suppliers
        : (reg.supplier ? [reg.supplier] : []);
    document.querySelectorAll('input[name="game-editor-supplier"]').forEach(cb => {
        cb.checked = supSel.includes(cb.value);
    });

    // Tab: Visual
    document.getElementById('game-editor-name').value = reg.name || '';
    document.getElementById('game-editor-emoji').value = reg.emoji || '';
    document.getElementById('game-editor-channel-emoji').value = reg.channelEmoji || '';
    document.getElementById('game-editor-image').value = reg.image || '';
    document.getElementById('game-editor-description').value = reg.description || '';
    document.getElementById('game-editor-hidden').checked = !!reg.hidden;
    updateImagePreview(reg.image || '');

    // Reset tab pra Pacotes
    switchEditorTab('packs');

    modal.classList.add('active');
    modal.style.display = 'flex';
    playSound('click');
}

function closeGameEditor() {
    // Se há snapshot pendente, o admin clicou Cancelar (saveGameFromEditor
    // limpa o snapshot ao salvar). Restaura cache local pra não persistir
    // mutações acidentalmente em saves em massa posteriores.
    if (_editorSnapshot && _editingGameId) {
        registryGames[_editingGameId] = _editorSnapshot.reg;
        allPrices[_editingGameId] = _editorSnapshot.prices;
    }
    _editorSnapshot = null;

    const modal = document.getElementById('modal-game-editor');
    if (modal) {
        modal.classList.remove('active');
        modal.style.display = 'none';
    }
    _editingGameId = null;
}

function switchEditorTab(tab) {
    _activeEditorTab = tab;
    document.querySelectorAll('.game-editor-tab').forEach(b => {
        b.classList.toggle('active', b.dataset.editorTab === tab);
    });
    document.querySelectorAll('.game-editor-tab-content').forEach(c => {
        c.classList.toggle('active', c.dataset.editorTabContent === tab);
    });
}

// Renderiza UMA seção simple_packs (header de produto + grid de items +
// botão de adicionar pacote). Usada para todos os simple_packs do jogo —
// jogos com múltiplos products (ex: ymirpoints com 'topup' YMP + 'twd')
// chamam essa função uma vez por produto. O id do <div> de rows é
// suffixado com o productId pra addEditorPackRow saber onde inserir.
function renderSimplePacksSection(gameId, product, role, prices, couponLimits) {
    if (!product) return '';
    const items = product.items || [];
    const productId = String(product.id || '').replace(/'/g, '');
    const rowsId = `game-editor-pack-rows-${productId || 'main'}`;
    const headerHtml = `
        <div class="pack-row-headers">
            <span>Emoji</span>
            <span>ID interno</span>
            <span>Label (visível ao cliente)</span>
            <span>Preço USD</span>
            <span>Cashback %</span>
            <span>Limite cupom %</span>
            <span></span>
        </div>
    `;
    const rowsHtml = items.map(it => packRowHtml(
        gameId, it.id, it.label,
        prices[it.id] ?? it.price ?? 0,
        prices[`cashback_${it.id}`] ?? 0,
        couponLimits[it.id] ?? 0.5,
        it.emoji || ''
    )).join('');
    const productHeaderHtml = productHeaderHtmlFor(gameId, product, role);
    const addBtnLabel = role === 'topup' ? '+ Adicionar Top Up' : '+ Adicionar pacote';
    const addBtn = `<button type="button" class="btn-add-pack" onclick="addEditorPackRow('${productId}')">${addBtnLabel}</button>`;
    return productHeaderHtml + headerHtml + `<div id="${rowsId}" data-product-id="${productId}">` + rowsHtml + '</div>' + addBtn;
}

function renderEditorPacksTab(reg) {
    const area = document.getElementById('game-editor-packs-area');
    const engineLabel = document.getElementById('game-editor-engine-label');
    const globalLimitInput = document.getElementById('game-editor-global-limit');
    const gameId = reg.id;
    const prices = allPrices[gameId] || {};
    const couponLimits = prices.couponLimits || {};

    globalLimitInput.value = prices.defaultCashbackLimit ?? reg.defaultCashbackLimit ?? 1.0;
    globalLimitInput.onchange = (e) => updateGlobalLimit(gameId, e.target.value);

    // ═══ Caso especial: Legend of Ymir — Diamantes ═══
    // Esse jogo usa engine 'calculate' (função JS no hardcoded do bot) — não
    // tem items/packs fixos pra editar. Só uma config { diamondsRefUnit,
    // diamondsUsdPerRef, diamondsBrlPerRef } no registry. BRL é FIXO (não
    // usa cotação Binance) pra não oscilar e dar valor redondo no embed.
    if (gameId === 'ymirdiamonds') {
        engineLabel.textContent = 'diamonds_proportional';
        const cfg = reg.config || {};
        const refUnit = Number(cfg.diamondsRefUnit) || 1000;
        const usdPerRef = Number(cfg.diamondsUsdPerRef) || 15.00;
        const brlPerRef = Number(cfg.diamondsBrlPerRef) || 75.00;
        const pricePerUnitUSD = (usdPerRef / refUnit);
        const pricePerUnitBRL = (brlPerRef / refUnit);
        area.innerHTML = `
            <div class="brackets-panel">
                <h4>💎 Diamantes — Configuração de Preço</h4>
                <p style="opacity:0.75;font-size:0.92em;margin-bottom:12px;">
                    Cliente digita a quantidade desejada e o bot calcula proporcional:
                    <code>(quantidade ÷ Unidade base) × Preço</code>.<br>
                    <strong>BRL é fixo</strong> (não converte da cotação Binance) — defina o valor redondo que vai cobrar.
                </p>
                <div class="brackets-grid">
                    <div class="form-group">
                        <label>Unidade base</label>
                        <input type="number" step="1" min="1"
                            id="game-editor-diamonds-ref"
                            value="${refUnit}"
                            onchange="updateDiamondsConfigField('${gameId}', 'diamondsRefUnit', this.value)">
                    </div>
                    <div class="form-group">
                        <label>Preço USD</label>
                        <input type="number" step="0.01" min="0"
                            id="game-editor-diamonds-usd"
                            value="${usdPerRef}"
                            onchange="updateDiamondsConfigField('${gameId}', 'diamondsUsdPerRef', this.value)">
                    </div>
                    <div class="form-group">
                        <label>Preço BRL (fixo)</label>
                        <input type="number" step="0.01" min="0"
                            id="game-editor-diamonds-brl"
                            value="${brlPerRef}"
                            onchange="updateDiamondsConfigField('${gameId}', 'diamondsBrlPerRef', this.value)">
                    </div>
                </div>
                <div style="margin-top:14px;padding:12px;background:rgba(255,255,255,0.03);border-radius:6px;font-size:0.9em;">
                    💡 <strong>${refUnit.toLocaleString('pt-BR')} Diamantes = $${usdPerRef.toFixed(2)} / R$ ${brlPerRef.toFixed(2)}</strong><br>
                    Por unidade: $${pricePerUnitUSD.toFixed(5)} / R$ ${pricePerUnitBRL.toFixed(5)} ·
                    Cliente digita 2000 → $${(pricePerUnitUSD * 2000).toFixed(2)} / R$ ${(pricePerUnitBRL * 2000).toFixed(2)} ·
                    5000 → $${(pricePerUnitUSD * 5000).toFixed(2)} / R$ ${(pricePerUnitBRL * 5000).toFixed(2)}
                </div>
            </div>
        `;
        return;
    }

    // Detecta engine principal — engines especializadas (gold/wemix) têm
    // prioridade sobre simple_packs porque o MIR4 tem AMBAS no array (gold +
    // topup), e queremos abrir o painel de brackets, não a lista de top-up.
    const product = (reg.products || []).find(p => p.engine === 'mir4_gold_brackets')
        || (reg.products || []).find(p => p.engine === 'wemix_margin')
        || (reg.products || []).find(p => p.engine === 'simple_packs')
        || (reg.products || [])[0];

    const engine = product?.engine || 'simple_packs';
    engineLabel.textContent = engine;
    area.innerHTML = '';

    if (engine === 'simple_packs') {
        // Renderiza TODOS os products simple_packs (ymirpoints tem 2:
        // 'topup' com YMP + 'twd' com TWD; cada um precisa de sua própria
        // seção editável). Sem isso, só o primeiro aparece e o admin não
        // consegue editar TWD.
        const simpleProducts = (reg.products || []).filter(p => p.engine === 'simple_packs');
        if (simpleProducts.length === 0) {
            area.innerHTML = '<p style="opacity:0.7">Esse jogo não tem produtos simple_packs.</p>';
        } else {
            simpleProducts.forEach((prod, idx) => {
                const role = idx === 0 ? 'main' : `extra-${prod.id}`;
                area.insertAdjacentHTML('beforeend', renderSimplePacksSection(gameId, prod, role, prices, couponLimits));
            });
        }
    } else if (engine === 'mir4_gold_brackets') {
        const goldHeaderHtml = productHeaderHtmlFor(gameId, product, 'main');
        area.innerHTML = goldHeaderHtml + `
            <div class="brackets-panel">
                <h4>💰 Gold MIR4 (faixas)</h4>
                <div class="brackets-grid">
                    <div class="form-group"><label>USD por 1k (fixo)</label><input type="number" step="0.01" id="game-editor-gold-usd" value="${prices.gold_usd ?? 3.50}" onchange="updatePriceValue('${gameId}', 'gold_usd', this.value)"></div>
                    <div class="form-group"><label>BRL/1k 0–4999</label><input type="number" step="0.01" id="game-editor-goldBase" value="${prices.goldBase ?? 20.00}" onchange="updatePriceValue('${gameId}', 'goldBase', this.value)"></div>
                    <div class="form-group"><label>BRL/1k 5k–9999</label><input type="number" step="0.01" id="game-editor-gold5k" value="${prices.gold5k ?? 20.00}" onchange="updatePriceValue('${gameId}', 'gold5k', this.value)"></div>
                    <div class="form-group"><label>BRL/1k 10k–19999</label><input type="number" step="0.01" id="game-editor-gold10k" value="${prices.gold10k ?? 20.00}" onchange="updatePriceValue('${gameId}', 'gold10k', this.value)"></div>
                    <div class="form-group"><label>BRL/1k 20k+</label><input type="number" step="0.01" id="game-editor-gold20k" value="${prices.gold20k ?? 18.40}" onchange="updatePriceValue('${gameId}', 'gold20k', this.value)"></div>
                </div>
            </div>
        `;
        // Renderiza topup junto se houver um produto simple_packs
        const topup = (reg.products || []).find(p => p.engine === 'simple_packs');
        if (topup) {
            area.insertAdjacentHTML('beforeend', renderSimplePacksSection(gameId, topup, 'topup', prices, couponLimits));
        }
    } else if (engine === 'wemix_margin') {
        const wemixHeaderHtml = productHeaderHtmlFor(gameId, product, 'main');
        area.innerHTML = wemixHeaderHtml + `
            <div class="brackets-panel">
                <h4>💱 Margens WEMIX (% sobre cotação)</h4>
                <div class="brackets-grid">
                    <div class="form-group"><label>1–9 WEMIX (%)</label><input type="number" step="0.1" value="${prices.margem_1_9 ?? 55}" onchange="updatePriceValue('${gameId}', 'margem_1_9', this.value)"></div>
                    <div class="form-group"><label>10–99 WEMIX (%)</label><input type="number" step="0.1" value="${prices.margem_10_99 ?? 15}" onchange="updatePriceValue('${gameId}', 'margem_10_99', this.value)"></div>
                    <div class="form-group"><label>100+ WEMIX (%)</label><input type="number" step="0.1" value="${prices.margem_100 ?? 6.5}" onchange="updatePriceValue('${gameId}', 'margem_100', this.value)"></div>
                </div>
            </div>
        `;
    }
}

// HTML do cabeçalho de produto (nome + emoji editáveis) acima da lista de pacotes.
// 'role' identifica qual produto do array está sendo editado: 'main' = produto principal
// detectado pelo find() em renderEditorPacksTab; 'topup' = produto simple_packs auxiliar
// que aparece junto com mir4_gold_brackets.
function productHeaderHtmlFor(gameId, product, role) {
    if (!product) return '';
    const safeName = String(product.name || '').replace(/"/g, '&quot;');
    const safeEmoji = String(product.emoji || '').replace(/"/g, '&quot;');
    const productId = String(product.id || '').replace(/'/g, '');
    return `
        <div class="product-editor-card" data-product-role="${role}">
            <div class="product-editor-grid">
                <div class="form-group">
                    <label>Nome do produto</label>
                    <input type="text" class="product-name-input" value="${safeName}" placeholder="Top Up / Gold / WEMIX" onchange="updateProductField('${gameId}', '${productId}', 'name', this.value)">
                </div>
                <div class="form-group">
                    <label>Emoji do produto</label>
                    <input type="text" class="product-emoji-input" value="${safeEmoji}" placeholder="💎 ou <:gold:1234...>" onchange="updateProductField('${gameId}', '${productId}', 'emoji', this.value)">
                </div>
            </div>
        </div>
    `;
}

function updateProductField(gameId, productId, field, value) {
    const reg = registryGames[gameId];
    if (!reg) return;
    const product = (reg.products || []).find(p => p.id === productId);
    if (!product) return;
    product[field] = value;
}

function packRowHtml(gameId, itemId, label, price, cashback, limit, emoji) {
    const safeId = String(itemId || '').replace(/'/g, '');
    const safeEmoji = String(emoji || '').replace(/"/g, '&quot;');
    return `
        <div class="pack-row" data-pack-id="${safeId}">
            <input type="text" class="pack-emoji" value="${safeEmoji}" placeholder="📦" title="Emoji do pacote" onchange="updateItemEmoji('${gameId}', this.parentElement.dataset.packId, this.value)">
            <input type="text" class="pack-id" value="${safeId}" placeholder="ID interno (ex: pack_50)" onchange="renamePackId('${gameId}', '${safeId}', this.value, this)">
            <input type="text" class="pack-label" value="${(label || '').replace(/"/g, '&quot;')}" placeholder="Label visível" onchange="renamePackLabel('${gameId}', this.parentElement.dataset.packId, this.value)">
            <input type="number" class="pack-price" step="0.01" value="${price}" onchange="updatePriceValue('${gameId}', this.parentElement.dataset.packId, this.value)">
            <input type="number" class="pack-cashback" step="0.1" value="${cashback}" onchange="updateCashbackValue('${gameId}', this.parentElement.dataset.packId, this.value)">
            <input type="number" class="pack-limit" step="0.1" value="${limit}" onchange="updateLimitValue('${gameId}', this.parentElement.dataset.packId, this.value)">
            <button type="button" class="btn-remove" onclick="removeEditorPackRow(this)" title="Remover">✕</button>
        </div>
    `;
}

function updateItemEmoji(gameId, itemId, value) {
    const reg = registryGames[gameId];
    if (!reg) return;
    for (const product of (reg.products || [])) {
        if (product.items) {
            const item = product.items.find(i => i.id === itemId);
            if (item) item.emoji = value;
        }
    }
}

// Adiciona um novo pacote ao produto correto. Aceita productId pra
// suportar jogos com múltiplos simple_packs (ymirpoints: 'topup' + 'twd').
// Sem productId, cai no primeiro simple_packs (compat com chamadas antigas
// e jogos com produto único).
function addEditorPackRow(productId) {
    if (!_editingGameId) return;
    const reg = registryGames[_editingGameId];
    if (!reg) return;
    const products = reg.products || [];
    const product = productId
        ? products.find(p => p.id === productId)
        : products.find(p => p.engine === 'simple_packs');
    if (!product) {
        showToast('Produto não encontrado — recarregue a página.', 'warning');
        return;
    }
    const newId = `pack_${Date.now().toString(36).slice(-5)}`;
    if (!product.items) product.items = [];
    product.items.push({ id: newId, label: 'Novo pacote', emoji: '📦', price: 0, priceUSD: 0 });
    if (!allPrices[_editingGameId]) allPrices[_editingGameId] = {};
    allPrices[_editingGameId][newId] = 0;

    const rowsArea = document.getElementById(`game-editor-pack-rows-${product.id}`)
        || document.getElementById('game-editor-pack-rows'); // fallback p/ id legado
    if (!rowsArea) return;
    rowsArea.insertAdjacentHTML('beforeend', packRowHtml(_editingGameId, newId, 'Novo pacote', 0, 0, 0.5));
    // Foca o campo LABEL (visível ao cliente), não o "ID interno". O ID auto
    // (pack_xxxxx) já é válido e o cliente nunca o vê. Antes focava o ID, e o
    // usuário digitava o nome do pacote ali → virava "pack_1_" (sanitizado) e
    // parecia que "não dava pra adicionar". select() pré-marca "Novo pacote".
    const labelInput = rowsArea.lastElementChild.querySelector('.pack-label');
    if (labelInput) { labelInput.focus(); labelInput.select(); }
}

function removeEditorPackRow(btn) {
    if (!_editingGameId) return;
    const row = btn.closest('.pack-row');
    if (!row) return;
    const itemId = row.dataset.packId;
    if (!confirm(`Remover pacote "${itemId}"?`)) return;

    const reg = registryGames[_editingGameId];
    if (reg) {
        for (const p of (reg.products || [])) {
            if (p.items) p.items = p.items.filter(i => i.id !== itemId);
        }
    }
    if (allPrices[_editingGameId]) {
        delete allPrices[_editingGameId][itemId];
        delete allPrices[_editingGameId][`cashback_${itemId}`];
        if (allPrices[_editingGameId].couponLimits) delete allPrices[_editingGameId].couponLimits[itemId];
    }
    row.remove();
}

function renamePackId(gameId, oldId, newRawId, inputEl) {
    const newId = (newRawId || '').trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');
    if (!newId || newId === oldId) {
        if (inputEl) inputEl.value = oldId;
        return;
    }
    const reg = registryGames[gameId];
    if (!reg) return;
    if (allPrices[gameId] && allPrices[gameId][newId] !== undefined) {
        showToast('Já existe um pacote com esse ID!', 'error');
        if (inputEl) inputEl.value = oldId;
        return;
    }
    for (const p of (reg.products || [])) {
        if (p.items) {
            p.items = p.items.map(i => i.id === oldId ? { ...i, id: newId } : i);
        }
    }
    if (allPrices[gameId]) {
        if (allPrices[gameId][oldId] !== undefined) {
            allPrices[gameId][newId] = allPrices[gameId][oldId];
            delete allPrices[gameId][oldId];
        }
        if (allPrices[gameId][`cashback_${oldId}`] !== undefined) {
            allPrices[gameId][`cashback_${newId}`] = allPrices[gameId][`cashback_${oldId}`];
            delete allPrices[gameId][`cashback_${oldId}`];
        }
        if (allPrices[gameId].couponLimits && allPrices[gameId].couponLimits[oldId] !== undefined) {
            allPrices[gameId].couponLimits[newId] = allPrices[gameId].couponLimits[oldId];
            delete allPrices[gameId].couponLimits[oldId];
        }
    }
    const row = inputEl?.closest('.pack-row');
    if (row) row.dataset.packId = newId;
    if (inputEl) inputEl.value = newId;
}

function renamePackLabel(gameId, itemId, newLabel) {
    const reg = registryGames[gameId];
    if (!reg) return;
    const trimmed = (newLabel || '').trim();
    if (!trimmed) return;
    for (const p of (reg.products || [])) {
        if (p.items) p.items = p.items.map(i => i.id === itemId ? { ...i, label: trimmed } : i);
    }
}

function renderEditorCredentialsTab(reg) {
    const list = document.getElementById('game-editor-credentials-list');
    if (!list) return;
    const current = Array.isArray(reg.credentialsSchema) ? reg.credentialsSchema : [];
    const currentKeys = new Set(current.map(c => c.key));

    list.innerHTML = CREDENTIAL_FIELDS_CATALOG.map(f => {
        const checked = currentKeys.has(f.key);
        return `
            <label class="credential-option ${checked ? 'checked' : ''}">
                <input type="checkbox" data-cred-key="${f.key}" data-cred-label="${f.label}" data-cred-required="${f.required}" data-cred-type="${f.type || 'text'}" ${checked ? 'checked' : ''} onchange="this.parentElement.classList.toggle('checked', this.checked);">
                <div>
                    <strong>${f.label}</strong>
                    <small>${f.description}</small>
                </div>
            </label>
        `;
    }).join('');
}

function collectCredentialsSchemaFromEditor() {
    const checks = document.querySelectorAll('#game-editor-credentials-list input[type="checkbox"]:checked');
    return Array.from(checks).map(c => ({
        key: c.dataset.credKey,
        label: c.dataset.credLabel,
        type: c.dataset.credType || 'text',
        required: c.dataset.credRequired === 'true'
    }));
}

function updateImagePreview(url) {
    const preview = document.getElementById('game-editor-image-preview');
    if (preview) preview.src = normalizeImageUrl(url) || '';
}

async function saveGameFromEditor() {
    if (!_editingGameId) return;
    const gameId = _editingGameId;
    try {
        const credentialsSchema = collectCredentialsSchemaFromEditor();

        // Sincronizar registry com TUDO do DOM (preços, brackets, margens, supplier, schema, etc)
        await _syncGameToRegistry(gameId, { fromModal: true, credentialsSchema });

        // Persistir gamePrices em paralelo (mantém legacy compat)
        await window.db.ref(`gamePrices/${gameId}`).set(allPrices[gameId] || {});

        // Notificar o bot
        await window.db.ref('priceUpdateTrigger').set({
            timestamp: Date.now(),
            updatedBy: 'dashboard',
            game: gameId
        });

        // Salvou com sucesso — descarta snapshot pra closeGameEditor não
        // tentar restaurar (mutações já viraram a verdade canônica).
        _editorSnapshot = null;

        showToast(`✅ ${gameId.toUpperCase()} salvo com sucesso!`, 'success');
        playSound('success');
        closeGameEditor();
        renderPrices();
    } catch (err) {
        console.error('❌ Erro ao salvar jogo:', err);
        showToast('Erro ao salvar: ' + err.message, 'error');
    }
}

async function deleteGameFromEditor() {
    if (!_editingGameId) return;
    const gameId = _editingGameId;
    if (!confirm(`⚠️ Deletar permanentemente "${gameId}"?\n\nVai apagar:\n- gameRegistry/${gameId}\n- gamePrices/${gameId}\n- config/games/${gameId}\n\nEsta ação NÃO pode ser desfeita.`)) return;

    try {
        await Promise.all([
            window.db.ref(`gameRegistry/${gameId}`).remove(),
            window.db.ref(`gamePrices/${gameId}`).remove(),
            window.db.ref(`config/games/${gameId}`).remove()
        ]);
        delete registryGames[gameId];
        delete allPrices[gameId];
        _editorSnapshot = null; // jogo apagado — não há o que restaurar

        await window.db.ref('priceUpdateTrigger').set({
            timestamp: Date.now(),
            updatedBy: 'dashboard',
            action: 'game-deleted',
            gameId
        });

        showToast(`Jogo "${gameId}" deletado!`, 'success');
        closeGameEditor();
        renderPrices();
    } catch (err) {
        console.error('❌ Erro ao deletar:', err);
        showToast('Erro ao deletar: ' + err.message, 'error');
    }
}

async function saveAllPrices() {
    // Agora salvamos um por um ou todos de uma vez
    try {
        await window.db.ref('gamePrices').set(allPrices);

        // Também sincronizar TODOS os jogos que existem no registry.
        // Sem isso, save em massa atualizava gamePrices/ mas deixava o registry
        // com valores velhos — e o bot lê do registry.
        const syncIds = Object.keys(registryGames || {});
        for (const gid of syncIds) {
            await _syncGameToRegistry(gid);
        }

        // Notificar o bot (salvamento em massa)
        await window.db.ref('priceUpdateTrigger').set({
            timestamp: Date.now(),
            updatedBy: 'dashboard',
            game: 'all'
        });

        showToast('Todos os preços salvos com sucesso!', 'success');
        playSound('success');
        loadPricesData();
    } catch (error) {
        showToast('Erro ao salvar tudo: ' + error.message, 'error');
    }
}

async function resetPricesToDefault() {
    if (!confirm('Deseja resetar TODOS os preços para os valores padrão?')) return;
    const defaults = getDefaultPrices();
    try {
        await window.db.ref('gamePrices').set(defaults);

        // Atualizar memória local antes do sync, pra _syncGameToRegistry ler os defaults
        Object.assign(allPrices, defaults);

        // Sincronizar registry pra todos os jogos — senão o bot continua com preços velhos
        const syncIds = Object.keys(registryGames || {});
        for (const gid of syncIds) {
            await _syncGameToRegistry(gid);
        }

        // Notificar o bot (reset em massa)
        await window.db.ref('priceUpdateTrigger').set({
            timestamp: Date.now(),
            updatedBy: 'dashboard',
            game: 'all'
        });

        showToast('Preços resetados!', 'success');
        loadPricesData();
    } catch (error) {
        showToast('Erro ao resetar: ' + error.message, 'error');
    }
}

// ═══════════════════════════════════════════════════════════════
// 👥 CLIENTES - SISTEMA COMPLETO
// ═══════════════════════════════════════════════════════════════

async function loadClientesData() {
    try {
        const snapshot = await window.db.ref('clientes').once('value');
        allClientes = [];

        snapshot.forEach((child) => {
            const data = child.val();
            allClientes.push({
                id: child.key,
                userId: data.userId || child.key,
                username: data.username || data.discordUsername || 'Cliente',
                ...data
            });
        });

        // Removido o auto-call de createClientesFromSales:
        // o snapshot 'clientes' pode vir vazio por race/network blip e essa
        // heuristica ("vazio + tem sales = recriar tudo") apagava savedAccounts
        // de TODOS os clientes de uma vez, silenciosamente. Se precisar
        // reconstruir clientes a partir de vendas, expor um botao explicito
        // na UI que chame createClientesFromSales — agora seguro pq usa update().
        if (allClientes.length === 0 && allSales.length > 0) {
            console.warn('⚠️ Nenhum cliente carregado mas existem vendas. Snapshot pode estar com lag — nao recriando automaticamente. Use o botao manual se for necessario.');
        }

        updateClientesStats();
        updateClientesTable();
        console.log(`✅ ${allClientes.length} clientes carregados`);
    } catch (error) {
        console.error('❌ Erro ao carregar clientes:', error);
    }
}

function updateClientesStats() {
    const total = allClientes.length;
    const saldoTotal = allClientes.reduce((sum, c) => sum + Number(c.saldoDisponivel || 0), 0);
    const totalComprado = allClientes.reduce((sum, c) => sum + Number(c.totalComprado || 0), 0);
    const comCupom = allClientes.filter(c => c.referralCode).length;
    const totalCompras = allClientes.reduce((sum, c) => sum + Number(c.compras || 0), 0);
    const comSaldo = allClientes.filter(c => Number(c.saldoDisponivel || 0) > 0).length;

    const setEl = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    setEl('clientes-total', total.toLocaleString('pt-BR'));
    setEl('clientes-saldo-total', `R$ ${saldoTotal.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`);
    setEl('clientes-total-comprado', `R$ ${totalComprado.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`);
    setEl('clientes-com-cupom', comCupom.toLocaleString('pt-BR'));
    setEl('clientes-total-compras', totalCompras.toLocaleString('pt-BR'));
    setEl('clientes-com-saldo', comSaldo.toLocaleString('pt-BR'));
}

async function createClientesFromSales() {
    const defaultCashback = parseFloat(document.getElementById('default-cashback')?.value || 0);
    const clientesMap = {};

    allSales.forEach(sale => {
        if (!sale.userId) return;
        if (!isSaleActive(sale)) return; // nunca creditar cashback/total de vendas canceladas
        if (!clientesMap[sale.userId]) {
            clientesMap[sale.userId] = {
                userId: sale.userId,
                username: sale.username || 'Cliente',
                cashbackPercent: defaultCashback,
                saldoManual: 0, saldoCashback: 0, saldoDisponivel: 0,
                totalComprado: 0, totalCashback: 0,
                createdAt: sale.createdAt || Date.now()
            };
        }
        const valorCompra = sale.totalBRL || 0;
        const cashbackValue = valorCompra * (defaultCashback / 100);
        clientesMap[sale.userId].totalComprado += valorCompra;
        clientesMap[sale.userId].saldoCashback += cashbackValue;
        clientesMap[sale.userId].saldoDisponivel += cashbackValue;
        clientesMap[sale.userId].totalCashback += cashbackValue;
    });

    for (const userId in clientesMap) {
        // CRITICO: usar .update() (PATCH) em vez de .set() (PUT) preserva
        // subnodes existentes — principalmente clientes/{userId}/savedAccounts
        // (logins criptografados) e /transacoes. .set() apagava tudo isso.
        // Mesmo bug do registerOfficialSale que ja foi corrigido no bot.
        await window.db.ref(`clientes/${userId}`).update(clientesMap[userId]);
    }
    console.log(`✅ ${Object.keys(clientesMap).length} clientes recalculados a partir das vendas (savedAccounts/transacoes preservados)`);
}

function getFilteredClientes() {
    const searchValue = (document.getElementById('search-clientes')?.value || '').toLowerCase();
    const filterSaldo = document.getElementById('filter-clientes-saldo')?.value || 'all';
    const filterCupom = document.getElementById('filter-clientes-cupom')?.value || 'all';
    const filterOrder = document.getElementById('filter-clientes-order')?.value || 'total-comprado';

    let filtered = [...allClientes];

    // Pesquisa
    if (searchValue) {
        filtered = filtered.filter(c =>
            (c.username || '').toLowerCase().includes(searchValue) ||
            (c.userId || '').toLowerCase().includes(searchValue) ||
            (c.discordTag || '').toLowerCase().includes(searchValue) ||
            (c.referralCode || '').toLowerCase().includes(searchValue) ||
            (c.phone || '').toLowerCase().includes(searchValue) ||
            (c.email || '').toLowerCase().includes(searchValue)
        );
    }

    // Filtro de saldo
    if (filterSaldo === 'com-saldo') {
        filtered = filtered.filter(c => Number(c.saldoDisponivel || 0) > 0);
    } else if (filterSaldo === 'sem-saldo') {
        filtered = filtered.filter(c => Number(c.saldoDisponivel || 0) <= 0);
    }

    // Filtro de cupom
    if (filterCupom === 'com-cupom') {
        filtered = filtered.filter(c => c.referralCode);
    } else if (filterCupom === 'sem-cupom') {
        filtered = filtered.filter(c => !c.referralCode);
    }

    // Ordenação
    switch (filterOrder) {
        case 'saldo':
            filtered.sort((a, b) => Number(b.saldoDisponivel || 0) - Number(a.saldoDisponivel || 0));
            break;
        case 'compras':
            filtered.sort((a, b) => Number(b.compras || 0) - Number(a.compras || 0));
            break;
        case 'recente':
            filtered.sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0));
            break;
        case 'nome':
            filtered.sort((a, b) => (a.username || '').localeCompare(b.username || ''));
            break;
        default: // total-comprado
            filtered.sort((a, b) => Number(b.totalComprado || 0) - Number(a.totalComprado || 0));
    }

    return filtered;
}

function updateClientesTable() {
    const tbody = document.getElementById('clientes-tbody');
    if (!tbody) return;

    const filtered = getFilteredClientes();
    const totalPages = Math.max(1, Math.ceil(filtered.length / clientesItemsPerPage));
    if (clientesCurrentPage > totalPages) clientesCurrentPage = totalPages;

    const start = (clientesCurrentPage - 1) * clientesItemsPerPage;
    const pageClientes = filtered.slice(start, start + clientesItemsPerPage);

    // Atualizar contador
    const showingEl = document.getElementById('clientes-showing');
    if (showingEl) showingEl.textContent = `Mostrando ${Math.min(start + 1, filtered.length)}-${Math.min(start + clientesItemsPerPage, filtered.length)} de ${filtered.length}`;

    tbody.innerHTML = '';

    if (pageClientes.length === 0) {
        tbody.innerHTML = '<tr><td colspan="12" style="text-align:center; padding: 40px; color: var(--text-secondary);">🔍 Nenhum cliente encontrado</td></tr>';
        renderClientesPagination(totalPages);
        return;
    }

    pageClientes.forEach(cliente => {
        const row = document.createElement('tr');
        const defaultAvatar = parseInt(cliente.userId) % 5;
        const avatarUrl = cliente.avatarUrl || `https://cdn.discordapp.com/embed/avatars/${defaultAvatar}.png`;
        const saldoManual = Number(cliente.saldoManual || 0);
        const saldoCashback = cliente.saldoCashback !== undefined
            ? Number(cliente.saldoCashback)
            : Math.max(0, Number(cliente.saldoDisponivel || 0) - saldoManual);
        const saldoDisponivel = saldoManual + saldoCashback;
        const totalCashback = Number(cliente.totalCashback || 0);
        const hasReferral = cliente.referralCode && cliente.referralAutoApply !== false;

        let createdAtStr = '—';
        if (cliente.createdAt) {
            try {
                const d = new Date(cliente.createdAt);
                if (!isNaN(d.getTime())) createdAtStr = d.toLocaleDateString('pt-BR');
            } catch(e) {}
        }

        row.innerHTML = `
            <td>
                <div class="cliente-avatar-wrap">
                    <img src="${avatarUrl}" alt="${cliente.username}" onerror="this.src='https://cdn.discordapp.com/embed/avatars/${defaultAvatar}.png'">
                </div>
            </td>
            <td>
                <div class="cliente-name-cell">
                    <span class="name">${cliente.username || 'N/A'}</span>
                    ${cliente.discordTag && cliente.discordTag !== cliente.username ? `<span class="tag">${cliente.discordTag}</span>` : ''}
                </div>
            </td>
            <td>
                <span class="cliente-discord-id" onclick="copyDiscordId('${cliente.userId}')" title="Clique para copiar">${cliente.userId}</span>
            </td>
            <td>
                ${cliente.phone
                    ? `<span class="cliente-phone" onclick="copyDiscordId('${(cliente.phone || '').replace(/'/g, "\\'")}')" title="Clique para copiar" style="cursor:pointer;">${cliente.phone}</span>`
                    : '<span style="color: #555;">—</span>'}
            </td>
            <td>
                ${cliente.email
                    ? `<span class="cliente-email" onclick="copyDiscordId('${(cliente.email || '').replace(/'/g, "\\'")}')" title="Clique para copiar" style="cursor:pointer;">${cliente.email}</span>`
                    : '<span style="color: #555;">—</span>'}
            </td>
            <td>
                ${cliente.referralCode
                    ? `<span class="cupom-badge ${hasReferral ? 'active' : 'inactive'}" title="${hasReferral ? 'Ativo' : 'Desativado'}">${cliente.referralCode}</span>`
                    : '<span style="color: #555;">—</span>'}
            </td>
            <td>
                <span class="cliente-saldo ${saldoDisponivel > 0 ? 'has-saldo' : 'no-saldo'}">R$ ${saldoDisponivel.toFixed(2)}</span>
            </td>
            <td style="text-align: center; font-weight: 600;">${cliente.compras || 0}</td>
            <td style="font-weight: 600;">R$ ${(cliente.totalComprado || 0).toFixed(2)}</td>
            <td style="color: #34d399;">R$ ${totalCashback.toFixed(2)}</td>
            <td><span class="cliente-date">${createdAtStr}</span></td>
            <td>
                <div class="clientes-actions">
                    <button class="btn-action view-info" onclick="viewClienteDetails('${cliente.userId}')" title="Ver Detalhes">📋</button>
                    <button class="btn-action add-saldo" onclick="addSaldoManual('${cliente.userId}')" title="Adicionar Saldo">➕</button>
                    <button class="btn-action remove-saldo" onclick="removeSaldoManual('${cliente.userId}')" title="Remover Saldo">➖</button>
                    ${cliente.referralCode ? `<button class="btn-action remove-cupom" onclick="removeReferralCoupon('${cliente.userId}')" title="Remover Cupom">🎫</button>` : ''}
                    <button class="btn-action view-history" onclick="viewClienteHistory('${cliente.userId}')" title="Ver Histórico">📊</button>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });

    renderClientesPagination(totalPages);
}

function renderClientesPagination(totalPages) {
    const container = document.getElementById('clientes-pagination');
    if (!container) return;
    container.innerHTML = '';

    if (totalPages <= 1) return;

    // Prev
    const prevBtn = document.createElement('button');
    prevBtn.textContent = '◀';
    prevBtn.disabled = clientesCurrentPage <= 1;
    prevBtn.onclick = () => goToClientesPage(clientesCurrentPage - 1);
    container.appendChild(prevBtn);

    // Pages
    const maxVisible = 7;
    let startPage = Math.max(1, clientesCurrentPage - Math.floor(maxVisible / 2));
    let endPage = Math.min(totalPages, startPage + maxVisible - 1);
    if (endPage - startPage < maxVisible - 1) startPage = Math.max(1, endPage - maxVisible + 1);

    if (startPage > 1) {
        const btn = document.createElement('button');
        btn.textContent = '1';
        btn.onclick = () => goToClientesPage(1);
        container.appendChild(btn);
        if (startPage > 2) {
            const dots = document.createElement('span');
            dots.textContent = '...';
            dots.style.cssText = 'color: var(--text-secondary); padding: 0 4px;';
            container.appendChild(dots);
        }
    }

    for (let i = startPage; i <= endPage; i++) {
        const btn = document.createElement('button');
        btn.textContent = i;
        if (i === clientesCurrentPage) btn.classList.add('active');
        btn.onclick = () => goToClientesPage(i);
        container.appendChild(btn);
    }

    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            const dots = document.createElement('span');
            dots.textContent = '...';
            dots.style.cssText = 'color: var(--text-secondary); padding: 0 4px;';
            container.appendChild(dots);
        }
        const btn = document.createElement('button');
        btn.textContent = totalPages;
        btn.onclick = () => goToClientesPage(totalPages);
        container.appendChild(btn);
    }

    // Next
    const nextBtn = document.createElement('button');
    nextBtn.textContent = '▶';
    nextBtn.disabled = clientesCurrentPage >= totalPages;
    nextBtn.onclick = () => goToClientesPage(clientesCurrentPage + 1);
    container.appendChild(nextBtn);
}

function goToClientesPage(page) {
    clientesCurrentPage = page;
    updateClientesTable();
    // Scroll para o topo da tabela
    document.getElementById('tab-clientes')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function copyDiscordId(id) {
    navigator.clipboard.writeText(id).then(() => {
        showToast(`ID copiado: ${id}`, 'success');
    }).catch(() => {
        // Fallback
        const input = document.createElement('input');
        input.value = id;
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
        showToast(`ID copiado: ${id}`, 'success');
    });
}

function viewClienteDetails(userId) {
    const cliente = allClientes.find(c => c.userId === userId);
    if (!cliente) return;

    const defaultAvatar = parseInt(cliente.userId) % 5;
    const avatarUrl = cliente.avatarUrl || `https://cdn.discordapp.com/embed/avatars/${defaultAvatar}.png`;
    const saldoManual = Number(cliente.saldoManual || 0);
    const saldoCashback = cliente.saldoCashback !== undefined
        ? Number(cliente.saldoCashback)
        : Math.max(0, Number(cliente.saldoDisponivel || 0) - saldoManual);
    const saldoDisponivel = saldoManual + saldoCashback;
    const totalCashback = Number(cliente.totalCashback || 0);
    const totalComprado = Number(cliente.totalComprado || 0);
    const compras = Number(cliente.compras || 0);
    const ticketMedio = compras > 0 ? totalComprado / compras : 0;

    // Contar transações
    let numTransacoes = 0;
    if (cliente.transacoes && typeof cliente.transacoes === 'object') {
        numTransacoes = Object.keys(cliente.transacoes).length;
    }

    const fmtDate = (ts) => {
        if (!ts) return '—';
        try { const d = new Date(ts); return isNaN(d.getTime()) ? '—' : d.toLocaleString('pt-BR'); } catch(e) { return '—'; }
    };

    // Remover modal existente
    const existing = document.getElementById('cliente-detail-modal');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'cliente-detail-modal';
    overlay.className = 'cliente-modal-overlay';
    overlay.innerHTML = `
        <div class="cliente-modal">
            <div class="cliente-modal-header">
                <h2>📋 Ficha do Cliente</h2>
                <button class="cliente-modal-close" onclick="document.getElementById('cliente-detail-modal').remove()">&times;</button>
            </div>

            <div class="cliente-modal-profile">
                <img src="${avatarUrl}" alt="${cliente.username}" onerror="this.src='https://cdn.discordapp.com/embed/avatars/${defaultAvatar}.png'">
                <div class="cliente-modal-profile-info">
                    <span class="modal-username">${cliente.username || 'Cliente'}</span>
                    ${cliente.discordTag ? `<span class="modal-tag">${cliente.discordTag}</span>` : ''}
                    <span class="modal-id" onclick="copyDiscordId('${cliente.userId}')" title="Clique para copiar">📋 ${cliente.userId}</span>
                </div>
            </div>

            <div class="cliente-modal-body">
                <div class="modal-section-title">💰 Saldo & Financeiro</div>
                <div class="modal-data-grid">
                    <div class="modal-data-item">
                        <div class="data-label">💎 Saldo Disponível</div>
                        <div class="data-value green">R$ ${saldoDisponivel.toFixed(2)}</div>
                    </div>
                    <div class="modal-data-item">
                        <div class="data-label">🔄 Cashback Acumulado</div>
                        <div class="data-value blue">R$ ${saldoCashback.toFixed(2)}</div>
                    </div>
                    <div class="modal-data-item">
                        <div class="data-label">✋ Saldo Manual</div>
                        <div class="data-value purple">R$ ${saldoManual.toFixed(2)}</div>
                    </div>
                    <div class="modal-data-item">
                        <div class="data-label">📈 Total Cashback Ganho</div>
                        <div class="data-value yellow">R$ ${totalCashback.toFixed(2)}</div>
                    </div>
                </div>

                <div class="modal-section-title">📞 Contato</div>
                <div class="modal-data-grid">
                    <div class="modal-data-item">
                        <div class="data-label">📱 WhatsApp</div>
                        <div class="data-value ${cliente.phone ? '' : ''}" style="cursor:${cliente.phone ? 'pointer' : 'default'};" ${cliente.phone ? `onclick="copyDiscordId('${(cliente.phone || '').replace(/'/g, "\\'")}')" title="Clique para copiar"` : ''}>${cliente.phone || '—'}</div>
                    </div>
                    <div class="modal-data-item">
                        <div class="data-label">📧 E-mail</div>
                        <div class="data-value" style="cursor:${cliente.email ? 'pointer' : 'default'}; font-size: 13px;" ${cliente.email ? `onclick="copyDiscordId('${(cliente.email || '').replace(/'/g, "\\'")}')" title="Clique para copiar"` : ''}>${cliente.email || '—'}</div>
                    </div>
                </div>

                <div class="modal-section-title">🛒 Compras</div>
                <div class="modal-data-grid">
                    <div class="modal-data-item">
                        <div class="data-label">🛒 Nº de Compras</div>
                        <div class="data-value">${compras}</div>
                    </div>
                    <div class="modal-data-item">
                        <div class="data-label">💵 Total Comprado</div>
                        <div class="data-value green">R$ ${totalComprado.toFixed(2)}</div>
                    </div>
                    <div class="modal-data-item">
                        <div class="data-label">🎯 Ticket Médio</div>
                        <div class="data-value blue">R$ ${ticketMedio.toFixed(2)}</div>
                    </div>
                    <div class="modal-data-item">
                        <div class="data-label">📝 Transações</div>
                        <div class="data-value">${numTransacoes}</div>
                    </div>
                </div>

                <div class="modal-section-title">🎫 Afiliado & Cupom</div>
                <div class="modal-data-grid">
                    <div class="modal-data-item">
                        <div class="data-label">🎫 Cupom Vinculado</div>
                        <div class="data-value ${cliente.referralCode ? 'purple' : ''}">${cliente.referralCode || 'Nenhum'}</div>
                    </div>
                    <div class="modal-data-item">
                        <div class="data-label">🔄 Auto-Aplicar</div>
                        <div class="data-value ${cliente.referralAutoApply !== false && cliente.referralCode ? 'green' : ''}">${cliente.referralCode ? (cliente.referralAutoApply !== false ? '✅ Ativo' : '❌ Desativado') : '—'}</div>
                    </div>
                    <div class="modal-data-item">
                        <div class="data-label">💰 % Cashback Cupom</div>
                        <div class="data-value">${cliente.referralCashbackPercent !== undefined ? cliente.referralCashbackPercent + '%' : '—'}</div>
                    </div>
                    <div class="modal-data-item">
                        <div class="data-label">🎯 Cashback Custom</div>
                        <div class="data-value">${cliente.customCashback !== undefined && cliente.customCashback !== null ? cliente.customCashback + '%' : 'Padrão'}</div>
                    </div>
                </div>

                <div class="modal-section-title">📅 Datas & Controle</div>
                <div class="modal-data-grid">
                    <div class="modal-data-item">
                        <div class="data-label">📅 Cliente Desde</div>
                        <div class="data-value" style="font-size: 13px;">${fmtDate(cliente.createdAt)}</div>
                    </div>
                    <div class="modal-data-item">
                        <div class="data-label">🔄 Última Atualização</div>
                        <div class="data-value" style="font-size: 13px;">${fmtDate(cliente.lastManualUpdate)}</div>
                    </div>
                    <div class="modal-data-item full-width">
                        <div class="data-label">👨‍💼 Atualizado Por</div>
                        <div class="data-value" style="font-size: 13px;">${cliente.updatedBy || '—'}</div>
                    </div>
                    ${cliente.referralLinkedAt ? `
                    <div class="modal-data-item full-width">
                        <div class="data-label">🔗 Cupom Vinculado em</div>
                        <div class="data-value" style="font-size: 13px;">${fmtDate(cliente.referralLinkedAt)}</div>
                    </div>` : ''}
                </div>

                <button class="modal-btn-close" onclick="document.getElementById('cliente-detail-modal').remove()">Fechar</button>
            </div>
        </div>
    `;

    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) overlay.remove();
    });

    document.body.appendChild(overlay);
}

function exportClientesCSV() {
    const filtered = getFilteredClientes();
    if (filtered.length === 0) {
        showToast('Nenhum cliente para exportar!', 'warning');
        return;
    }

    const headers = ['Username', 'Discord ID', 'Discord Tag', 'WhatsApp', 'E-mail', 'Saldo Disponível', 'Saldo Cashback', 'Saldo Manual', 'Total Cashback Ganho', 'Total Comprado', 'Compras', 'Cupom Vinculado', 'Cashback Custom', 'Membro Desde'];
    const rows = filtered.map(c => {
        const saldoManual = Number(c.saldoManual || 0);
        const saldoCashback = c.saldoCashback !== undefined ? Number(c.saldoCashback) : Math.max(0, Number(c.saldoDisponivel || 0) - saldoManual);
        const saldoDisponivel = saldoManual + saldoCashback;
        let createdAt = '';
        if (c.createdAt) { try { createdAt = new Date(c.createdAt).toLocaleDateString('pt-BR'); } catch(e) {} }

        return [
            c.username || '',
            c.userId || '',
            c.discordTag || '',
            c.phone || '',
            c.email || '',
            saldoDisponivel.toFixed(2),
            saldoCashback.toFixed(2),
            saldoManual.toFixed(2),
            Number(c.totalCashback || 0).toFixed(2),
            Number(c.totalComprado || 0).toFixed(2),
            c.compras || 0,
            c.referralCode || '',
            c.customCashback !== undefined && c.customCashback !== null ? c.customCashback + '%' : 'Padrão',
            createdAt
        ];
    });

    const csvContent = '\uFEFF' + [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `clientes-daoshi-${new Date().toISOString().slice(0,10)}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
    showToast(`${filtered.length} clientes exportados com sucesso!`, 'success');
}

async function addSaldoManual(userId) {
    const cliente = allClientes.find(c => c.userId === userId);
    if (!cliente) return;

    const saldoManualAtual = cliente.saldoManual || 0;
    const saldoCashbackAtual = cliente.saldoCashback !== undefined
        ? cliente.saldoCashback
        : Math.max(0, (cliente.saldoDisponivel || 0) - saldoManualAtual);
    const saldoAtualTotal = saldoManualAtual + saldoCashbackAtual;

    const valor = prompt(`💰 Adicionar saldo para ${cliente.username}\n\nSaldo atual: R$ ${saldoAtualTotal.toFixed(2)}\n\nDigite o valor a adicionar (R$):`);

    if (!valor) return;

    const amount = parseFloat(valor);
    if (isNaN(amount) || amount <= 0) {
        showToast('Digite um valor válido!', 'warning');
        return;
    }

    try {
        const novoSaldoManual = saldoManualAtual + amount;
        const novoSaldoTotal = Math.max(0, novoSaldoManual + saldoCashbackAtual);

        await window.db.ref(`clientes/${userId}`).update({
            saldoManual: novoSaldoManual,
            saldoCashback: saldoCashbackAtual,
            saldoDisponivel: novoSaldoTotal
        });

        // Registrar transação
        await window.db.ref(`clientes/${userId}/transacoes`).push({
            tipo: 'adicao_manual',
            valor: amount,
            saldoAnterior: saldoAtualTotal,
            saldoNovo: novoSaldoTotal,
            data: Date.now(),
            observacao: 'Adicionado manualmente pelo admin'
        });

        showToast(`R$ ${amount.toFixed(2)} adicionado ao saldo de ${cliente.username}! Novo saldo: R$ ${novoSaldoTotal.toFixed(2)}`, 'success');
        await loadClientesData();
    } catch (error) {
        showToast('Erro: ' + error.message, 'error');
    }
}

async function removeSaldoManual(userId) {
    const cliente = allClientes.find(c => c.userId === userId);
    if (!cliente) return;

    const saldoManualAtual = cliente.saldoManual || 0;
    const saldoCashbackAtual = cliente.saldoCashback !== undefined
        ? cliente.saldoCashback
        : Math.max(0, (cliente.saldoDisponivel || 0) - saldoManualAtual);
    const saldoAtualTotal = saldoManualAtual + saldoCashbackAtual;

    if (saldoAtualTotal <= 0) {
        showToast('Este cliente não possui saldo para remover!', 'warning');
        return;
    }

    const valor = prompt(`➖ Remover saldo de ${cliente.username}\n\nSaldo total atual: R$ ${saldoAtualTotal.toFixed(2)} (Manual: R$ ${saldoManualAtual.toFixed(2)}, Cashback: R$ ${saldoCashbackAtual.toFixed(2)})\n\nDigite o valor a remover (R$):`);

    if (!valor) return;

    const amount = parseFloat(valor);
    if (isNaN(amount) || amount <= 0) {
        showToast('Digite um valor válido!', 'warning');
        return;
    }

    if (amount > saldoAtualTotal) {
        showToast(`Valor maior que o saldo total disponível (R$ ${saldoAtualTotal.toFixed(2)})!`, 'warning');
        return;
    }

    if (!confirm(`Confirma remover R$ ${amount.toFixed(2)} do saldo de ${cliente.username}?`)) {
        return;
    }

    try {
        let toRemove = amount;
        let novoSaldoManual = saldoManualAtual;
        let novoSaldoCashback = saldoCashbackAtual;

        // Tentar remover primeiro do saldo manual
        if (novoSaldoManual >= toRemove) {
            novoSaldoManual -= toRemove;
            toRemove = 0;
        } else {
            toRemove -= novoSaldoManual;
            novoSaldoManual = 0;
            // Remover o que restou do saldo de cashback
            novoSaldoCashback = Math.max(0, novoSaldoCashback - toRemove);
        }

        const novoSaldoTotal = novoSaldoManual + novoSaldoCashback;

        await window.db.ref(`clientes/${userId}`).update({
            saldoManual: novoSaldoManual,
            saldoCashback: novoSaldoCashback,
            saldoDisponivel: novoSaldoTotal
        });

        // Registrar transação
        await window.db.ref(`clientes/${userId}/transacoes`).push({
            tipo: 'remocao_manual',
            valor: -amount,
            saldoAnterior: saldoAtualTotal,
            saldoNovo: novoSaldoTotal,
            data: Date.now(),
            observacao: 'Removido pelo admin via painel'
        });

        showToast(`R$ ${amount.toFixed(2)} removido do saldo de ${cliente.username}! Novo saldo: R$ ${novoSaldoTotal.toFixed(2)}`, 'success');
        await loadClientesData();
    } catch (error) {
        showToast('Erro: ' + error.message, 'error');
    }
}

async function removeReferralCoupon(userId) {
    const cliente = allClientes.find(c => c.userId === userId);
    if (!cliente) return;

    if (!cliente.referralCode) {
        showToast('Este cliente não possui cupom vinculado!', 'warning');
        return;
    }

    if (!confirm(`⚠️ Tem certeza que deseja remover o cupom "${cliente.referralCode}" do cliente ${cliente.username}?\n\nIsso impedirá que ele ganhe cashback automático nas próximas compras.`)) {
        return;
    }

    try {
        addLiveFeedItem(`Removendo cupom ${cliente.referralCode} do cliente ${cliente.username}...`, 'info');

        // Limpar campos de cupom no Firebase
        await window.db.ref(`clientes/${userId}`).update({
            referralCode: null,
            referralCouponId: null,
            referralCashbackPercent: 0,
            referralAutoApply: false,
            referralRemovedAt: Date.now(),
            referralRemovedBy: 'admin'
        });

        showToast(`Cupom removido com sucesso de ${cliente.username}!`, 'success');
        addLiveFeedItem(`Cupom removido do cliente ${cliente.username}.`, 'success');
        
        await loadClientesData();
    } catch (error) {
        console.error('Erro ao remover cupom:', error);
        showToast('Erro ao remover cupom: ' + error.message, 'error');
    }
}

function viewClienteHistory(userId) {
    const cliente = allClientes.find(c => c.userId === userId);
    if (!cliente) return;

    const vendas = allSales.filter(s => s.userId === userId && isSaleActive(s));
    const totalCompras = vendas.length;
    const ticketMedio = totalCompras > 0 ? (cliente.totalComprado / totalCompras) : 0;

    // Mostrar resumo no toast
    showToast(`${cliente.username}: R$ ${(cliente.totalComprado || 0).toFixed(2)} em ${cliente.compras || totalCompras} compras`, 'info');

    // Log completo no console
    console.log('\n📊 HISTÓRICO DE ' + cliente.username);
    console.log('💰 Saldo Disponível: R$', (cliente.saldoDisponivel || 0).toFixed(2));
    if (cliente.referralCode) {
        console.log('🎫 Cupom Vinculado:', cliente.referralCode);
        console.log('🔄 Auto-Apply:', cliente.referralAutoApply !== false ? 'Ativo' : 'Desativado');
    }
    console.log('💵 Total Comprado: R$', (cliente.totalComprado || 0).toFixed(2));
    console.log('🛒 Total de Compras:', cliente.compras || totalCompras);
    console.log('📈 Ticket Médio: R$', ticketMedio.toFixed(2));
    console.log('💎 Cashback Acumulado: R$', (cliente.totalCashback || 0).toFixed(2));
    console.log('📅 Cliente desde:', new Date(cliente.createdAt).toLocaleDateString('pt-BR'));
}

// Ver informações de afiliado do cliente
function viewAffiliateInfo(userId) {
    const cliente = allClientes.find(c => c.userId === userId);
    if (!cliente) {
        showToast('Cliente não encontrado!', 'error');
        return;
    }

    // Criar modal com informações de afiliado
    let existingModal = document.getElementById('affiliate-modal');
    if (existingModal) existingModal.remove();

    const modal = document.createElement('div');
    modal.id = 'affiliate-modal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.7);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
    `;

    const hasAffiliateInfo = cliente.email || cliente.phone || cliente.referralCode;

    modal.innerHTML = `
        <div style="background: var(--bg-card, #1e293b); border-radius: 16px; padding: 24px; max-width: 500px; width: 90%; border: 1px solid var(--border, #334155); box-shadow: 0 20px 60px rgba(0,0,0,0.5);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h2 style="margin: 0; color: var(--text-primary, #f1f5f9);">👁️ Informações de Afiliado</h2>
                <button onclick="document.getElementById('affiliate-modal').remove()" style="background: none; border: none; color: var(--text-secondary, #94a3b8); font-size: 24px; cursor: pointer;">&times;</button>
            </div>
            
            <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 20px; padding: 15px; background: var(--bg-dark, #0f172a); border-radius: 12px;">
                <img src="${cliente.avatarUrl || `https://cdn.discordapp.com/embed/avatars/${parseInt(cliente.userId) % 5}.png`}" 
                     style="width: 60px; height: 60px; border-radius: 50%;">
                <div>
                    <h3 style="margin: 0; color: var(--text-primary, #f1f5f9);">${cliente.username || 'Cliente'}</h3>
                    <span style="color: var(--text-secondary, #94a3b8); font-size: 12px; font-family: monospace;">${cliente.userId}</span>
                </div>
            </div>
            
            ${hasAffiliateInfo ? `
                <div style="display: flex; flex-direction: column; gap: 12px;">
                    ${cliente.referralCode ? `
                        <div style="padding: 12px; background: linear-gradient(135deg, rgba(155,89,182,0.2), rgba(155,89,182,0.05)); border-radius: 10px; border-left: 4px solid #9b59b6;">
                            <span style="color: var(--text-secondary, #94a3b8); font-size: 12px;">🎫 Cupom de Afiliado</span>
                            <p style="margin: 5px 0 0; color: var(--text-primary, #f1f5f9); font-size: 18px; font-weight: bold;">${cliente.referralCode}</p>
                        </div>
                    ` : ''}
                    
                    ${cliente.email ? `
                        <div style="padding: 12px; background: var(--bg-dark, #0f172a); border-radius: 10px;">
                            <span style="color: var(--text-secondary, #94a3b8); font-size: 12px;">📧 E-mail</span>
                            <p style="margin: 5px 0 0; color: var(--text-primary, #f1f5f9);">${cliente.email}</p>
                        </div>
                    ` : ''}
                    
                    ${cliente.phone ? `
                        <div style="padding: 12px; background: var(--bg-dark, #0f172a); border-radius: 10px;">
                            <span style="color: var(--text-secondary, #94a3b8); font-size: 12px;">📱 Telefone</span>
                            <p style="margin: 5px 0 0; color: var(--text-primary, #f1f5f9);">${cliente.phone}</p>
                        </div>
                    ` : ''}
                    
                    ${cliente.referralCashbackPercent !== undefined ? `
                        <div style="padding: 12px; background: var(--bg-dark, #0f172a); border-radius: 10px;">
                            <span style="color: var(--text-secondary, #94a3b8); font-size: 12px;">💰 Cashback do Cupom</span>
                            <p style="margin: 5px 0 0; color: #10b981; font-size: 18px; font-weight: bold;">${cliente.referralCashbackPercent}%</p>
                        </div>
                    ` : ''}
                    
                    ${cliente.referralAutoApply !== undefined ? `
                        <div style="padding: 12px; background: var(--bg-dark, #0f172a); border-radius: 10px;">
                            <span style="color: var(--text-secondary, #94a3b8); font-size: 12px;">🔄 Auto-Aplicar Cupom</span>
                            <p style="margin: 5px 0 0; color: ${cliente.referralAutoApply !== false ? '#10b981' : '#ef4444'}; font-weight: bold;">
                                ${cliente.referralAutoApply !== false ? '✅ Ativo' : '❌ Desativado'}
                            </p>
                        </div>
                    ` : ''}
                    
                    ${cliente.referralLinkedAt ? `
                        <div style="padding: 12px; background: var(--bg-dark, #0f172a); border-radius: 10px;">
                            <span style="color: var(--text-secondary, #94a3b8); font-size: 12px;">📅 Vinculado em</span>
                            <p style="margin: 5px 0 0; color: var(--text-primary, #f1f5f9);">${new Date(cliente.referralLinkedAt).toLocaleString('pt-BR')}</p>
                        </div>
                    ` : ''}
                </div>
            ` : `
                <div style="text-align: center; padding: 30px; color: var(--text-secondary, #94a3b8);">
                    <p style="font-size: 48px; margin: 0;">🚫</p>
                    <p style="margin: 10px 0 0;">Este cliente não possui informações de afiliado.</p>
                    <p style="font-size: 12px; margin: 5px 0 0;">O cliente ainda não fez pré-cadastro para cashback.</p>
                </div>
            `}
            
            <button onclick="document.getElementById('affiliate-modal').remove()" 
                    style="width: 100%; margin-top: 20px; padding: 12px; background: var(--primary, #6366f1); color: white; border: none; border-radius: 10px; font-size: 14px; font-weight: 600; cursor: pointer;">
                Fechar
            </button>
        </div>
    `;

    // Fechar ao clicar fora
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
    });

    document.body.appendChild(modal);
}

// ═══════════════════════════════════════════════════════════════
// 🛠️ UTILIDADES
// ═══════════════════════════════════════════════════════════════

function formatMoney(value) {
    const num = parseFloat(value);
    if (isNaN(num)) return '0,00';
    return num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(isoString) {
    if (!isoString) return 'N/A';
    try {
        // Aceita tanto timestamp numérico quanto string ISO
        const date = typeof isoString === 'number' ? new Date(isoString) : new Date(isoString);
        if (isNaN(date.getTime())) return 'N/A';
        return date.toLocaleString('pt-BR');
    } catch (error) {
        return 'N/A';
    }
}

function isDefaultDashboardView() {
    return (document.getElementById('filter-period')?.value || 'all') === 'all' &&
        !(document.getElementById('filter-status')?.value) &&
        !(document.getElementById('filter-payment')?.value) &&
        !(document.getElementById('search-vendas')?.value || '').trim();
}

function updateStatistics(sales) {
    // Exclui canceladas de todos os totais (elas continuam visíveis na tabela).
    const activeSales = sales.filter(isSaleActive);
    const useGlobalSummary = isDefaultDashboardView() && dashboardGlobalSummary?.geral;
    console.log(`📈 Atualizando estatísticas: ${activeSales.length} ativas (${sales.length - activeSales.length} canceladas ignoradas)`);

    // Total de vendas
    const totalVendasEl = document.getElementById('total-vendas');
    const totalVendas = useGlobalSummary
        ? Number(dashboardGlobalSummary.geral.totalVendas || activeSales.length)
        : activeSales.length;
    if (totalVendasEl) totalVendasEl.textContent = totalVendas.toLocaleString('pt-BR');

    // Receita total
    const recentTotalBRL = activeSales.reduce((sum, sale) => {
        const val = parseFloat(sale.totalBRL || 0);
        return sum + (isNaN(val) ? 0 : val);
    }, 0);
    const totalBRL = useGlobalSummary
        ? Number(dashboardGlobalSummary.geral.totalReceita || recentTotalBRL)
        : recentTotalBRL;

    const totalUSD = activeSales.reduce((sum, sale) => {
        const val = parseFloat(sale.totalUSD || 0);
        return sum + (isNaN(val) ? 0 : val);
    }, 0);

    const receitaBRLEl = document.getElementById('receita-brl');
    const receitaUSDEl = document.getElementById('receita-usd');
    if (receitaBRLEl) receitaBRLEl.textContent = `R$ ${totalBRL.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    if (receitaUSDEl) receitaUSDEl.textContent = `$ ${totalUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    // Vendas hoje
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const salesToday = activeSales.filter(sale => {
        if (!sale.createdAt) return false;
        const saleDate = typeof sale.createdAt === 'number' ? new Date(sale.createdAt) : new Date(sale.createdAt);
        return saleDate >= today;
    });
    const vendasHojeEl = document.getElementById('vendas-hoje');
    if (vendasHojeEl) vendasHojeEl.textContent = salesToday.length;

    // Jogo mais vendido
    const gameCount = {};
    const gameNames = {
        'mir4': 'MIR4',
        'nightcrows': 'Nightcrows',
        'tsdsorigin': 'TSDS Origin',
        'odin': 'Odin',
        'wemix': 'Wemix',
        'raven2': 'Raven II',
        'rohan2': 'Rohan II',
        'genshin': 'Genshin Impact',
        'genshinloginesenha': 'GENSHIN LOGIN e SENHA',
        'zzzloginesenha': 'ZZZ LOGIN e SENHA',
        'honkailoginesenha': 'HONKAI LOGIN e SENHA',
        'ymirloginesenha': 'Ymir Login e Senha',
        'summonerswar': 'Summoners War',
        'aion2': 'AION 2',
        'wutheringwaves': 'Wuthering Waves UID',
        'wutheringwavesloginesenha': 'WUTHERING LOGIN e SENHA',
        'honkaistarrail': 'Honkai Star Rail',
        'zzz': 'Zenless Zone Zero',
        'romgoldenage': 'ROM Golden Age',
        'nteloginesenha': 'NTE: Neverness to Everness (login e senha)'
    };

    if (useGlobalSummary && dashboardGlobalSummary.jogos) {
        Object.entries(dashboardGlobalSummary.jogos).forEach(([game, data]) => {
            gameCount[game.toLowerCase()] = Number(data?.vendas || 0);
        });
    } else {
        activeSales.forEach(sale => {
            if (sale.game) {
                const gameKey = sale.game.toLowerCase();
                gameCount[gameKey] = (gameCount[gameKey] || 0) + 1;
            }
        });
    }

    let topGame = '-';
    let maxCount = 0;
    for (const [game, count] of Object.entries(gameCount)) {
        if (count > maxCount) {
            maxCount = count;
            topGame = `${gameNames[game] || game.toUpperCase()} (${count})`;
        }
    }

    const topGameEl = document.getElementById('top-game');
    if (topGameEl) topGameEl.textContent = topGame;

    console.log(`✅ Estatísticas atualizadas: R$ ${totalBRL.toFixed(2)} | $ ${totalUSD.toFixed(2)}`);
}

// ═══════════════════════════════════════════════════════════════
// 📊 ESTATÍSTICAS AVANÇADAS COM GRÁFICOS
// ═══════════════════════════════════════════════════════════════

let statsRevenueChart = null;
let statsGamesChart = null;
let statsPaymentChart = null;
let statsCurrentCurrency = 'brl';
let statsFilteredData = [];

function initAdvancedStats() {
    // Event listeners para filtros
    const periodSelect = document.getElementById('stats-period');
    const statusSelect = document.getElementById('stats-status');
    const searchType = document.getElementById('stats-search-type');
    const searchValue = document.getElementById('stats-search-value');

    if (periodSelect) periodSelect.addEventListener('change', updateAdvancedStats);
    if (statusSelect) statusSelect.addEventListener('change', updateAdvancedStats);
    if (searchType) {
        searchType.addEventListener('change', () => {
            const placeholder = {
                'id': 'Pesquisar por ID',
                'client': 'Pesquisar por cliente',
                'game': 'Pesquisar por jogo'
            };
            searchValue.placeholder = placeholder[searchType.value];
        });
    }
    if (searchValue) searchValue.addEventListener('input', debounce(updateAdvancedStats, 500));

    // Toggle de moeda
    document.querySelectorAll('.currency-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.currency-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            statsCurrentCurrency = btn.dataset.currency;
            renderRevenueChart();
        });
    });

    // Tabs de faturamento/lucro
    document.querySelectorAll('.stats-card-tabs .tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.stats-card-tabs .tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            updateFaturamentoDisplay(tab.dataset.type);
        });
    });

    // Inicializar gráficos
    initCharts();
}

function initCharts() {
    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                labels: { color: '#9ca3af' }
            }
        },
        scales: {
            x: {
                grid: { color: 'rgba(255,255,255,0.05)' },
                ticks: { color: '#9ca3af' }
            },
            y: {
                grid: { color: 'rgba(255,255,255,0.05)' },
                ticks: { color: '#9ca3af' }
            }
        }
    };

    // Gráfico de Receita por Dia
    const revenueCtx = document.getElementById('stats-revenue-chart');
    if (revenueCtx) {
        statsRevenueChart = new Chart(revenueCtx.getContext('2d'), {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Receita',
                    data: [],
                    borderColor: '#ec4899',
                    backgroundColor: 'rgba(236, 72, 153, 0.1)',
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: '#ec4899',
                    pointBorderColor: '#ec4899',
                    pointRadius: 5,
                    pointHoverRadius: 8
                }]
            },
            options: {
                ...chartOptions,
                plugins: {
                    ...chartOptions.plugins,
                    legend: { display: false }
                }
            }
        });
    }

    // Gráfico de Vendas por Jogo
    const gamesCtx = document.getElementById('stats-games-chart');
    if (gamesCtx) {
        statsGamesChart = new Chart(gamesCtx.getContext('2d'), {
            type: 'doughnut',
            data: {
                labels: [],
                datasets: [{
                    data: [],
                    backgroundColor: [
                        '#ec4899', '#8b5cf6', '#3b82f6', '#10b981',
                        '#f59e0b', '#ef4444', '#06b6d4', '#84cc16'
                    ],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right',
                        labels: { color: '#9ca3af', padding: 15 }
                    }
                }
            }
        });
    }

    // Gráfico de Métodos de Pagamento
    const paymentCtx = document.getElementById('stats-payment-chart');
    if (paymentCtx) {
        statsPaymentChart = new Chart(paymentCtx.getContext('2d'), {
            type: 'bar',
            data: {
                labels: [],
                datasets: [{
                    label: 'Vendas',
                    data: [],
                    backgroundColor: '#8b5cf6',
                    borderRadius: 6
                }]
            },
            options: chartOptions
        });
    }
}

function updateAdvancedStats() {
    const period = document.getElementById('stats-period')?.value || '30';
    const status = document.getElementById('stats-status')?.value || 'all';
    const searchType = document.getElementById('stats-search-type')?.value || 'id';
    const searchValue = document.getElementById('stats-search-value')?.value?.toLowerCase() || '';

    // Filtrar dados
    let filtered = [...allSales];

    // Filtro de período
    if (period !== 'all') {
        const days = parseInt(period);
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - days);
        filtered = filtered.filter(sale => {
            const saleDate = sale.createdAt ? new Date(sale.createdAt) : null;
            return saleDate && saleDate >= cutoff;
        });
    }

    // Filtro de status
    if (status !== 'all') {
        filtered = filtered.filter(sale => {
            const saleStatus = (sale.status || '').toLowerCase();
            if (status === 'completed') return saleStatus === 'finalizado' || saleStatus === 'completed';
            if (status === 'pending') return saleStatus === 'pendente' || saleStatus === 'pending' || !saleStatus;
            if (status === 'cancelled') return INACTIVE_SALE_STATUSES.has(saleStatus);
            return true;
        });
    } else {
        // Default 'all' = tudo menos canceladas (que nunca devem inflar faturamento).
        filtered = filtered.filter(isSaleActive);
    }

    // Filtro de busca
    if (searchValue) {
        filtered = filtered.filter(sale => {
            if (searchType === 'id') return (sale.id || '').toLowerCase().includes(searchValue);
            if (searchType === 'client') return (sale.userName || sale.userId || '').toLowerCase().includes(searchValue);
            if (searchType === 'game') return (sale.game || '').toLowerCase().includes(searchValue);
            return true;
        });
    }

    statsFilteredData = filtered;

    // Calcular estatísticas
    const totalBRL = filtered.reduce((sum, s) => sum + (s.totalBRL || 0), 0);
    const totalUSD = filtered.reduce((sum, s) => sum + (s.totalUSD || 0), 0);
    const pedidos = filtered.length;
    const ticketBRL = pedidos > 0 ? totalBRL / pedidos : 0;
    const ticketUSD = pedidos > 0 ? totalUSD / pedidos : 0;

    // Atualizar elementos
    const faturamentoEl = document.getElementById('stats-faturamento');
    const vendasBRLEl = document.getElementById('stats-vendas-brl');
    const vendasUSDEl = document.getElementById('stats-vendas-usd');
    const ticketBRLEl = document.getElementById('stats-ticket-brl');
    const ticketUSDEl = document.getElementById('stats-ticket-usd');
    const pedidosEl = document.getElementById('stats-pedidos');

    if (faturamentoEl) faturamentoEl.textContent = `R$ ${totalBRL.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
    if (vendasBRLEl) vendasBRLEl.textContent = `R$ ${totalBRL.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
    if (vendasUSDEl) vendasUSDEl.textContent = `US$ ${totalUSD.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
    if (ticketBRLEl) ticketBRLEl.textContent = `R$ ${ticketBRL.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
    if (ticketUSDEl) ticketUSDEl.textContent = `US$ ${ticketUSD.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
    if (pedidosEl) pedidosEl.textContent = pedidos.toLocaleString('pt-BR');

    // Armazenar para toggle de faturamento/lucro
    window.statsTotalBRL = totalBRL;
    window.statsTotalUSD = totalUSD;

    // Renderizar gráficos
    renderRevenueChart();
    renderGamesChart();
    renderPaymentChart();
}

function updateFaturamentoDisplay(type) {
    const el = document.getElementById('stats-faturamento');
    const labelEl = el?.nextElementSibling;

    if (type === 'lucro') {
        // Estimar lucro como 30% do faturamento (ajuste conforme necessário)
        const lucro = (window.statsTotalBRL || 0) * 0.30;
        if (el) el.textContent = `R$ ${lucro.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
        if (labelEl) labelEl.textContent = 'Lucro líquido estimado (30%)';
    } else {
        if (el) el.textContent = `R$ ${(window.statsTotalBRL || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
        if (labelEl) labelEl.textContent = 'Valor total no período';
    }
}

function renderRevenueChart() {
    if (!statsRevenueChart) return;

    // Agrupar vendas por dia
    const dailyData = {};
    statsFilteredData.forEach(sale => {
        if (!sale.createdAt) return;
        const date = new Date(sale.createdAt);
        const key = date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
        if (!dailyData[key]) dailyData[key] = { brl: 0, usd: 0, date: date };
        dailyData[key].brl += sale.totalBRL || 0;
        dailyData[key].usd += sale.totalUSD || 0;
    });

    // Ordenar por data
    const sorted = Object.entries(dailyData)
        .sort((a, b) => a[1].date - b[1].date);

    const labels = sorted.map(([key]) => key);
    const data = sorted.map(([, val]) => statsCurrentCurrency === 'brl' ? val.brl : val.usd);

    statsRevenueChart.data.labels = labels;
    statsRevenueChart.data.datasets[0].data = data;
    statsRevenueChart.data.datasets[0].label = statsCurrentCurrency === 'brl' ? 'Receita (R$)' : 'Receita (US$)';
    statsRevenueChart.update();

    // Atualizar título
    const titleEl = document.querySelector('.chart-header h3');
    if (titleEl) titleEl.textContent = `Receita por Dia (${statsCurrentCurrency.toUpperCase()})`;
}

function renderGamesChart() {
    if (!statsGamesChart) return;

    const gameCount = {};
    const gameNames = {
        'mir4': 'MIR4',
        'nightcrows': 'Nightcrows',
        'tsdsorigin': 'TSDS Origin',
        'odin': 'Odin',
        'wemix': 'Wemix',
        'raven2': 'Raven II',
        'rohan2': 'Rohan II',
        'genshin': 'Genshin Impact',
        'genshinloginesenha': 'GENSHIN LOGIN e SENHA',
        'zzzloginesenha': 'ZZZ LOGIN e SENHA',
        'honkailoginesenha': 'HONKAI LOGIN e SENHA',
        'ymirloginesenha': 'Ymir Login e Senha',
        'summonerswar': 'Summoners War',
        'aion2': 'AION 2',
        'wutheringwaves': 'Wuthering Waves UID',
        'wutheringwavesloginesenha': 'WUTHERING LOGIN e SENHA',
        'honkaistarrail': 'Honkai Star Rail',
        'zzz': 'Zenless Zone Zero',
        'romgoldenage': 'ROM Golden Age',
        'nteloginesenha': 'NTE: Neverness to Everness (login e senha)'
    };

    statsFilteredData.forEach(sale => {
        const game = sale.game || 'Outros';
        gameCount[game] = (gameCount[game] || 0) + 1;
    });

    const sorted = Object.entries(gameCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8);

    statsGamesChart.data.labels = sorted.map(([game]) => gameNames[game] || game);
    statsGamesChart.data.datasets[0].data = sorted.map(([, count]) => count);
    statsGamesChart.update();
}

function renderPaymentChart() {
    if (!statsPaymentChart) return;

    const paymentCount = {};
    statsFilteredData.forEach(sale => {
        const method = sale.paymentMethod || 'Não informado';
        paymentCount[method] = (paymentCount[method] || 0) + 1;
    });

    const sorted = Object.entries(paymentCount)
        .sort((a, b) => b[1] - a[1]);

    statsPaymentChart.data.labels = sorted.map(([method]) => method);
    statsPaymentChart.data.datasets[0].data = sorted.map(([, count]) => count);
    statsPaymentChart.update();
}

function clearStatsFilters() {
    document.getElementById('stats-period').value = '30';
    document.getElementById('stats-status').value = 'all';
    document.getElementById('stats-search-type').value = 'id';
    document.getElementById('stats-search-value').value = '';
    updateAdvancedStats();
}

function jumpToStatsPage() {
    const input = document.getElementById('stats-page-jump');
    const page = parseInt(input?.value);
    if (page && page > 0) {
        showToast(`Funcionalidade de paginação em desenvolvimento`, 'info');
    }
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Inicializar quando a tab de estatísticas for aberta
onDashboardDomReady(() => {
    // Aguardar dados carregarem e inicializar stats
    setTimeout(() => {
        initAdvancedStats();
        updateAdvancedStats();
    }, 2000);
});

// Atualizar stats quando mudar de tab
const originalTabClick = document.querySelectorAll('.nav-item');
originalTabClick.forEach(item => {
    item.addEventListener('click', () => {
        if (item.dataset.tab === 'estatisticas') {
            setTimeout(updateAdvancedStats, 100);
        }
    });
});

// Expor funções globais
window.clearStatsFilters = clearStatsFilters;
window.jumpToStatsPage = jumpToStatsPage;
window.updateAdvancedStats = updateAdvancedStats;

// Expor funções globais
window.editSale = editSale;
window.deleteSale = deleteSale;
window.toggleCoupon = toggleCoupon;
window.editCoupon = editCoupon;
window.deleteCoupon = deleteCoupon;
window.saveCoupon = saveCoupon;
window.closeCouponModal = closeCouponModal;
window.closeCupomModal = closeCouponModal;  // Alias para HTML
window.saveCupom = saveCoupon;  // Alias para HTML

// ═══════════════════════════════════════════════════════════════
// 🎮 MODAL DE EDIÇÃO DE JOGO
// ═══════════════════════════════════════════════════════════════

async function openGameModal(gameId, gameName, gameEmoji) {
    // Carregar dados atuais do jogo do Firebase
    try {
        const snapshot = await window.db.ref(`config/games/${gameId}`).once('value');
        const gameData = snapshot.val() || {};

        document.getElementById('game-id').value = gameId;
        document.getElementById('game-name').value = gameName;
        document.getElementById('game-emoji').value = gameData.emoji || gameEmoji;
        document.getElementById('game-image').value = gameData.image || '';

        document.getElementById('modal-edit-game').classList.add('active');
    } catch (error) {
        console.error('❌ Erro ao carregar dados do jogo:', error);
        showToast('Erro ao carregar dados do jogo', 'error');
    }
}

function closeGameModal() {
    document.getElementById('modal-edit-game').classList.remove('active');
}

async function saveGameInfo() {
    const gameId = document.getElementById('game-id').value;
    const emoji = document.getElementById('game-emoji').value.trim();
    const image = normalizeImageUrl(document.getElementById('game-image').value);

    if (!gameId) {
        showToast('ID do jogo não encontrado!', 'error');
        return;
    }

    try {
        await window.db.ref(`config/games/${gameId}`).update({
            emoji: emoji || '',
            image: image || '',
            updatedAt: new Date().toISOString()
        });

        // Notificar o bot para atualizar embeds
        await window.db.ref('priceUpdateTrigger').set({
            timestamp: Date.now(),
            updatedBy: 'dashboard',
            action: 'game-info-updated',
            gameId: gameId
        });

        showToast('Informações do jogo atualizadas! O bot já está usando os novos valores.', 'success');
        closeGameModal();
        loadPricesData();
    } catch (error) {
        console.error('❌ Erro ao salvar informações do jogo:', error);
        showToast('Erro ao salvar: ' + error.message, 'error');
    }
}

async function deleteGame() {
    const gameId = document.getElementById('game-id').value;
    const gameName = document.getElementById('game-name').value;

    if (!confirm(`⚠️ Tem certeza que deseja deletar todas as configurações de "${gameName}"?\n\nIsso removerá:\n- Emoji personalizado\n- Imagem personalizada\n- Preços configurados\n- Entrada no gameRegistry (bot)\n\nEsta ação não pode ser desfeita!`)) {
        return;
    }

    try {
        // Deletar de todos os nós em paralelo
        await Promise.all([
            window.db.ref(`config/games/${gameId}`).remove(),
            window.db.ref(`gamePrices/${gameId}`).remove(),
            window.db.ref(`gameRegistry/${gameId}`).remove()
        ]);

        // Limpar dados locais
        delete registryGames[gameId];
        delete allPrices[gameId];

        // Notificar o bot
        await window.db.ref('priceUpdateTrigger').set({
            timestamp: Date.now(),
            updatedBy: 'dashboard',
            action: 'game-deleted',
            gameId: gameId
        });

        showToast('Jogo deletado com sucesso!', 'success');
        closeGameModal();
        loadPricesData();
    } catch (error) {
        console.error('❌ Erro ao deletar jogo:', error);
        showToast('Erro ao deletar: ' + error.message, 'error');
    }
}

window.openGameModal = openGameModal;
window.closeGameModal = closeGameModal;
window.saveGameInfo = saveGameInfo;
window.deleteGame = deleteGame;

// ═══════════════════════════════════════════════════════════════
// 🆕 CRIAR NOVO JOGO (gameRegistry-driven)
// ═══════════════════════════════════════════════════════════════

let registryGames = {};

// Auto-formata URLs de imagem para o formato direto do host.
// Ex: https://imgur.com/a/4ZzPku5  → https://i.imgur.com/4ZzPku5.png
//     https://imgur.com/4ZzPku5    → https://i.imgur.com/4ZzPku5.png
//     https://i.imgur.com/4ZzPku5  → https://i.imgur.com/4ZzPku5.png (adiciona .png)
function normalizeImageUrl(url) {
    if (!url) return '';
    url = url.trim();

    // Imgur: converter qualquer variação para i.imgur.com/{id}.png
    const imgurMatch = url.match(/(?:https?:\/\/)?(?:i\.)?imgur\.com\/(?:a\/|gallery\/)?([a-zA-Z0-9]+)(?:\.[a-z]+)?(?:\?.*)?$/);
    if (imgurMatch) {
        const id = imgurMatch[1];
        return `https://i.imgur.com/${id}.png`;
    }

    // Rejeita paths relativos (ex: /gifs/dungeoncross-cover.png). Esses
    // arquivos vivem na public/ do daoshi-loja, mas o painel admin e o bot
    // (Discord setThumbnail) precisam de URL absoluta. Em vez de salvar lixo
    // que vai quebrar tudo depois, retornamos vazio e o admin vê o
    // placeholder cinza no card — fica óbvio que precisa cadastrar URL.
    if (!/^(https?:|data:)/.test(url)) {
        console.warn('[normalizeImageUrl] Path relativo rejeitado:', url);
        return '';
    }

    return url;
}

async function loadRegistryGames() {
    try {
        const snapshot = await window.db.ref('gameRegistry').once('value');
        registryGames = snapshot.val() || {};
    } catch (e) {
        console.warn('⚠️ Não foi possível carregar gameRegistry:', e.message);
        registryGames = {};
    }
}

// ═══════════════════════════════════════════════════════════════
// 🪄 WIZARD: CRIAR NOVO JOGO (5 passos)
// ═══════════════════════════════════════════════════════════════

let _editingGameId = null;
let _wizardStep = 1;
let _wizardEngine = 'simple_packs';

function openCreateGameWizard() {
    _wizardStep = 1;
    _wizardEngine = 'simple_packs';

    document.getElementById('wizard-id').value = '';
    document.getElementById('wizard-name').value = '';
    document.getElementById('wizard-emoji').value = '';
    document.getElementById('wizard-image').value = '';
    const wChan = document.getElementById('wizard-channel-emoji'); if (wChan) wChan.value = '';
    const wDesc = document.getElementById('wizard-description'); if (wDesc) wDesc.value = '';
    document.getElementById('wizard-cashback-limit').value = '1.0';
    const enginePack = document.querySelector('input[name="wizard-engine"][value="simple_packs"]');
    if (enginePack) enginePack.checked = true;
    document.querySelectorAll('input[name="wizard-supplier"]').forEach(cb => { cb.checked = false; });
    document.getElementById('wizard-requires-screenshot').checked = false;
    document.getElementById('wizard-requires-2fa').checked = false;
    updateWizardImagePreview('');
    renderWizardCredentials([]);
    renderWizardPacksArea('simple_packs');

    showWizardStep(1);
    document.getElementById('modal-game-wizard').classList.add('active');
    document.getElementById('modal-game-wizard').style.display = 'flex';
    playSound('click');
}

function closeGameWizard() {
    const modal = document.getElementById('modal-game-wizard');
    if (modal) {
        modal.classList.remove('active');
        modal.style.display = 'none';
    }
}

function updateWizardImagePreview(url) {
    const preview = document.getElementById('wizard-image-preview');
    if (preview) preview.src = normalizeImageUrl(url) || '';
}

function showWizardStep(step) {
    _wizardStep = step;
    // Tabs visuais
    document.querySelectorAll('.wizard-step').forEach(el => {
        const s = parseInt(el.dataset.wizardStep, 10);
        el.classList.toggle('active', s === step);
        el.classList.toggle('completed', s < step);
    });
    document.querySelectorAll('.wizard-step-content').forEach(el => {
        el.classList.toggle('active', parseInt(el.dataset.wizardContent, 10) === step);
    });

    // Botões de navegação (Step 6 = Revisar é o último)
    const WIZARD_LAST_STEP = 6;
    document.getElementById('wizard-prev').style.display = step > 1 ? '' : 'none';
    document.getElementById('wizard-next').style.display = step < WIZARD_LAST_STEP ? '' : 'none';
    document.getElementById('wizard-finish').style.display = step === WIZARD_LAST_STEP ? '' : 'none';

    // Side effects por step
    if (step === 5) {
        // Garantir que packs area está renderizado pra engine atual
        renderWizardPacksArea(_wizardEngine);
    } else if (step === 6) {
        // Renderiza o preview de como o jogo vai aparecer no Discord
        renderWizardPreview();
    }
}

function wizardNextStep() {
    if (!validateWizardStep(_wizardStep)) return;

    if (_wizardStep === 2) {
        // Captura engine selecionada
        const engineEl = document.querySelector('input[name="wizard-engine"]:checked');
        _wizardEngine = engineEl?.value || 'simple_packs';
    }

    showWizardStep(Math.min(_wizardStep + 1, 6));
}

function wizardPrevStep() {
    showWizardStep(Math.max(_wizardStep - 1, 1));
}

function validateWizardStep(step) {
    if (step === 1) {
        const id = document.getElementById('wizard-id').value.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
        const name = document.getElementById('wizard-name').value.trim();
        if (!id || id.length < 2) { showToast('ID precisa ter pelo menos 2 caracteres (a-z 0-9).', 'error'); return false; }
        if (!name) { showToast('Nome do jogo é obrigatório.', 'error'); return false; }
        if (registryGames[id] || allPrices[id]) { showToast(`Jogo "${id}" já existe!`, 'error'); return false; }
    } else if (step === 3) {
        const checked = document.querySelectorAll('#wizard-credentials-list input[type="checkbox"]:checked');
        if (checked.length === 0) { showToast('Marque pelo menos 1 campo de credencial.', 'error'); return false; }
        // Modal do Discord aceita no MÁXIMO 5 campos. Se passar disso, o bot
        // corta os extras e o fornecedor recebe dados incompletos. Reserva 1
        // vaga se o 2FA (Step 4) for marcado depois.
        const wants2fa = !!(document.getElementById('wizard-requires-2fa') || {}).checked;
        const has2faCred = !!document.querySelector('#wizard-credentials-list input[data-cred-key="twofa"]:checked');
        const max = (wants2fa && !has2faCred) ? 4 : 5;
        if (checked.length > max) {
            showToast(`Discord aceita no máximo 5 campos de login no modal${max === 4 ? ' (e o 2FA ocupa 1 vaga)' : ''}. Você marcou ${checked.length} — desmarque ${checked.length - max}.`, 'error');
            return false;
        }
    }
    return true;
}

function renderWizardCredentials(initialKeys) {
    const list = document.getElementById('wizard-credentials-list');
    if (!list) return;
    const initial = new Set(initialKeys || []);
    list.innerHTML = CREDENTIAL_FIELDS_CATALOG.map(f => {
        const checked = initial.has(f.key);
        return `
            <label class="credential-option ${checked ? 'checked' : ''}">
                <input type="checkbox" data-cred-key="${f.key}" data-cred-label="${f.label}" data-cred-required="${f.required}" data-cred-type="${f.type || 'text'}" ${checked ? 'checked' : ''} onchange="this.parentElement.classList.toggle('checked', this.checked);">
                <div>
                    <strong>${f.label}</strong>
                    <small>${f.description}</small>
                </div>
            </label>
        `;
    }).join('');
}

function renderWizardPacksArea(engine) {
    const area = document.getElementById('wizard-packs-area');
    const help = document.getElementById('wizard-packs-help');
    if (!area) return;

    if (engine === 'simple_packs') {
        if (help) help.textContent = 'Adicione cada pacote com o Label (nome visível ao cliente) e o Preço em USD (convertido em R$ via Binance). O "ID interno" é opcional — deixe vazio que o sistema gera.';
        area.innerHTML = `
            <div class="pack-row-headers">
                <span>ID (opcional)</span><span>Label *</span><span>Preço USD *</span><span>Cashback %</span><span>Limite %</span><span></span>
            </div>
            <div id="wizard-pack-rows"></div>
            <button type="button" class="btn-add-pack" onclick="addWizardPackRow()">+ Adicionar pacote</button>
        `;
        // 1 row inicial vazia pra orientar o usuário
        addWizardPackRow();
    } else if (engine === 'mir4_gold_brackets') {
        if (help) help.textContent = 'Configure USD/1k (fixo) e BRL/1k por faixa de quantidade.';
        area.innerHTML = `
            <div class="brackets-panel">
                <h4>💰 Faixas de Gold</h4>
                <div class="brackets-grid">
                    <div class="form-group"><label>USD por 1k (fixo)</label><input type="number" step="0.01" id="wizard-gold-usd" value="3.50"></div>
                    <div class="form-group"><label>BRL/1k 0–4999</label><input type="number" step="0.01" id="wizard-goldBase" value="20.00"></div>
                    <div class="form-group"><label>BRL/1k 5k–9999</label><input type="number" step="0.01" id="wizard-gold5k" value="20.00"></div>
                    <div class="form-group"><label>BRL/1k 10k–19999</label><input type="number" step="0.01" id="wizard-gold10k" value="20.00"></div>
                    <div class="form-group"><label>BRL/1k 20k+</label><input type="number" step="0.01" id="wizard-gold20k" value="18.40"></div>
                </div>
            </div>
        `;
    } else if (engine === 'wemix_margin') {
        if (help) help.textContent = 'Configure margem percentual sobre a cotação WEMIX/BRL para cada faixa.';
        area.innerHTML = `
            <div class="brackets-panel">
                <h4>💱 Margens WEMIX</h4>
                <div class="brackets-grid">
                    <div class="form-group"><label>1–9 WEMIX (%)</label><input type="number" step="0.1" id="wizard-margem-1-9" value="55"></div>
                    <div class="form-group"><label>10–99 WEMIX (%)</label><input type="number" step="0.1" id="wizard-margem-10-99" value="15"></div>
                    <div class="form-group"><label>100+ WEMIX (%)</label><input type="number" step="0.1" id="wizard-margem-100" value="6.5"></div>
                </div>
            </div>
        `;
    }
}

function addWizardPackRow() {
    const container = document.getElementById('wizard-pack-rows');
    if (!container) return;
    const row = document.createElement('div');
    row.className = 'pack-row';
    row.innerHTML = `
        <input type="text" class="pack-id" placeholder="auto (opcional)">
        <input type="text" class="pack-label" placeholder="Pacote $50">
        <input type="number" class="pack-price" step="0.01" placeholder="0.00">
        <input type="number" class="pack-cashback" step="0.1" placeholder="0">
        <input type="number" class="pack-limit" step="0.1" placeholder="0.5">
        <button type="button" class="btn-remove" onclick="this.closest('.pack-row').remove()" title="Remover">✕</button>
    `;
    container.appendChild(row);
    // Foca o LABEL (o que importa), não o "ID interno" — id é opcional/auto.
    const lbl = row.querySelector('.pack-label');
    if (lbl) lbl.focus();
}

// Parser numérico tolerante: aceita vírgula como separador decimal (brasileiro
// digita "2,85") e devolve número ou NaN. Usado em todos os campos numéricos do
// wizard pra um valor não virar errado/default em silêncio.
function wizardParseNum(v) {
  if (v == null) return NaN;
  return parseFloat(String(v).trim().replace(',', '.'));
}

// Renderiza um emoji pra exibição no painel: custom (<:nome:id> ou :nome:)
// vira <img> da CDN do Discord; unicode aparece como texto. Faz o admin VER
// o emoji custom real antes de salvar (o painel não é o Discord, mas a CDN
// serve o emoji por id publicamente).
function previewEmojiHtml(raw) {
    const s = String(raw || '').trim();
    if (!s) return '🎮';
    const full = s.match(/^<a?:([\w-]+):(\d+)>$/);
    if (full) {
        const ext = s.startsWith('<a:') ? 'gif' : 'png';
        return `<img src="https://cdn.discordapp.com/emojis/${full[2]}.${ext}" alt=":${full[1]}:" title=":${full[1]}:" style="width:20px;height:20px;vertical-align:middle;border-radius:3px;" onerror="this.replaceWith(document.createTextNode('🎮'))">`;
    }
    // :nome: curto (custom sem id) — não dá pra resolver no painel, mostra texto
    if (/^:[\w-]+:$/.test(s)) return `<code>${escapeHtmlSafe(s)}</code>`;
    return escapeHtmlSafe(s); // unicode
}

function escapeHtmlSafe(str) {
    return String(str == null ? '' : str).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// Monta o preview do Step 6 a partir dos campos em memória do wizard. Pura
// apresentação — não salva nada. Mostra como o jogo vai aparecer no Discord:
// linha do menu de jogos, lista de pacotes (label + USD), campos de login,
// fornecedor e flags. Pega erros (emoji errado, label/preço, campos) ANTES
// de criar.
function renderWizardPreview() {
    const area = document.getElementById('wizard-preview-area');
    if (!area) return;

    const name = (document.getElementById('wizard-name').value || '').trim() || '(sem nome)';
    const emoji = (document.getElementById('wizard-emoji').value || '').trim() || '🎮';
    const desc = (document.getElementById('wizard-description')?.value || '').trim();
    const channelEmojiRaw = (document.getElementById('wizard-channel-emoji')?.value || '').trim();
    const isCustom = /[<:]/.test(emoji);
    const channelEmoji = channelEmojiRaw || (isCustom ? '🎮' : emoji);
    const cashback = parseFloat(document.getElementById('wizard-cashback-limit').value) || 0;

    const supNames = { dog: '🐕 Dog', daodao: '🐉 DaoDao', sombra: '🌑 Sombra' };
    const supChecked = Array.from(document.querySelectorAll('input[name="wizard-supplier"]:checked')).map(el => el.value);
    const supplierLabel = supChecked.length
        ? supChecked.map(s => supNames[s] || s).join(' + ') + (supChecked.length > 1 ? ' (split / alterna)' : '')
        : '🎫 Manual / interno';
    const reqScr = document.getElementById('wizard-requires-screenshot').checked;
    const req2fa = document.getElementById('wizard-requires-2fa').checked;

    // Credenciais marcadas
    const credChecks = Array.from(document.querySelectorAll('#wizard-credentials-list input[type="checkbox"]:checked'));
    let credKeys = credChecks.map(c => c.dataset.credLabel || c.dataset.credKey);
    if (req2fa && !credChecks.some(c => c.dataset.credKey === 'twofa')) credKeys.push('Código 2FA');

    // Pacotes (só simple_packs tem lista; gold/wemix mostram resumo)
    let packsHtml = '';
    if (_wizardEngine === 'simple_packs') {
        const rows = Array.from(document.querySelectorAll('#wizard-pack-rows .pack-row'));
        const items = rows.map(r => ({
            label: (r.querySelector('.pack-label').value || '').trim(),
            price: parseFloat(r.querySelector('.pack-price').value) || 0
        })).filter(it => it.label);
        if (items.length === 0) {
            packsHtml = `<div style="opacity:.6;padding:8px;">⚠️ Nenhum pacote com label preenchido ainda (Step 5).</div>`;
        } else {
            packsHtml = items.map(it =>
                `<div style="display:flex;justify-content:space-between;gap:10px;padding:6px 10px;border-bottom:1px solid rgba(255,255,255,.06);">
                    <span>${previewEmojiHtml(emoji)} ${escapeHtmlSafe(it.label)}</span>
                    <span style="font-family:monospace;color:#43d17a;">$${it.price.toFixed(2)}</span>
                </div>`
            ).join('');
        }
    } else if (_wizardEngine === 'mir4_gold_brackets') {
        const usd = document.getElementById('wizard-gold-usd')?.value || '?';
        packsHtml = `<div style="padding:8px 10px;">💰 Gold por faixa — USD/1k fixo: <b>$${usd}</b> · BRL/1k variável por faixa.</div>`;
    } else if (_wizardEngine === 'wemix_margin') {
        const m1 = document.getElementById('wizard-margem-1-9')?.value || '?';
        const m2 = document.getElementById('wizard-margem-10-99')?.value || '?';
        const m3 = document.getElementById('wizard-margem-100')?.value || '?';
        packsHtml = `<div style="padding:8px 10px;">💱 Margem sobre cotação WEMIX — 1-9: <b>+${m1}%</b> · 10-99: <b>+${m2}%</b> · 100+: <b>+${m3}%</b></div>`;
    }

    const card = (title, body) => `
        <div style="background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.08);border-radius:8px;padding:12px;margin-bottom:12px;">
            <div style="font-size:12px;text-transform:uppercase;letter-spacing:.5px;opacity:.6;margin-bottom:8px;">${title}</div>
            ${body}
        </div>`;

    area.innerHTML =
        card('Menu de jogos (/precos e ticket)',
            `<div style="font-size:16px;">${previewEmojiHtml(emoji)} <b>${escapeHtmlSafe(name)}</b></div>` +
            (desc ? `<div style="opacity:.7;font-size:13px;margin-top:2px;">${escapeHtmlSafe(desc)}</div>` : `<div style="opacity:.4;font-size:13px;margin-top:2px;">(sem descrição)</div>`) +
            `<div style="opacity:.7;font-size:12px;margin-top:6px;">Nome do canal do ticket: ${escapeHtmlSafe(channelEmoji)} ${escapeHtmlSafe(name)} - cliente</div>`)
        +
        card('Pacotes / preços (botões de compra)',
            `<div>${packsHtml}</div>` +
            `<div style="opacity:.55;font-size:12px;margin-top:8px;">R$ é calculado na hora pela cotação Binance (USD × cotação). Cashback até <b>${cashback}%</b>.</div>`)
        +
        card('Login pedido no Discord',
            credKeys.length
                ? `<div>${credKeys.map(k => `<span style="display:inline-block;background:rgba(67,209,122,.12);border:1px solid rgba(67,209,122,.3);border-radius:14px;padding:3px 10px;margin:3px;font-size:13px;">${escapeHtmlSafe(k)}</span>`).join('')}</div>`
                : `<div style="color:#e06;">⚠️ Nenhum campo de login marcado (Step 3).</div>`)
        +
        card('Entrega',
            `<div>Fornecedor: <b>${escapeHtmlSafe(supplierLabel)}</b></div>` +
            `<div style="margin-top:4px;">📸 Pede screenshot: <b>${reqScr ? 'Sim' : 'Não'}</b> &nbsp;·&nbsp; 🔐 Pede 2FA: <b>${req2fa ? 'Sim' : 'Não'}</b></div>`);
}

async function wizardFinish() {
    // Captura todos os steps
    const id = document.getElementById('wizard-id').value.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    const name = document.getElementById('wizard-name').value.trim();
    const emoji = document.getElementById('wizard-emoji').value.trim() || '🎮';
    const image = normalizeImageUrl(document.getElementById('wizard-image').value);
    const description = (document.getElementById('wizard-description')?.value || '').trim();
    const channelEmojiInput = (document.getElementById('wizard-channel-emoji')?.value || '').trim();
    const cashbackLimit = wizardParseNum(document.getElementById('wizard-cashback-limit').value) || 1.0;

    if (!id || !name) { showToast('Preencha ID e Nome no Step 1.', 'error'); return showWizardStep(1); }
    if (registryGames[id]) { showToast(`Jogo "${id}" já existe!`, 'error'); return; }

    const credChecks = document.querySelectorAll('#wizard-credentials-list input[type="checkbox"]:checked');
    const credentialsSchema = Array.from(credChecks).map(c => ({
        key: c.dataset.credKey,
        label: c.dataset.credLabel,
        type: c.dataset.credType || 'text',
        required: c.dataset.credRequired === 'true'
    }));

    // Fornecedores marcados (1+). 2+ = split (bot alterna). Nenhum = manual.
    const suppliers = Array.from(document.querySelectorAll('input[name="wizard-supplier"]:checked')).map(el => el.value).filter(Boolean);
    const supplier = suppliers[0] || null;
    const requiresScreenshot = document.getElementById('wizard-requires-screenshot').checked;
    const requires2FA = document.getElementById('wizard-requires-2fa').checked;

    // Se marcou "pede 2FA" mas não incluiu o campo twofa nas credenciais,
    // adiciona automaticamente — assim o modal do Discord (montado a partir do
    // credentialsSchema) realmente pede o código. Antes era descartado em
    // silêncio quando já tinha 5 campos; agora bloqueia com aviso claro
    // (Discord aceita no máximo 5 campos no modal).
    if (requires2FA && !credentialsSchema.some(c => c.key === 'twofa')) {
        if (credentialsSchema.length >= 5) {
            showToast('Você marcou "pede 2FA", mas já tem 5 campos de login (máximo do Discord). Desmarque um campo de login ou o 2FA.', 'error');
            return showWizardStep(3);
        }
        credentialsSchema.push({ key: 'twofa', label: 'Código 2FA', type: 'text', required: false });
    }

    // Trava final: nunca deixa passar mais de 5 campos (o modal do Discord corta
    // o excedente e o fornecedor receberia dados incompletos).
    if (credentialsSchema.length > 5) {
        showToast(`Você marcou ${credentialsSchema.length} campos de login, mas o Discord aceita no máximo 5. Desmarque ${credentialsSchema.length - 5}.`, 'error');
        return showWizardStep(3);
    }

    let accountType = 'uid';
    const credKeys = new Set(credentialsSchema.map(c => c.key));
    if (credKeys.has('login') || credKeys.has('password')) accountType = 'login_password';
    else if (credKeys.has('wallet')) accountType = 'wallet';

    // Build products from engine
    let products;
    const gamePricesFlat = { defaultCashbackLimit: cashbackLimit, couponLimits: {} };

    if (_wizardEngine === 'simple_packs') {
        const items = [];
        const seenIds = new Set();
        const duplicates = [];
        const badPct = []; // cashback/limite fora de 0–100
        const rows = document.querySelectorAll('#wizard-pack-rows .pack-row');
        for (const row of rows) {
            let itemId = row.querySelector('.pack-id').value.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_').replace(/_+/g, '_').replace(/^_+|_+$/g, '');
            const label = row.querySelector('.pack-label').value.trim();
            // wizardParseNum aceita vírgula (brasileiro digita "2,85") e devolve
            // número; campos numéricos não podem virar valor errado em silêncio.
            const price = wizardParseNum(row.querySelector('.pack-price').value) || 0;
            const cb = wizardParseNum(row.querySelector('.pack-cashback').value) || 0;
            const lim = wizardParseNum(row.querySelector('.pack-limit').value) || 0;
            // Linha sem label é linha vazia — ignora. (Antes exigia ID também,
            // e um pacote com label+preço mas SEM id era descartado em silêncio:
            // usuário leigo esquecia o "ID interno" e perdia o pacote.)
            if (!label) continue;
            // Cashback e limite são porcentagens — fora de 0–100 é erro (999%
            // daria cashback maior que a compra; negativo não faz sentido).
            if (cb < 0 || cb > 100 || lim < 0 || lim > 100) badPct.push(label);
            // ID é OPCIONAL: se vazio, gera a partir do valor em dólar no label
            // (ex "Pack 50$" -> pack_50) ou de um contador.
            const idWasTyped = !!itemId;
            if (!itemId) {
                const m = label.match(/(\d+)/);
                itemId = m ? `pack_${m[1]}` : `pack_${items.length + 1}`;
            }
            if (seenIds.has(itemId)) {
                if (idWasTyped) { duplicates.push(itemId); continue; } // erro só se o user digitou
                let base = itemId, n = 2; // auto-gerado colidiu: uniquifica em silêncio
                while (seenIds.has(itemId)) itemId = `${base}_${n++}`;
            }
            seenIds.add(itemId);
            items.push({ id: itemId, label, emoji: '📦', price, priceUSD: price });
            gamePricesFlat[itemId] = price;
            if (cb) gamePricesFlat[`cashback_${itemId}`] = cb;
            if (lim) gamePricesFlat.couponLimits[itemId] = lim;
        }
        if (duplicates.length > 0) {
            showToast(`IDs duplicados: ${duplicates.join(', ')}. Cada pacote precisa de ID único.`, 'error');
            return showWizardStep(5);
        }
        if (items.length === 0) { showToast('Adicione pelo menos 1 pacote no Step 5.', 'error'); return showWizardStep(5); }
        // Trava pacote com preço 0 (quase sempre é o preço esquecido) — senão o
        // cliente compraria de graça. Bloqueia e aponta qual pacote corrigir.
        const semPreco = items.filter(it => !(Number(it.priceUSD) > 0)).map(it => it.label);
        if (semPreco.length > 0) {
            showToast(`Preço 0 em: ${semPreco.join(', ')}. Coloque o preço em USD (> 0) antes de criar.`, 'error');
            return showWizardStep(5);
        }
        if (badPct.length > 0) {
            showToast(`Cashback/limite tem que ser entre 0 e 100%. Corrija: ${badPct.join(', ')}.`, 'error');
            return showWizardStep(5);
        }
        products = [{ id: 'topup', name: 'Pacotes', emoji: '📦', engine: 'simple_packs', items }];
    } else if (_wizardEngine === 'mir4_gold_brackets') {
        const usdPerK = wizardParseNum(document.getElementById('wizard-gold-usd').value) || 3.5;
        const goldBase = wizardParseNum(document.getElementById('wizard-goldBase').value) || 20.0;
        const gold5k = wizardParseNum(document.getElementById('wizard-gold5k').value) || goldBase;
        const gold10k = wizardParseNum(document.getElementById('wizard-gold10k').value) || goldBase;
        const gold20k = wizardParseNum(document.getElementById('wizard-gold20k').value) || goldBase;
        gamePricesFlat.gold_usd = usdPerK;
        gamePricesFlat.goldBase = goldBase;
        gamePricesFlat.gold5k = gold5k;
        gamePricesFlat.gold10k = gold10k;
        gamePricesFlat.gold20k = gold20k;
        products = [{
            id: 'gold',
            name: 'Gold',
            emoji: '💰',
            engine: 'mir4_gold_brackets',
            params: {
                usdPerK,
                brackets: [
                    { min: 0,     brl: goldBase },
                    { min: 1000,  brl: goldBase },
                    { min: 5000,  brl: gold5k },
                    { min: 10000, brl: gold10k },
                    { min: 20000, brl: gold20k }
                ]
            }
        }];
    } else if (_wizardEngine === 'wemix_margin') {
        const m1 = wizardParseNum(document.getElementById('wizard-margem-1-9').value) || 55;
        const m2 = wizardParseNum(document.getElementById('wizard-margem-10-99').value) || 15;
        const m3 = wizardParseNum(document.getElementById('wizard-margem-100').value) || 6.5;
        gamePricesFlat.margem_1_9 = m1;
        gamePricesFlat.margem_10_99 = m2;
        gamePricesFlat.margem_100 = m3;
        products = [{
            id: 'conversion',
            name: 'Conversão WEMIX',
            emoji: '💱',
            engine: 'wemix_margin',
            params: {
                margins: [
                    { min: 1,   max: 9,    marginPct: m1 },
                    { min: 10,  max: 99,   marginPct: m2 },
                    { min: 100, max: null, marginPct: m3 }
                ]
            }
        }];
    }

    // channelEmoji = unicode usado no nome do canal Discord. Custom emoji
    // (':nome:' / '<:nome:id>') NÃO renderiza em nome de canal. Prioridade:
    // (1) o que o admin digitou no campo "Emoji do canal" (se for unicode),
    // (2) o emoji do jogo se ele for unicode puro, (3) fallback 🎮.
    const channelEmojiIsCustom = /[<:]/.test(channelEmojiInput);
    const emojiIsCustom = /[<:]/.test(emoji);
    let channelEmoji = '🎮';
    if (channelEmojiInput && !channelEmojiIsCustom) channelEmoji = channelEmojiInput;
    else if (!emojiIsCustom) channelEmoji = emoji;

    const registryEntry = {
        id,
        name,
        emoji,
        channelEmoji,
        description,
        image: image || '',
        hidden: false,
        accountType,
        supplier,
        suppliers,
        requiresScreenshot,
        requires2FA,
        credentialsSchema,
        products,
        defaultCashbackLimit: cashbackLimit,
        createdAt: Date.now(),
        createdBy: 'painel-admin',
        updatedAt: Date.now(),
        updatedBy: 'painel-admin'
    };

    try {
        await Promise.all([
            window.db.ref(`gameRegistry/${id}`).set(registryEntry),
            window.db.ref(`gamePrices/${id}`).set(gamePricesFlat)
        ]);
        await window.db.ref('priceUpdateTrigger').set({
            timestamp: Date.now(),
            updatedBy: 'dashboard',
            action: 'game-created',
            gameId: id
        });

        showToast(`✅ Jogo "${name}" criado!`, 'success');
        playSound('success');

        registryGames[id] = registryEntry;
        allPrices[id] = gamePricesFlat;

        closeGameWizard();
        renderPrices();
    } catch (err) {
        console.error('❌ Erro ao criar jogo:', err);
        showToast('Erro ao criar jogo: ' + err.message, 'error');
    }
}

// Listener pra atualizar engine area do wizard quando muda
document.addEventListener('change', (e) => {
    if (e.target?.name === 'wizard-engine') {
        _wizardEngine = e.target.value;
    }
});

// Listener pra trocar tabs do editor (delegação no document)
document.addEventListener('click', (e) => {
    const tabBtn = e.target.closest('[data-editor-tab]');
    if (tabBtn) switchEditorTab(tabBtn.dataset.editorTab);
});

// Expor funções globais
window.openCreateGameWizard = openCreateGameWizard;
window.closeGameWizard = closeGameWizard;
window.wizardNextStep = wizardNextStep;
window.wizardPrevStep = wizardPrevStep;
window.wizardFinish = wizardFinish;
window.addWizardPackRow = addWizardPackRow;
window.updateWizardImagePreview = updateWizardImagePreview;

window.openGameEditor = openGameEditor;
window.closeGameEditor = closeGameEditor;
window.switchEditorTab = switchEditorTab;
window.addEditorPackRow = addEditorPackRow;
window.removeEditorPackRow = removeEditorPackRow;
window.renamePackId = renamePackId;
window.renamePackLabel = renamePackLabel;
window.saveGameFromEditor = saveGameFromEditor;
window.deleteGameFromEditor = deleteGameFromEditor;
window.updateImagePreview = updateImagePreview;
window.filterGamePicker = filterGamePicker;

// ─── INDICADOR DE SINCRONIZAÇÃO EM TEMPO REAL ──────────────────────
// Quando o painel grava em priceUpdateTrigger, o bot reflete em até 60s.
// Mostra um banner discreto pra confirmar visualmente que o sinal saiu.
let _lastPriceUpdateTs = 0;
function setupPriceSyncIndicator() {
    if (!window.db) return;
    const ref = window.db.ref('priceUpdateTrigger');
    ref.once('value').then(snap => {
        _lastPriceUpdateTs = snap.val()?.timestamp || 0;
    }).catch(() => { /* ignore */ });

    ref.on('value', snap => {
        const data = snap.val();
        if (!data?.timestamp) return;
        if (data.timestamp <= _lastPriceUpdateTs) return;
        _lastPriceUpdateTs = data.timestamp;
        showSyncIndicator(data);
    });
}

function showSyncIndicator(data) {
    let el = document.getElementById('price-sync-indicator');
    if (!el) {
        el = document.createElement('div');
        el.id = 'price-sync-indicator';
        el.className = 'sync-indicator';
        document.body.appendChild(el);
    }
    const game = data.gameId || data.game || 'todos';
    const action = data.action || 'price-update';
    el.textContent = `✨ Sinal enviado ao bot (${action} · ${game})`;
    el.classList.add('visible');
    clearTimeout(el._hideTimer);
    el._hideTimer = setTimeout(() => el.classList.remove('visible'), 4000);
}

window.setupPriceSyncIndicator = setupPriceSyncIndicator;

// ═══════════════════════════════════════════════════════════════
// 📋 CRM - VENDAS OFICIAIS (FINALIZADAS)
// ═══════════════════════════════════════════════════════════════

let allOfficialSales = [];
let filteredOfficialSales = [];
let crmCurrentPage = 1;
const crmItemsPerPage = 15;

// Ranking de clientes (Top Clientes) - paginação
let crmRankingClientesPage = 1;
const crmRankingClientesPerPage = 10;
let crmRankingClientesData = [];
let crmRankingClientesNames = {};

function crmRankingClientesPreviousPage() {
    if (crmRankingClientesPage > 1) {
        crmRankingClientesPage--;
        renderCRMRankingClientes();
    }
}

function crmRankingClientesNextPage() {
    const totalPages = Math.max(1, Math.ceil((crmRankingClientesData || []).length / crmRankingClientesPerPage));
    if (crmRankingClientesPage < totalPages) {
        crmRankingClientesPage++;
        renderCRMRankingClientes();
    }
}

function renderCRMRankingClientes() {
    const rankingClientesDiv = document.getElementById('crm-ranking-clientes');
    if (!rankingClientesDiv) return;

    const totalItems = (crmRankingClientesData || []).length;
    const totalPages = Math.max(1, Math.ceil(totalItems / crmRankingClientesPerPage));
    crmRankingClientesPage = Math.min(Math.max(1, crmRankingClientesPage), totalPages);

    const startIndex = (crmRankingClientesPage - 1) * crmRankingClientesPerPage;
    const endIndex = startIndex + crmRankingClientesPerPage;
    const pageItems = (crmRankingClientesData || []).slice(startIndex, endIndex);

    if (pageItems.length === 0) {
        rankingClientesDiv.innerHTML = '<p style="color: var(--text-secondary);">Sem dados</p>';
    } else {
        rankingClientesDiv.innerHTML = pageItems.map(([id, data], idx) => {
            const nome = (crmRankingClientesNames && crmRankingClientesNames[id]) ? crmRankingClientesNames[id] : id;
            const rank = startIndex + idx + 1;
            const color = rank === 1 ? '#ffd700' : rank === 2 ? '#c0c0c0' : rank === 3 ? '#cd7f32' : '#ff8fce';
            return `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid rgba(255, 45, 149, 0.22);">
                    <span title="${nome}" style="color: #ffd9ec;">
                        <span style="font-weight: bold; color: ${color};">#${rank}</span>
                        ${nome.length > 20 ? nome.substring(0, 17) + '...' : nome}
                    </span>
                    <span style="color: #10b981; font-weight: bold;">
                        ${data.count} compras | R$ ${formatMoney(data.total)}
                    </span>
                </div>
            `;
        }).join('');
    }

    const prevBtn = document.getElementById('crm-ranking-clientes-prev');
    const nextBtn = document.getElementById('crm-ranking-clientes-next');
    const pageInfo = document.getElementById('crm-ranking-clientes-page-info');
    if (pageInfo) pageInfo.textContent = `Página ${crmRankingClientesPage} de ${totalPages}`;
    if (prevBtn) prevBtn.disabled = crmRankingClientesPage <= 1;
    if (nextBtn) nextBtn.disabled = crmRankingClientesPage >= totalPages;
}

function getCRMPeriodRange() {
    const period = document.getElementById('crm-filter-period')?.value || '7';
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    if (period === 'all') return { period, start: null, end: null, label: 'todo o histórico' };
    if (period === 'today') {
        const start = new Date();
        start.setHours(0, 0, 0, 0);
        return { period, start: start.getTime(), end: now, label: 'hoje' };
    }
    if (period === 'year') {
        const start = new Date(new Date().getFullYear(), 0, 1).getTime();
        return { period, start, end: now, label: 'este ano' };
    }
    if (period === 'custom') {
        const startValue = document.getElementById('crm-date-start')?.value;
        const endValue = document.getElementById('crm-date-end')?.value;
        if (!startValue || !endValue) return { period, incomplete: true, label: 'período personalizado' };
        return {
            period,
            start: new Date(`${startValue}T00:00:00`).getTime(),
            end: new Date(`${endValue}T23:59:59.999`).getTime(),
            label: `${startValue.split('-').reverse().join('/')} a ${endValue.split('-').reverse().join('/')}`
        };
    }
    const days = Math.max(1, Number(period) || 7);
    return { period, start: now - (days * dayMs), end: now, label: `últimos ${days} dias` };
}

// Carregar CRM apenas no período escolhido. "Todo período" continua disponível,
// mas só baixa o histórico completo quando a pessoa seleciona essa opção.
async function loadOfficialSalesData(forceRefresh = false) {
    try {
        console.log('📡 Carregando vendas oficiais (CRM)...');
        const range = getCRMPeriodRange();
        if (range.incomplete) {
            setTableState('crm-tbody', 11, 'Escolha a data inicial e final para carregar o período.');
            return;
        }
        setTableState('crm-tbody', 11, `Carregando vendas de ${range.label}...`);

        const oficiaisData = range.period === 'all'
            ? await _fetchAllOfficialSales(forceRefresh)
            : await _fetchOfficialSalesRange(range.start, range.end, forceRefresh);

        allOfficialSales = [];

        // 1. Adicionar vendas oficiais
        Object.entries(oficiaisData || {}).forEach(([key, data]) => {
            allOfficialSales.push({
                orderNumber: key,
                ...data
            });
        });

        // Ordenar por data (mais recente primeiro)
        allOfficialSales.sort((a, b) =>
            (b.timestamp || b.createdAt || b.paidAt || 0) -
            (a.timestamp || a.createdAt || a.paidAt || 0)
        );

        console.log(`📋 CRM: ${allOfficialSales.length} vendas carregadas (${range.label})`);
        const scope = document.getElementById('crm-data-scope');
        if (scope) scope.textContent = `Exibindo ${allOfficialSales.length.toLocaleString('pt-BR')} vendas de ${range.label}.`;

        const selectedGame = document.getElementById('crm-filter-game')?.value || '';
        populateGameFilter();
        const gameSelect = document.getElementById('crm-filter-game');
        if (gameSelect && [...gameSelect.options].some(option => option.value === selectedGame)) {
            gameSelect.value = selectedGame;
        }
        applyCRMFilters();

    } catch (error) {
        console.error('❌ Erro ao carregar vendas oficiais:', error);
        setTableState('crm-tbody', 11, error.message, 'error');
        showToast('Erro ao carregar CRM: ' + error.message, 'error');
    }
}

// Popular filtro de jogos
function populateGameFilter() {
    const select = document.getElementById('crm-filter-game');
    if (!select) return;

    // Contagens no dropdown ignoram canceladas.
    const activeOfficialSales = allOfficialSales.filter(isSaleActive);

    // Coletar jogos das vendas
    const gamesFromSales = [...new Set(activeOfficialSales.map(s => s.game || s.gameName).filter(Boolean))];

    // Criar HTML do select
    let html = '<option value="">🎮 Todos os Jogos</option>';
    html += '<optgroup label="━━━ Jogos do Sistema ━━━">';

    // Adicionar todos os jogos do sistema
    Object.entries(JOGOS_DISPONIVEIS).forEach(([id, info]) => {
        // Match EXATO. O .includes() antigo contava 'genshinloginesenha' como
        // "Genshin Impact" no dropdown, inflando o número entre parênteses
        // ("Genshin Impact (841)") mesmo após o filtro por linha já estar correto.
        const idLower = id.toLowerCase();
        const nameLower = info.name.toLowerCase();
        const salesCount = activeOfficialSales.filter(s => {
            const g = (s.game || '').toLowerCase();
            const gn = (s.gameName || '').toLowerCase();
            return g === idLower || gn === nameLower;
        }).length;
        html += `<option value="${id}">${info.emoji} ${info.name} (${salesCount})</option>`;
    });

    html += '</optgroup>';

    // Adicionar jogos customizados que não estão na lista padrão
    const customGames = gamesFromSales.filter(g => {
        const gLower = g?.toLowerCase() || '';
        return !Object.keys(JOGOS_DISPONIVEIS).some(id =>
            gLower === id || gLower.includes(id)
        );
    });

    if (customGames.length > 0) {
        html += '<optgroup label="━━━ Outros Jogos ━━━">';
        customGames.forEach(game => {
            const salesCount = activeOfficialSales.filter(s => s.game === game || s.gameName === game).length;
            html += `<option value="${game}">🎮 ${game} (${salesCount})</option>`;
        });
        html += '</optgroup>';
    }

    select.innerHTML = html;
}

// Atualizar estatísticas CRM
function updateCRMStats() {
    // Stats do CRM nunca contam canceladas — elas ainda aparecem na tabela.
    const sales = filteredOfficialSales.filter(isSaleActive);

    // Função auxiliar para formatar valores grandes nos cards
    const formatStat = (val) => {
        if (val >= 10000) {
            return val.toLocaleString('pt-BR', {
                minimumFractionDigits: 0,
                maximumFractionDigits: 0
            });
        }
        return formatMoney(val);
    };

    // Total vendas
    const totalVendasEl = document.getElementById('crm-total-vendas');
    if (totalVendasEl) totalVendasEl.textContent = sales.length;

    // Receita BRL
    const receitaBRL = sales.reduce((sum, s) => sum + (parseFloat(s.totalBRL) || 0), 0);
    const receitaEl = document.getElementById('crm-receita-brl');
    if (receitaEl) receitaEl.textContent = `R$ ${formatStat(receitaBRL)}`;

    // Custo Total
    const custoTotal = sales.reduce((sum, s) => sum + (parseFloat(s.custoBRL) || 0), 0);
    const custoElement = document.getElementById('crm-custo-total');
    if (custoElement) {
        custoElement.textContent = `R$ ${formatStat(custoTotal)}`;
    }

    // Lucro Total
    const lucroTotal = receitaBRL - custoTotal;
    const lucroElement = document.getElementById('crm-lucro-total');
    if (lucroElement) {
        lucroElement.textContent = `R$ ${formatStat(lucroTotal)}`;
        lucroElement.style.color = lucroTotal >= 0 ? '#10b981' : '#ef4444';
    }

    // Cupons/Referrals usados
    const cuponsUsados = sales.filter(s => s.referral?.code || s.couponCode).length;
    const cuponsEl = document.getElementById('crm-cupons-usados');
    if (cuponsEl) cuponsEl.textContent = cuponsUsados;

    // Top cliente
    const clienteGastos = {};
    const clienteNomes = {};

    sales.forEach(s => {
        // Usar ID como chave para agrupar corretamente o mesmo usuário
        const id = s.clientId || s.clientName || 'Desconhecido';
        const nome = s.clientName || s.clientId || 'Desconhecido';

        // EXCLUIR A PRÓPRIA LOJA DO RANKING DE CLIENTES
        if (nome.toLowerCase().includes('daoshistore')) return;

        if (!clienteGastos[id]) {
            clienteGastos[id] = 0;
            clienteNomes[id] = nome;
        }
        clienteGastos[id] += (parseFloat(s.totalBRL) || 0);

        // Se encontrarmos um nome melhor (não ID) para este ID, atualizamos
        if (s.clientName && s.clientName !== id) {
            clienteNomes[id] = s.clientName;
        }
    });

    const topClienteEntry = Object.entries(clienteGastos).sort((a, b) => b[1] - a[1])[0];
    const topClienteEl = document.getElementById('crm-top-cliente');

    if (topClienteEntry && topClienteEl) {
        const [id, total] = topClienteEntry;
        const nome = clienteNomes[id];
        const nomeExibicao = nome.length > 25 ? nome.substring(0, 22) + '...' : nome;

        topClienteEl.style.whiteSpace = 'normal';
        topClienteEl.style.lineHeight = '1.2';
        topClienteEl.innerHTML = `
            <div style="font-size: 12px; color: var(--text-secondary); font-weight: 400; margin-bottom: 2px;">${nomeExibicao}</div>
            <div style="font-size: 18px; font-weight: 800; color: #ec4899;">R$ ${formatStat(total)}</div>
        `;
        topClienteEl.title = `${nome} - Total: R$ ${formatMoney(total)}`; // Tooltip com nome completo
    } else if (topClienteEl) {
        topClienteEl.textContent = '-';
    }
}

// Atualizar tabela CRM
function updateCRMTable() {
    const tbody = document.getElementById('crm-tbody');
    if (!tbody) return;

    tbody.innerHTML = '';

    // Paginação
    const startIndex = (crmCurrentPage - 1) * crmItemsPerPage;
    const endIndex = startIndex + crmItemsPerPage;
    const paginatedSales = filteredOfficialSales.slice(startIndex, endIndex);

    if (paginatedSales.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="11" style="text-align: center; padding: 40px; color: var(--text-secondary);">
                    📭 Nenhuma venda oficial encontrada neste período
                </td>
            </tr>
        `;
        updateCRMPagination();
        return;
    }

    paginatedSales.forEach(sale => {
        const tr = document.createElement('tr');

        // Formatar itens
        let itensText = '-';
        if (sale.items && Array.isArray(sale.items)) {
            itensText = sale.items.map(i => i.name || i.description || 'Item').join(', ');
            if (itensText.length > 30) itensText = itensText.substring(0, 30) + '...';
        }

        tr.innerHTML = `
            <td>
                <div class="action-buttons">
                    <button class="btn-icon btn-view" onclick="openCRMDetails('${sale.orderNumber}')" title="Ver Detalhes">
                        👁️
                    </button>
                    <button class="btn-icon btn-edit" onclick="openCRMEditModal('${sale.orderNumber}')" title="Editar">
                        ✏️
                    </button>
                    <button class="btn-icon btn-delete" onclick="deleteCRMEntry('${sale.orderNumber}')" title="Excluir">
                        🗑️
                    </button>
                </div>
            </td>
            <td><code style="color: #10b981; font-weight: bold;">${sale.orderNumber}</code></td>
            <td>${sale.clientName || sale.clientId || 'N/A'}</td>
            <td>${sale.gameName || '-'}</td>
            <td title="${Array.isArray(sale.items) ? sale.items.map(i => i.name).join(', ') : ''}">${itensText}</td>
            <td><strong>R$ ${formatMoney(sale.totalBRL || 0)}</strong></td>
            <td>$ ${formatMoney(sale.totalUSD || 0)}</td>
            <td>${sale.paymentMethod || '-'}</td>
            <td>${sale.referral?.code ? `<code style="color: #9b59b6;">${sale.referral.code}</code>` : (sale.couponCode ? `<code style="color: #f59e0b;">${sale.couponCode}</code>` : '-')}</td>
            <td>${sale.finalizedBy?.username || '-'}</td>
            <td>${formatDate(sale.timestamp)}</td>
        `;

        tbody.appendChild(tr);
    });

    updateCRMPagination();
}

// Atualizar paginação CRM
function updateCRMPagination() {
    const totalPages = Math.ceil(filteredOfficialSales.length / crmItemsPerPage);
    document.getElementById('crm-page-info').textContent = `Página ${crmCurrentPage} de ${totalPages || 1}`;

    document.getElementById('crm-btn-prev').disabled = crmCurrentPage === 1;
    document.getElementById('crm-btn-next').disabled = crmCurrentPage >= totalPages;
}

function crmNextPage() {
    const totalPages = Math.ceil(filteredOfficialSales.length / crmItemsPerPage);
    if (crmCurrentPage < totalPages) {
        crmCurrentPage++;
        updateCRMTable();
    }
}

function crmPreviousPage() {
    if (crmCurrentPage > 1) {
        crmCurrentPage--;
        updateCRMTable();
    }
}

// Atualizar rankings
function updateCRMRankings() {
    const sales = filteredOfficialSales.filter(isSaleActive);

    // ─── Ranking de Jogos (agregado por jogo base + breakdown de variantes) ───
    // Cada gameId vira "base" (ex: genshin, genshinloginesenha → genshin).
    // Mostra total agregado + breakdown das variantes (login+senha, twd, etc).
    // Mapping explicito de variante -> jogo base canonico. Cobre casos onde
    // stripar sufixo nao bate com o gameId real (ex: honkailoginesenha
    // viraria "honkai", mas o jogo principal eh "honkaistarrail").
    // Tambem cobre familias inteiras (Ymir tem ymirpoints, ymirtwd, ymirymp,
    // ymirloginesenha — todas agregam sob ymirpoints).
    const BASE_GAME_MAP = {
        // Honkai Star Rail
        'honkai': 'honkaistarrail',
        'honkailoginesenha': 'honkaistarrail',
        'honkaistarrailloginesenha': 'honkaistarrail',
        // Ymir (todas variantes -> ymirpoints)
        'ymir': 'ymirpoints',
        'ymirtwd': 'ymirpoints',
        'ymirymp': 'ymirpoints',
        'ymirloginesenha': 'ymirpoints',
        // ZZZ (zzz eh base, zzzloginesenha agrega)
        'zenlesszonezero': 'zzz',
        'zzzloginesenha': 'zzz',
        // Wuthering
        'wuthering': 'wutheringwaves',
        'wutheringwavesloginesenha': 'wutheringwaves',
        // NTE (so existe variante login)
        'nte': 'nteloginesenha',
        'ntecasheneverness': 'nteloginesenha',
        // Genshin
        'genshinloginesenha': 'genshin',
        'genshinimpact': 'genshin',
        // Night Crows
        'nightcrowstwd': 'nightcrows',
        // MIR4 (todas variantes -> mir4)
        'mir4twd': 'mir4',
        'mir4gold': 'mir4',
        'mir4cash': 'mir4',
        'mir4loginsenha': 'mir4',
        'mir4loginesenha': 'mir4',
    };
    const getGameBaseId = (gid) => {
        if (!gid) return 'desconhecido';
        const g = String(gid).toLowerCase();
        // 1) Match explicito tem prioridade absoluta
        if (BASE_GAME_MAP[g]) return BASE_GAME_MAP[g];
        // 2) Strip de sufixos comuns
        const stripped = g
            .replace(/loginesenha$/, '')
            .replace(/loginsenha$/, '')
            .replace(/twd$/, '')
            .replace(/gold$/, '')
            .replace(/cash$/, '')
            .replace(/points$/, '')
            || g;
        // 3) Re-checa map apos strip (ex: honkailoginesenha -> "honkai" -> honkaistarrail)
        if (BASE_GAME_MAP[stripped]) return BASE_GAME_MAP[stripped];
        return stripped;
    };
    const getDisplayName = (gid, fallback) => {
        if (gid && JOGOS_DISPONIVEIS[gid]) return JOGOS_DISPONIVEIS[gid].name;
        if (gid && JOGOS_DISPONIVEIS[getGameBaseId(gid)]) return JOGOS_DISPONIVEIS[getGameBaseId(gid)].name;
        return fallback || gid || 'Desconhecido';
    };

    // Agrega por base, mantendo breakdown por variante
    const jogoAgregado = {}; // baseId → { count, total, variantes: { gid → { name, count, total } } }
    sales.forEach(s => {
        const rawGid = (s.game || '').toLowerCase();
        const baseId = rawGid ? getGameBaseId(rawGid) : 'desconhecido';
        const variantId = rawGid || 'desconhecido';
        const variantName = s.gameName || getDisplayName(rawGid, 'Desconhecido');
        const baseName = JOGOS_DISPONIVEIS[baseId]?.name || variantName;
        const valor = parseFloat(s.totalBRL) || 0;

        if (!jogoAgregado[baseId]) {
            jogoAgregado[baseId] = { name: baseName, count: 0, total: 0, variantes: {} };
        }
        jogoAgregado[baseId].count++;
        jogoAgregado[baseId].total += valor;

        if (!jogoAgregado[baseId].variantes[variantId]) {
            jogoAgregado[baseId].variantes[variantId] = { name: variantName, count: 0, total: 0 };
        }
        jogoAgregado[baseId].variantes[variantId].count++;
        jogoAgregado[baseId].variantes[variantId].total += valor;
    });

    const totalJogosAggregados = Object.keys(jogoAgregado).length;
    const topJogos = Object.entries(jogoAgregado)
        .sort((a, b) => b[1].total - a[1].total)
        .slice(0, 200);

    const rankingJogosInfo = document.getElementById('crm-ranking-jogos-info');
    if (rankingJogosInfo) {
        rankingJogosInfo.textContent = totalJogosAggregados === 0
            ? 'Sem dados no período'
            : `Mostrando 1-${topJogos.length} de ${totalJogosAggregados} jogos (agregados por jogo base)`;
    }

    const rankingJogosDiv = document.getElementById('crm-ranking-jogos');
    if (rankingJogosDiv) {
        if (topJogos.length === 0) {
            rankingJogosDiv.innerHTML = '<p style="color: var(--text-secondary);">Sem dados</p>';
        } else {
            rankingJogosDiv.innerHTML = `
                <div style="max-height: 500px; overflow-y: auto; padding-right: 10px;">
                    ${topJogos.map(([baseId, data], idx) => {
                        const variantes = Object.values(data.variantes || {})
                            .sort((a, b) => b.total - a.total);
                        const temBreakdown = variantes.length > 1;
                        const breakdownHtml = temBreakdown
                            ? `<div style="margin-top: 6px; padding: 6px 10px; font-size: 11px; color: #ff8fce; background: rgba(255, 45, 149, 0.06); border-left: 2px solid rgba(255, 45, 149, 0.45); border-radius: 4px;">
                                ${variantes.map(v => `<div style="padding: 1px 0;">↳ ${v.name}: <span style="color: #ffd9ec;">${v.count}×</span> | <span style="color: #ffd9ec;">R$ ${formatMoney(v.total)}</span></div>`).join('')}
                               </div>`
                            : '';
                        return `
                            <div style="padding: 12px 0; border-bottom: 1px solid rgba(255, 45, 149, 0.22);">
                                <div style="display: flex; justify-content: space-between; align-items: center;">
                                    <span>
                                        <span style="font-weight: bold; color: ${idx === 0 ? '#ffd700' : idx === 1 ? '#c0c0c0' : idx === 2 ? '#cd7f32' : '#ff8fce'};">#${idx + 1}</span>
                                        ${data.name}${temBreakdown ? ` <span style="font-size: 10px; color: #ff8fce;">(${variantes.length} variantes)</span>` : ''}
                                    </span>
                                    <span style="color: #10b981; font-weight: bold;">
                                        ${data.count} vendas | R$ ${formatMoney(data.total)}
                                    </span>
                                </div>
                                ${breakdownHtml}
                            </div>
                        `;
                    }).join('')}
                </div>
            `;
        }
    }

    // Ranking de clientes
    const clienteGastos = {};
    const clienteNomes = {};

    sales.forEach(s => {
        const id = s.clientId || s.clientName || 'Desconhecido';
        const nome = s.clientName || s.clientId || 'Desconhecido';

        // EXCLUIR A PRÓPRIA LOJA DO RANKING DE CLIENTES
        if (nome.toLowerCase().includes('daoshistore')) return;

        if (!clienteGastos[id]) {
            clienteGastos[id] = { count: 0, total: 0 };
            clienteNomes[id] = nome;
        }
        clienteGastos[id].count++;
        clienteGastos[id].total += (parseFloat(s.totalBRL) || 0);

        if (s.clientName && s.clientName !== id) {
            clienteNomes[id] = s.clientName;
        }
    });

    const totalClientesUnicos = Object.keys(clienteGastos).length;
    const topClientes = Object.entries(clienteGastos)
        .sort((a, b) => b[1].total - a[1].total)
        .slice(0, 200);

    const rankingClientesInfo = document.getElementById('crm-ranking-clientes-info');
    if (rankingClientesInfo) {
        rankingClientesInfo.textContent = totalClientesUnicos === 0
            ? 'Sem dados no período'
            : `Mostrando 1-${topClientes.length} de ${totalClientesUnicos} clientes`;
    }

    // Cache + render paginado (10 por página)
    crmRankingClientesData = topClientes;
    crmRankingClientesNames = clienteNomes;
    renderCRMRankingClientes();

    // Ranking de Cupons
    const cupomStats = {};
    sales.forEach(s => {
        const cupom = s.referral?.code || s.couponCode;
        if (cupom) {
            if (!cupomStats[cupom]) cupomStats[cupom] = { count: 0, total: 0 };
            cupomStats[cupom].count++;
            cupomStats[cupom].total += (parseFloat(s.totalBRL) || 0);
        }
    });

    const totalCuponsUnicos = Object.keys(cupomStats).length;
    const topCupons = Object.entries(cupomStats)
        .sort((a, b) => b[1].count - a[1].count) // Ordenar por uso (mais usados)
        .slice(0, 200);

    const topCuponsInfo = document.getElementById('crm-top-cupons-info');
    if (topCuponsInfo) {
        topCuponsInfo.textContent = totalCuponsUnicos === 0
            ? 'Sem cupons usados no período'
            : `Mostrando 1-${topCupons.length} de ${totalCuponsUnicos} cupons`;
    }

    const topCuponsDiv = document.getElementById('crm-top-cupons');
    if (topCuponsDiv) {
        if (topCupons.length === 0) {
            topCuponsDiv.innerHTML = '<p style="color: var(--text-secondary);">Nenhum cupom usado no período</p>';
        } else {
            topCuponsDiv.innerHTML = `
                <div style="max-height: 500px; overflow-y: auto; padding-right: 10px;">
                    ${topCupons.map(([cupom, data], idx) => `
                        <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid rgba(255, 45, 149, 0.22);">
                            <span>
                                <span style="font-weight: bold; color: ${idx === 0 ? '#ffd700' : idx === 1 ? '#c0c0c0' : idx === 2 ? '#cd7f32' : '#ff8fce'};">#${idx + 1}</span>
                                🎫 ${cupom}
                            </span>
                            <div style="text-align: right;">
                                <div style="color: #ffd9ec; font-weight: bold;">${data.count} usos</div>
                                <div style="color: #10b981; font-size: 12px;">R$ ${formatMoney(data.total)}</div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
        }
    }
}

// Aplicar filtros CRM
function applyCRMFilters() {
    const period = document.getElementById('crm-filter-period')?.value || 'all';
    const game = document.getElementById('crm-filter-game')?.value || '';
    const search = document.getElementById('crm-search')?.value.toLowerCase() || '';

    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;

    filteredOfficialSales = allOfficialSales.filter(sale => {
        // Filtro de período
        let matchPeriod = true;
        const saleTime = sale.timestamp || sale.createdAt || sale.paidAt || 0;
        if (period !== 'all' && saleTime) {
            switch (period) {
                case 'today':
                    matchPeriod = (now - saleTime) < dayMs;
                    break;
                case '7':
                    matchPeriod = (now - saleTime) < (7 * dayMs);
                    break;
                case '30':
                    matchPeriod = (now - saleTime) < (30 * dayMs);
                    break;
                case '90':
                    matchPeriod = (now - saleTime) < (90 * dayMs);
                    break;
                case 'year':
                    const saleYear = new Date(saleTime).getFullYear();
                    matchPeriod = saleYear === new Date().getFullYear();
                    break;
                case 'custom':
                    const startDate = document.getElementById('crm-date-start')?.value;
                    const endDate = document.getElementById('crm-date-end')?.value;
                    if (startDate && endDate) {
                        const start = new Date(startDate).getTime();
                        const end = new Date(endDate).getTime() + dayMs;
                        matchPeriod = saleTime >= start && saleTime <= end;
                    }
                    break;
            }
        }

        // Filtro de jogo
        let matchGame = true;
        if (game) {
            const saleGame = (sale.game || '').toLowerCase();
            const saleGameName = (sale.gameName || '').toLowerCase();
            const filterGame = game.toLowerCase();

            // Match EXATO. O .includes() antigo contaminava entre jogos:
            // 'genshinloginesenha'.includes('genshin') → true → puxava vendas
            // do Genshin login+senha quando o filtro era só "Genshin Impact".
            // Mesmo problema com 'wutheringwavesloginesenha' vs 'wutheringwaves',
            // 'ymirloginesenha' vs 'ymirpoints', etc.
            const jogoInfo = JOGOS_DISPONIVEIS[filterGame];
            if (jogoInfo) {
                matchGame = saleGame === filterGame ||
                    saleGameName === jogoInfo.name.toLowerCase();
            } else {
                matchGame = saleGame === filterGame || saleGameName === filterGame;
            }
        }

        // Filtro de busca
        const matchSearch = !search ||
            (sale.orderNumber || '').toLowerCase().includes(search) ||
            (sale.clientName || '').toLowerCase().includes(search) ||
            (sale.clientId || '').toLowerCase().includes(search) ||
            (sale.referral?.code || sale.couponCode || '').toLowerCase().includes(search);

        return matchPeriod && matchGame && matchSearch;
    });

    crmCurrentPage = 1;
    updateCRMStats();
    updateCRMTable();
    updateCRMRankings();
}

// Abrir modal de edição CRM
function openCRMEditModal(orderNumber) {
    const sale = allOfficialSales.find(s => s.orderNumber === orderNumber);
    if (!sale) return;

    document.getElementById('crm-edit-id').value = orderNumber;
    document.getElementById('crm-edit-order-display').textContent = orderNumber;
    document.getElementById('crm-edit-cliente-nome').value = sale.clientName || sale.clientId || '';
    document.getElementById('crm-edit-jogo').value = sale.gameName || '';
    document.getElementById('crm-edit-total-brl').value = sale.totalBRL || 0;
    document.getElementById('crm-edit-total-usd').value = sale.totalUSD || 0;
    document.getElementById('crm-edit-payment').value = sale.paymentMethod || 'PIX';
    document.getElementById('crm-edit-cupom').value = sale.referral?.code || sale.couponCode || '';
    document.getElementById('crm-edit-obs').value = sale.observacoes || '';

    // Campos de custo e lucro
    const custoInput = document.getElementById('crm-edit-custo-brl');
    const lucroInput = document.getElementById('crm-edit-lucro');

    if (custoInput) {
        custoInput.value = sale.custoBRL || 0;
        // Adicionar listener para calcular lucro automaticamente
        custoInput.oninput = () => calculateLucro();
    }

    if (lucroInput) {
        const totalBRL = sale.totalBRL || 0;
        const custoBRL = sale.custoBRL || 0;
        lucroInput.value = (totalBRL - custoBRL).toFixed(2);
    }

    // Adicionar listener no total para recalcular lucro
    const totalBRLInput = document.getElementById('crm-edit-total-brl');
    if (totalBRLInput) {
        totalBRLInput.oninput = () => calculateLucro();
    }

    document.getElementById('modal-edit-crm').classList.add('active');
}

// Calcular lucro automaticamente
function calculateLucro() {
    const totalBRL = parseFloat(document.getElementById('crm-edit-total-brl').value) || 0;
    const custoBRL = parseFloat(document.getElementById('crm-edit-custo-brl').value) || 0;
    const lucroInput = document.getElementById('crm-edit-lucro');

    if (lucroInput) {
        const lucro = totalBRL - custoBRL;
        lucroInput.value = lucro.toFixed(2);
        lucroInput.style.color = lucro >= 0 ? '#10b981' : '#ef4444';
    }
}

function closeCRMEditModal() {
    document.getElementById('modal-edit-crm').classList.remove('active');
}

// Salvar edição CRM
async function saveCRMEdit() {
    const orderNumber = document.getElementById('crm-edit-id').value;
    const clientName = document.getElementById('crm-edit-cliente-nome').value.trim();
    const gameName = document.getElementById('crm-edit-jogo').value.trim();
    const totalBRL = parseFloat(document.getElementById('crm-edit-total-brl').value) || 0;
    const totalUSD = parseFloat(document.getElementById('crm-edit-total-usd').value) || 0;
    const custoBRL = parseFloat(document.getElementById('crm-edit-custo-brl').value) || 0;
    const paymentMethod = document.getElementById('crm-edit-payment').value;
    const couponCode = document.getElementById('crm-edit-cupom').value.trim();
    const observacoes = document.getElementById('crm-edit-obs').value.trim();

    // Calcular lucro
    const lucroBRL = totalBRL - custoBRL;

    try {
        await window.db.ref(`vendasOficiais/${orderNumber}`).update({
            clientName,
            gameName,
            totalBRL,
            totalUSD,
            custoBRL,
            lucroBRL,
            paymentMethod,
            couponCode: couponCode || null,
            observacoes: observacoes || null,
            updatedAt: Date.now(),
            editedBy: 'dashboard-admin'
        });

        showToast('Venda oficial atualizada!', 'success');
        closeCRMEditModal();
        _invalidateOfficialSalesCache();
        loadOfficialSalesData(true);

    } catch (error) {
        console.error('❌ Erro ao atualizar venda:', error);
        showToast('Erro ao atualizar: ' + error.message, 'error');
    }
}

// Excluir venda oficial
async function deleteCRMEntry(orderNumber) {
    if (!confirm(`Tem certeza que deseja excluir permanentemente a venda ${orderNumber}?`)) return;

    try {
        await window.db.ref(`vendasOficiais/${orderNumber}`).remove();
        showToast('Venda oficial excluída!', 'success');
        _invalidateOfficialSalesCache();
        loadOfficialSalesData(true);
    } catch (error) {
        console.error('❌ Erro ao excluir venda:', error);
        showToast('Erro ao excluir: ' + error.message, 'error');
    }
}

// Abrir detalhes da venda
function openCRMDetails(orderNumber) {
    const sale = allOfficialSales.find(s => s.orderNumber === orderNumber);
    if (!sale) return;

    const content = document.getElementById('crm-details-content');

    // Formatar itens
    let itensHtml = '<p style="color: var(--text-secondary);">Nenhum item registrado</p>';
    if (sale.items && Array.isArray(sale.items) && sale.items.length > 0) {
        itensHtml = `<ul style="list-style: none; padding: 0;">` +
            sale.items.map(item => `
                <li style="padding: 8px 0; border-bottom: 1px solid var(--border);">
                    <strong>${item.name || item.description || 'Item'}</strong>
                    ${item.quantity ? ` x${item.quantity}` : ''}
                    ${item.price ? ` - R$ ${formatMoney(item.price)}` : ''}
                </li>
            `).join('') +
            `</ul>`;
    }

    content.innerHTML = `
        <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 20px; border-radius: 12px; margin-bottom: 20px; text-align: center;">
            <h2 style="color: white; margin: 0; font-family: monospace; font-size: 24px;">${sale.orderNumber}</h2>
            <p style="color: rgba(255,255,255,0.8); margin: 5px 0 0 0;">Pedido Oficial</p>
        </div>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
            <div>
                <h4 style="color: var(--text-secondary); margin-bottom: 10px;">📋 Informações Gerais</h4>
                <div style="background: var(--input-bg); padding: 15px; border-radius: 8px;">
                    <p><strong>Cliente:</strong> ${sale.clientName || 'N/A'}</p>
                    <p><strong>ID Discord:</strong> ${sale.clientId || 'N/A'}</p>
                    <p><strong>Jogo:</strong> ${sale.gameName || 'N/A'}</p>
                    <p><strong>Data:</strong> ${formatDate(sale.timestamp)}</p>
                </div>
            </div>
            
            <div>
                <h4 style="color: var(--text-secondary); margin-bottom: 10px;">💰 Valores</h4>
                <div style="background: var(--input-bg); padding: 15px; border-radius: 8px;">
                    <p><strong>Total BRL:</strong> <span style="color: #10b981; font-size: 18px;">R$ ${formatMoney(sale.totalBRL || 0)}</span></p>
                    <p><strong>Total USD:</strong> $ ${formatMoney(sale.totalUSD || 0)}</p>
                    <p><strong>Pagamento:</strong> ${sale.paymentMethod || 'N/A'}</p>
                    <p><strong>Cupom Referência:</strong> ${sale.referral?.code || sale.couponCode || 'Nenhum'}</p>
                    ${sale.usedBalance ? `<p><strong>Saldo Usado:</strong> <span style="color: #f59e0b;">-R$ ${formatMoney(sale.usedBalance)}</span></p>` : ''}
                    ${sale.cashback?.valor ? `<p><strong>Cashback:</strong> <span style="color: #9b59b6;">+R$ ${formatMoney(sale.cashback.valor)} (${sale.cashback.percentual}%)</span></p>` : ''}
                </div>
            </div>
        </div>
        
        <div style="margin-top: 20px;">
            <h4 style="color: var(--text-secondary); margin-bottom: 10px;">📦 Itens</h4>
            <div style="background: var(--input-bg); padding: 15px; border-radius: 8px;">
                ${itensHtml}
            </div>
        </div>
        
        <div style="margin-top: 20px;">
            <h4 style="color: var(--text-secondary); margin-bottom: 10px;">👤 Responsável</h4>
            <div style="background: var(--input-bg); padding: 15px; border-radius: 8px;">
                <p><strong>Finalizado por:</strong> ${sale.finalizedBy?.username || 'N/A'}</p>
                <p><strong>ID Staff:</strong> ${sale.finalizedBy?.id || 'N/A'}</p>
            </div>
        </div>
        
        ${sale.observacoes ? `
        <div style="margin-top: 20px;">
            <h4 style="color: var(--text-secondary); margin-bottom: 10px;">📝 Observações</h4>
            <div style="background: var(--input-bg); padding: 15px; border-radius: 8px;">
                <p>${sale.observacoes}</p>
            </div>
        </div>
        ` : ''}
    `;

    document.getElementById('modal-crm-details').classList.add('active');
}

function closeCRMDetailsModal() {
    document.getElementById('modal-crm-details').classList.remove('active');
}

// Imprimir recibo
function printCRMDetails() {
    const content = document.getElementById('crm-details-content').innerHTML;
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Recibo - Daoshi Store</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 20px; background: white; color: black; }
                h2 { color: #10b981; }
                p { margin: 5px 0; }
            </style>
        </head>
        <body>
            <h1 style="text-align: center;">⚔️ DAOSHI STORE</h1>
            <p style="text-align: center; color: #666;">Recibo de Venda</p>
            <hr>
            ${content.replace(/var\(--[^)]+\)/g, '#333')}
            <hr>
            <p style="text-align: center; font-size: 12px; color: #666;">
                Documento gerado em ${new Date().toLocaleString('pt-BR')}<br>
                Este documento é válido para fins fiscais.
            </p>
        </body>
        </html>
    `);
    printWindow.document.close();
    printWindow.print();
}

// Exportar CSV Fiscal
function exportCRMToCSV() {
    const sales = filteredOfficialSales;

    if (sales.length === 0) {
        showToast('Nenhuma venda para exportar!', 'warning');
        return;
    }

    // Cabeçalho fiscal completo - usando ponto-e-vírgula como separador (padrão Excel/Brasil)
    let csv = 'Numero_Pedido;Data;Cliente_Nome;Cliente_ID;Jogo;Itens;Total_BRL;Total_USD;Metodo_Pagamento;Cupom_Referencia;Saldo_Usado;Cashback;Staff_Responsavel\n';

    sales.forEach(sale => {
        const itens = Array.isArray(sale.items) ? sale.items.map(i => i.name || i.description).join(' | ') : '';
        const cupom = sale.referral?.code || sale.couponCode || '';
        const saldoUsado = sale.usedBalance || 0;
        const cashback = sale.cashback?.valor || 0;

        const fields = [
            sale.orderNumber,
            formatDate(sale.timestamp),
            sale.clientName || '',
            sale.clientId || '',
            sale.gameName || '',
            itens,
            sale.totalBRL || 0,
            sale.totalUSD || 0,
            sale.paymentMethod || '',
            cupom,
            saldoUsado,
            cashback,
            sale.finalizedBy?.username || ''
        ];
        csv += fields.map(f => escapeCSVField(f)).join(';') + '\n';
    });

    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vendas_oficiais_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
}

// Setup listeners CRM
let _crmListenersInitialized = false;
function setupCRMListeners() {
    if (_crmListenersInitialized) return;
    _crmListenersInitialized = true;

    const periodFilter = document.getElementById('crm-filter-period');
    const gameFilter = document.getElementById('crm-filter-game');
    const searchInput = document.getElementById('crm-search');
    const dateStart = document.getElementById('crm-date-start');
    const dateEnd = document.getElementById('crm-date-end');

    if (periodFilter) {
        periodFilter.addEventListener('change', async () => {
            // Mostrar/esconder campos de data personalizada
            const isCustom = periodFilter.value === 'custom';
            if (dateStart) dateStart.style.display = isCustom ? 'block' : 'none';
            if (dateEnd) dateEnd.style.display = isCustom ? 'block' : 'none';
            if (periodFilter.value === 'all') {
                const proceed = window.confirm(
                    'O histórico completo tem mais de 32 mil vendas e pode demorar. Deseja carregar mesmo assim?'
                );
                if (!proceed) {
                    periodFilter.value = '30';
                }
            }
            await loadOfficialSalesData();
        });
    }

    if (gameFilter) gameFilter.addEventListener('change', applyCRMFilters);
    if (searchInput) searchInput.addEventListener('input', applyCRMFilters);
    const reloadCustomRange = () => {
        if (periodFilter?.value === 'custom' && dateStart?.value && dateEnd?.value) {
            loadOfficialSalesData();
        }
    };
    if (dateStart) dateStart.addEventListener('change', reloadCustomRange);
    if (dateEnd) dateEnd.addEventListener('change', reloadCustomRange);

    // Listener em tempo real para novas vendas oficiais
    // Usar debounce para evitar múltiplas chamadas simultâneas
    let crmReloadTimeout = null;
    let crmInitialLoadComplete = false;

    // Marcar initial load como complete após um delay
    setTimeout(() => { crmInitialLoadComplete = true; }, 3000);

    const debouncedReload = () => {
        if (!crmInitialLoadComplete) return; // Ignorar durante o carregamento inicial
        if (crmReloadTimeout) clearTimeout(crmReloadTimeout);
        crmReloadTimeout = setTimeout(() => {
            console.log('📋 Recarregando vendas oficiais...');
            loadOfficialSalesData(true);
        }, 1000); // Esperar 1 segundo antes de recarregar
    };

    // Capturar refs pra poder dar .off() ao sair da pagina
    // (antes: listeners persistiam pra sempre, recebendo cada mudança 24h/dia).
    //
    // ⚡ REDUÇÃO DE BANDA (crítico): antes era `ref('vendasOficiais')` puro.
    // No Firebase, `.on('child_added')` numa coleção dispara pra CADA filho já
    // existente ao conectar — ou seja, transmitia as ~27 MIL vendas inteiras a
    // cada vez que o CRM abria ou o listener re-conectava (aba volta do bg).
    // Era o principal responsável pelo estouro de download (~115 GB/mês).
    // Agora observamos só as ÚLTIMAS 20 (orderByChild('createdAt') já é indexado
    // nas regras): detecta venda nova/edição recente do mesmo jeito, mas baixa
    // 20 registros em vez de 27 mil ao conectar. O reload em si continua usando
    // o cache compartilhado de vendasOficiais.
    const crmAddedRef = window.db.ref('vendasOficiais').orderByChild('createdAt').limitToLast(20);
    const crmAddedHandler = () => {
        if (!crmInitialLoadComplete) return;
        debouncedReload();
    };
    crmAddedRef.on('child_added', crmAddedHandler);

    const crmChangedHandler = () => {
        if (!crmInitialLoadComplete) return;
        debouncedReload();
    };
    crmAddedRef.on('child_changed', crmChangedHandler);

    // Cleanup ao fechar/recarregar a pagina — evita vazar bytes Firebase.
    window.addEventListener('beforeunload', () => {
        try {
            crmAddedRef.off('child_added', crmAddedHandler);
            crmAddedRef.off('child_changed', crmChangedHandler);
        } catch (_) {}
    });

    // Cleanup agressivo: se aba fica em background por >10min, desliga listeners.
    // Ao voltar, re-registra (capturando o que perdeu via reload).
    let crmListenersActive = true;
    let crmHiddenSince = null;
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            crmHiddenSince = Date.now();
        } else {
            if (crmHiddenSince && Date.now() - crmHiddenSince > 10 * 60 * 1000) {
                // Voltou depois de >10min escondida — se havia desligado, reativa + reload
                if (!crmListenersActive) {
                    crmAddedRef.on('child_added', crmAddedHandler);
                    crmAddedRef.on('child_changed', crmChangedHandler);
                    crmListenersActive = true;
                    debouncedReload();
                }
            }
            crmHiddenSince = null;
        }
    });

    // Desligar listeners se aba ficar escondida por mais de 10min (checa periodicamente)
    setInterval(() => {
        if (document.hidden && crmHiddenSince && crmListenersActive && (Date.now() - crmHiddenSince) > 10 * 60 * 1000) {
            try {
                crmAddedRef.off('child_added', crmAddedHandler);
                crmAddedRef.off('child_changed', crmChangedHandler);
                crmListenersActive = false;
                console.log('🛑 Listeners CRM desativados (aba em background >10min)');
            } catch (_) {}
        }
    }, 60 * 1000); // verifica a cada 1min
}

// Expor funções CRM globalmente
window.loadOfficialSalesData = loadOfficialSalesData;
window.applyCRMFilters = applyCRMFilters;
window.crmNextPage = crmNextPage;
window.crmPreviousPage = crmPreviousPage;
window.crmRankingClientesNextPage = crmRankingClientesNextPage;
window.crmRankingClientesPreviousPage = crmRankingClientesPreviousPage;
window.openCRMEditModal = openCRMEditModal;
window.closeCRMEditModal = closeCRMEditModal;
window.saveCRMEdit = saveCRMEdit;
window.deleteCRMEntry = deleteCRMEntry;
window.openCRMDetails = openCRMDetails;
window.closeCRMDetailsModal = closeCRMDetailsModal;
window.printCRMDetails = printCRMDetails;
window.exportCRMToCSV = exportCRMToCSV;

// ═══════════════════════════════════════════════════════════════
// 🤝 CADASTROS INTERMÉDIO
// ═══════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════
// 🎫 TICKETS DE INTERMEDIAÇÃO (wizard) — puxa ticketLogs/ filtrado
// ═══════════════════════════════════════════════════════════════

let intermedTicketsData = [];

async function loadIntermedTickets() {
    try {
        setTableState('intermed-tickets-tbody', 10, `Carregando os ${INTERMED_TICKETS_LIMIT} tickets de intermédio mais recentes...`);
        const query = window.db.ref('ticketLogs')
            .orderByChild('ticketType')
            .equalTo('intermediacao')
            .limitToLast(INTERMED_TICKETS_LIMIT);
        const snapshot = await withTimeout(query.once('value'), 30_000, 'tickets de intermédio');
        const raw = snapshot.val() || {};
        intermedTicketsData = Object.entries(raw)
            .map(([key, val]) => ({ id: key, ...val }))
            .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

        const total = intermedTicketsData.length;
        const countByTipo = (t) => intermedTicketsData.filter(l => l.intermediacao?.tipo === t).length;
        const setTxt = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
        setTxt('intermed-tickets-total', total);
        setTxt('intermed-tickets-gmail', countByTipo('GMAIL'));
        setTxt('intermed-tickets-nft', countByTipo('NFT'));
        setTxt('intermed-tickets-troca', countByTipo('TROCA'));

        renderIntermedTicketsTable();
    } catch (err) {
        console.error('❌ Erro ao carregar tickets de intermediação:', err);
        setTableState('intermed-tickets-tbody', 10, err.message, 'error');
    }
}

function renderIntermedTicketsTable() {
    const tbody = document.getElementById('intermed-tickets-tbody');
    if (!tbody) return;

    const search = (document.getElementById('search-intermed-tickets')?.value || '').toLowerCase().trim();
    const tipoFilter = document.getElementById('filter-intermed-tipo')?.value || '';

    const filtered = intermedTicketsData.filter(log => {
        const im = log.intermediacao || {};
        if (tipoFilter && im.tipo !== tipoFilter) return false;
        if (search) {
            const hay = [
                log.logCode, log.username, log.userId,
                im.tipo, im.transacao?.jogo, im.transacao?.valorTransacao, im.transacao?.descricao,
                im.partes?.vendedor?.tag, im.partes?.vendedor?.userId,
                im.partes?.comprador?.tag, im.partes?.comprador?.userId
            ].filter(Boolean).join(' ').toLowerCase();
            if (!hay.includes(search)) return false;
        }
        return true;
    });

    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="10" style="text-align:center; padding: 30px; color: var(--text-secondary);">🔍 Nenhum ticket de intermediação encontrado</td></tr>';
        return;
    }

    const tipoColor = { GMAIL: '#e74c3c', NFT: '#2ecc71', TROCA: '#9b59b6', OUTRO: '#95a5a6' };
    const esc = (s) => String(s ?? '—').replace(/[<>&"']/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' }[c]));

    tbody.innerHTML = filtered.map(log => {
        const im = log.intermediacao || {};
        const tipo = im.tipo || '—';
        const taxa = Number.isFinite(im.transacao?.taxaCalculada)
            ? `R$ ${Number(im.transacao.taxaCalculada).toFixed(2).replace('.', ',')}${Number.isFinite(im.transacao?.taxaPercent) ? ` (${Number(im.transacao.taxaPercent).toFixed(1)}%)` : ''}`
            : 'manual';
        const data = log.createdAt ? new Date(log.createdAt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—';
        const vend = im.partes?.vendedor;
        const comp = im.partes?.comprador;
        return `<tr>
            <td><code style="background: rgba(139,92,246,0.2); color: #a78bfa; padding: 2px 6px; border-radius: 4px; font-weight: 600;">${esc(log.logCode)}</code></td>
            <td><span style="background: ${tipoColor[tipo] || '#95a5a6'}; color: white; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: 600;">${esc(tipo)}</span></td>
            <td>${esc(log.username)}<br><span style="font-size: 11px; color: var(--text-secondary); font-family: monospace;">${esc(log.userId)}</span></td>
            <td>${vend ? `${esc(vend.tag)}<br><span style="font-size: 11px; color: var(--text-secondary); font-family: monospace;">${esc(vend.userId)}</span>` : '—'}</td>
            <td>${comp ? `${esc(comp.tag)}<br><span style="font-size: 11px; color: var(--text-secondary); font-family: monospace;">${esc(comp.userId)}</span>` : '—'}</td>
            <td>${esc(im.transacao?.jogo)}</td>
            <td style="font-weight: 600;">${esc(im.transacao?.valorTransacao)}</td>
            <td>${esc(taxa)}${im.transacao?.minimoAplicado ? ' <span title="mínimo aplicado" style="color:#e67e22;">⚠️</span>' : ''}</td>
            <td>${esc(im.horarioAgendado)}</td>
            <td style="font-size: 12px;">${data}</td>
        </tr>`;
    }).join('');
}

window.loadIntermedTickets = loadIntermedTickets;
window.renderIntermedTicketsTable = renderIntermedTicketsTable;

async function loadIntermedioData() {
    const tbody = document.getElementById('intermedio-tbody');
    if (!tbody) return;

    const search = document.getElementById('search-intermedio')?.value.toLowerCase() || '';

    try {
        const snapshot = await window.db.ref('cadastrosIntermedio').once('value');
        const data = snapshot.val() || {};
        
        let registrations = Object.entries(data).map(([id, reg]) => ({
            id,
            ...reg
        })).sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

        // Aplicar busca
        if (search) {
            registrations = registrations.filter(reg => 
                (reg.nome || '').toLowerCase().includes(search) ||
                (reg.cpf || '').toLowerCase().includes(search) ||
                (reg.email || '').toLowerCase().includes(search) ||
                (reg.observacoes || '').toLowerCase().includes(search) ||
                (reg.registradoPor?.username || '').toLowerCase().includes(search)
            );
        }

        if (registrations.length === 0) {
            tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--text-secondary); padding: 20px;">${search ? 'Nenhum resultado encontrado' : 'Nenhum cadastro encontrado'}</td></tr>`;
            return;
        }

        tbody.innerHTML = registrations.map(reg => `
            <tr>
                <td>${reg.timestamp ? new Date(reg.timestamp).toLocaleString('pt-BR') : '—'}</td>
                <td style="font-weight: 600; color: var(--text-primary);">${reg.nome || '—'}</td>
                <td>${reg.cpf || '—'}</td>
                <td>${reg.telefone || '—'}</td>
                <td>${reg.email || '—'}</td>
                <td style="max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${reg.observacoes || ''}">
                    ${reg.observacoes || '—'}
                </td>
                <td>${reg.registradoPor?.username || '—'}</td>
                <td>
                    <button onclick="deleteIntermedio('${reg.id}')" class="btn-action btn-delete" title="Excluir">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');

    } catch (error) {
        console.error('❌ Erro ao carregar cadastros intermédio:', error);
        tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; color: #ef4444; padding: 20px;">Erro ao carregar dados</td></tr>';
    }
}

async function deleteIntermedio(id) {
    if (!confirm('Tem certeza que deseja excluir este cadastro?')) return;

    try {
        await window.db.ref(`cadastrosIntermedio/${id}`).remove();
        showToast('Cadastro excluído com sucesso!', 'success');
        loadIntermedioData();
    } catch (error) {
        console.error('❌ Erro ao excluir cadastro:', error);
        showToast('Erro ao excluir cadastro', 'error');
    }
}

// Expor globalmente
window.loadIntermedioData = loadIntermedioData;
window.deleteIntermedio = deleteIntermedio;

let _intermedioListenersInitialized = false;
function setupIntermedioListeners() {
    if (_intermedioListenersInitialized) return;
    _intermedioListenersInitialized = true;
    const searchInput = document.getElementById('search-intermedio');
    if (searchInput) {
        searchInput.addEventListener('input', () => loadIntermedioData());
    }

    // Listener em tempo real para novos cadastros
    let initialLoad = true;
    window.db.ref('cadastrosIntermedio').once('value', () => {
        initialLoad = false;
    });

    window.db.ref('cadastrosIntermedio').on('child_added', () => {
        if (!initialLoad) loadIntermedioData();
    });
    window.db.ref('cadastrosIntermedio').on('child_removed', () => loadIntermedioData());
    window.db.ref('cadastrosIntermedio').on('child_changed', () => loadIntermedioData());
}

// ═══════════════════════════════════════════════════════════════
// 📊 RELATÓRIOS MENSAIS
// ═══════════════════════════════════════════════════════════════

let monthlyReportData = [];
let cashbackRegistrations = [];

// Inicializar relatórios mensais
function initializeMonthlyReports() {
    if (initializeMonthlyReports.initialized) return;
    initializeMonthlyReports.initialized = true;
    const monthSelect = document.getElementById('report-month');
    if (!monthSelect) return;

    // Gerar últimos 12 meses
    const months = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const label = date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
        months.push({ value, label: label.charAt(0).toUpperCase() + label.slice(1) });
    }

    monthSelect.innerHTML = months.map(m =>
        `<option value="${m.value}">${m.label}</option>`
    ).join('');

    // Carregar relatório do mês atual
    loadMonthlyReports();
}

// Carregar dados do relatório mensal
async function loadMonthlyReports() {
    const monthSelect = document.getElementById('report-month');
    if (!monthSelect) return;

    const selectedMonth = monthSelect.value;
    const [year, month] = selectedMonth.split('-').map(Number);

    const startDate = new Date(year, month - 1, 1).getTime();
    const endDate = new Date(year, month, 0, 23, 59, 59, 999).getTime();

    try {
        // Consulta somente o mês selecionado usando o índice createdAt.
        const oficiaisData = await _fetchOfficialSalesRange(startDate, endDate);

        const mergedSales = [];

        // 1. Adicionar oficiais
        Object.entries(oficiaisData).forEach(([id, sale]) => {
            mergedSales.push({ id, ...sale });
        });

        monthlyReportData = mergedSales.filter(sale => {
            if (!isSaleActive(sale)) return false;
            const ts = sale.timestamp || sale.createdAt;
            return ts >= startDate && ts <= endDate;
        });

        // Carregar pré-cadastros de cashback do mês
        const cashbackSnapshot = await window.db.ref('cashbackRegistrations').once('value');
        const allCashback = cashbackSnapshot.val() || {};

        cashbackRegistrations = Object.entries(allCashback)
            .map(([id, reg]) => ({ id, ...reg }))
            .filter(reg => reg.timestamp >= startDate && reg.timestamp <= endDate);

        // Atualizar estatísticas gerais
        updateMonthlyStats();

        // Gerar relatórios específicos
        generateCouponReport();
        generateClientReport();
        generateGameReport();

        // Preencher tabela de transações
        updateTransactionsTable();

        // Preencher tabela de pré-cadastros de cashback
        updateCashbackTable();

    } catch (error) {
        console.error('❌ Erro ao carregar relatórios:', error);
        showToast('Erro ao carregar relatórios', 'error');
    }
}

// Atualizar estatísticas gerais do mês
function updateMonthlyStats() {
    const totalVendas = monthlyReportData.length;
    const receitaBRL = monthlyReportData.reduce((sum, sale) => sum + (sale.totalBRL || 0), 0);
    const cuponsUsados = monthlyReportData.filter(sale => sale.couponCode).length;

    // Contar clientes únicos que fizeram primeira compra este mês
    const clientesUnicos = [...new Set(monthlyReportData.map(s => s.clientId))];

    document.getElementById('report-total-vendas').textContent = totalVendas;
    document.getElementById('report-receita-brl').textContent = `R$ ${receitaBRL.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
    document.getElementById('report-cupons-usados').textContent = cuponsUsados;
    document.getElementById('report-novos-clientes').textContent = clientesUnicos.length;
}

// Relatório de Cupons
function generateCouponReport() {
    const container = document.getElementById('report-cupons');
    if (!container) return;

    const couponStats = {};

    monthlyReportData.forEach(sale => {
        const coupon = sale.couponCode || 'Sem cupom';
        if (!couponStats[coupon]) {
            couponStats[coupon] = { count: 0, revenue: 0 };
        }
        couponStats[coupon].count++;
        couponStats[coupon].revenue += sale.totalBRL || 0;
    });

    const sorted = Object.entries(couponStats)
        .sort((a, b) => b[1].revenue - a[1].revenue)
        .slice(0, 10);

    if (sorted.length === 0) {
        container.innerHTML = '<p style="color: var(--text-secondary);">Nenhum dado disponível</p>';
        return;
    }

    container.innerHTML = sorted.map(([coupon, stats], index) => `
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid var(--border);">
            <div>
                <span style="color: var(--text-secondary); font-size: 12px;">#${index + 1}</span>
                <span style="margin-left: 8px; font-weight: 500; color: ${coupon === 'Sem cupom' ? 'var(--text-secondary)' : '#10b981'};">
                    ${coupon === 'Sem cupom' ? '—' : '🎫 ' + coupon}
                </span>
            </div>
            <div style="text-align: right;">
                <span style="font-weight: 600; color: var(--text-primary);">R$ ${stats.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                <span style="color: var(--text-secondary); font-size: 12px; margin-left: 8px;">(${stats.count}x)</span>
            </div>
        </div>
    `).join('');
}

// Relatório de Clientes
function generateClientReport() {
    const container = document.getElementById('report-clientes');
    if (!container) return;

    const clientStats = {};

    monthlyReportData.forEach(sale => {
        const clientId = sale.clientId || 'unknown';
        const clientName = sale.clientName || 'Desconhecido';
        if (!clientStats[clientId]) {
            clientStats[clientId] = { name: clientName, count: 0, revenue: 0 };
        }
        clientStats[clientId].count++;
        clientStats[clientId].revenue += sale.totalBRL || 0;
    });

    const sorted = Object.entries(clientStats)
        .sort((a, b) => b[1].revenue - a[1].revenue)
        .slice(0, 10);

    if (sorted.length === 0) {
        container.innerHTML = '<p style="color: var(--text-secondary);">Nenhum dado disponível</p>';
        return;
    }

    container.innerHTML = sorted.map(([id, stats], index) => `
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid var(--border);">
            <div style="display: flex; align-items: center; gap: 8px;">
                <span style="background: linear-gradient(135deg, #8b5cf6, #7c3aed); color: white; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: bold;">
                    ${index + 1}
                </span>
                <span style="font-weight: 500; color: var(--text-primary);">👤 ${stats.name}</span>
            </div>
            <div style="text-align: right;">
                <span style="font-weight: 600; color: #10b981;">R$ ${stats.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                <span style="color: var(--text-secondary); font-size: 12px; margin-left: 8px;">(${stats.count} compras)</span>
            </div>
        </div>
    `).join('');
}

// Relatório de Jogos
function generateGameReport() {
    const container = document.getElementById('report-jogos');
    if (!container) return;

    const gameStats = {};

    monthlyReportData.forEach(sale => {
        const game = sale.gameName || sale.game || 'Desconhecido';
        if (!gameStats[game]) {
            gameStats[game] = { count: 0, revenue: 0 };
        }
        gameStats[game].count++;
        gameStats[game].revenue += sale.totalBRL || 0;
    });

    const sorted = Object.entries(gameStats)
        .sort((a, b) => b[1].revenue - a[1].revenue);

    if (sorted.length === 0) {
        container.innerHTML = '<p style="color: var(--text-secondary);">Nenhum dado disponível</p>';
        return;
    }

    const maxRevenue = sorted[0][1].revenue;

    container.innerHTML = sorted.map(([game, stats], index) => {
        const percentage = ((stats.revenue / maxRevenue) * 100).toFixed(0);
        return `
            <div style="margin-bottom: 12px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                    <span style="font-weight: 500; color: var(--text-primary);">
                        🎮 ${game}
                    </span>
                    <span style="font-weight: 600; color: var(--text-primary);">
                        R$ ${stats.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                </div>
                <div style="background: var(--bg-tertiary); border-radius: 4px; height: 8px; overflow: hidden;">
                    <div style="background: linear-gradient(90deg, #3b82f6, #8b5cf6); width: ${percentage}%; height: 100%; border-radius: 4px; transition: width 0.5s ease;"></div>
                </div>
                <span style="color: var(--text-secondary); font-size: 11px;">${stats.count} vendas</span>
            </div>
        `;
    }).join('');
}

// Atualizar tabela de transações do mês
function updateTransactionsTable() {
    const tbody = document.getElementById('report-transactions-tbody');
    if (!tbody) return;

    if (monthlyReportData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: var(--text-secondary);">Nenhuma transação encontrada</td></tr>';
        return;
    }

    const sorted = [...monthlyReportData].sort((a, b) => b.timestamp - a.timestamp);

    tbody.innerHTML = sorted.map(sale => {
        const date = new Date(sale.timestamp).toLocaleDateString('pt-BR');
        const items = Array.isArray(sale.items)
            ? sale.items.map(i => i.pack || i.name || 'Item').join(', ').substring(0, 50)
            : '—';

        return `
            <tr>
                <td>${date}</td>
                <td>${sale.clientName || '—'}</td>
                <td>${sale.gameName || sale.game || '—'}</td>
                <td title="${items}">${items.length > 30 ? items.substring(0, 30) + '...' : items}</td>
                <td style="font-weight: 600; color: #10b981;">R$ ${(sale.totalBRL || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                <td>${sale.couponCode ? '🎫 ' + sale.couponCode : '—'}</td>
                <td>${sale.paymentMethod || '—'}</td>
            </tr>
        `;
    }).join('');
}

// Atualizar tabela de pré-cadastros de cashback
function updateCashbackTable() {
    const tbody = document.getElementById('report-cashback-tbody');
    if (!tbody) return;

    if (cashbackRegistrations.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: var(--text-secondary);">Nenhum pré-cadastro encontrado</td></tr>';
        return;
    }

    const sorted = [...cashbackRegistrations].sort((a, b) => b.timestamp - a.timestamp);

    tbody.innerHTML = sorted.map(reg => {
        const date = new Date(reg.timestamp).toLocaleDateString('pt-BR');
        const statusClass = reg.processed ? 'color: #10b981' : 'color: #f59e0b';
        const statusText = reg.processed ? '✅ Processado' : '⏳ Pendente';

        return `
            <tr>
                <td>${date}</td>
                <td style="font-weight: 500;">🎫 ${reg.couponCode || '—'}</td>
                <td>${reg.cpf || '—'}</td>
                <td>${reg.phone || '—'}</td>
                <td>${reg.email || '—'}</td>
                <td>${reg.username || '—'}</td>
                <td style="${statusClass}">${statusText}</td>
            </tr>
        `;
    }).join('');
}

// Exportar relatório mensal
function exportMonthlyReport() {
    const monthSelect = document.getElementById('report-month');
    const selectedMonth = monthSelect ? monthSelect.value : 'unknown';

    // Usando ponto-e-vírgula como separador (padrão Excel/Brasil)
    let csv = '\ufeffRelatório Mensal - ' + selectedMonth + '\n\n';

    // Resumo
    csv += 'RESUMO DO MÊS\n';
    csv += `Total de Vendas;${monthlyReportData.length}\n`;
    csv += `Receita BRL;${monthlyReportData.reduce((sum, s) => sum + (s.totalBRL || 0), 0).toFixed(2)}\n`;
    csv += `Cupons Utilizados;${monthlyReportData.filter(s => s.couponCode).length}\n\n`;

    // Transações
    csv += 'TRANSAÇÕES\n';
    csv += 'Data;Cliente;Jogo;Valor BRL;Cupom;Pagamento\n';
    monthlyReportData.forEach(sale => {
        const date = new Date(sale.timestamp).toLocaleDateString('pt-BR');
        const fields = [
            date,
            sale.clientName || '',
            sale.gameName || '',
            sale.totalBRL || 0,
            sale.couponCode || '',
            sale.paymentMethod || ''
        ];
        csv += fields.map(f => escapeCSVField(f)).join(';') + '\n';
    });

    csv += '\n\nPRÉ-CADASTROS DE CASHBACK\n';
    csv += 'Data;Cupom;CPF;Telefone;Email;Cliente Discord;Status\n';
    cashbackRegistrations.forEach(reg => {
        const date = new Date(reg.timestamp).toLocaleDateString('pt-BR');
        const fields = [
            date,
            reg.couponCode || '',
            reg.cpf || '',
            reg.phone || '',
            reg.email || '',
            reg.username || '',
            reg.processed ? 'Processado' : 'Pendente'
        ];
        csv += fields.map(f => escapeCSVField(f)).join(';') + '\n';
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relatorio_mensal_${selectedMonth}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    showToast('Relatório exportado com sucesso!', 'success');
}

// Expor funções de relatórios globalmente
window.loadMonthlyReports = loadMonthlyReports;
window.exportMonthlyReport = exportMonthlyReport;

// ═══════════════════════════════════════════════════════════════
// 📚 FAQ
// ═══════════════════════════════════════════════════════════════

let allFaqs = [];

async function loadFaqData() {
    try {
        const snap = await window.db.ref('faq').once('value');
        const data = snap.val() || {};
        allFaqs = Object.entries(data).map(([id, faq]) => ({
            id,
            question: faq.question || '',
            answer: faq.answer || '',
            category: faq.category || 'Geral',
            image: faq.image || '',
            createdAt: faq.createdAt || 0
        }));
        allFaqs.sort((a, b) => a.createdAt - b.createdAt);
        renderFaqList();
    } catch (err) {
        console.error('❌ Erro ao carregar FAQ:', err);
        showToast('Erro ao carregar FAQ', 'error');
    }
}

function renderFaqList() {
    const tbody = document.getElementById('faq-tbody');
    if (!tbody) return;

    const searchEl = document.getElementById('search-faq');
    const search = (searchEl?.value || '').toLowerCase();

    const filtered = allFaqs.filter(faq =>
        faq.question.toLowerCase().includes(search) ||
        faq.answer.toLowerCase().includes(search) ||
        faq.category.toLowerCase().includes(search)
    );

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; color: var(--text-secondary); padding: 30px;">Nenhuma pergunta encontrada</td></tr>`;
        return;
    }

    tbody.innerHTML = filtered.map(faq => `
        <tr>
            <td><span style="background: rgba(52,152,219,0.2); color: #3498db; padding: 3px 10px; border-radius: 12px; font-size: 12px;">${faq.category}</span></td>
            <td style="font-weight: 600;">${faq.question}</td>
            <td style="max-width: 400px; white-space: pre-wrap; font-size: 13px; color: var(--text-secondary);">${faq.answer.length > 150 ? faq.answer.slice(0, 150) + '...' : faq.answer}</td>
            <td>
                <button class="btn-action" onclick="editFaq('${faq.id}')" title="Editar">✏️</button>
                <button class="btn-action" onclick="deleteFaq('${faq.id}')" title="Excluir">🗑️</button>
            </td>
        </tr>
    `).join('');
}

function openFaqModal(faqId = null) {
    const modal = document.getElementById('modal-faq');
    if (!modal) return;

    const titleEl = document.getElementById('modal-faq-title');
    const btnEl = document.getElementById('modal-faq-btn');

    document.getElementById('faq-category').value = '';
    document.getElementById('faq-question').value = '';
    document.getElementById('faq-answer').value = '';
    document.getElementById('faq-image').value = '';

    if (faqId) {
        const faq = allFaqs.find(f => f.id === faqId);
        if (!faq) return;

        document.getElementById('faq-category').value = faq.category;
        document.getElementById('faq-question').value = faq.question;
        document.getElementById('faq-answer').value = faq.answer;
        document.getElementById('faq-image').value = faq.image || '';

        modal.dataset.faqId = faqId;
        if (titleEl) titleEl.textContent = '✏️ Editar Pergunta FAQ';
        if (btnEl) btnEl.textContent = '💾 Salvar Alterações';
    } else {
        delete modal.dataset.faqId;
        if (titleEl) titleEl.textContent = '📚 Nova Pergunta FAQ';
        if (btnEl) btnEl.textContent = '📚 Salvar';
    }

    modal.classList.add('active');
}

function closeFaqModal() {
    const modal = document.getElementById('modal-faq');
    if (modal) modal.classList.remove('active');
}

function saveFaq() {
    const modal = document.getElementById('modal-faq');
    if (!modal) return;

    const id = modal.dataset.faqId || null;
    const category = document.getElementById('faq-category').value.trim() || 'Geral';
    const question = document.getElementById('faq-question').value.trim();
    const answer = document.getElementById('faq-answer').value.trim();
    const image = normalizeImageUrl(document.getElementById('faq-image').value) || '';

    if (!question) {
        showToast('Digite a pergunta!', 'warning');
        return;
    }
    if (!answer) {
        showToast('Digite a resposta!', 'warning');
        return;
    }

    const faqData = {
        question,
        answer,
        category,
        image,
        createdAt: id ? (allFaqs.find(f => f.id === id)?.createdAt || Date.now()) : Date.now(),
        updatedAt: Date.now()
    };

    const ref = id ? window.db.ref(`faq/${id}`) : window.db.ref('faq').push();

    ref.set(faqData)
        .then(() => {
            const action = id ? 'atualizada' : 'criada';
            showToast(`Pergunta ${action} com sucesso!`, 'success');
            closeFaqModal();
            loadFaqData();
        })
        .catch(err => {
            showToast('Erro ao salvar: ' + err.message, 'error');
        });
}

function editFaq(faqId) {
    openFaqModal(faqId);
}

function deleteFaq(faqId) {
    if (!confirm('Deseja realmente excluir esta pergunta?')) return;

    window.db.ref(`faq/${faqId}`).remove()
        .then(() => {
            showToast('Pergunta excluída!', 'success');
            loadFaqData();
        })
        .catch(err => showToast('Erro: ' + err.message, 'error'));
}

// ═══════════════════════════════════════════════════════════════
// 🔗 ANALYTICS DE CONVITES (invite tracking + receita)
// ═══════════════════════════════════════════════════════════════

let allIndicacoes = [];         // cada registro de inviteTracking + gastoTotal calculado
let indicacoesRanking = [];     // agrupado por inviter com receita total

async function loadIndicacoesData() {
    try {
        const invitesSnap = await withTimeout(
            window.db.ref('inviteTracking').once('value'),
            15_000,
            'indicações'
        );
        const invitesData = invitesSnap.val() || {};

        // Busca somente os dois agregados dos clientes convidados. Antes esta aba
        // baixava as 32 mil vendas só para somar total/compras de poucos usuários.
        const gastosPorUser = {};   // userId -> { total: R$, count: N }
        const invitedIds = [...new Set(
            Object.values(invitesData).map(record => record?.invitedId).filter(Boolean)
        )];
        await Promise.all(invitedIds.map(async uid => {
            const [totalSnap, countSnap] = await Promise.all([
                window.db.ref(`clientes/${uid}/totalComprado`).once('value'),
                window.db.ref(`clientes/${uid}/compras`).once('value')
            ]);
            gastosPorUser[uid] = {
                total: Number(totalSnap.val()) || 0,
                count: Number(countSnap.val()) || 0
            };
        }));

        // Montar lista de indicações com gasto de cada convidado
        allIndicacoes = Object.entries(invitesData).map(([id, r]) => {
            const gastos = gastosPorUser[r.invitedId] || { total: 0, count: 0 };
            return { id, ...r, gastoTotal: gastos.total, compras: gastos.count };
        });
        allIndicacoes.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

        // Agrupar por inviter para ranking
        const porInviter = {};
        for (const rec of allIndicacoes) {
            const key = rec.inviterId;
            if (!porInviter[key]) {
                porInviter[key] = {
                    userId: key,
                    username: rec.inviterUsername || 'Desconhecido',
                    convites: 0,
                    compraram: 0,
                    receitaTotal: 0
                };
            }
            porInviter[key].convites += 1;
            porInviter[key].receitaTotal += rec.gastoTotal;
            if (rec.compras > 0) porInviter[key].compraram += 1;
        }
        indicacoesRanking = Object.values(porInviter).sort((a, b) => b.receitaTotal - a.receitaTotal);

        // Stats
        const totalConvites = allIndicacoes.length;
        const receitaTotal = allIndicacoes.reduce((sum, r) => sum + r.gastoTotal, 0);
        const compraram = allIndicacoes.filter(r => r.compras > 0).length;
        const topIndicador = indicacoesRanking[0];

        document.getElementById('indicacoes-total').textContent = totalConvites;
        document.getElementById('indicacoes-receita-total').textContent = `R$ ${receitaTotal.toFixed(2)}`;
        document.getElementById('indicacoes-compraram').textContent = `${compraram} / ${totalConvites}`;
        document.getElementById('indicacoes-top').textContent = topIndicador
            ? `${topIndicador.username} (R$ ${topIndicador.receitaTotal.toFixed(2)})`
            : '-';

        renderIndicacoesRanking();
        renderIndicacoesHistory();
        showToast(`${totalConvites} convites carregados`, 'info', 2000);
    } catch (err) {
        showToast('Erro ao carregar analytics de convites: ' + err.message, 'error');
    }
}

function renderIndicacoesRanking() {
    const tbody = document.getElementById('indicacoes-ranking-tbody');
    if (!tbody) return;

    if (indicacoesRanking.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color: var(--text-secondary);">Nenhum convite registrado</td></tr>';
        return;
    }

    const medals = ['🥇', '🥈', '🥉'];
    tbody.innerHTML = indicacoesRanking.map((e, i) => `
        <tr>
            <td>${medals[i] || (i + 1)}</td>
            <td><strong>${escapeHtml(e.username)}</strong><br><small style="color: var(--text-secondary);">${e.userId}</small></td>
            <td><strong>${e.convites}</strong></td>
            <td>${e.compraram} / ${e.convites}</td>
            <td><strong style="color: ${e.receitaTotal > 0 ? '#00b894' : 'var(--text-secondary)'};">R$ ${e.receitaTotal.toFixed(2)}</strong></td>
        </tr>
    `).join('');
}

function renderIndicacoesHistory() {
    const tbody = document.getElementById('indicacoes-history-tbody');
    if (!tbody) return;

    const searchTerm = (document.getElementById('search-indicacoes')?.value || '').toLowerCase();
    let filtered = allIndicacoes;
    if (searchTerm) {
        filtered = allIndicacoes.filter(r =>
            (r.inviterUsername || '').toLowerCase().includes(searchTerm) ||
            (r.invitedUsername || '').toLowerCase().includes(searchTerm) ||
            (r.inviteCode || '').toLowerCase().includes(searchTerm)
        );
    }

    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color: var(--text-secondary);">Nenhum convite encontrado</td></tr>';
        return;
    }

    tbody.innerHTML = filtered.slice(0, 200).map(r => {
        const date = r.timestamp ? new Date(r.timestamp).toLocaleString('pt-BR') : '-';
        const gastoColor = r.gastoTotal > 0 ? '#00b894' : 'var(--text-secondary)';
        return `
            <tr>
                <td>${date}</td>
                <td><strong>${escapeHtml(r.inviterUsername || '-')}</strong></td>
                <td>${escapeHtml(r.invitedUsername || '-')}</td>
                <td><code>${r.inviteCode || '-'}</code></td>
                <td><strong style="color: ${gastoColor};">R$ ${r.gastoTotal.toFixed(2)}</strong></td>
                <td>${r.compras > 0 ? r.compras : '<span style="color: var(--text-secondary);">0</span>'}</td>
            </tr>
        `;
    }).join('');
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ═══════════════════════════════════════════════════════════════
// 📜 LOGS DE TICKETS
// ═══════════════════════════════════════════════════════════════
let ticketLogsData = [];
let logsCurrentPage = 1;
const logsPerPage = 20;

async function loadTicketLogs() {
    try {
        setTableState('logs-tbody', 10, `Carregando os ${LOGS_RECENT_LIMIT} logs mais recentes...`);
        const query = window.db.ref('ticketLogs')
            .orderByChild('createdAt')
            .limitToLast(LOGS_RECENT_LIMIT);
        const snapshot = await withTimeout(query.once('value'), 30_000, 'logs de tickets');
        const raw = snapshot.val() || {};
        ticketLogsData = Object.entries(raw).map(([key, val]) => ({ id: key, ...val }));
        // Ordenar por data mais recente
        ticketLogsData.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

        // Stats
        const total = ticketLogsData.length;
        const vendas = ticketLogsData.filter(l => l.ticketType === 'compra' || l.ticketType === 'venda').length;
        const intermediacoes = ticketLogsData.filter(l => l.ticketType === 'intermediacao').length;
        const outros = total - vendas - intermediacoes;

        const setTxt = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
        setTxt('logs-total', total === LOGS_RECENT_LIMIT ? `${total} recentes` : total);
        setTxt('logs-vendas', vendas);
        setTxt('logs-intermediacoes', intermediacoes);
        setTxt('logs-outros', outros);

        logsCurrentPage = 1;
        renderTicketLogsTable();
    } catch (err) {
        console.error('❌ Erro ao carregar logs:', err);
        setTableState('logs-tbody', 10, err.message, 'error');
    }
}

function getFilteredLogs() {
    const search = (document.getElementById('search-logs')?.value || '').toLowerCase().trim();
    const typeFilter = document.getElementById('filter-logs-type')?.value || '';
    const fromDate = document.getElementById('filter-logs-from')?.value;
    const toDate = document.getElementById('filter-logs-to')?.value;
    const fromTs = fromDate ? new Date(fromDate).getTime() : 0;
    const toTs = toDate ? new Date(toDate + 'T23:59:59').getTime() : Infinity;

    return ticketLogsData.filter(log => {
        if (typeFilter && log.ticketType !== typeFilter) return false;
        const ts = log.createdAt || 0;
        if (ts < fromTs || ts > toTs) return false;
        if (search) {
            const haystack = [
                log.logCode, log.username, log.userId, log.game, log.gameName,
                log.officialOrderNumber, log.finalizedBy, log.paymentMethod,
                log.saleId, log.firebaseOrderId
            ].filter(Boolean).join(' ').toLowerCase();
            if (!haystack.includes(search)) return false;
        }
        return true;
    });
}

function renderTicketLogsTable() {
    const tbody = document.getElementById('logs-tbody');
    if (!tbody) return;

    const filtered = getFilteredLogs();
    const totalPages = Math.max(1, Math.ceil(filtered.length / logsPerPage));
    if (logsCurrentPage > totalPages) logsCurrentPage = totalPages;

    const start = (logsCurrentPage - 1) * logsPerPage;
    const page = filtered.slice(start, start + logsPerPage);

    if (page.length === 0) {
        tbody.innerHTML = '<tr><td colspan="10" style="text-align:center; padding: 40px; color: var(--text-secondary);">🔍 Nenhum log encontrado</td></tr>';
        renderLogsPagination(totalPages);
        return;
    }

    const typeLabels = {
        compra: '🛒 Compra',
        venda: '💸 Venda',
        intermediacao: '🔐 Intermédio',
        duvidas: '❓ Dúvidas'
    };

    tbody.innerHTML = page.map(log => {
        const date = log.createdAt ? new Date(log.createdAt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—';
        const typeLabel = typeLabels[log.ticketType] || log.ticketType || '—';
        const totalBRL = log.totalBRL ? `R$ ${Number(log.totalBRL).toFixed(2)}` : '—';

        return `<tr>
            <td><code style="background: rgba(139,92,246,0.2); color: #a78bfa; padding: 2px 8px; border-radius: 4px; font-weight: bold; cursor: pointer;" onclick="copyLogCode('${escapeHtml(log.logCode || '')}')" title="Clique para copiar">${escapeHtml(log.logCode || '—')}</code></td>
            <td>${typeLabel}</td>
            <td>
                <span style="font-weight: 600;">${escapeHtml(log.username || '—')}</span>
                ${log.userId ? `<br><span style="font-size: 11px; color: var(--text-secondary); font-family: monospace;">${log.userId}</span>` : ''}
            </td>
            <td>${escapeHtml(log.gameName || log.game || '—')}</td>
            <td style="font-weight: 600;">${totalBRL}</td>
            <td>${escapeHtml(log.paymentMethod || '—')}</td>
            <td>${log.officialOrderNumber ? `<code>${escapeHtml(String(log.officialOrderNumber))}</code>` : '—'}</td>
            <td>${escapeHtml(log.finalizedBy || '—')}</td>
            <td><span style="font-size: 12px;">${date}</span></td>
            <td style="text-align: center;">${log.messageCount || '—'}</td>
        </tr>`;
    }).join('');

    renderLogsPagination(totalPages);
}

function renderLogsPagination(totalPages) {
    const container = document.getElementById('logs-pagination');
    if (!container) return;
    if (totalPages <= 1) { container.innerHTML = ''; return; }

    let html = '';
    if (logsCurrentPage > 1) html += `<button onclick="logsGoToPage(${logsCurrentPage - 1})" class="btn-secondary" style="padding: 4px 10px;">‹</button>`;
    const start = Math.max(1, logsCurrentPage - 2);
    const end = Math.min(totalPages, logsCurrentPage + 2);
    for (let i = start; i <= end; i++) {
        html += `<button onclick="logsGoToPage(${i})" class="${i === logsCurrentPage ? 'btn-primary' : 'btn-secondary'}" style="padding: 4px 10px;">${i}</button>`;
    }
    if (logsCurrentPage < totalPages) html += `<button onclick="logsGoToPage(${logsCurrentPage + 1})" class="btn-secondary" style="padding: 4px 10px;">›</button>`;
    container.innerHTML = html;
}

function logsGoToPage(page) {
    logsCurrentPage = page;
    renderTicketLogsTable();
}

function copyLogCode(code) {
    if (!code) return;
    navigator.clipboard.writeText(code).then(() => {
        addLiveFeedItem(`Código ${code} copiado!`, 'success');
    }).catch(() => {});
}

// ═══════════════════════════════════════════════════════════════
// 🎟️ RELATÓRIO DE COMPRAS (data + jogos → participantes únicos)
// ═══════════════════════════════════════════════════════════════
// Lê vendasOficiais/, filtra status=finalizado, janela de paidAt em BRT,
// jogos selecionados (ou todos). Usado pra sorteios, prestação de contas,
// recortes por evento.
// ═══════════════════════════════════════════════════════════════

let _relatorioDados = null; // último resultado pra exportar/copy

function _brtRangeToUTC(dateInicioStr, dateFimStr) {
    // Inputs são "YYYY-MM-DD" do <input type=date>. BRT = UTC-3.
    // Início: 00:00:00 BRT = 03:00:00 UTC. Fim: 23:59:59.999 BRT = 02:59:59.999 do dia seguinte UTC.
    const [y1, m1, d1] = dateInicioStr.split('-').map(Number);
    const [y2, m2, d2] = dateFimStr.split('-').map(Number);
    const startMs = Date.UTC(y1, m1 - 1, d1, 3, 0, 0, 0);
    const endMs = Date.UTC(y2, m2 - 1, d2 + 1, 2, 59, 59, 999);
    return { startMs, endMs };
}

function _populateRelatorioGamesSelect() {
    const select = document.getElementById('relatorio-games-select');
    if (!select) return;
    if (select.options.length > 0) return; // já populado
    const games = Object.entries(registryGames || {}).sort((a, b) => {
        const na = (a[1]?.name || a[0]).toLowerCase();
        const nb = (b[1]?.name || b[0]).toLowerCase();
        return na.localeCompare(nb);
    });
    for (const [gameId, g] of games) {
        const opt = document.createElement('option');
        opt.value = gameId;
        opt.textContent = `${g?.name || gameId} (${gameId})`;
        select.appendChild(opt);
    }
}

function _initRelatorioDefaults() {
    // Default em BRT (não UTC). Se o user abrir após 21h BRT, .toISOString()
    // já avançou pra "amanhã" UTC e mostraria data errada como default.
    // toLocaleDateString('en-CA', tz=BRT) gera YYYY-MM-DD do dia em BRT.
    const fmtBRT = (d) => d.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
    const inicio = document.getElementById('relatorio-data-inicio');
    const fim = document.getElementById('relatorio-data-fim');
    if (inicio && !inicio.value) {
        const d = new Date();
        d.setDate(d.getDate() - 7);
        inicio.value = fmtBRT(d);
    }
    if (fim && !fim.value) {
        fim.value = fmtBRT(new Date());
    }
}

async function gerarRelatorio() {
    _populateRelatorioGamesSelect();
    _initRelatorioDefaults();

    const inicio = document.getElementById('relatorio-data-inicio').value;
    const fim = document.getElementById('relatorio-data-fim').value;
    if (!inicio || !fim) {
        showToast('Preencha as duas datas', 'error');
        return;
    }

    const select = document.getElementById('relatorio-games-select');
    const selectedGames = Array.from(select.selectedOptions).map(o => o.value);
    const filterByGame = selectedGames.length > 0;

    const { startMs, endMs } = _brtRangeToUTC(inicio, fim);
    if (endMs < startMs) {
        showToast('Data fim é anterior à data início', 'error');
        return;
    }

    showToast('Carregando vendas...', 'info');

    let salesObj = {};
    try {
        // Consulta apenas a janela pedida; não baixa o histórico inteiro.
        salesObj = await _fetchOfficialSalesRange(startMs, endMs);
    } catch (err) {
        showToast('Erro ao ler vendasOficiais: ' + err.message, 'error');
        return;
    }

    const byGame = new Map();    // gameId -> { gameName, count, totalBRL, users:Set }
    const users = new Map();     // userId -> { username, userTag, count, totalBRL, games:Set }
    let totalVendas = 0;
    let totalBRL = 0;

    for (const [orderKey, sale] of Object.entries(salesObj)) {
        if (!sale || sale.status !== 'finalizado') continue;
        const ts = Number(sale.paidAt) || Number(sale.timestamp) || Number(sale.createdAt) || 0;
        if (ts < startMs || ts > endMs) continue;
        if (filterByGame && !selectedGames.includes(sale.game)) continue;

        totalVendas++;
        const brl = Number(sale.totalBRL) || 0;
        totalBRL += brl;

        const gid = sale.game || 'unknown';
        if (!byGame.has(gid)) {
            byGame.set(gid, {
                gameName: sale.gameName || (registryGames[gid]?.name) || gid,
                count: 0, totalBRL: 0, users: new Set()
            });
        }
        const g = byGame.get(gid);
        g.count++;
        g.totalBRL += brl;

        const uid = String(sale.userId || sale.clientId || 'unknown');
        g.users.add(uid);
        if (!users.has(uid)) {
            users.set(uid, {
                username: sale.username || sale.clientName || '(sem username)',
                userTag: sale.clientTag || sale.userTag || null,
                count: 0, totalBRL: 0, games: new Set()
            });
        }
        const u = users.get(uid);
        u.count++;
        u.totalBRL += brl;
        u.games.add(gid);
    }

    // Render resumo
    document.getElementById('relatorio-empty').style.display = 'none';
    document.getElementById('relatorio-resumo').style.display = 'block';
    document.getElementById('relatorio-total-vendas').textContent = totalVendas;
    document.getElementById('relatorio-total-users').textContent = users.size;
    document.getElementById('relatorio-total-brl').textContent =
        'R$ ' + totalBRL.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    // Tabela por jogo
    const byGameTbody = document.getElementById('relatorio-by-game-tbody');
    const byGameRows = [...byGame.entries()].sort((a, b) => b[1].count - a[1].count);
    byGameTbody.innerHTML = byGameRows.map(([gid, g]) => `
        <tr>
            <td>${g.gameName} <span style="color: var(--text-secondary); font-size: 11px;">(${gid})</span></td>
            <td>${g.count}</td>
            <td>R$ ${g.totalBRL.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            <td>${g.users.size}</td>
        </tr>
    `).join('') || '<tr><td colspan="4" style="text-align:center; color: var(--text-secondary);">Nenhuma venda no período</td></tr>';

    // Tabela de participantes únicos
    const usersTbody = document.getElementById('relatorio-users-tbody');
    const userRows = [...users.entries()]
        .map(([uid, u]) => ({ uid, ...u }))
        .sort((a, b) => b.totalBRL - a.totalBRL);
    usersTbody.innerHTML = userRows.map(u => `
        <tr>
            <td>${u.username}${u.userTag ? ` <span style="color: var(--text-secondary); font-size: 11px;">[${u.userTag}]</span>` : ''}</td>
            <td style="font-family: monospace; font-size: 12px;">${u.uid}</td>
            <td>${u.count}</td>
            <td>R$ ${u.totalBRL.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            <td style="font-size: 11px;">${[...u.games].join(', ')}</td>
        </tr>
    `).join('') || '<tr><td colspan="5" style="text-align:center; color: var(--text-secondary);">Nenhum participante</td></tr>';

    _relatorioDados = { startMs, endMs, selectedGames, totalVendas, totalBRL, byGame: byGameRows, users: userRows };
    showToast(`✅ ${totalVendas} venda(s), ${users.size} pessoa(s) únicas`, 'success');
}

function exportarRelatorioCSV() {
    if (!_relatorioDados || _relatorioDados.users.length === 0) {
        showToast('Gere o relatório antes de exportar', 'warning');
        return;
    }
    const header = ['username', 'userId', 'userTag', 'compras', 'totalBRL', 'jogos'];
    const rows = _relatorioDados.users.map(u => [
        u.username,
        u.uid,
        u.userTag || '',
        u.count,
        u.totalBRL.toFixed(2),
        [...u.games].join('|')
    ]);
    const csv = [header, ...rows]
        .map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
        .join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relatorio-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('CSV baixado', 'success');
}

function copiarMentionsRelatorio() {
    if (!_relatorioDados || _relatorioDados.users.length === 0) {
        showToast('Gere o relatório antes', 'warning');
        return;
    }
    const mentions = _relatorioDados.users.map(u => `<@${u.uid}>`).join(' ');
    navigator.clipboard.writeText(mentions).then(() => {
        showToast(`📋 ${_relatorioDados.users.length} mentions copiadas`, 'success');
    }).catch(() => showToast('Falha ao copiar', 'error'));
}

// Popular dropdown de jogos quando abrir a aba de relatório.
// Usa o mesmo handler do painel — registry pode não estar carregado ainda
// quando o user troca de aba, então tentamos popular sob demanda.
onDashboardDomReady(() => {
    document.querySelectorAll('a[data-tab="relatorio"]').forEach(link => {
        link.addEventListener('click', () => {
            setTimeout(() => {
                _populateRelatorioGamesSelect();
                _initRelatorioDefaults();
            }, 100);
        });
    });
});

// ═══════════════════════════════════════════════════════════════
// 🚫 BLACKLIST WEMIX (anti-golpe)
// ═══════════════════════════════════════════════════════════════
// Lê/escreve em `wemixBlacklist/<wallet>` no Firebase Realtime DB.
// Wallets estáticas no bot.txt do servidor NÃO aparecem aqui (precisa
// editar manualmente). Esta UI gerencia apenas as dinâmicas.

let _blacklistCache = [];

async function loadBlacklistData() {
    const tbody = document.getElementById('blacklist-tbody');
    if (tbody) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 20px; color: var(--text-secondary);">Carregando...</td></tr>';
    }
    try {
        if (!window.db) throw new Error('Firebase não inicializado');
        const snap = await window.db.ref('wemixBlacklist').once('value');
        const data = snap.val() || {};
        _blacklistCache = Object.keys(data).map(wallet => ({
            wallet,
            ...data[wallet]
        })).sort((a, b) => (b.addedAt || 0) - (a.addedAt || 0));

        const totalEl = document.getElementById('blacklist-total');
        if (totalEl) totalEl.textContent = String(_blacklistCache.length);

        renderBlacklistTable();
    } catch (err) {
        console.error('❌ Erro ao carregar blacklist:', err);
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding: 20px; color: var(--danger);">Erro ao carregar: ${err.message}<br><small>Verifique se as regras Firebase liberam o path <code>wemixBlacklist</code>.</small></td></tr>`;
        }
    }
}

function renderBlacklistTable() {
    const tbody = document.getElementById('blacklist-tbody');
    if (!tbody) return;
    const search = (document.getElementById('search-blacklist')?.value || '').toLowerCase().trim();

    const filtered = !search ? _blacklistCache : _blacklistCache.filter(item => {
        const haystack = `${item.wallet} ${item.reason || ''} ${item.addedByTag || ''} ${item.addedBy || ''}`.toLowerCase();
        return haystack.includes(search);
    });

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding: 20px; color: var(--text-secondary);">${_blacklistCache.length === 0 ? 'Nenhuma wallet bloqueada via painel ainda.' : 'Nenhum resultado pra essa busca.'}</td></tr>`;
        return;
    }

    tbody.innerHTML = filtered.map(item => {
        const dateStr = item.addedAt
            ? new Date(item.addedAt).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })
            : '-';
        const by = item.addedByTag || item.addedBy || '-';
        const reason = item.reason || '-';
        const walletShort = `${item.wallet.slice(0, 10)}...${item.wallet.slice(-8)}`;
        return `
            <tr>
                <td><code style="font-size: 11px;" title="${item.wallet}">${walletShort}</code> <button class="btn-link" onclick="navigator.clipboard.writeText('${item.wallet}'); this.textContent='✓'" style="background:none;border:none;cursor:pointer;color:var(--primary);font-size:11px;">📋</button></td>
                <td>${dateStr}</td>
                <td>${escapeHtml(by)}</td>
                <td>${escapeHtml(reason)}</td>
                <td><button class="btn-danger" onclick="removeWalletFromBlacklist('${item.wallet}')" style="padding: 4px 10px; font-size: 12px;">🗑️ Remover</button></td>
            </tr>
        `;
    }).join('');
}

function openAddWalletModal() {
    const modal = document.getElementById('modal-blacklist-add');
    if (!modal) return;
    document.getElementById('new-blacklist-wallet').value = '';
    document.getElementById('new-blacklist-reason').value = '';
    modal.classList.add('show');
    setTimeout(() => document.getElementById('new-blacklist-wallet')?.focus(), 100);
}

function closeAddWalletModal() {
    document.getElementById('modal-blacklist-add')?.classList.remove('show');
}

async function submitAddWallet() {
    const walletInput = (document.getElementById('new-blacklist-wallet')?.value || '').trim().toLowerCase();
    const reason = (document.getElementById('new-blacklist-reason')?.value || '').trim() || '(não informado)';

    if (!/^0x[a-f0-9]{40}$/.test(walletInput)) {
        alert('❌ Endereço inválido. Formato esperado: 0x + 40 caracteres hex (a-f e 0-9).');
        return;
    }

    try {
        // Quem é o usuário logado? Pega do localStorage se houver, senão "painel-admin"
        let addedByTag = 'painel-admin';
        try {
            const user = JSON.parse(localStorage.getItem('adminUser') || '{}');
            if (user.username) addedByTag = user.username;
        } catch (_) {}

        await window.db.ref(`wemixBlacklist/${walletInput}`).set({
            addedBy: 'painel',
            addedByTag,
            addedAt: Date.now(),
            reason
        });

        closeAddWalletModal();
        await loadBlacklistData();

        if (typeof showToast === 'function') {
            showToast(`🚫 Wallet ${walletInput.slice(0, 12)}... bloqueada`, 'success');
        }
    } catch (err) {
        console.error('❌ Erro ao adicionar wallet:', err);
        alert('❌ Erro ao adicionar: ' + err.message);
    }
}

async function removeWalletFromBlacklist(wallet) {
    const walletNorm = wallet.toLowerCase().trim();
    if (!confirm(`Tem certeza que quer DESBLOQUEAR esta wallet?\n\n${walletNorm}\n\nEla voltará a poder receber WEMIX.`)) return;

    try {
        await window.db.ref(`wemixBlacklist/${walletNorm}`).remove();
        await loadBlacklistData();
        if (typeof showToast === 'function') {
            showToast(`✅ Wallet desbloqueada`, 'success');
        }
    } catch (err) {
        console.error('❌ Erro ao remover wallet:', err);
        alert('❌ Erro ao remover: ' + err.message);
    }
}

// Helper de escape HTML (caso `escapeHtml` global não exista)
if (typeof escapeHtml === 'undefined') {
    window.escapeHtml = function(s) {
        if (s == null) return '';
        return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    };
}
