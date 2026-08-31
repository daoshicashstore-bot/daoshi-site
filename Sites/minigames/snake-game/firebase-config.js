// ===== CONFIGURAÇÃO DO FIREBASE =====
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
  console.log('✅ Firebase inicializado com sucesso! (Daoshi Snake)');
} catch (error) {
  console.error('❌ Erro ao inicializar Firebase:', error);
}

// Referências do Firebase
const auth = firebase.auth();
const database = firebase.database();

// Configurar provedor do Google
const googleProvider = new firebase.auth.GoogleAuthProvider();
