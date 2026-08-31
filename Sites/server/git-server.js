// ═══════════════════════════════════════════════════════════════
// 🚀 GIT SERVER - DAOSHI STORE
// ═══════════════════════════════════════════════════════════════
// Servidor local para executar comandos Git via dashboard

const http = require('http');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

const PORT = 3333;
const PROJECT_PATH = 'D:\\Cursor';

// Função para executar comando Git
function executeGitCommand(command) {
  return new Promise((resolve, reject) => {
    exec(command, { cwd: PROJECT_PATH }, (error, stdout, stderr) => {
      if (error) {
        reject({ error: error.message, stderr });
      } else {
        resolve({ stdout, stderr });
      }
    });
  });
}

// Criar servidor HTTP
const server = http.createServer(async (req, res) => {
  // Headers CORS para permitir requisições do dashboard
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Responder OPTIONS (preflight)
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  // Rota: Status do servidor
  if (req.url === '/status' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      status: 'online', 
      message: '🟢 Servidor Git Online',
      port: PORT,
      project: PROJECT_PATH
    }));
    return;
  }
  
  // Rota: Verificar mudanças
  if (req.url === '/git/status' && req.method === 'GET') {
    try {
      const result = await executeGitCommand('git status Sites/ --short');
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        success: true, 
        output: result.stdout || 'Nenhuma mudança',
        hasChanges: result.stdout.trim().length > 0
      }));
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        success: false, 
        error: error.error || error.message 
      }));
    }
    return;
  }
  
  // Rota: Adicionar arquivos
  if (req.url === '/git/add' && req.method === 'POST') {
    try {
      // Adicionar APENAS Sites/ e arquivos importantes da raiz
      await executeGitCommand('git add Sites/');
      await executeGitCommand('git add .gitignore');
      await executeGitCommand('git add index.html');
      await executeGitCommand('git add README.md');
      
      const status = await executeGitCommand('git status --short');
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        success: true, 
        message: '✅ Arquivos adicionados com sucesso!',
        files: status.stdout
      }));
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        success: false, 
        error: error.error || error.message 
      }));
    }
    return;
  }
  
  // Rota: Commit
  if (req.url === '/git/commit' && req.method === 'POST') {
    let body = '';
    
    req.on('data', chunk => {
      body += chunk.toString();
    });
    
    req.on('end', async () => {
      try {
        const { message } = JSON.parse(body);
        
        if (!message || message.trim() === '') {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ 
            success: false, 
            error: 'Mensagem do commit é obrigatória' 
          }));
          return;
        }
        
        const result = await executeGitCommand(`git commit -m "${message}"`);
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          success: true, 
          message: '✅ Commit criado com sucesso!',
          output: result.stdout
        }));
      } catch (error) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          success: false, 
          error: error.error || error.message 
        }));
      }
    });
    return;
  }
  
  // Rota: Push
  if (req.url === '/git/push' && req.method === 'POST') {
    try {
      const result = await executeGitCommand('git push');
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        success: true, 
        message: '✅ Push realizado com sucesso!',
        output: result.stdout || result.stderr
      }));
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        success: false, 
        error: error.error || error.stderr || error.message 
      }));
    }
    return;
  }
  
  // Rota: Commit + Push automático (tudo de uma vez)
  if (req.url === '/git/commit-push' && req.method === 'POST') {
    let body = '';
    
    req.on('data', chunk => {
      body += chunk.toString();
    });
    
    req.on('end', async () => {
      try {
        const { message } = JSON.parse(body);
        
        if (!message || message.trim() === '') {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ 
            success: false, 
            error: 'Mensagem do commit é obrigatória' 
          }));
          return;
        }
        
        const steps = [];
        
        // 1. Adicionar arquivos
        steps.push('📥 Adicionando arquivos...');
        await executeGitCommand('git add Sites/');
        await executeGitCommand('git add .gitignore');
        await executeGitCommand('git add index.html');
        await executeGitCommand('git add README.md');
        
        // 2. Verificar status
        const status = await executeGitCommand('git status --short');
        
        if (!status.stdout.trim()) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ 
            success: true, 
            message: '⚠️ Nenhuma mudança para commitar',
            steps: ['Nenhuma alteração detectada']
          }));
          return;
        }
        
        steps.push('✅ Arquivos adicionados: ' + status.stdout.split('\n').length + ' arquivo(s)');
        
        // 3. Commit
        steps.push('📝 Criando commit...');
        const commitResult = await executeGitCommand(`git commit -m "${message}"`);
        steps.push('✅ Commit criado: ' + message);
        
        // 4. Push
        steps.push('🚀 Enviando para o repositório...');
        const pushResult = await executeGitCommand('git push');
        steps.push('✅ Push concluído!');
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          success: true, 
          message: '🎉 Atualização completa realizada com sucesso!',
          steps: steps,
          commitOutput: commitResult.stdout,
          pushOutput: pushResult.stdout || pushResult.stderr
        }));
      } catch (error) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          success: false, 
          error: error.error || error.stderr || error.message 
        }));
      }
    });
    return;
  }
  
  // Rota não encontrada
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Rota não encontrada' }));
});

// Iniciar servidor
server.listen(PORT, () => {
  console.log('\n╔═══════════════════════════════════════════════╗');
  console.log('║                                               ║');
  console.log('║      🚀 GIT SERVER - DAOSHI STORE 🚀         ║');
  console.log('║                                               ║');
  console.log('╚═══════════════════════════════════════════════╝\n');
  console.log(`🟢 Servidor rodando na porta: ${PORT}`);
  console.log(`📂 Projeto: ${PROJECT_PATH}`);
  console.log(`🌐 URL: http://localhost:${PORT}`);
  console.log('\n📋 Rotas disponíveis:');
  console.log('   GET  /status          - Status do servidor');
  console.log('   GET  /git/status      - Ver mudanças');
  console.log('   POST /git/add         - Adicionar arquivos');
  console.log('   POST /git/commit      - Criar commit');
  console.log('   POST /git/push        - Fazer push');
  console.log('   POST /git/commit-push - Tudo de uma vez');
  console.log('\n✨ Servidor pronto! Agora você pode usar o dashboard.\n');
  console.log('⚠️  Para parar: Pressione Ctrl + C\n');
});

// Tratamento de erros
server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`\n❌ Erro: Porta ${PORT} já está em uso!`);
    console.error('   Feche o outro servidor ou mude a porta.\n');
  } else {
    console.error('\n❌ Erro no servidor:', error.message, '\n');
  }
  process.exit(1);
});

// Tratamento de encerramento
process.on('SIGINT', () => {
  console.log('\n\n🛑 Encerrando servidor...\n');
  server.close(() => {
    console.log('✅ Servidor encerrado com sucesso!\n');
    process.exit(0);
  });
});

