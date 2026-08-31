// ============================================
// 🔥 FIREBASE CONFIG - ORDERS PANEL
// ============================================
// Suporta dois ambientes:
//   - prod  (default): Firebase real do Daoshi Store
//   - test  (?env=test): Firebase isolado usado pelo bot de teste
//
// Como ativar modo teste:
//   - Acesse qualquer página do painel com ?env=test (ex: dog.html?env=test)
//   - A escolha persiste em sessionStorage durante a aba inteira
//   - Pra voltar pra prod: feche a aba ou abra com ?env=prod
// ============================================

(function () {
    const FIREBASE_PROD = {
        apiKey: "AIzaSyD6vn4IagySnIJ-0knlelyZmIWNV7qJnKk",
        authDomain: "daoshi-bot.firebaseapp.com",
        databaseURL: "https://daoshi-bot-default-rtdb.firebaseio.com",
        projectId: "daoshi-bot",
        storageBucket: "daoshi-bot.firebasestorage.app",
        messagingSenderId: "472062549464",
        appId: "1:472062549464:web:086c1c07d63a11ce3ca6ad"
    };

    const FIREBASE_TEST = {
        apiKey: "AIzaSyAFbKncBomggS_UcjK4B07vjUhCWQTeHso",
        authDomain: "bot-daoshi-teste.firebaseapp.com",
        databaseURL: "https://bot-daoshi-teste-default-rtdb.firebaseio.com",
        projectId: "bot-daoshi-teste"
    };

    // Resolve env: querystring tem prioridade, senão sessionStorage, senão prod.
    function resolveEnv() {
        try {
            const qs = new URLSearchParams(window.location.search);
            const fromQs = qs.get('env');
            if (fromQs === 'test' || fromQs === 'prod') {
                sessionStorage.setItem('daoshi_env', fromQs);
                return fromQs;
            }
            const fromSession = sessionStorage.getItem('daoshi_env');
            if (fromSession === 'test') return 'test';
        } catch (_) { /* sessionStorage indisponível */ }
        return 'prod';
    }

    const env = resolveEnv();
    const firebaseConfig = env === 'test' ? FIREBASE_TEST : FIREBASE_PROD;
    window.DAOSHI_ENV = env;

    if (typeof firebase !== 'undefined') {
        firebase.initializeApp(firebaseConfig);
        window.db = firebase.database();
        const tag = env === 'test' ? '🧪 TESTE' : '✅ PROD';
        console.log(`${tag} Firebase inicializado: ${firebaseConfig.databaseURL}`);
    } else {
        console.error('❌ Firebase SDK não carregado!');
    }

    // Banner visível apenas em modo teste — evita que fornecedor confunda
    // contexto e ache que tá vendo pedidos reais.
    if (env === 'test') {
        const inject = () => {
            if (document.getElementById('daoshi-env-banner')) return;
            const div = document.createElement('div');
            div.id = 'daoshi-env-banner';
            div.textContent = '🧪 MODO TESTE — Firebase isolado';
            div.style.cssText = [
                'position:fixed', 'top:8px', 'right:8px', 'z-index:99999',
                'background:#ff9800', 'color:#000', 'font-weight:bold',
                'padding:6px 12px', 'border-radius:6px',
                'font-family:system-ui,sans-serif', 'font-size:12px',
                'box-shadow:0 2px 8px rgba(0,0,0,0.3)', 'pointer-events:none'
            ].join(';');
            document.body.appendChild(div);
        };
        if (document.body) inject();
        else document.addEventListener('DOMContentLoaded', inject);
    }
})();
