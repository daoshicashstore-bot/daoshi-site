// ===== CONFIGURAÇÃO DA DAOSHI STORE =====
// Este arquivo centraliza TODAS as configurações editáveis do site
// Edite aqui para mudar textos, valores, links e informações

const SITE_CONFIG = {
  // ===== INFORMAÇÕES DA LOJA =====
  loja: {
    nome: "DAOSHI STORE",
    logo: "⭐💎⭐",
    tagline: "✨ A Loja Premium de Games que Você Confia ✨",
    subtitle: "🎮 8 Jogos • Melhores Preços • Entrega Instantânea • Suporte 24/7 🚀",
    descricao: "A DAOSHI STORE é a sua loja premium de confiança para serviços de games. Com anos de experiência no mercado, oferecemos as melhores soluções para jogadores que buscam qualidade, segurança e preços justos.",
    missao: "Trabalhamos com os principais jogos do momento, oferecendo Gold, Diamonds, Top Up e muito mais. Nossa missão é proporcionar a melhor experiência de compra para a comunidade gamer."
  },

  // ===== ESTATÍSTICAS =====
  stats: [
    { numero: "10.000+", label: "Clientes Satisfeitos" },
    { numero: "100.000+", label: "Transações Realizadas" },
    { numero: "auto", label: "Jogos Disponíveis" },
    { numero: "24/7", label: "Suporte Online" }
  ],

  // ===== JOGOS =====
  jogos: [
    {
      id: "typing-game",
      nome: "⌨️ Daoshi Typing",
      nomeCurto: "Typing Game",
      icone: "https://media3.giphy.com/media/v1.Y2lkPTc5MGI3NjExenJsZ3h2ejgxeTN4enRwazcyYTllYzI1aW1uaTh1czdzZjJnd3YzcCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/IAkgiYMQzCzzMas62O/giphy.gif",
      iconeGrande: true,
      emoji: "⌨️",
      destaque: true,
      tipo: "game",
      descricaoCurta: "Teste de Velocidade de Digitação",
      descricaoLonga: "Teste suas habilidades de digitação, compita no ranking global e melhore sua velocidade!",
      url: "typing-game/index.html",
      features: [
        "Ranking Online Global",
        "Modo Casual e Ranqueado",
        "Sistema Anti-Cheat",
        "Estatísticas Detalhadas",
        "Palavras em Português"
      ]
    },
    {
      id: "mir4",
      nome: "MIR4",
      nomeCurto: "MIR4",
      icone: "https://i.imgur.com/XrXphs0.png",
      iconeGrande: true,
      emoji: "⚔️",
      tipo: "loja",
      descricaoCurta: "Gold, Top Up e Serviços Premium",
      descricaoLonga: "O melhor serviço de Gold e Top Up para MIR4!",
      url: "Mir4/index.html",
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
      tipo: "loja",
      descricaoCurta: "Compra de Diamonds Rápida e Segura",
      descricaoLonga: "Compre Diamonds para Nightcrows com segurança!",
      url: "Nightcrows/index.html",
      features: [
        "Compra Rápida de Diamonds",
        "Preços Competitivos",
        "Sistema de Pagamento Seguro",
        "Entrega Garantida",
        "Suporte 24/7"
      ]
    },
    {
      id: "odin",
      {
        id: "sealm",
        nome: "Seal M",
        nomeCurto: "Seal M",
        icone: "https://i.imgur.com/aDF7tqi.png",
        iconeGrande: true,
        emoji: "?",
        tipo: "loja",
        descricaoCurta: "Top Up",
        descricaoLonga: "Top Up seguro e r�pido para Seal M!",
        url: "SealM/index.html",
        features: [
          "Pacotes de Cash",
          "Pre�os Competitivos",
          "Sistema de Pagamento Seguro",
          "Entrega Garantida",
          "Suporte 24/7"
        ]
      },

      nome: "Odin: Valhalla",
      nomeCurto: "Odin",
      icone: "https://i.imgur.com/aLsQf6y.png",
      iconeGrande: true,
      emoji: "⚡",
      tipo: "loja",
      descricaoCurta: "Valhalla Rising - Diamonds e Pacotes",
      descricaoLonga: "Top Up de Diamonds para Odin Valhalla Rising!",
      url: "Odin/index.html",
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
      tipo: "loja",
      descricaoCurta: "Conversão WEMIX/BRL Facilitada",
      descricaoLonga: "Conversão de WEMIX para Real facilitada!",
      url: "Wemix/index.html",
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
      iconeGrande: false,
      emoji: "✝︎",
      tipo: "loja",
      descricaoCurta: "RAVEN II",
      descricaoLonga: "Venha comprar packs para sua conta ^^",
      url: "raven2/index.html",
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
      iconeGrande: false,
      emoji: "✳︎",
      tipo: "loja",
      descricaoCurta: "ROHAN II",
      descricaoLonga: "Venha comprar packs pra sua conta ^^",
      url: "rohan2/index.html",
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
      tipo: "loja",
      descricaoCurta: "Genesis Crystals e Benção da Lua",
      descricaoLonga: "Genesis Crystals e Benção da Lua com os melhores preços!",
      url: "genshin/index.html",
      features: [
        "Entrega Instantânea",
        "Suporte 24/7",
        "100% Seguro",
        "Melhor Preço",
        "Genesis Crystals"
      ]
    },
    {
      id: "summonerswar",
      nome: "Summoners War",
      nomeCurto: "Summoners War",
      icone: "https://i.imgur.com/kav5I7I.png",
      iconScale: 1.05,
      emoji: "🔮",
      tipo: "loja",
      descricaoCurta: "Cristais, pacotes e serviços oficiais",
      descricaoLonga: "Cristais, pacotes mensais e serviços premium para Summoners War.",
      url: "summonerswar/index.html",
      features: [
        "Pacotes de Cristais Atualizados",
        "Planos Mensais e Semanais",
        "Pagamento 100% Seguro",
        "Entrega Rápida",
        "Suporte Dedicado"
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
      descricaoCurta: "Sobreviva aos tanques neon",
      descricaoLonga: "Mini-game exclusivo com reflexos de cor, tanques e projéteis que podem ser devolvidos!",
      url: "snake-game/index.html",
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
      texto: "Receba seus itens instantaneamente após a confirmação do pagamento"
    },
    {
      icone: "🔒",
      titulo: "100% SEGURO",
      texto: "Transações protegidas e dados criptografados para sua segurança"
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
      titulo: "5.000+ CLIENTES",
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
      descricao: "Junte-se à nossa comunidade no Discord! Suporte 24/7, promoções exclusivas e muito mais!",
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
    descricao: "A sua loja premium de games. Qualidade, segurança e os melhores preços do mercado!",
    copyright: "© 2025 Daoshi Store • Todos os direitos reservados",
    mensagem: "Feito com 💜 para a comunidade gamer"
  },

  // ===== NAVEGAÇÃO =====
  nav: {
    links: [
      { id: "home", icone: "🏠", texto: "Início" },
      { id: "games", icone: "🎮", texto: "Jogos" },
      { id: "about", icone: "📖", texto: "Sobre" },
      { id: "contact", icone: "💬", texto: "Contato" }
    ]
  },

  // ===== TÍTULOS DE SEÇÕES =====
  titulos: {
    jogos: "🎮 NOSSOS SERVIÇOS 🎮",
    todosJogos: "🎮 TODOS OS SERVIÇOS 🎮",
    sobre: "📖 SOBRE NÓS 📖",
    quemSomos: "💜 Quem Somos",
    contato: "💬 ENTRE EM CONTATO 💬",
    miniGames: "⌨️ MINI GAMES ⌨️",
    loja: "🛒 LOJA DE JOGOS 🛒"
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




