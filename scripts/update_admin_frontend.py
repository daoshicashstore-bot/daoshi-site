import sys
import re

# Update painel-admin.js
painel_admin = r"d:\SiteDaoshi-main\Sites\admin\painel-admin.js"
with open(painel_admin, "r", encoding="utf-8", errors="ignore") as f:
    text = f.read()

game_block = """    'sealm': { name: 'Seal M', emoji: '⭐', icon: 'https://i.imgur.com/aDF7tqi.png' },
    'tsdsorigin': { name: 'The Seven Deadly Sins: Origin', emoji: '🗡️', icon: 'https://i.imgur.com/vHqBEMi.png' },
    'arknights': { name: 'Arknights Endfield', emoji: '🏰', icon: 'https://i.imgur.com/HLExT4R.png' },
    'dungeoncross': { name: 'Dungeon Cross', emoji: '⚔️', icon: 'https://i.imgur.com/W2d5X3j.png' },"""

gameNames_block = """        'sealm': 'Seal M',
        'tsdsorigin': 'TSDS Origin',
        'arknights': 'Arknights',
        'dungeoncross': 'Dungeon Cross',"""

if "'tsdsorigin':" not in text:
    text = text.replace("'sealm': { name: 'Seal M', emoji: '⭐', icon: 'https://i.imgur.com/aDF7tqi.png' },", game_block)
    # They are twice in gameNames:
    text = text.replace("'sealm': 'Seal M',", gameNames_block)

defaultPrices_block = """        'sealm': {
            'pack-11': 10.45,
            'pack-24': 22.79,
            'pack-30': 28.50,
            'pack-40': 38.00,
            'pack-50': 47.50,
            'pack-80': 76.00,
            'pack-100': 95.00
        },
        'tsdsorigin': {
            'pack-4': 4.30,
            'pack-120': 0.90,
            'pack-600': 4.30,
            'pack-1900': 12.75,
            'pack-3800': 21.25,
            'pack-6200': 42.50,
            'pack-121200': 85.00
        },
        'arknights': {
            'pack-1': 16.99,
            'pack-2': 9.00,
            'pack-3': 12.35,
            'pack-4': 19.99,
            'pack-5': 32.50,
            'pack-6': 65.00,
            'pack-7': 14.25,
            'pack-8': 14.25,
            'pack-9': 4.80,
            'pack-10': 19.00,
            'pack-11': 28.50,
            'pack-12': 14.25,
            'pack-13': 13.30,
            'pack-14': 9.50
        },
        'dungeoncross': {
            'pack-1': 1.89,
            'pack-2': 2.84,
            'pack-6': 6.64,
            'pack-9': 9.49,
            'pack-14': 14.24,
            'pack-19': 18.99,
            'pack-29': 28.49,
            'pack-39': 37.99,
            'pack-49': 47.49,
            'pack-99': 94.99
        },"""
if "pack-121200" not in text:
    text = text.replace("""        'sealm': {
            'pack-11': 10.45,
            'pack-24': 22.79,
            'pack-30': 28.50,
            'pack-40': 38.00,
            'pack-50': 47.50,
            'pack-80': 76.00,
            'pack-100': 95.00
        },""", defaultPrices_block)

gamesConfigUI_block = """    'sealm': {
        name: 'Seal M',
        fields: ['pack-11', 'pack-24', 'pack-30', 'pack-40', 'pack-50', 'pack-80', 'pack-100']
    },
    'tsdsorigin': {
        name: 'TSDS Origin',
        fields: ['pack-4', 'pack-120', 'pack-600', 'pack-1900', 'pack-3800', 'pack-6200', 'pack-121200']
    },
    'arknights': {
        name: 'Arknights Endfield',
        fields: ['pack-1', 'pack-2', 'pack-3', 'pack-4', 'pack-5', 'pack-6', 'pack-7', 'pack-8', 'pack-9', 'pack-10', 'pack-11', 'pack-12', 'pack-13', 'pack-14']
    },
    'dungeoncross': {
        name: 'Dungeon Cross',
        fields: ['pack-1', 'pack-2', 'pack-6', 'pack-9', 'pack-14', 'pack-19', 'pack-29', 'pack-39', 'pack-49', 'pack-99']
    },"""

if "'dungeoncross': {" not in text:
    text = text.replace("""    'sealm': {
        name: 'Seal M',
        fields: ['pack-11', 'pack-24', 'pack-30', 'pack-40', 'pack-50', 'pack-80', 'pack-100']
    },""", gamesConfigUI_block)

with open(painel_admin, "w", encoding="utf-8") as f:
    f.write(text)
print("painel-admin.js updated.")


# Update dashboard.js
dashboard = r"d:\SiteDaoshi-main\Sites\dashboard.js"
with open(dashboard, "r", encoding="utf-8", errors="ignore") as f:
    text = f.read()

game_names_block1 = """    'sealm': 'SealM',
    'tsdsorigin': 'Tsdsorigin',
    'arknights': 'Arknights',
    'dungeoncross': 'Dungeoncross',"""

if "'tsdsorigin': 'Tsdsorigin'," not in text:
    text = text.replace("'sealm': 'SealM',", game_names_block1)

switch_block1 = """      case 'sealm':
      configCode = generateSealmConfig(data);
      break;
      case 'tsdsorigin':
      configCode = generateTsdsoriginConfig(data);
      break;
      case 'arknights':
      configCode = generateArknightsConfig(data);
      break;
      case 'dungeoncross':
      configCode = generateDungeoncrossConfig(data);
      break;"""

if "case 'tsdsorigin':" not in text:
    text = text.replace("""      case 'sealm':
      configCode = generateSealmConfig(data);
      break;""", switch_block1)

switch_block2 = """    case 'sealm':
      configCode = generateSealmConfig(data);
      break;
    case 'tsdsorigin':
      configCode = generateTsdsoriginConfig(data);
      break;
    case 'arknights':
      configCode = generateArknightsConfig(data);
      break;
    case 'dungeoncross':
      configCode = generateDungeoncrossConfig(data);
      break;"""

if "generateTsdsoriginConfig(data)" not in text:
    text = text.replace("""    case 'sealm':
      configCode = generateSealmConfig(data);
      break;""", switch_block2)

generate_funcs_block = """function generateSealmConfig(data) {
  let fieldsStr = `      topUpPackages: {\\n`;
  let packagesStr = `        packages: [\\n`;
  if (data.sealm) {
    Object.keys(data.sealm).forEach((key, index, arr) => {
      const price = data.sealm[key];
      const isLast = index === arr.length - 1;
      const num = key.replace('pack-', '');
      fieldsStr += `        ${num}: { price: ${price} }${isLast ? '' : ','}\\n`;
      packagesStr += `          { label: 'Pack ${num}', priceUSD: ${price} }${isLast ? '' : ','}\\n`;
    });
  }
  fieldsStr += `      }`;
  packagesStr += `        ]`;
  return { fieldsStr, packagesStr };
}

function generateTsdsoriginConfig(data) {
  let fieldsStr = `      topUpPackages: {\\n`;
  let packagesStr = `        packages: [\\n`;
  if (data.tsdsorigin) {
    Object.keys(data.tsdsorigin).forEach((key, index, arr) => {
      const price = data.tsdsorigin[key];
      const isLast = index === arr.length - 1;
      const num = key.replace('pack-', '');
      fieldsStr += `        ${num}: { price: ${price} }${isLast ? '' : ','}\\n`;
      packagesStr += `          { label: 'Pack ${num}', priceUSD: ${price} }${isLast ? '' : ','}\\n`;
    });
  }
  fieldsStr += `      }`;
  packagesStr += `        ]`;
  return { fieldsStr, packagesStr };
}

function generateArknightsConfig(data) {
  let fieldsStr = `      topUpPackages: {\\n`;
  let packagesStr = `        packages: [\\n`;
  if (data.arknights) {
    Object.keys(data.arknights).forEach((key, index, arr) => {
      const price = data.arknights[key];
      const isLast = index === arr.length - 1;
      const num = key.replace('pack-', '');
      fieldsStr += `        ${num}: { price: ${price} }${isLast ? '' : ','}\\n`;
      packagesStr += `          { label: 'Pack ${num}', priceUSD: ${price} }${isLast ? '' : ','}\\n`;
    });
  }
  fieldsStr += `      }`;
  packagesStr += `        ]`;
  return { fieldsStr, packagesStr };
}

function generateDungeoncrossConfig(data) {
  let fieldsStr = `      topUpPackages: {\\n`;
  let packagesStr = `        packages: [\\n`;
  if (data.dungeoncross) {
    Object.keys(data.dungeoncross).forEach((key, index, arr) => {
      const price = data.dungeoncross[key];
      const isLast = index === arr.length - 1;
      const num = key.replace('pack-', '');
      fieldsStr += `        ${num}: { price: ${price} }${isLast ? '' : ','}\\n`;
      packagesStr += `          { label: 'Pack ${num}', priceUSD: ${price} }${isLast ? '' : ','}\\n`;
    });
  }
  fieldsStr += `      }`;
  packagesStr += `        ]`;
  return { fieldsStr, packagesStr };
}"""

if "function generateTsdsoriginConfig" not in text:
    # Need to regex search for the function
    text = re.sub(r"function generateSealmConfig\(data\) \{.+?return \{ fieldsStr, packagesStr \};\n\}", generate_funcs_block, text, flags=re.DOTALL)

with open(dashboard, "w", encoding="utf-8") as f:
    f.write(text)
print("dashboard.js updated.")
