import sys
import re

# 1. Update gameConfigs.js
bot_configs = r"d:\SiteDaoshi-main\discord-bot\gameConfigs.js"
with open(bot_configs, "r", encoding="utf-8", errors="ignore") as f:
    text = f.read()

games_block = """  // ═══════════════════════════════════════════════════════════════
  // 🗡️ THE SEVEN DEADLY SINS: ORIGIN
  // ═══════════════════════════════════════════════════════════════
  tsdsorigin: {
    id: 'tsdsorigin',
    name: 'The Seven Deadly Sins: Origin',
    emoji: ':tsdsorigin:',
    description: 'Top Up',
    config: {
      defaultExchangeRate: 5.65,
      cardFeePercentage: 0.06,
      topUpPackages: {
        4: { price: 4.30 },
        120: { price: 0.90 },
        600: { price: 4.30 },
        1900: { price: 12.75 },
        3800: { price: 21.25 },
        6200: { price: 42.50 },
        121200: { price: 85.00 }
      }
    },
    products: [
      {
        id: 'topup',
        name: 'Top Up TSDS Origin',
        emoji: '💎',
        description: 'Pacotes de recarga',
        detailedDescription: 'Pacotes de Top Up disponíveis',
        packages: [
          { label: 'Suprimentos de Liones', priceUSD: 4.30 },
          { label: '120+120 Memórias da estrela', priceUSD: 0.90 },
          { label: '600+600 Memórias da estrela', priceUSD: 4.30 },
          { label: '1900+1900 Memórias da estrela', priceUSD: 12.75 },
          { label: '3800+3800 Memórias da estrela', priceUSD: 21.25 },
          { label: '6200+6200 Memórias da estrela', priceUSD: 42.50 },
          { label: '121200+12200 Memórias da estrela', priceUSD: 85.00 }
        ]
      }
    ]
  },

  // ═══════════════════════════════════════════════════════════════
  // 🏰 ARKNIGHTS ENDFIELD
  // ═══════════════════════════════════════════════════════════════
  arknights: {
    id: 'arknights',
    name: 'Arknights Endfield',
    emoji: ':arkicon:',
    description: 'Top Up',
    config: {
      defaultExchangeRate: 5.65,
      cardFeePercentage: 0.06,
      topUpPackages: {
        1: { price: 16.99 },
        2: { price: 9.00 },
        3: { price: 12.35 },
        4: { price: 19.99 },
        5: { price: 32.50 },
        6: { price: 65.00 },
        7: { price: 14.25 },
        8: { price: 14.25 },
        9: { price: 4.80 },
        10: { price: 19.00 },
        11: { price: 28.50 },
        12: { price: 14.25 },
        13: { price: 13.30 },
        14: { price: 9.50 }
      }
    },
    products: [
      {
        id: 'topup',
        name: 'Top Up Arknights',
        emoji: '💎',
        description: 'Pacotes de recarga',
        detailedDescription: 'Pacotes de Top Up disponíveis',
        packages: [
          { label: 'Pacote arsenal economico', priceUSD: 16.99 },
          { label: 'Origiometria 21+5', priceUSD: 9.00 },
          { label: 'Origeometria 34+6', priceUSD: 12.35 },
          { label: 'Origeometria 57+11', priceUSD: 19.99 },
          { label: 'Origeometria 92+20', priceUSD: 32.50 },
          { label: 'origeometria 194+48', priceUSD: 65.00 },
          { label: 'Pacote CT do patch atual', priceUSD: 14.25 },
          { label: 'Pacote apoio a RH', priceUSD: 14.25 },
          { label: 'passe mensal', priceUSD: 4.80 },
          { label: 'Pacote completo', priceUSD: 19.00 },
          { label: 'Pacote fluxo de protocolo', priceUSD: 28.50 },
          { label: 'Pacote de materiais mensais', priceUSD: 14.25 },
          { label: 'Pacote tiquete do arsenal promo', priceUSD: 13.30 },
          { label: 'Passe de batalha', priceUSD: 9.50 }
        ]
      }
    ]
  },

  // ═══════════════════════════════════════════════════════════════
  // ⚔️ DUNGEON CROSS
  // ═══════════════════════════════════════════════════════════════
  dungeoncross: {
    id: 'dungeoncross',
    name: 'Dungeon Cross',
    emoji: ':dungeoncross:',
    description: 'Top Up',
    config: {
      defaultExchangeRate: 5.65,
      cardFeePercentage: 0.06,
      topUpPackages: {
        1: { price: 1.89 },
        2: { price: 2.84 },
        6: { price: 6.64 },
        9: { price: 9.49 },
        14: { price: 14.24 },
        19: { price: 18.99 },
        29: { price: 28.49 },
        39: { price: 37.99 },
        49: { price: 47.49 },
        99: { price: 94.99 }
      }
    },
    products: [
      {
        id: 'topup',
        name: 'Top Up Dungeon Cross',
        emoji: '💎',
        description: 'Pacotes de recarga',
        detailedDescription: 'Pacotes de Top Up disponíveis',
        packages: [
          { label: '1,99 USDT', priceUSD: 1.89 },
          { label: '2,99 USDT', priceUSD: 2.84 },
          { label: '6,99 USDT', priceUSD: 6.64 },
          { label: '9,99 USDT', priceUSD: 9.49 },
          { label: '14,99 USDT', priceUSD: 14.24 },
          { label: '19,99 USDT', priceUSD: 18.99 },
          { label: '29,99 USDT', priceUSD: 28.49 },
          { label: '39,99 USDT', priceUSD: 37.99 },
          { label: '49,99 USDT', priceUSD: 47.49 },
          { label: '99,99 USDT', priceUSD: 94.99 }
        ]
      }
    ]
  },

"""

if "tsdsorigin: {" not in text:
    text = text.replace("nightcrows: {\n    id: 'nightcrows',", games_block + "nightcrows: {\n    id: 'nightcrows',")
    with open(bot_configs, "w", encoding="utf-8") as f:
        f.write(text)
    print("gameConfigs.js updated.")

# 2. Update index.js
bot_index = r"d:\SiteDaoshi-main\discord-bot\index.js"
with open(bot_index, "r", encoding="utf-8", errors="ignore") as f:
    text = f.read()

# Fallback routing
routing_block = """      if (gameId === 'tsdsorigin') {
        console.log(`🔒 tsdsorigin: Fallback para DAODAO`);
        return 'DAODAO';
      }
      if (gameId === 'arknights' || gameId === 'dungeoncross') {
        console.log(`🔒 ${gameId}: Fallback para DOG`);
        return 'DOG';
      }

      // Fallback automático para Legends of Ymir (ymirpoints) -> DAODAO (se não configurado)"""

if "tsdsorigin: Fallback para DAODAO" not in text:
    text = text.replace("// Fallback automático para Legends of Ymir (ymirpoints) -> DAODAO (se não configurado)", routing_block)

# loginGames
if "'tsdsorigin', 'arknights', 'dungeoncross'" not in text:
    text = text.replace("const loginGames = ['mir4'", "const loginGames = ['tsdsorigin', 'arknights', 'dungeoncross', 'mir4'")

# DEFAULT_GAME_CASHBACK_LIMITS
if "tsdsorigin: 1," not in text:
    text = text.replace("mir4: 1,", "tsdsorigin: 1,\n  arknights: 1,\n  dungeoncross: 1,\n  mir4: 1,")

with open(bot_index, "w", encoding="utf-8") as f:
    f.write(text)
print("index.js updated.")
