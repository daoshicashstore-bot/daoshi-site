// ===== CONFIGURAÇÃO DO FIREBASE =====
// IMPORTANTE: Substitua com suas credenciais do Firebase Console

const firebaseConfig = {
  apiKey: "AIzaSyAbjxyNODIVtz8p-6v6fD3MwdQd9at-2lo",
  authDomain: "sitedaoshi.firebaseapp.com",
  databaseURL: "https://sitedaoshi-default-rtdb.firebaseio.com",
  projectId: "sitedaoshi",
  storageBucket: "sitedaoshi.firebasestorage.app",
  messagingSenderId: "235166183885",
  appId: "1:235166183885:web:54aa0f47a04d7723365484"
};

// Inicializar Firebase
try {
  firebase.initializeApp(firebaseConfig);
  console.log('✅ Firebase inicializado com sucesso!');
} catch (error) {
  console.error('❌ Erro ao inicializar Firebase:', error);
}

// Referências do Firebase
const auth = firebase.auth();
const database = firebase.database();

// Configurar provedor do Google
const googleProvider = new firebase.auth.GoogleAuthProvider();

// ===== INSTRUÇÕES DE CONFIGURAÇÃO =====
/*
🔥 COMO CONFIGURAR O FIREBASE:

1. Acesse: https://console.firebase.google.com/
2. Clique em "Adicionar projeto"
3. Dê um nome (ex: daoshi-typing-game)
4. Desabilite o Google Analytics (opcional)
5. Clique em "Criar projeto"

6. No painel do projeto, clique no ícone da Web (</>)
7. Registre o app (nome: Daoshi Typing)
8. Copie as credenciais do firebaseConfig acima

9. No menu lateral, vá em "Authentication"
10. Clique em "Primeiros passos"
11. Ative "E-mail/senha" e "Google"
12. Salve

13. No menu lateral, vá em "Realtime Database"
14. Clique em "Criar banco de dados"
15. Escolha localização (us-central1)
16. Inicie em "Modo de teste" (por enquanto)
17. Clique em "Ativar"

18. Nas "Regras" do Realtime Database, cole:
{
  "rules": {
    "users": {
      "$uid": {
        ".read": "auth != null",
        ".write": "$uid === auth.uid"
      }
    },
    "rankings": {
      ".read": true,
      ".write": "auth != null",
      "$recordId": {
        ".validate": "newData.hasChildren(['userId', 'username', 'wpm', 'accuracy', 'time', 'timestamp'])"
      }
    }
  }
}

19. Volte para este arquivo e substitua as credenciais
20. Pronto! O ranking online funcionará perfeitamente 🚀

📌 DOMÍNIOS AUTORIZADOS:
- localhost (já está autorizado)
- SEU_DOMINIO.github.io (adicione em Authentication > Settings > Authorized domains)

*/
