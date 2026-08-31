// ===== CONFIGURAÇÃO DA DAOSHI STORE =====
// Este arquivo centraliza TODAS as configurações editáveis do site
// Edite aqui para mudar textos, valores, links e informações

const SITE_CONFIG = {
  // ===== INFORMAÇÕES DA LOJA =====
  loja: {
    nome: "DAOSHI STORE",
    logo: "⭐💎⭐",
    tagline: "✨Cash e Intermediação ✨",
    subtitle: "🎮 8 Jogos • Melhores Preços • Entrega Instantânea • Entrega 24/7 🚀",
    descricao: "Daoshi  Store - um lugar onde você compra e vende! Oferecemos descontos em diversos games, garantimos entrega e segurança, além de fornecer espaços de divulgação e intermediação.",
    missao: "Nossa missão é proporcionar a melhor experiência de compra e venda para a comunidade gamer. Nosso nome é muito importante para nós, assim como a satisfação do cliente com nossos serviços!"
  },

  // ===== ESTATÍSTICAS =====
  stats: [
    { numero: "7.000+", label: "Clientes Satisfeitos" },
    { numero: "120.000+", label: "Transações Realizadas" },
    { numero: "auto", label: "Jogos Disponíveis" },
    { numero: "24/7", label: "Entrega Online" }
  ],

  // ===== JOGOS =====
  jogos: [
    {
      id: "mir4",
      nome: "MIR4",
      nomeCurto: "MIR4",
      icone: "https://i.imgur.com/XrXphs0.png",
      iconeGrande: true,
      emoji: "⚔️",
      descricaoCurta: "Gold e Top Up ",
      descricaoLonga: "O melhor serviço de Gold e Top Up para MIR4!",
      url: "Sites/jogos/Mir4/index.html",
      features: [
        "Calculadora de Gold Automática",
        "Conversão Dollar/Real em Tempo Real",
        "Múltiplas Formas de Pagamento",
        "Entrega Instantânea",
        "Suporte Dedicado"
      ]
    },
    {
      id: "nightcrows",
      nome: "Nightcrows",
      nomeCurto: "Nightcrows",
      icone: "https://i.imgur.com/LLGJGNI.png",
      iconeGrande: true,
      emoji: "🦇",
      descricaoCurta: "Top Up e  TWD",
      descricaoLonga: "Economize no cash conosco!",
      url: "Sites/jogos/Nightcrows/index.html",
      features: [
        "Compra Rápida de Diamonds",
        "Preços Competitivos",
        "Sistema de Pagamento Seguro",
        "Entrega Garantida",
        "Suporte 24/7"
      ]
    },
    {
      id: "sealm",
      nome: "Seal M",
      nomeCurto: "Seal M",
      icone: "https://i.imgur.com/aDF7tqi.png",
      iconeGrande: true,
      emoji: "⭐",
      descricaoCurta: "Top Up",
      descricaoLonga: "Top Up seguro e rapido para Seal M!",
      url: "Sites/jogos/SealM/index.html",
      features: [
        "Pacotes de Cash",
        "Precos Competitivos",
        "Sistema de Pagamento Seguro",
        "Entrega Garantida",
        "Suporte 24/7"
      ]
    },
    {
      id: "tsdsorigin",
      nome: "The Seven Deadly Sins: Origin",
      nomeCurto: "TSDS Origin",
      icone: "https://i.imgur.com/IMg7Z0p.png",
      iconeGrande: true,
      emoji: "🗡️",
      descricaoCurta: "Top Up",
      descricaoLonga: "Top Up para TSDS Origin com entrega segura.",
      url: "Sites/jogos/Tsdsorigin/index.html",
      features: [
        "Pacotes completos",
        "Precos competitivos",
        "Entrega rapida",
        "Pagamento seguro",
        "Suporte 24/7"
      ]
    },
    {
      id: "arknights",
      nome: "Arknights Endfield",
      nomeCurto: "Arknights",
      icone: "https://i.imgur.com/HLExT4R.png",
      iconeGrande: true,
      emoji: "🏰",
      descricaoCurta: "Top Up",
      descricaoLonga: "Top Up para Arknights Endfield com entrega segura.",
      url: "Sites/jogos/Arknights/index.html",
      features: [
        "Pacotes completos",
        "Precos competitivos",
        "Entrega rapida",
        "Pagamento seguro",
        "Suporte 24/7"
      ]
    },
    {
      id: "dungeoncross",
      nome: "Dungeon Cross",
      nomeCurto: "Dungeon Cross",
      icone: "https://i.imgur.com/VUssVQB.png",
      iconeGrande: true,
      emoji: "⚔️",
      descricaoCurta: "Top Up",
      descricaoLonga: "Top Up para Dungeon Cross com entrega segura.",
      url: "Sites/jogos/Dungeoncross/index.html",
      features: [
        "Pacotes completos",
        "Precos competitivos",
        "Entrega rapida",
        "Pagamento seguro",
        "Suporte 24/7"
      ]
    },
    {
      id: "odin",
      nome: "Odin: Valhalla",
      nomeCurto: "Odin",
      icone: "https://i.imgur.com/aLsQf6y.png",
      iconeGrande: true,
      emoji: "⚡",
      descricaoCurta: "Packs com desconto",
      descricaoLonga: "Economize no seu cash!",
      url: "Sites/jogos/Odin/index.html",
      features: [
        "Pacotes de Diamonds",
        "Cálculo Automático de Valores",
        "Desconto em Grandes Compras",
        "Pagamento Facilitado",
        "Entrega Imediata"
      ]
    },
    {
      id: "wemix",
      nome: "Wemix",
      nomeCurto: "Wemix",
      icone: "https://i.imgur.com/YTGq40y.png",
      iconeGrande: false,
      emoji: "💎",
      descricaoCurta: "Conversão WEMIX/BRL Facilitada",
      descricaoLonga: "Calculadora de valores de wemix da daoshi Store",
      url: "Sites/jogos/Wemix/index.html",
      features: [
        "Conversor WEMIX/BRL",
        "Taxas Transparentes",
        "Cotação em Tempo Real",
        "Transferência Rápida",
        "Sistema Seguro"
      ]
    },
    {
      id: "raven2",
      nome: "Raven II",
      nomeCurto: "Raven II",
      icone: "https://i.imgur.com/jgNSgdY.png",
      iconeGrande: true,
      emoji: "✝︎",
      descricaoCurta: "RAVEN II",
      descricaoLonga: "Venha comprar packs para sua conta ^^",
      url: "Sites/jogos/raven2/index.html",
      features: [
        "Entrega Rápida",
        "Suporte 24/7",
        "100% Seguro",
        "Entrega Garantida",
        "Melhor valor do mercado"
      ]
    },
    {
      id: "rohan2",
      nome: "Rohan II",
      nomeCurto: "Rohan II",
      icone: "https://i.imgur.com/nZg3UYE.png",
      iconeGrande: true,
      emoji: "✳︎",
      descricaoCurta: "ROHAN II",
      descricaoLonga: "Venha comprar packs pra sua conta ^^",
      url: "Sites/jogos/rohan2/index.html",
      features: [
        "Entrega Rápida",
        "Suporte 24/7",
        "100% Seguro",
        "Entrega Garantida",
        "Melhor preço do mercado"
      ]
    },
    {
      id: "genshin",
      nome: "Genshin Impact",
      nomeCurto: "Genshin",
      icone: "https://i.imgur.com/Q1T1tta.png",
      iconeGrande: false,
      emoji: "⚔️",
      descricaoCurta: "Genesis Crystals e Benção da Lua",
      descricaoLonga: "Genesis Crystals e Benção da Lua com os melhores preços! SOMENTE UID",
      url: "Sites/jogos/genshin/index.html",
      features: [
        "Entrega Instantânea",
        "Suporte 24/7",
        "100% Seguro",
        "Melhor Preço",
        "Genesis Crystals"
      ]
    },
    {
      id: "genshinloginesenha",
      nome: "GENSHIN LOGIN e SENHA",
      nomeCurto: "Genshin L&S",
      icone: "https://i.imgur.com/Q1T1tta.png",
      iconeGrande: false,
      emoji: "⭐",
      descricaoCurta: "Cristais, Passes (Login e Senha)",
      descricaoLonga: "Método mais barato via Login e Senha - mais opções disponíveis!",
      url: "Sites/jogos/genshinloginesenha/index.html",
      features: [
        "Mais Barato",
        "Mais Opções",
        "Passe de Batalha",
        "Suporte 24/7",
        "100% Seguro"
      ]
    },
    {
      id: "ymirloginesenha",
      nome: "Ymir Login e Senha",
      nomeCurto: "Ymir L&S",
      icone: "https://i.imgur.com/Bna4U0c.png",
      iconeGrande: false,
      emoji: "🔐",
      descricaoCurta: "YMP via Login e Senha (Global & Steam)",
      descricaoLonga: "Pacotes de YMP via Login e Senha - Global & Steam",
      url: "Sites/jogos/ymirloginesenha/index.html",
      features: [
        "Global & Steam",
        "Pacotes YMP",
        "Suporte 24/7",
        "100% Seguro",
        "Entrega Rápida"
      ]
    },
    {
      id: "summonerswar",
      nome: "Summoners War",
      nomeCurto: "Summoners War",
  icone: "https://i.imgur.com/kav5I7I.png",
      iconScale: 1.05,
      emoji: "🔮",
      descricaoCurta: "Pacotes com desconto",
      descricaoLonga: "Top ups",
      url: "Sites/jogos/summonerswar/index.html",
      features: [
        "Pagamento 100% Seguro",
        "Entrega Rápida",
        "Suporte Dedicado"
      ]
    },
    {
      id: "typing-game",
      nome: "Daoshi Typing",
      nomeCurto: "Typing Game",
      icone: "https://media3.giphy.com/media/v1.Y2lkPTc5MGI3NjExenJsZ3h2ejgxeTN4enRwazcyYTllYzI1aW1uaTh1czdzZjJnd3YzcCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/IAkgiYMQzCzzMas62O/giphy.gif",
      iconeGrande: false,
      emoji: "🎮",
      category: "minigame",
      descricaoCurta: "Teste de Digitação",
      descricaoLonga: "Teste sua velocidade de digitação e compete no ranking global!",
      url: "Sites/minigames/typing-game/index.html",
      features: [
        "500+ Palavras Brasileiras",
        "Ranking Online Global",
        "Sistema de Contas",
        "Estatísticas Detalhadas",
        "Histórico Completo"
      ]
    },
    {
      id: "snake",
      nome: "Daoshi Snake",
      nomeCurto: "Daoshi Snake",
      icone: "https://i.imgur.com/ZKBivNM.png",
      iconeGrande: false,
      emoji: "🐍",
      tipo: "game",
      category: "minigame",
      descricaoCurta: "Sobreviva aos tanques neon",
      descricaoLonga: "Mini-game exclusivo com reflexos de cor, tanques e projéteis que podem ser devolvidos!",
      url: "Sites/minigames/snake-game/index.html",
      features: [
        "Sistema de Progressão com Augments",
        "Tanques Boss a cada 2 minutos",
        "Dificuldade Crescente",
        "Poderes Especiais (tecla K)",
        "Visual Neon Retrô"
      ]
    }
  ],

  // ===== CARACTERÍSTICAS/DIFERENCIAIS =====
  features: [
    {
      icone: "🚀",
      titulo: "ENTREGA RÁPIDA",
      texto: "Seu  pedido será feito o mais rápido possivel, estamos disponiveis 24 horas para te atender!"
    },
    {
      icone: "🔒",
      titulo: "100% SEGURO",
      texto: "Transações protegidas e dados criptografados para sua segurança."
    },
    {
      icone: "💰",
      titulo: "MELHOR PREÇO",
      texto: "Preços competitivos e justos para todos os jogadores"
    },
    {
      icone: "💬",
      titulo: "SUPORTE 24/7",
      texto: "Equipe sempre disponível para ajudar você"
    },
    {
      icone: "⭐",
      titulo: "7.000+ CLIENTES",
      texto: "Milhares de jogadores confiam em nossos serviços"
    },
    {
      icone: "✅",
      titulo: "GARANTIA TOTAL",
      texto: "Devolução garantida em casos de problemas técnicos ou desistência antes do início do acesso ao produto. Após o início do acesso, não é possível realizar reembolso."
    },
    {
      icone: "🎮",
      titulo: "MARKETPLACE",
      texto: "Participe dos nossos grupos no WhatsApp e Facebook, com comunidades ativas de diversos jogos! Anuncie seus produtos e encontre compradores de forma rápida e segura."
    },
    {
      icone: "🤝",
      titulo: "INTERMEDIAÇÃO",
      texto: "Realizamos intermediações para diversos tipos de serviços! Com a Daoshi Store você garante que nenhuma das partes seja prejudicada e que o processo seja seguro."
    }
  ],

  // ===== REDES SOCIAIS =====
  social: [
    {
      nome: "Discord",
      icone: "https://i.imgur.com/7Dmdj3I.png",
      descricao: "Junte-se à nossa comunidade no Discord! Suporte 24/7, promoções exclusivas, espaço para você anunciar e muito mais!",
      url: "https://discord.gg/daoshi",
      textoBotao: "Entrar no Discord"
    },
    {
      nome: "Instagram",
      icone: "https://i.imgur.com/hfAONeB.png",
      descricao: "Siga-nos no Instagram para novidades, promoções e atualizações sobre os jogos!",
      url: "https://www.instagram.com/daoshi.store/",
      textoBotao: "Seguir no Instagram"
    },
    {
      nome: "Facebook",
      icone: "https://i.imgur.com/cvwtPa9.png",
      descricao: "Curta nossa página no Facebook e fique por dentro de todas as novidades da loja!",
      url: "https://www.facebook.com/profile.php?id=61581292253937",
      textoBotao: "Curtir no Facebook"
    }
  ],

  // ===== FOOTER =====
  footer: {
    descricao: "Daoshi Store - Qualidade, segurança e os melhores preços do mercado!",
    copyright: "© 2025 Daoshi Store • Todos os direitos reservados",
    mensagem: "Feito com 💜 para a comunidade gamer"
  },

  // ===== NAVEGAÇÃO =====
  nav: {
    links: [
      { id: "home", icone: "🏠", texto: "Início" },
      { id: "games", icone: "🎮", texto: "Jogos" },
      { id: "minigames", icone: "🕹️", texto: "Minigames" },
      { id: "about", icone: "📖", texto: "Sobre" },
      { id: "contact", icone: "💬", texto: "Contato" }
    ]
  },

  // ===== TÍTULOS DE SEÇÕES =====
  titulos: {
    jogos: "🎮 NOSSOS JOGOS 🎮",
    todosJogos: "🎮 TODOS OS JOGOS 🎮",
    minigames: "🕹️ MINIGAMES EXCLUSIVOS 🕹️",
    sobre: "📖 SOBRE NÓS 📖",
    quemSomos: "💜 Quem Somos",
    contato: "💬 ENTRE EM CONTATO 💬"
  },

  // ===== BOTÕES =====
  botoes: {
    verJogos: "🎮 VER JOGOS",
    faleConosco: "💬 FALE CONOSCO",
    voltarInicio: "🏠 VOLTAR AO INÍCIO",
    acessar: "Acessar",
    abrirNovaAba: "🔗 Abrir em Nova Aba (Recomendado)"
  }
};

// Exporta a configuração para ser usada no HTML
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SITE_CONFIG;
}


