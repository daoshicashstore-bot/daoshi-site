import sys
import re

painel_admin = r"d:\SiteDaoshi-main\Sites\admin\painel-admin.js"
with open(painel_admin, "r", encoding="utf-8", errors="ignore") as f:
    text = f.read()

# Fix defaultPrices inside `getDefaultPrices()`
defaultPrices_block = """        sealm: {
            topup_11: 10.45,
            topup_24: 22.79,
            topup_30: 28.50,
            topup_40: 38.00,
            topup_50: 47.50,
            topup_80: 76.00,
            topup_100: 95.00
        },
        tsdsorigin: {
            topup_4: 4.30,
            topup_120: 0.90,
            topup_600: 4.30,
            topup_1900: 12.75,
            topup_3800: 21.25,
            topup_6200: 42.50,
            topup_121200: 85.00
        },
        arknights: {
            topup_1: 16.99,
            topup_2: 9.00,
            topup_3: 12.35,
            topup_4: 19.99,
            topup_5: 32.50,
            topup_6: 65.00,
            topup_7: 14.25,
            topup_8: 14.25,
            topup_9: 4.80,
            topup_10: 19.00,
            topup_11: 28.50,
            topup_12: 14.25,
            topup_13: 13.30,
            topup_14: 9.50
        },
        dungeoncross: {
            topup_1: 1.89,
            topup_2: 2.84,
            topup_6: 6.64,
            topup_9: 9.49,
            topup_14: 14.24,
            topup_19: 18.99,
            topup_29: 28.49,
            topup_39: 37.99,
            topup_49: 47.49,
            topup_99: 94.99
        },"""

# Current is:
current_sealm_old = """        sealm: {
            topup_5: 4.89,
            topup_8: 7.60,
            topup_10: 9.50,
            topup_30: 28.50,
            topup_50: 47.50,
            topup_80: 76.00,
            topup_100: 95.00
        },"""

if "topup_121200: 85.00" not in text:
    text = text.replace(current_sealm_old, defaultPrices_block)


# Fix gamesConfig UI map inside `renderPrices()`
gamesConfigUI_block = """        { id: 'sealm', name: 'Seal M', emoji: '⭐', fields: [
            { key: 'topup_11', label: '⭐ Pack 10.99 dol' },
            { key: 'topup_24', label: '⭐ Pacote 23.99 dol' },
            { key: 'topup_30', label: '⭐ Pack 30 dol' },
            { key: 'topup_40', label: '⭐ Pacote 40 dol' },
            { key: 'topup_50', label: '⭐ pack 50 dol' },
            { key: 'topup_80', label: '⭐ pack de 80 dol' },
            { key: 'topup_100', label: '⭐ pack de 100 dol' }
        ] },
        { id: 'tsdsorigin', name: 'TSDS Origin', emoji: '🗡️', fields: [
            { key: 'topup_4', label: '🗡️ Suprimentos de Liones' },
            { key: 'topup_120', label: '🗡️ 120+120 Memórias da estrela' },
            { key: 'topup_600', label: '🗡️ 600+600 Memórias da estrela' },
            { key: 'topup_1900', label: '🗡️ 1900+1900 Memórias da estrela' },
            { key: 'topup_3800', label: '🗡️ 3800+3800 Memórias da estrela' },
            { key: 'topup_6200', label: '🗡️ 6200+6200 Memórias da estrela' },
            { key: 'topup_121200', label: '🗡️ 121200+12200 Memórias' }
        ] },
        { id: 'arknights', name: 'Arknights Endfield', emoji: '🏰', fields: [
            { key: 'topup_1', label: '🏰 Pacote arsenal economico' },
            { key: 'topup_2', label: '🏰 Origiometria 21+5' },
            { key: 'topup_3', label: '🏰 Origeometria 34+6' },
            { key: 'topup_4', label: '🏰 Origeometria 57+11' },
            { key: 'topup_5', label: '🏰 Origeometria 92+20' },
            { key: 'topup_6', label: '🏰 origeometria 194+48' },
            { key: 'topup_7', label: '🏰 Pacote CT do patch atual' },
            { key: 'topup_8', label: '🏰 Pacote apoio a RH' },
            { key: 'topup_9', label: '🏰 passe mensal' },
            { key: 'topup_10', label: '🏰 Pacote completo' },
            { key: 'topup_11', label: '🏰 Pacote fluxo de protocolo' },
            { key: 'topup_12', label: '🏰 Pacote de materiais mensais' },
            { key: 'topup_13', label: '🏰 Pacote tiquete' },
            { key: 'topup_14', label: '🏰 Passe de batalha' }
        ] },
        { id: 'dungeoncross', name: 'Dungeon Cross', emoji: '⚔️', fields: [
            { key: 'topup_1', label: '⚔️ 1,99 USDT' },
            { key: 'topup_2', label: '⚔️ 2,99 USDT' },
            { key: 'topup_6', label: '⚔️ 6,99 USDT' },
            { key: 'topup_9', label: '⚔️ 9,99 USDT' },
            { key: 'topup_14', label: '⚔️ 14,99 USDT' },
            { key: 'topup_19', label: '⚔️ 19,99 USDT' },
            { key: 'topup_29', label: '⚔️ 29,99 USDT' },
            { key: 'topup_39', label: '⚔️ 39,99 USDT' },
            { key: 'topup_49', label: '⚔️ 49,99 USDT' },
            { key: 'topup_99', label: '⚔️ 99,99 USDT' }
        ] },"""

current_sealm_uimap = """        { id: 'sealm', name: 'Seal M', emoji: '⭐', fields: [
            { key: 'topup_11', label: '⭐ Pack 10.99 dol' },
            { key: 'topup_24', label: '⭐ Pacote 23.99 dol' },
            { key: 'topup_30', label: '⭐ Pack 30 dol' },
            { key: 'topup_40', label: '⭐ Pacote 40 dol' },
            { key: 'topup_50', label: '⭐ pack 50 dol' },
            { key: 'topup_80', label: '⭐ pack de 80 dol' },
            { key: 'topup_100', label: '⭐ pack de 100 dol' }
        ] },"""

if "id: 'tsdsorigin'" not in text:
    text = text.replace(current_sealm_uimap, gamesConfigUI_block)

with open(painel_admin, "w", encoding="utf-8") as f:
    f.write(text)
print("Painel prices updated")
