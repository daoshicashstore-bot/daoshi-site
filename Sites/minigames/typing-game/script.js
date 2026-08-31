function startRankingAutoRefresh() {
  stopRankingAutoRefresh();
  rankingRefreshInterval = setInterval(() => {
    loadRanking(currentRankingFilter, false);
  }, RANKING_REFRESH_MS);
}

function stopRankingAutoRefresh() {
  if (rankingRefreshInterval) {
    clearInterval(rankingRefreshInterval);
    rankingRefreshInterval = null;
  }
}

// ===== DAOSHI TYPING GAME - SCRIPT PRINCIPAL =====

// ===== ÁUDIO =====
const audioContext = new (window.AudioContext || window.webkitAudioContext)();

// Função para tocar som de digitação sintético com pitch aleatório
function playTypeSound() {
  if (!gameStarted) return;
  
  const now = audioContext.currentTime;
  
  // Criar oscilador (tom)
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  
  // Pitch aleatório entre 800Hz e 1200Hz (variação de ~20%)
  const basePitch = 1000;
  const randomPitch = basePitch * (0.8 + Math.random() * 0.4);
  oscillator.frequency.value = randomPitch;
  
  // Tipo de onda (square = som mais "clicky" de teclado)
  oscillator.type = 'square';
  
  // Envelope ADSR para som de clique de teclado
  gainNode.gain.setValueAtTime(0, now);
  gainNode.gain.linearRampToValueAtTime(0.08, now + 0.005); // Attack
  gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.02); // Decay
  gainNode.gain.linearRampToValueAtTime(0, now + 0.05); // Release
  
  // Conectar
  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  
  // Tocar
  oscillator.start(now);
  oscillator.stop(now + 0.05);
}

// ===== VARIÁVEIS GLOBAIS =====
let currentUser = null;
let gameWords = [];
let currentWordIndex = 0;
let currentLetterIndex = 0;
let gameStarted = false;
let gameEnded = false;
let startTime = null;
let timerInterval = null;
let selectedTime = 15;
let correctWords = 0;
let wrongWords = 0;
let totalTypedChars = 0;
let correctTypedChars = 0;

const rankedTimes = [15, 30, 60];

let currentRankingFilter = '15';
let rankingRefreshInterval = null;
const RANKING_REFRESH_MS = 5000;

// Novas variáveis para sistema de modos
let gameMode = 'casual'; // 'casual' ou 'ranked'
let rankedReady = false;
let antiCheatValidation = null;
let devToolsOpen = false;

// ===== ANTI-CHEAT: DETECÇÃO DE DEVTOOLS =====
// Detecta se o DevTools está aberto através de diferença de timing
// ou verificação de debugger em modo ranqueado
function detectDevTools() {
  const threshold = 160;
  const widthThreshold = window.outerWidth - window.innerWidth > threshold;
  const heightThreshold = window.outerHeight - window.innerHeight > threshold;
  
  if (widthThreshold || heightThreshold) {
    if (gameMode === 'ranked' && gameStarted && !gameEnded) {
      devToolsOpen = true;
      showToast('⚠️ DevTools detectado! Partida invalidada.', 'error');
    }
  }
}

// Verificar DevTools periodicamente durante partida ranqueada
setInterval(() => {
  if (gameMode === 'ranked' && gameStarted && !gameEnded) {
    detectDevTools();
  }
}, 500);

// Detectar abertura via debugger statement
(function() {
  const devtools = { open: false };
  const element = new Image();
  Object.defineProperty(element, 'id', {
    get: function() {
      devtools.open = true;
      if (gameMode === 'ranked' && gameStarted && !gameEnded) {
        devToolsOpen = true;
      }
    }
  });
  
  setInterval(() => {
    devtools.open = false;
    console.log('%c', element);
    if (devtools.open) {
      if (gameMode === 'ranked' && gameStarted && !gameEnded) {
        devToolsOpen = true;
        showToast('⚠️ DevTools detectado! Partida invalidada.', 'error');
      }
    }
  }, 1000);
})();

// ===== ELEMENTOS DOM =====
const authModal = document.getElementById('authModal');
const app = document.getElementById('app');
const wordsContainer = document.getElementById('wordsContainer');
const wordInput = document.getElementById('wordInput');
const timerDisplay = document.getElementById('timer');
const wpmDisplay = document.getElementById('wpm');
const accuracyDisplay = document.getElementById('accuracy');
const resultModal = document.getElementById('resultModal');

// ===== AUTENTICAÇÃO =====

// Verificar estado de autenticação
auth.onAuthStateChanged(user => {
  if (user) {
    currentUser = user;
    showApp();
    updateUserInfo();
    loadStats();
    loadHistory();
  } else {
    currentUser = null;
    showAuthModal();
  }
});

function showAuthModal() {
  authModal.classList.remove('hidden');
  app.style.display = 'none';
}

function closeAuthModal() {
  authModal.classList.add('hidden');
}

function showApp() {
  authModal.classList.add('hidden');
  app.style.display = 'block';
  initGame();
}

function switchAuthTab(tab) {
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');
  const tabs = document.querySelectorAll('.auth-tab');
  
  tabs.forEach(t => t.classList.remove('active'));
  
  if (tab === 'login') {
    loginForm.classList.add('active');
    registerForm.classList.remove('active');
    tabs[0].classList.add('active');
  } else {
    loginForm.classList.remove('active');
    registerForm.classList.add('active');
    tabs[1].classList.add('active');
  }
  
  hideAuthError();
}

function showAuthError(message) {
  const errorDiv = document.getElementById('authError');
  errorDiv.textContent = message;
  errorDiv.classList.add('show');
}

function hideAuthError() {
  const errorDiv = document.getElementById('authError');
  errorDiv.classList.remove('show');
}

// Login com Email
async function loginWithEmail() {
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  
  if (!email || !password) {
    showAuthError('⚠️ Preencha todos os campos!');
    return;
  }
  
  try {
    await auth.signInWithEmailAndPassword(email, password);
    showToast('✅ Login realizado com sucesso!', 'success');
  } catch (error) {
    console.error('Erro no login:', error);
    let errorMessage = 'Erro ao fazer login. Tente novamente.';
    
    if (error.code === 'auth/user-not-found') {
      errorMessage = '❌ Usuário não encontrado!';
    } else if (error.code === 'auth/wrong-password') {
      errorMessage = '❌ Senha incorreta!';
    } else if (error.code === 'auth/invalid-email') {
      errorMessage = '❌ Email inválido!';
    }
    
    showAuthError(errorMessage);
  }
}

// Registrar com Email
async function registerWithEmail() {
  const username = document.getElementById('registerUsername').value.trim();
  const email = document.getElementById('registerEmail').value.trim();
  const password = document.getElementById('registerPassword').value;
  
  if (!username || !email || !password) {
    showAuthError('⚠️ Preencha todos os campos!');
    return;
  }
  
  if (username.length < 3) {
    showAuthError('⚠️ Nome de usuário deve ter no mínimo 3 caracteres!');
    return;
  }
  
  if (password.length < 6) {
    showAuthError('⚠️ Senha deve ter no mínimo 6 caracteres!');
    return;
  }
  
  try {
    const userCredential = await auth.createUserWithEmailAndPassword(email, password);
    const user = userCredential.user;
    
    // Atualizar perfil com o username
    await user.updateProfile({
      displayName: username
    });
    
    // Salvar dados adicionais no Realtime Database
    await database.ref('users/' + user.uid).set({
      username: username,
      email: email,
      createdAt: Date.now(),
      stats: {
        totalGames: 0,
        bestWPM: 0,
        avgAccuracy: 0,
        totalWords: 0
      },
      records: {}
    });
    
    showToast('✅ Conta criada com sucesso!', 'success');
  } catch (error) {
    console.error('Erro no registro:', error);
    let errorMessage = 'Erro ao criar conta. Tente novamente.';
    
    if (error.code === 'auth/email-already-in-use') {
      errorMessage = '❌ Este email já está em uso!';
    } else if (error.code === 'auth/invalid-email') {
      errorMessage = '❌ Email inválido!';
    } else if (error.code === 'auth/weak-password') {
      errorMessage = '❌ Senha muito fraca!';
    }
    
    showAuthError(errorMessage);
  }
}

// Login com Google
async function loginWithGoogle() {
  try {
    const result = await auth.signInWithPopup(googleProvider);
    const user = result.user;
    
    // Verificar se é primeira vez do usuário
    const userRef = database.ref('users/' + user.uid);
    const snapshot = await userRef.once('value');
    
    if (!snapshot.exists()) {
      // Criar registro inicial
      await userRef.set({
        username: user.displayName || 'Jogador',
        email: user.email,
        photoURL: user.photoURL,
        createdAt: Date.now(),
        stats: {
          totalGames: 0,
          bestWPM: 0,
          avgAccuracy: 0,
          totalWords: 0
        },
        records: {}
      });
    }
    
    showToast('✅ Login com Google realizado!', 'success');
  } catch (error) {
    console.error('Erro no login com Google:', error);
    showAuthError('❌ Erro ao fazer login com Google. Tente novamente.');
  }
}

// Logout
async function logout() {
  if (confirm('Tem certeza que deseja sair?')) {
    try {
      await auth.signOut();
      showToast('👋 Até logo!', 'success');
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
      showToast('❌ Erro ao sair', 'error');
    }
  }
}

// Atualizar informações do usuário no header
function updateUserInfo() {
  if (!currentUser) return;
  
  const userName = document.getElementById('userName');
  const userAvatar = document.getElementById('userAvatar');
  
  const displayName = currentUser.displayName || currentUser.email.split('@')[0];
  userName.textContent = displayName;
  
  if (currentUser.photoURL) {
    userAvatar.innerHTML = `<img src="${currentUser.photoURL}" alt="Avatar" style="width: 32px; height: 32px; border-radius: 50%;">`;
  } else {
    userAvatar.textContent = displayName.charAt(0).toUpperCase();
  }
}

// ===== NAVEGAÇÃO =====

function switchTab(tabName, evt) {
  // Remover active de todas as tabs
  document.querySelectorAll('.nav-tab').forEach(tab => {
    tab.classList.remove('active');
  });
  
  // Remover active de todas as sections
  document.querySelectorAll('.section').forEach(section => {
    section.classList.remove('active');
  });
  
  const triggerEvent = evt || window.event || null;
  let activeTabButton = null;
  if (triggerEvent && triggerEvent.currentTarget) {
    activeTabButton = triggerEvent.currentTarget;
  } else if (triggerEvent && triggerEvent.target && triggerEvent.target.classList.contains('nav-tab')) {
    activeTabButton = triggerEvent.target;
  } else {
    activeTabButton = document.querySelector(`.nav-tab[data-tab="${tabName}"]`);
  }
  if (activeTabButton) {
    activeTabButton.classList.add('active');
  }
  
  // Ativar section correspondente
  const section = document.getElementById(tabName + 'Section');
  if (!section) {
    if (tabName !== 'ranking') {
      stopRankingAutoRefresh();
    }
    return;
  }
  section.classList.add('active');
  
  if (tabName === 'ranking') {
    const selectedFilter = currentRankingFilter || '15';
    filterRanking(selectedFilter);
    return;
  }
  
  stopRankingAutoRefresh();
  if (tabName === 'stats') {
    loadStats();
  } else if (tabName === 'history') {
    loadHistory();
  }
}

// ===== JOGO =====

function initGame() {
  generateWords();
  displayWords();
  wordInput.value = '';
  wordInput.disabled = false;
  wordInput.focus();
  
  // Resetar scroll do container para o topo
  wordsContainer.scrollTop = 0;
}

function generateWords() {
  gameWords = getRandomWords(100); // Gera 100 palavras aleatórias
}

function displayWords() {
  wordsContainer.innerHTML = gameWords
    .map((word, index) => {
      const classes = index === 0 ? 'word current' : 'word';
      return `<span class="${classes}" data-index="${index}">${word}</span>`;
    })
    .join(' ');
}

// ===== SELEÇÃO DE MODO =====
function selectMode(mode) {
  if (gameStarted) {
    showToast('⚠️ Resete o jogo para mudar o modo!', 'warning');
    return;
  }
  
  gameMode = mode;
  rankedReady = false;
  
  // Atualizar botões
  document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.classList.remove('active');
    if (btn.dataset.mode === mode) {
      btn.classList.add('active');
    }
  });
  
  const playContainer = document.getElementById('playContainer');
  const wordsContainer = document.getElementById('wordsContainer');
  const wordInput = document.getElementById('wordInput');
  const inputContainer = document.getElementById('inputContainer');
  
  if (mode === 'ranked') {
    // Modo Ranqueado: Mostra botão Play e esconde palavras + input
    playContainer.classList.remove('hidden');
    wordsContainer.style.opacity = '0';
    wordsContainer.style.filter = 'blur(20px)';
    wordInput.disabled = true;
    wordInput.placeholder = 'Clique em INICIAR JOGO primeiro';
    inputContainer.style.display = 'none';
  } else {
    // Modo Casual: Normal
    playContainer.classList.add('hidden');
    wordsContainer.style.opacity = '1';
    wordsContainer.style.filter = 'none';
    wordInput.disabled = false;
    wordInput.placeholder = 'Comece a digitar...';
    inputContainer.style.display = 'block';
    initGame();
  }
}

function startRankedGame() {
  if (gameStarted) return;

  // Preparar novo conjunto de palavras antes de travar hash
  initGame();
  
  // Gerar validação anti-trapaça
  antiCheatValidation = {
    startTime: null,
    wordHash: generateWordHash(),
    clientData: navigator.userAgent,
    expectedDuration: selectedTime * 1000
  };
  
  rankedReady = true;
  
  // Revelar palavras e habilitar input
  const wordsContainer = document.getElementById('wordsContainer');
  const wordInput = document.getElementById('wordInput');
  const playContainer = document.getElementById('playContainer');
  const inputContainer = document.getElementById('inputContainer');
  
  wordsContainer.style.opacity = '1';
  wordsContainer.style.filter = 'none';
  wordInput.disabled = false;
  wordInput.placeholder = 'Comece a digitar...';
  playContainer.classList.add('hidden');
  inputContainer.style.display = 'block';
  
  // Iniciar jogo automaticamente
  startGame();
  wordInput.focus();
  
  showToast('🏆 Jogo Ranqueado Iniciado!', 'success');
}

// Gerar hash das palavras para validação
function generateWordHash() {
  return gameWords.slice(0, 20).join('').length + Date.now();
}

function selectTime(time) {
  if (gameStarted) {
    showToast('⚠️ Resete o jogo para mudar o tempo!', 'warning');
    return;
  }
  
  selectedTime = time;
  timerDisplay.textContent = time;
  
  // Atualizar botões
  document.querySelectorAll('.time-btn').forEach(btn => {
    btn.classList.remove('active');
    if (parseInt(btn.dataset.time) === time) {
      btn.classList.add('active');
    }
  });
}

function startGame() {
  if (gameStarted) return;
  
  gameStarted = true;
  gameEnded = false;
  startTime = Date.now();
  if (gameMode === 'ranked') {
    if (!antiCheatValidation) {
      antiCheatValidation = { expectedDuration: selectedTime * 1000 };
    }
    antiCheatValidation.startTime = startTime;
    antiCheatValidation.expectedDuration = selectedTime * 1000;
  }
  currentWordIndex = 0;
  currentLetterIndex = 0;
  correctWords = 0;
  wrongWords = 0;
  totalTypedChars = 0;
  correctTypedChars = 0;
  
  startTimer();
}

function startTimer() {
  let timeLeft = selectedTime;
  
  timerInterval = setInterval(() => {
    timeLeft--;
    timerDisplay.textContent = timeLeft;
    
    // Atualizar WPM em tempo real
    updateLiveWPM();
    
    if (timeLeft <= 0) {
      endGame();
    }
  }, 1000);
}

function updateLiveWPM() {
  if (!startTime) return;
  
  const elapsedMinutes = (Date.now() - startTime) / 1000 / 60;
  // CPM (Caracteres por minuto) / 5 = WPM (padrão MonkeyType)
  // Exemplo: 250 caracteres corretos em 1 minuto = 250/5 = 50 WPM
  const wpm = Math.round((correctTypedChars / elapsedMinutes) / 5) || 0;
  wpmDisplay.textContent = wpm;
  
  // Debug (remover depois)
  if (gameMode === 'ranked') {
    console.log(`[WPM Debug] Chars corretos: ${correctTypedChars}, Tempo: ${elapsedMinutes.toFixed(2)}min, WPM: ${wpm}`);
  }
  
  // Atualizar precisão
  const accuracy = totalTypedChars > 0 
    ? Math.round((correctTypedChars / totalTypedChars) * 100) 
    : 100;
  accuracyDisplay.textContent = accuracy + '%';
}

function endGame() {
  clearInterval(timerInterval);
  gameEnded = true;
  gameStarted = false;
  wordInput.disabled = true;
  
  const elapsedMinutes = selectedTime / 60;
  // CPM (Caracteres por minuto) / 5 = WPM (padrão MonkeyType)
  const finalWPM = Math.round((correctTypedChars / elapsedMinutes) / 5);
  const finalAccuracy = totalTypedChars > 0 
    ? Math.round((correctTypedChars / totalTypedChars) * 100) 
    : 100;
  
  // Salvar resultado
  saveResult(finalWPM, finalAccuracy);
  
  // Mostrar modal de resultado
  showResultModal(finalWPM, finalAccuracy);
}

function resetGame() {
  clearInterval(timerInterval);
  gameStarted = false;
  gameEnded = false;
  startTime = null;
  currentWordIndex = 0;
  currentLetterIndex = 0;
  correctWords = 0;
  wrongWords = 0;
  totalTypedChars = 0;
  correctTypedChars = 0;
  
  // Resetar flags de anti-cheat
  devToolsOpen = false;
  rankedReady = false;
  antiCheatValidation = null;
  
  timerDisplay.textContent = selectedTime;
  wpmDisplay.textContent = '0';
  accuracyDisplay.textContent = '100%';
  
  // Resetar scroll do container de palavras para o topo
  wordsContainer.scrollTop = 0;
  
  // Se modo ranqueado, mostrar botão Play novamente e esconder input
  if (gameMode === 'ranked') {
    const playContainer = document.getElementById('playContainer');
    const inputContainer = document.getElementById('inputContainer');
    const wordInput = document.getElementById('wordInput');
    
    playContainer.classList.remove('hidden');
    inputContainer.style.display = 'none';
    wordsContainer.innerHTML = '';
    wordsContainer.style.opacity = '0';
    wordsContainer.style.filter = 'blur(20px)';
    wordInput.disabled = true;
    wordInput.placeholder = 'Clique em INICIAR JOGO primeiro';
  }
  
  initGame();
  showToast('🔄 Jogo resetado!', 'success');
}

// ===== INPUT HANDLING =====

wordInput.addEventListener('input', (e) => {
  if (!gameStarted && e.target.value.length > 0) {
    // Não iniciar automaticamente se for modo ranqueado e não estiver pronto
    if (gameMode === 'ranked' && !rankedReady) {
      e.target.value = '';
      showToast('⚠️ Clique em INICIAR JOGO primeiro!', 'warning');
      return;
    }
    startGame();
  }
  
  if (gameEnded) return;
  
  // Tocar som de digitação
  playTypeSound();
  
  const typedText = e.target.value;
  const currentWord = gameWords[currentWordIndex];
  
  // Atualizar visualização da palavra atual
  updateCurrentWord(typedText, currentWord);
  
  // Verificar se completou a palavra (espaço ou enter)
  if (typedText.endsWith(' ')) {
    checkWord(typedText.trim());
  }
  
  // Atualizar WPM em tempo real
  updateLiveWPM();
});

wordInput.addEventListener('keydown', (e) => {
  // Desabilitar Tab (evita perder foco do input)
  if (e.key === 'Tab') {
    e.preventDefault();
    return;
  }
  
  // Shift + Enter para resetar
  if (e.key === 'Enter' && e.shiftKey) {
    e.preventDefault();
    resetGame();
  }
});

function updateCurrentWord(typedText, currentWord) {
  const wordElement = document.querySelector(`.word[data-index="${currentWordIndex}"]`);
  if (!wordElement) return;
  
  let html = '';
  let correctCharsInCurrentWord = 0;
  
  for (let i = 0; i < Math.max(currentWord.length, typedText.length); i++) {
    const char = currentWord[i];
    const typedChar = typedText[i];
    
    if (typedChar === undefined) {
      html += char;
    } else if (typedChar === char) {
      html += `<span class="letter correct">${char}</span>`;
      correctCharsInCurrentWord++;
    } else {
      html += `<span class="letter wrong">${char || typedChar}</span>`;
    }
  }
  
  wordElement.innerHTML = html;
  
  // Atualizar contadores em tempo real (apenas para a palavra atual sendo digitada)
  // Total de chars = palavras completas anteriores + palavra atual
  totalTypedChars = 0;
  correctTypedChars = 0;
  
  // Somar caracteres das palavras já completas
  for (let i = 0; i < currentWordIndex; i++) {
    const word = gameWords[i];
    totalTypedChars += word.length + 1; // +1 pelo espaço
    
    // Verificar se a palavra foi marcada como correta
    const wordEl = document.querySelector(`.word[data-index="${i}"]`);
    if (wordEl && wordEl.classList.contains('correct')) {
      // Palavra correta: conta todos os caracteres + espaço
      correctTypedChars += word.length + 1;
    } else if (wordEl && wordEl.classList.contains('wrong')) {
      // Palavra errada: conta apenas letras corretas (sem espaço)
      const correctLetters = wordEl.querySelectorAll('.letter.correct').length;
      correctTypedChars += correctLetters;
    }
  }
  
  // Adicionar caracteres da palavra atual
  totalTypedChars += typedText.length;
  correctTypedChars += correctCharsInCurrentWord;
}

function checkWord(typedWord) {
  const currentWord = gameWords[currentWordIndex];
  
  // Marcar palavra como correta ou errada
  if (typedWord === currentWord) {
    correctWords++;
    markWordAs('correct');
  } else {
    wrongWords++;
    markWordAs('wrong');
  }
  
  // Próxima palavra
  currentWordIndex++;
  currentLetterIndex = 0;
  wordInput.value = '';
  
  // Atualizar palavra atual
  updateCurrentWordIndicator();
  
  // Verificar se acabaram as palavras
  if (currentWordIndex >= gameWords.length) {
    generateMoreWords();
  }
  
  // Atualizar WPM
  updateLiveWPM();
}

function markWordAs(status) {
  const wordElement = document.querySelector(`.word[data-index="${currentWordIndex}"]`);
  if (wordElement) {
    wordElement.classList.remove('current');
    wordElement.classList.add(status);
  }
}

function updateCurrentWordIndicator() {
  document.querySelectorAll('.word').forEach(word => {
    word.classList.remove('current');
  });
  
  const nextWord = document.querySelector(`.word[data-index="${currentWordIndex}"]`);
  if (nextWord) {
    nextWord.classList.add('current');
    
    // Scroll automático para manter sempre 3 linhas visíveis
    // Calcula a posição para mostrar a palavra atual no topo
    const container = wordsContainer;
    const wordTop = nextWord.offsetTop;
    const containerHeight = container.clientHeight;
    // Se a palavra está na metade inferior do container, faz scroll
    if (wordTop > containerHeight / 2) {
      container.scrollTo({
        top: wordTop - 50, // Deixa um pequeno espaço no topo
        behavior: 'smooth'
      });
    }
  }
}

function generateMoreWords() {
  const moreWords = getRandomWords(50);
  gameWords.push(...moreWords);
  
  // Adicionar ao DOM
  const fragment = document.createDocumentFragment();
  const startIndex = gameWords.length - moreWords.length;
  
  moreWords.forEach((word, i) => {
    const span = document.createElement('span');
    span.className = 'word';
    span.dataset.index = startIndex + i;
    span.textContent = word;
    fragment.appendChild(span);
    
    // Adicionar espaço
    fragment.appendChild(document.createTextNode(' '));
  });
  
  wordsContainer.appendChild(fragment);
}

// ===== RESULTADO =====

function showResultModal(wpm, accuracy) {
  document.getElementById('resultWPM').textContent = wpm;
  document.getElementById('resultTime').textContent = selectedTime + 's';
  document.getElementById('resultAccuracy').textContent = accuracy + '%';
  document.getElementById('resultCorrect').textContent = correctWords;
  document.getElementById('resultWrong').textContent = wrongWords;
  document.getElementById('resultTotal').textContent = correctWords + wrongWords;
  
  // Mensagem personalizada
  const message = getResultMessage(wpm, accuracy);
  document.getElementById('resultMessage').textContent = message;
  
  resultModal.classList.remove('hidden');
}

function closeResultModal() {
  resultModal.classList.add('hidden');
}

function playAgain() {
  closeResultModal();
  resetGame();
}

function viewStats() {
  closeResultModal();
  
  // Mudar para a aba de estatísticas
  document.querySelectorAll('.nav-tab').forEach(tab => {
    tab.classList.remove('active');
    if (tab.textContent.includes('ESTATÍSTICAS')) {
      tab.classList.add('active');
    }
  });
  
  document.querySelectorAll('.section').forEach(section => {
    section.classList.remove('active');
  });
  
  const statsSection = document.getElementById('statsSection');
  if (statsSection) {
    statsSection.classList.add('active');
    loadStats();
  }
}

function getResultMessage(wpm, accuracy) {
  if (wpm >= 80 && accuracy >= 95) {
    return '🏆 LENDÁRIO! Você é uma máquina de digitar!';
  } else if (wpm >= 60 && accuracy >= 90) {
    return '🔥 EXCELENTE! Velocidade impressionante!';
  } else if (wpm >= 40 && accuracy >= 85) {
    return '⭐ MUITO BOM! Continue praticando!';
  } else if (wpm >= 25 && accuracy >= 75) {
    return '👍 BOM! Você está melhorando!';
  } else {
    return '💪 CONTINUE PRATICANDO! A prática leva à perfeição!';
  }
}

// ===== SALVAR RESULTADO =====

async function saveResult(wpm, accuracy) {
  const result = {
    wpm: wpm,
    accuracy: accuracy,
    time: selectedTime,
    correctWords: correctWords,
    wrongWords: wrongWords,
    totalWords: correctWords + wrongWords,
    timestamp: Date.now(),
    date: new Date().toISOString(),
    mode: gameMode, // Adiciona o modo do jogo
    validated: gameMode === 'ranked' ? validateRankedGame() : false
  };
  
  // Salvar no localStorage (histórico local) - sempre salva
  saveToLocalHistory(result);
  
  // Salvar no Firebase APENAS se for RANQUEADO e estiver logado
  console.log('🎮 Modo de jogo:', gameMode);
  console.log('👤 Usuário logado:', currentUser ? 'SIM' : 'NÃO');
  console.log('✅ Validado:', result.validated);
  
  if (currentUser && gameMode === 'ranked') {
    if (result.validated) {
      console.log('💾 Iniciando salvamento ranqueado...');
      const rankingOutcome = await saveToFirebase(result);
      await updateUserStats(result);
      const isNewRecord = await updatePersonalRecord(result);
      await loadStats();
      if (rankingOutcome?.saved) {
        refreshRankingAfterSave(result.time);
        showToast(
          isNewRecord
            ? '🌟 Resultado salvo! Novo recorde pessoal ranqueado!'
            : '🏆 Resultado salvo no ranking!',
          'success'
        );
      } else if (rankingOutcome?.reason === 'lower') {
        showToast('⚠️ Você já possui um resultado melhor no ranking. Mantivemos o recorde mais alto.', 'warning');
      } else if (rankingOutcome?.reason === 'auth') {
        showToast('⚠️ Faça login novamente para salvar no ranking.', 'warning');
      } else if (rankingOutcome?.reason === 'error') {
        showToast('❌ Erro ao salvar no ranking. Tente novamente.', 'error');
      }
    } else {
      console.warn('⚠️ Jogo ranqueado invalidado');
      console.warn('Anti-cheat validation:', antiCheatValidation);
      console.warn('DevTools open:', devToolsOpen);
      showToast('⚠️ Jogo invalidado - possível trapaça detectada', 'error');
    }
  } else if (gameMode === 'casual') {
    console.log('✅ Jogo casual concluído (não salva no ranking)');
    showToast('✅ Jogo casual concluído!', 'success');
  } else if (!currentUser) {
    console.warn('⚠️ Usuário não está logado');
    showToast('⚠️ Faça login para salvar no ranking', 'warning');
  }
}

// Validação anti-trapaça para jogos ranqueados
function validateRankedGame() {
  if (!antiCheatValidation || !antiCheatValidation.startTime) return false;
  
  const expectedTime = antiCheatValidation.expectedDuration || (selectedTime * 1000);
  const timePlayed = Date.now() - antiCheatValidation.startTime;
  const tolerance = Math.max(1500, expectedTime * 0.02); // margem mínima de 1.5s ou 2% do tempo
  
  // Verificar se o tempo jogado é coerente
  if (Math.abs(timePlayed - expectedTime) > tolerance) {
    console.warn('Tempo de jogo inconsistente');
    return false;
  }
  
  // Verificar se DevTools foi aberto
  if (devToolsOpen) {
    console.warn('DevTools detectado durante o jogo');
    return false;
  }
  
  // Verificar PPM razoável (max 200 PPM para prevenir macros)
  const wpm = Math.round((correctTypedChars / (selectedTime / 60)) / 5);
  if (wpm > 200) {
    console.warn('PPM suspeito (possível macro)');
    return false;
  }
  
  return true;
}

function saveToLocalHistory(result) {
  let history = JSON.parse(localStorage.getItem('typingHistory') || '[]');
  history.unshift(result);
  
  // Manter apenas os últimos 50 resultados
  if (history.length > 50) {
    history = history.slice(0, 50);
  }
  
  localStorage.setItem('typingHistory', JSON.stringify(history));
}

async function saveToFirebase(result) {
  if (!currentUser) {
    console.error('❌ saveToFirebase: Usuário não autenticado');
    return { saved: false, reason: 'auth' };
  }
  
  try {
    console.log('🔄 Salvando resultado ranqueado no Firebase...');
    console.log('📊 Dados:', result);
    
    const rankingKey = `${currentUser.uid}_${result.time}`;
    const rankingRef = database.ref('rankings/' + rankingKey);
    const existingSnapshot = await rankingRef.once('value');
    const existingData = existingSnapshot.val();
    if (existingData && !isBetterRankingResult(result, existingData)) {
      console.log('⏸️ Resultado inferior ao recorde atual. Mantendo registro existente.');
      return { saved: false, reason: 'lower' };
    }
    
    const dataToSave = {
      userId: currentUser.uid,
      username: currentUser.displayName || currentUser.email.split('@')[0],
      photoURL: currentUser.photoURL || null,
      ...result
    };
    
    console.log('💾 Dados completos para salvar:', dataToSave);
    
    await rankingRef.set(dataToSave);
    console.log('✅ Resultado salvo no Firebase com sucesso!');
    return { saved: true };
  } catch (error) {
    console.error('❌ Erro ao salvar no Firebase:', error);
    console.error('❌ Código do erro:', error.code);
    console.error('❌ Mensagem:', error.message);
    return { saved: false, reason: 'error', error };
  }
}

async function updateUserStats(result) {
  if (!currentUser) return;
  
  try {
    const userRef = database.ref('users/' + currentUser.uid + '/stats');
    const snapshot = await userRef.once('value');
    const currentStats = snapshot.val() || {
      totalGames: 0,
      bestWPM: 0,
      avgAccuracy: 0,
      totalWords: 0
    };
    
    const newTotalGames = currentStats.totalGames + 1;
    const newBestWPM = Math.max(currentStats.bestWPM, result.wpm);
    const newAvgAccuracy = Math.round(
      ((currentStats.avgAccuracy * currentStats.totalGames) + result.accuracy) / newTotalGames
    );
    const newTotalWords = currentStats.totalWords + result.totalWords;
    
    await userRef.update({
      totalGames: newTotalGames,
      bestWPM: newBestWPM,
      avgAccuracy: newAvgAccuracy,
      totalWords: newTotalWords
    });
  } catch (error) {
    console.error('Erro ao atualizar stats:', error);
  }
}

async function updatePersonalRecord(result) {
  if (!currentUser) return false;
  try {
    const recordKey = String(result.time);
    const recordRef = database.ref('users/' + currentUser.uid + '/records/' + recordKey);
    const snapshot = await recordRef.once('value');
    const currentRecord = snapshot.val();
    const isBetter = !currentRecord ||
      result.wpm > currentRecord.wpm ||
      (result.wpm === currentRecord.wpm && result.accuracy > (currentRecord.accuracy || 0));
    if (isBetter) {
      await recordRef.set({
        wpm: result.wpm,
        accuracy: result.accuracy,
        timestamp: result.timestamp,
        time: result.time
      });
      return true;
    }
  } catch (error) {
    console.error('Erro ao atualizar recorde pessoal:', error);
  }
  return false;
}

// ===== ESTATÍSTICAS =====

async function loadStats() {
  if (!currentUser) return;
  
  try {
    const userRef = database.ref('users/' + currentUser.uid);
    const snapshot = await userRef.once('value');
    const userData = snapshot.val() || {};
    const stats = userData.stats || {
      totalGames: 0,
      bestWPM: 0,
      avgAccuracy: 0,
      totalWords: 0
    };
    
    document.getElementById('bestWPM').textContent = stats.bestWPM ?? 0;
    document.getElementById('avgAccuracy').textContent = (stats.avgAccuracy ?? 0) + '%';
    document.getElementById('totalGames').textContent = stats.totalGames ?? 0;
    document.getElementById('totalWords').textContent = stats.totalWords ?? 0;
    renderPersonalRecords(userData.records || {});
    
    // Carregar gráfico
    loadProgressChart();
  } catch (error) {
    console.error('Erro ao carregar stats:', error);
  }
}

function renderPersonalRecords(records = {}) {
  rankedTimes.forEach(time => {
    const valueEl = document.getElementById(`record${time}`);
    const metaEl = document.getElementById(`record${time}Meta`);
    if (!valueEl || !metaEl) return;
    const recordKey = String(time);
    const recordData = records[recordKey] || records[`${time}s`];
    if (recordData) {
      valueEl.textContent = `${recordData.wpm ?? '--'} PPM`;
      const accuracy = recordData.accuracy ?? 0;
      const dateLabel = recordData.timestamp
        ? new Date(recordData.timestamp).toLocaleDateString('pt-BR')
        : 'Sem data';
      metaEl.textContent = `${accuracy}% • ${dateLabel}`;
    } else {
      valueEl.textContent = '--';
      metaEl.textContent = 'Jogue ranqueado para registrar';
    }
  });
}

function refreshRankingAfterSave(resultTime) {
  const activeFilterBtn = document.querySelector('.filter-btn.active');
  if (!activeFilterBtn) return;
  const activeFilter = activeFilterBtn.dataset.filter || '15';
  if (activeFilter === 'all' || parseInt(activeFilter, 10) === resultTime) {
    loadRanking(activeFilter);
  }
}

function isBetterRankingResult(candidate, current) {
  if (!current) return true;
  if (candidate.wpm > current.wpm) return true;
  if (candidate.wpm === current.wpm) {
    const candidateAccuracy = candidate.accuracy ?? 0;
    const currentAccuracy = current.accuracy ?? 0;
    if (candidateAccuracy > currentAccuracy) return true;
    if (candidateAccuracy === currentAccuracy) {
      return (candidate.timestamp || 0) > (current.timestamp || 0);
    }
  }
  return false;
}

function loadProgressChart() {
  const history = JSON.parse(localStorage.getItem('typingHistory') || '[]');
  const last10 = history.slice(0, 10).reverse();
  
  const canvas = document.getElementById('progressChart');
  if (!canvas) return;
  
  const ctx = canvas.getContext('2d');
  const width = canvas.width = canvas.offsetWidth;
  const height = canvas.height = 300;
  
  // Limpar canvas
  ctx.clearRect(0, 0, width, height);
  
  if (last10.length === 0) {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.font = '16px JetBrains Mono';
    ctx.textAlign = 'center';
    ctx.fillText('Nenhum jogo registrado ainda', width / 2, height / 2);
    return;
  }
  
  // Configurações
  const padding = 40;
  const graphWidth = width - padding * 2;
  const graphHeight = height - padding * 2;
  
  const maxWPM = Math.max(...last10.map(r => r.wpm), 50);
  const pointSpacing = graphWidth / (last10.length - 1 || 1);
  
  // Desenhar grid
  ctx.strokeStyle = 'rgba(153, 51, 255, 0.2)';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 5; i++) {
    const y = padding + (graphHeight / 5) * i;
    ctx.beginPath();
    ctx.moveTo(padding, y);
    ctx.lineTo(width - padding, y);
    ctx.stroke();
  }
  
  // Desenhar linha
  ctx.strokeStyle = '#9933ff';
  ctx.lineWidth = 3;
  ctx.beginPath();
  
  last10.forEach((result, i) => {
    const x = padding + pointSpacing * i;
    const y = padding + graphHeight - (result.wpm / maxWPM) * graphHeight;
    
    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  });
  
  ctx.stroke();
  
  // Desenhar pontos
  last10.forEach((result, i) => {
    const x = padding + pointSpacing * i;
    const y = padding + graphHeight - (result.wpm / maxWPM) * graphHeight;
    
    ctx.fillStyle = '#ffd700';
    ctx.beginPath();
    ctx.arc(x, y, 6, 0, Math.PI * 2);
    ctx.fill();
    
    // Valor
    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 12px JetBrains Mono';
    ctx.textAlign = 'center';
    ctx.fillText(result.wpm, x, y - 15);
  });
}

// ===== RANKING =====

async function loadRanking(timeFilter = '15', showLoading = true) {
  const rankingList = document.getElementById('rankingList');
  if (showLoading) {
    rankingList.innerHTML = '<div class="no-data">⏳ Carregando ranking...</div>';
  }
  
  try {
    const rankingsRef = database.ref('rankings');
    let snapshot;
    const parsedTime = parseInt(timeFilter, 10);
    if (timeFilter === 'all') {
      snapshot = await rankingsRef.once('value');
    } else {
      snapshot = await rankingsRef.orderByChild('time').equalTo(parsedTime).once('value');
    }
    
    const bestByUser = {};
    snapshot.forEach(child => {
      const data = child.val();
      if (data.mode === 'ranked' && data.validated !== false) {
        if (timeFilter === 'all' || data.time === parsedTime) {
          const userKey = data.userId || child.key;
          if (isBetterRankingResult(data, bestByUser[userKey])) {
            bestByUser[userKey] = data;
          }
        }
      }
    });
    
    let rankings = Object.values(bestByUser);
    
    // Ordenar por WPM (maior primeiro)
    rankings.sort((a, b) => b.wpm - a.wpm);
    
    if (rankings.length === 0) {
      rankingList.innerHTML = '<div class="no-data">📊 Nenhum resultado ainda. Seja o primeiro!</div>';
      return;
    }
    
    // Limitar aos top 50
    rankings = rankings.slice(0, 50);
    
    rankingList.innerHTML = rankings.map((rank, index) => {
      const date = new Date(rank.timestamp).toLocaleDateString('pt-BR');
      const isCurrentUser = currentUser && rank.userId === currentUser.uid;
      
      return `
        <div class="ranking-item ${isCurrentUser ? 'highlight' : ''}">
          <div class="rank-col">#${index + 1}</div>
          <div class="player-col">${rank.username}</div>
          <div class="wpm-col">${rank.wpm}</div>
          <div class="accuracy-col">${rank.accuracy}%</div>
          <div class="date-col">${date}</div>
        </div>
      `;
    }).join('');
    
  } catch (error) {
    console.error('Erro ao carregar ranking:', error);
    rankingList.innerHTML = '<div class="no-data">❌ Erro ao carregar ranking</div>';
  }
}

function filterRanking(timeFilter, options = {}) {
  currentRankingFilter = timeFilter;
  const buttons = document.querySelectorAll('.filter-btn');
  buttons.forEach(btn => {
    if (btn.dataset.filter === timeFilter) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
  loadRanking(timeFilter, options.showLoading !== false);
  if (options.skipAutoRefresh) return;
  startRankingAutoRefresh();
}

// ===== HISTÓRICO =====

function loadHistory() {
  const historyList = document.getElementById('historyList');
  const history = JSON.parse(localStorage.getItem('typingHistory') || '[]');
  
  if (history.length === 0) {
    historyList.innerHTML = '<div class="no-data">📜 Nenhum jogo registrado ainda</div>';
    return;
  }
  
  historyList.innerHTML = history.map(result => {
    const date = new Date(result.timestamp).toLocaleString('pt-BR');
    
    return `
      <div class="history-item">
        <div class="history-time">${result.time}s</div>
        <div>
          <div class="history-wpm">${result.wpm} PPM</div>
        </div>
        <div class="history-accuracy">${result.accuracy}%</div>
        <div class="history-words">✅ ${result.correctWords} ❌ ${result.wrongWords}</div>
        <div class="history-date">${date}</div>
      </div>
    `;
  }).join('');
}

function clearHistory() {
  if (confirm('⚠️ Tem certeza que deseja limpar todo o histórico?')) {
    localStorage.removeItem('typingHistory');
    loadHistory();
    showToast('🗑️ Histórico limpo!', 'success');
  }
}

// ===== TOAST =====

function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = 'toast show ' + type;
  
  setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
}

// ===== ATALHOS DE TECLADO =====

document.addEventListener('keydown', (e) => {
  // Shift + Enter = Reset
  if (e.shiftKey && e.key === 'Enter') {
    e.preventDefault();
    resetGame();
  }
  
  // Esc = Fechar modal
  if (e.key === 'Escape') {
    if (!resultModal.classList.contains('hidden')) {
      closeResultModal();
    }
  }
});

// ===== INICIALIZAÇÃO =====

document.addEventListener('DOMContentLoaded', () => {
  console.log('⌨️ Daoshi Typing Game carregado!');
  
  // Focar no input quando clicar no container de palavras
  wordsContainer.addEventListener('click', () => {
    if (!gameEnded) {
      wordInput.focus();
    }
  });
});
