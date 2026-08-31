import os
import shutil
import glob

base_dir = r"d:\SiteDaoshi-main\Sites\jogos"
sealm_dir = os.path.join(base_dir, "SealM")

games_info = {
    "Tsdsorigin": {
        "title": "The Seven Deadly Sins: Origin",
        "var": "TSDSORIGIN",
        "game_id": "tsdsorigin",
        "icon": "https://i.imgur.com/vHqBEMi.png",
        "packs": [
            ("pack-4", "Suprimentos de Liones"),
            ("pack-120", "120+120 Memórias da estrela"),
            ("pack-600", "600+600 Memórias da estrela"),
            ("pack-1900", "1900+1900 Memórias da estrela"),
            ("pack-3800", "3800+3800 Memórias da estrela"),
            ("pack-6200", "6200+6200 Memórias da estrela"),
            ("pack-121200", "121200+12200 Memórias da estrela"),
        ]
    },
    "Arknights": {
        "title": "Arknights Endfield",
        "var": "ARKNIGHTS",
        "game_id": "arknights",
        "icon": "https://i.imgur.com/HLExT4R.png",
        "packs": [
            ("pack-1", "Pacote arsenal economico"),
            ("pack-2", "Origiometria 21+5"),
            ("pack-3", "Origeometria 34+6"),
            ("pack-4", "Origeometria 57+11"),
            ("pack-5", "Origeometria 92+20"),
            ("pack-6", "origeometria 194+48"),
            ("pack-7", "Pacote CT do patch atual"),
            ("pack-8", "Pacote apoio a RH"),
            ("pack-9", "passe mensal"),
            ("pack-10", "Pacote completo"),
            ("pack-11", "Pacote fluxo de protocolo"),
            ("pack-12", "Pacote de materiais mensais"),
            ("pack-13", "Pacote tiquete do arsenal promo"),
            ("pack-14", "Passe de batalha")
        ]
    },
    "Dungeoncross": {
        "title": "Dungeon Cross",
        "var": "DUNGEONCROSS",
        "game_id": "dungeoncross",
        "icon": "https://i.imgur.com/W2d5X3j.png",
        "packs": [
            ("pack-1", "1,99 USDT"),
            ("pack-2", "2,99 USDT"),
            ("pack-6", "6,99 USDT"),
            ("pack-9", "9,99 USDT"),
            ("pack-14", "14,99 USDT"),
            ("pack-19", "19,99 USDT"),
            ("pack-29", "29,99 USDT"),
            ("pack-39", "39,99 USDT"),
            ("pack-49", "49,99 USDT"),
            ("pack-99", "99,99 USDT"),
        ]
    }
}

for game_dir_name, info in games_info.items():
    dest_dir = os.path.join(base_dir, game_dir_name)
    if os.path.exists(dest_dir):
        shutil.rmtree(dest_dir)
    shutil.copytree(sealm_dir, dest_dir)
    
    index_path = os.path.join(dest_dir, "index.html")
    with open(index_path, "r", encoding="utf-8") as f:
        html = f.read()
    
    # Base replacements
    html = html.replace("Seal M", info["title"])
    html = html.replace("SEALM_", info["var"] + "_")
    html = html.replace("window.SEALM_CONFIG", "window." + info["var"] + "_CONFIG")
    html = html.replace("'sealm'", "'" + info["game_id"] + "'")
    html = html.replace("aDF7tqi.png", info["icon"].split("/")[-1])
    
    # We must replace the packs section in html
    import re
    # Extract the form section
    
    form_start = html.find('id="pack-form"')
    form_start_tag = html.find('>', form_start) + 1
    
    form_end = html.find('</form>', form_start)
    
    # Let's generate new inputs from the packs
    new_form_content = "\\n"
    for pack_id, pack_label in info["packs"]:
        new_form_content += f"""                <label class="pack-label" for="{pack_id}">
                    <span>{pack_label}</span>
                    <input type="number" id="{pack_id}" name="{pack_id}" min="0" placeholder="0" class="pack-input">
                </label>\\n"""
    
    # replace everything between form_start_tag and button
    button_idx = html.find('<button type="button"', form_start)
    
    new_html = html[:form_start_tag] + new_form_content + "                " + html[button_idx:]
    
    with open(index_path, "w", encoding="utf-8") as f:
        f.write(new_html)
    
    print(f"Created {game_dir_name} pages.")
