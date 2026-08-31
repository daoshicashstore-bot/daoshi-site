(function secureHubAdminBootstrap() {
    'use strict';

    const HUB_ADMIN_EMAIL = 'hub-admin@daoshi.com.br';
    const DASHBOARD_SCRIPT = 'painel-admin.js?v=12';
    let dashboardLoaded = false;

    function ensureLoginUi() {
        if (document.getElementById('hub-auth-gate')) return;

        const style = document.createElement('style');
        style.textContent = `
            #hub-auth-gate {
                position: fixed;
                inset: 0;
                z-index: 2147483647;
                display: grid;
                place-items: center;
                padding: 24px;
                background:
                    radial-gradient(circle at 20% 20%, rgba(124, 58, 237, .2), transparent 38%),
                    radial-gradient(circle at 80% 80%, rgba(236, 72, 153, .16), transparent 42%),
                    #070b16;
                color: #f8fafc;
                font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
            }
            #hub-auth-card {
                width: min(430px, 100%);
                padding: 30px;
                border: 1px solid rgba(148, 163, 184, .24);
                border-radius: 20px;
                background: rgba(15, 23, 42, .96);
                box-shadow: 0 30px 80px rgba(0, 0, 0, .45);
            }
            #hub-auth-card h1 { margin: 0 0 8px; font-size: 25px; }
            #hub-auth-card p { margin: 0 0 22px; color: #94a3b8; line-height: 1.5; }
            #hub-auth-card label {
                display: block;
                margin-bottom: 8px;
                color: #cbd5e1;
                font-size: 13px;
                font-weight: 700;
            }
            #hub-auth-password {
                width: 100%;
                padding: 13px 14px;
                border: 1px solid #334155;
                border-radius: 10px;
                outline: none;
                background: #0b1220;
                color: #f8fafc;
                font: inherit;
            }
            #hub-auth-password:focus {
                border-color: #8b5cf6;
                box-shadow: 0 0 0 3px rgba(139, 92, 246, .18);
            }
            #hub-auth-submit {
                width: 100%;
                margin-top: 14px;
                padding: 13px 16px;
                border: 0;
                border-radius: 10px;
                cursor: pointer;
                background: linear-gradient(135deg, #7c3aed, #db2777);
                color: #fff;
                font: inherit;
                font-weight: 800;
            }
            #hub-auth-submit:disabled { cursor: wait; opacity: .65; }
            #hub-auth-error {
                min-height: 20px;
                margin: 12px 0 0;
                color: #fda4af;
                font-size: 13px;
            }
            #hub-auth-account {
                margin: 16px 0 0;
                color: #64748b;
                font-size: 11px;
                text-align: center;
            }
        `;
        document.head.appendChild(style);

        const gate = document.createElement('div');
        gate.id = 'hub-auth-gate';
        gate.innerHTML = `
            <form id="hub-auth-card" autocomplete="on">
                <h1>Daoshi HUB</h1>
                <p>Área administrativa protegida. Entre para acessar preços, CRM e relatórios.</p>
                <label for="hub-auth-password">Senha do HUB</label>
                <input
                    id="hub-auth-password"
                    name="password"
                    type="password"
                    autocomplete="current-password"
                    required
                    minlength="12"
                    autofocus
                >
                <button id="hub-auth-submit" type="submit">Entrar com segurança</button>
                <div id="hub-auth-error" role="alert" aria-live="polite"></div>
                <div id="hub-auth-account">Conta administrativa: ${HUB_ADMIN_EMAIL}</div>
            </form>
        `;
        document.body.appendChild(gate);

        gate.querySelector('#hub-auth-card').addEventListener('submit', login);
    }

    function setLoginState({ busy = false, error = '' } = {}) {
        const button = document.getElementById('hub-auth-submit');
        const input = document.getElementById('hub-auth-password');
        const message = document.getElementById('hub-auth-error');
        if (button) {
            button.disabled = busy;
            button.textContent = busy ? 'Verificando...' : 'Entrar com segurança';
        }
        if (input) input.disabled = busy;
        if (message) message.textContent = error;
    }

    function friendlyAuthError(error) {
        const code = String(error && error.code || '');
        if (
            code === 'auth/wrong-password' ||
            code === 'auth/invalid-credential' ||
            code === 'auth/user-not-found' ||
            code === 'auth/invalid-login-credentials'
        ) {
            return 'Senha incorreta.';
        }
        if (code === 'auth/too-many-requests') {
            return 'Muitas tentativas. Aguarde alguns minutos e tente novamente.';
        }
        if (code === 'auth/network-request-failed') {
            return 'Falha de conexão. Verifique a internet e tente novamente.';
        }
        return 'Não foi possível entrar. Tente novamente.';
    }

    async function login(event) {
        event.preventDefault();
        const input = document.getElementById('hub-auth-password');
        const password = input ? input.value : '';
        if (!password) return;

        setLoginState({ busy: true });
        try {
            await firebase.auth().signInWithEmailAndPassword(HUB_ADMIN_EMAIL, password);
        } catch (error) {
            setLoginState({ error: friendlyAuthError(error) });
        }
    }

    async function authorize(user) {
        ensureLoginUi();
        if (!user) {
            setLoginState();
            return;
        }

        try {
            const token = await user.getIdTokenResult(true);
            if (token.claims.role !== 'admin' || token.claims.hubAdmin !== true) {
                await firebase.auth().signOut();
                setLoginState({ error: 'Esta conta não possui permissão administrativa.' });
                return;
            }

            const gate = document.getElementById('hub-auth-gate');
            if (gate) gate.remove();
            loadDashboard();
        } catch (error) {
            await firebase.auth().signOut().catch(function () {});
            setLoginState({ error: 'Não foi possível validar a permissão. Tente novamente.' });
        }
    }

    function loadDashboard() {
        if (dashboardLoaded) return;
        dashboardLoaded = true;
        const script = document.createElement('script');
        script.src = DASHBOARD_SCRIPT;
        script.defer = true;
        script.onerror = function () {
            dashboardLoaded = false;
            ensureLoginUi();
            setLoginState({ error: 'Falha ao carregar o HUB. Atualize a página.' });
        };
        document.body.appendChild(script);
    }

    ensureLoginUi();
    firebase.auth().setPersistence(firebase.auth.Auth.Persistence.SESSION)
        .then(function () {
            firebase.auth().onAuthStateChanged(authorize);
        })
        .catch(function () {
            setLoginState({ error: 'Não foi possível iniciar a sessão segura.' });
        });
})();
