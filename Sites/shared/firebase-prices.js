// ═══════════════════════════════════════════════════════════════
// 🔥 FIREBASE PRICES - Sistema Centralizado de Preços
// ═══════════════════════════════════════════════════════════════
// Busca preços do Firebase (mesmos usados pelo bot Discord)
// Cache de 15 minutos para não sobrecarregar o Firebase
// ═══════════════════════════════════════════════════════════════

const FIREBASE_PRICES = {
    // Configuração do Firebase
    config: {
        databaseURL: 'https://daoshi-bot-default-rtdb.firebaseio.com',
        apiKey: 'AIzaSyD6vn4IagySnIJ-0knlelyZmIWNV7qJnKk'
    },
    
    // Cache
    cache: {},
    lastUpdate: {},
    CACHE_DURATION: 60 * 60 * 1000, // 60 minutos (era 15min — redução 4x de fetches Firebase pelos storefronts)
    
    // ═══════════════════════════════════════════════════════════════
    // 📥 BUSCAR PREÇOS DO FIREBASE
    // ═══════════════════════════════════════════════════════════════
    async fetchPrices(gameId) {
        try {
            // Verificar cache
            const now = Date.now();
            if (this.cache[gameId] && (now - this.lastUpdate[gameId]) < this.CACHE_DURATION) {
                console.log(`💰 Usando cache de preços para ${gameId}`);
                return this.cache[gameId];
            }
            
            // Buscar do Firebase
            const url = `${this.config.databaseURL}/gamePrices/${gameId}.json`;
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data) {
                this.cache[gameId] = data;
                this.lastUpdate[gameId] = now;
                console.log(`✅ Preços de ${gameId} carregados do Firebase`);
                return data;
            }
            
            return null;
        } catch (error) {
            console.error(`❌ Erro ao buscar preços de ${gameId}:`, error);
            return null;
        }
    },
    
    // ═══════════════════════════════════════════════════════════════
    // 🎮 PARSERS PARA CADA JOGO
    // ═══════════════════════════════════════════════════════════════
    
    // MIR4
    async getMir4Config() {
        const prices = await this.fetchPrices('mir4');
        
        // Fallback para valores padrão
        const defaults = {
            gold_usd: 5.00,
            goldBase: 29.00,
            gold5k: 26.00,
            gold10k: 26.00,
            gold20k: 23.00,
            topup_1: 0.90,
            topup_3: 2.60,
            topup_5: 4.20,
            topup_10: 7.60,
            topup_30: 22.80,
            topup_50: 40.00,
            topup_100: 76.00
        };
        
        const p = prices || defaults;
        
        return {
            defaultExchangeRate: 5.88,
            cardFeePercentage: 0.06,
            goldRates: {
                base: p.goldBase || defaults.goldBase,
                above5k: p.gold5k || defaults.gold5k,
                above10k: p.gold10k || defaults.gold10k,
                above20k: p.gold20k || defaults.gold20k,
                usdt: p.gold_usd || defaults.gold_usd
            },
            topUpPackages: {
                1: { price: p.topup_1 || defaults.topup_1 },
                3: { price: p.topup_3 || defaults.topup_3 },
                5: { price: p.topup_5 || defaults.topup_5 },
                10: { price: p.topup_10 || defaults.topup_10 },
                30: { price: p.topup_30 || defaults.topup_30 },
                50: { price: p.topup_50 || defaults.topup_50 },
                100: { price: p.topup_100 || defaults.topup_100 }
            }
        };
    },
    
    // NIGHTCROWS
    async getNightcrowsConfig() {
        const prices = await this.fetchPrices('nightcrows');
        
        const defaults = {
            twd_500: 13.70,
            twd_800: 21.92,
            twd_1000: 27.40,
            twd_1200: 32.88,
            twd_3000: 82.20,
            twd_3500: 95.90,
            twd_5000: 137.00,
            twd_7000: 191.80,
            twd_10000: 274.00,
            twd_30000: 822.00
        };
        
        const p = prices || defaults;
        
        return {
            defaultExchangeRate: 5.30,
            cardFeePercentage: 0.06,
            twdPackages: {
                500: { price: p.twd_500 || defaults.twd_500 },
                800: { price: p.twd_800 || defaults.twd_800 },
                1000: { price: p.twd_1000 || defaults.twd_1000 },
                1200: { price: p.twd_1200 || defaults.twd_1200 },
                3000: { price: p.twd_3000 || defaults.twd_3000 },
                3500: { price: p.twd_3500 || defaults.twd_3500 },
                5000: { price: p.twd_5000 || defaults.twd_5000 },
                7000: { price: p.twd_7000 || defaults.twd_7000 },
                10000: { price: p.twd_10000 || defaults.twd_10000 },
                30000: { price: p.twd_30000 || defaults.twd_30000 }
            }
        };
    },
    
    // ODIN
    async getOdinConfig() {
        const prices = await this.fetchPrices('odin');
        
        const defaults = {
            pack_4: 3.44,
            pack_9: 7.44,
            pack_23: 19.78,
            pack_30: 25.80,
            pack_40: 34.40,
            pack_80: 68.80
        };
        
        const p = prices || defaults;
        
        return {
            defaultExchangeRate: 5.30,
            pacotePrecos: {
                4: p.pack_4 || defaults.pack_4,
                9: p.pack_9 || defaults.pack_9,
                23: p.pack_23 || defaults.pack_23,
                30: p.pack_30 || defaults.pack_30,
                40: p.pack_40 || defaults.pack_40,
                80: p.pack_80 || defaults.pack_80
            }
        };
    },
    
    // YMIR TWD
    async getYmirConfig() {
        const prices = await this.fetchPrices('ymirtwd');
        
        const defaults = {
            twd_500: 13.70,
            twd_800: 21.92,
            twd_1000: 27.40,
            twd_1200: 32.88,
            twd_3000: 82.20,
            twd_3500: 95.90,
            twd_5000: 137.00,
            twd_7000: 191.80,
            twd_10000: 274.00,
            twd_30000: 822.00,
            topup_5: 4.00,
            topup_8: 6.40,
            topup_10: 8.00,
            topup_20: 16.00,
            topup_30: 24.00,
            topup_50: 40.00,
            topup_100: 80.00
        };
        
        const p = prices || defaults;
        
        return {
            defaultExchangeRate: 5.30,
            cardFeePercentage: 0.06,
            twdPackages: {
                500: { price: p.twd_500 || defaults.twd_500 },
                800: { price: p.twd_800 || defaults.twd_800 },
                1000: { price: p.twd_1000 || defaults.twd_1000 },
                1200: { price: p.twd_1200 || defaults.twd_1200 },
                3000: { price: p.twd_3000 || defaults.twd_3000 },
                3500: { price: p.twd_3500 || defaults.twd_3500 },
                5000: { price: p.twd_5000 || defaults.twd_5000 },
                7000: { price: p.twd_7000 || defaults.twd_7000 },
                10000: { price: p.twd_10000 || defaults.twd_10000 },
                30000: { price: p.twd_30000 || defaults.twd_30000 }
            },
            topUpPackages: {
                5: { price: p.topup_5 || defaults.topup_5 },
                8: { price: p.topup_8 || defaults.topup_8 },
                10: { price: p.topup_10 || defaults.topup_10 },
                20: { price: p.topup_20 || defaults.topup_20 },
                30: { price: p.topup_30 || defaults.topup_30 },
                50: { price: p.topup_50 || defaults.topup_50 },
                100: { price: p.topup_100 || defaults.topup_100 }
            }
        };
    },
    
    // RAVEN 2
    async getRaven2Config() {
        const prices = await this.fetchPrices('raven2');
        
        const defaults = {
            topup_3: 2.70,
            topup_4: 3.60,
            topup_7: 6.30,
            topup_22: 19.80,
            topup_36: 32.40,
            topup_70: 63.00
        };
        
        const p = prices || defaults;
        
        return {
            defaultExchangeRate: 5.30,
            cardFeePercentage: 0.06,
            topUpPackages: {
                3: { price: p.topup_3 || defaults.topup_3 },
                4: { price: p.topup_4 || defaults.topup_4 },
                7: { price: p.topup_7 || defaults.topup_7 },
                22: { price: p.topup_22 || defaults.topup_22 },
                36: { price: p.topup_36 || defaults.topup_36 },
                70: { price: p.topup_70 || defaults.topup_70 }
            }
        };
    },
    
    // ROHAN 2
    async getRohan2Config() {
        const prices = await this.fetchPrices('rohan2');
        
        const defaults = {
            topup_10: 8.50,
            topup_12: 9.99,
            topup_20: 17.00,
            topup_50: 42.50,
            topup_100: 85.00,
            goldBase: 27.00,
            gold5k: 26.00,
            gold10k: 26.00,
            gold20k: 23.00,
            gold_usd: 4.20
        };
        
        const p = prices || defaults;
        
        return {
            defaultExchangeRate: 5.30,
            cardFeePercentage: 0.06,
            goldRates: {
                base: p.goldBase || defaults.goldBase,
                above5k: p.gold5k || defaults.gold5k,
                above10k: p.gold10k || defaults.gold10k,
                above20k: p.gold20k || defaults.gold20k,
                usdt: p.gold_usd || defaults.gold_usd
            },
            topUpPackages: {
                10: { price: p.topup_10 || defaults.topup_10 },
                12: { price: p.topup_12 || defaults.topup_12 },
                20: { price: p.topup_20 || defaults.topup_20 },
                50: { price: p.topup_50 || defaults.topup_50 },
                100: { price: p.topup_100 || defaults.topup_100 }
            }
        };
    },
    
    // SUMMONERS WAR
    async getSummonersWarConfig() {
        const prices = await this.fetchPrices('summonerswar');
        
        const defaults = {
            topup_4: 4.03,
            topup_8: 7.93,
            topup_16: 15.86,
            topup_25: 24.52,
            topup_40: 40.40,
            topup_79: 79.36
        };
        
        const p = prices || defaults;
        
        return {
            defaultExchangeRate: 5.30,
            cardFeePercentage: 0.06,
            topUpPackages: {
                4: { price: p.topup_4 || defaults.topup_4 },
                8: { price: p.topup_8 || defaults.topup_8 },
                16: { price: p.topup_16 || defaults.topup_16 },
                25: { price: p.topup_25 || defaults.topup_25 },
                40: { price: p.topup_40 || defaults.topup_40 },
                79: { price: p.topup_79 || defaults.topup_79 }
            }
        };
    },
    
    // WEMIX - Sistema de margens sobre cotação
    async getWemixConfig() {
        const prices = await this.fetchPrices('wemix');
        
        // Margens padrão em % (55 = +55%, 15 = +15%, 6.5 = +6.5%)
        const defaults = {
            margem_1_9: 55,     // +55%
            margem_10_99: 15,   // +15%
            margem_100: 6.5     // +6.5%
        };
        
        const p = prices || {};
        
        // Converter % para multiplicador (55% -> 1.55)
        const margem1 = 1 + ((p.margem_1_9 ?? defaults.margem_1_9) / 100);
        const margem2 = 1 + ((p.margem_10_99 ?? defaults.margem_10_99) / 100);
        const margem3 = 1 + ((p.margem_100 ?? defaults.margem_100) / 100);
        
        return {
            precosPorFaixa: {
                faixa1: {
                    min: 1,
                    max: 9,
                    tipo: 'cotacao',
                    margem: margem1
                },
                faixa2: {
                    min: 10,
                    max: 99,
                    tipo: 'cotacao',
                    margem: margem2
                },
                faixa3: {
                    min: 100,
                    max: Infinity,
                    tipo: 'cotacao',
                    margem: margem3
                }
            }
        };
    },
    
    // GENSHIN
    async getGenshinConfig() {
        const prices = await this.fetchPrices('genshin');

        const defaults = {
            pack_5: 4.00,
            pack_15: 12.00,
            pack_30: 24.00,
            pack_50: 40.00,
            pack_100: 80.00
        };

        const p = prices || defaults;

        return {
            defaultExchangeRate: 5.30,
            pacotePrecos: {
                5: p.pack_5 || defaults.pack_5,
                15: p.pack_15 || defaults.pack_15,
                30: p.pack_30 || defaults.pack_30,
                50: p.pack_50 || defaults.pack_50,
                100: p.pack_100 || defaults.pack_100
            }
        };
    },

    // GENSHIN LOGIN E SENHA
    async getGenshinLoginESenhaConfig() {
        const prices = await this.fetchPrices('genshinloginesenha');

        const defaults = {
            pack_1: 3.80,
            pack_2: 7.50,
            pack_3: 14.00,
            pack_4: 3.80,
            pack_5: 11.00,
            pack_6: 24.00,
            pack_7: 35.00,
            pack_8: 70.00,
            pack_9: 9.50
        };

        const p = prices || defaults;

        return {
            defaultExchangeRate: 5.30,
            pacotePrecos: {
                1: p.pack_1 || defaults.pack_1,
                2: p.pack_2 || defaults.pack_2,
                3: p.pack_3 || defaults.pack_3,
                4: p.pack_4 || defaults.pack_4,
                5: p.pack_5 || defaults.pack_5,
                6: p.pack_6 || defaults.pack_6,
                7: p.pack_7 || defaults.pack_7,
                8: p.pack_8 || defaults.pack_8,
                9: p.pack_9 || defaults.pack_9
            }
        };
    }
};

// Exportar globalmente
if (typeof window !== 'undefined') {
    window.FIREBASE_PRICES = FIREBASE_PRICES;
}
