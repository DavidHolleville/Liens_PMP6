import pandas as pd
import json
import os
import re
import unicodedata

# Image par défaut pour la plongée si aucun mot-clé ne correspond
DEFAULT_DIVING_IMAGE = "https://images.unsplash.com/photo-1682687220063-4742bd7fd538?auto=format&fit=crop&w=600&q=80"

# Images spécifiques pour l'affichage des dossiers (Catégories et Sous-Catégories)
CATEGORY_IMAGES = {
    "formation": "https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=600&q=80",
    "ffessm": "https://images.unsplash.com/photo-1518152006812-edab29b069ac?auto=format&fit=crop&w=600&q=80",
    "stage": "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&w=600&q=80"
}

SUBCATEGORY_IMAGES = {
    "n1": "https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=600&q=80",
    "glenan": "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600&q=80",
    "marseille": "https://images.unsplash.com/photo-1563784462386-044fd95e9852?auto=format&fit=crop&w=600&q=80",
}

def clean_text(val):
    if pd.isna(val):
        return ""
    return str(val).strip()

def strip_accents(text):
    """Retire les accents et met le texte en minuscules pour faciliter les correspondances"""
    text = clean_text(text)
    text = unicodedata.normalize('NFD', text)
    text = text.encode('ascii', 'ignore')
    return text.decode("utf-8").lower()

def get_best_image(nom, sous_cat, cat, custom_img_desc):
    custom_desc = clean_text(custom_img_desc)
    
    # Si une adresse (URL ou nom de fichier local) est spécifiée dans la colonne E, on l'utilise directement
    if custom_desc:
        return custom_desc
            
    # Fallback par défaut
    return DEFAULT_DIVING_IMAGE

def parse_excel():
    excel_file = "liens.xlsx"
    if not os.path.exists(excel_file):
        raise FileNotFoundError(f"Le fichier {excel_file} est introuvable. Veuillez le placer dans le dossier.")

    print(f"Lecture de {excel_file}...")
    df = pd.read_excel(excel_file)
    
    # Normalisation des noms de colonnes
    df.columns = [re.sub(r'[éèêë]', 'e', col.lower().strip()) for col in df.columns]
    
    col_mapping = {
        'categorie': 'categorie',
        'sous-categorie': 'sous_categorie',
        'nom': 'nom',
        'lien': 'lien',
        'image': 'image'
    }
    
    # Vérification et renommage des colonnes nécessaires
    for col in col_mapping.keys():
        if col not in df.columns:
            found = False
            for real_col in df.columns:
                if col in real_col or real_col in col:
                    df.rename(columns={real_col: col}, inplace=True)
                    found = True
                    break
            if not found:
                raise KeyError(f"La colonne '{col}' est manquante dans le fichier Excel.")

    data = {
        "categories": {},
        "all_links": []
    }

    # 1. Extraction des images personnalisées de catégories et sous-catégories depuis Excel
    custom_category_images = {}
    custom_subcategory_images = {}
    
    for idx, row in df.iterrows():
        cat = clean_text(row.get('categorie'))
        sub = clean_text(row.get('sous-categorie'))
        nom = clean_text(row.get('nom'))
        lien = clean_text(row.get('lien'))
        img_custom = clean_text(row.get('image'))
        
        if not cat:
            continue
            
        # Une ligne de configuration a "image" mais pas de nom ni de lien
        if not nom and not lien and img_custom:
            cat_key = strip_accents(cat)
            if sub:
                sub_key = strip_accents(sub)
                custom_subcategory_images[(cat_key, sub_key)] = img_custom
            else:
                custom_category_images[cat_key] = img_custom

    # 2. Construction de la structure de données des catégories et liens
    for idx, row in df.iterrows():
        cat = clean_text(row.get('categorie'))
        sub = clean_text(row.get('sous-categorie'))
        nom = clean_text(row.get('nom'))
        lien = clean_text(row.get('lien'))
        img_custom = clean_text(row.get('image'))
        
        if not cat or not nom or not lien:
            continue
            
        print(f"Traitement du lien : '{nom}'")
        img_url = get_best_image(nom, sub, cat, img_custom)
        
        # Enregistrer dans la liste globale
        data["all_links"].append({
            "category": cat,
            "subcategory": sub,
            "name": nom,
            "url": lien,
            "image": img_url
        })
        
        # Structuration hiérarchique
        if cat not in data["categories"]:
            cat_key = strip_accents(cat)
            
            # Détection d'image pour la catégorie (Excel prioritaire, puis locale, puis par défaut)
            cat_safe = re.sub(r'[^a-zA-Z0-9_\-]', '_', cat_key).strip('_')
            cat_img_local_png = f"cat_{cat_safe}.png"
            cat_img_local_jpg = f"cat_{cat_safe}.jpg"
            if cat_key in custom_category_images:
                cat_img = custom_category_images[cat_key]
            elif os.path.exists(cat_img_local_png):
                cat_img = cat_img_local_png
            elif os.path.exists(cat_img_local_jpg):
                cat_img = cat_img_local_jpg
            else:
                cat_img = CATEGORY_IMAGES.get(cat_key, DEFAULT_DIVING_IMAGE)
                
            data["categories"][cat] = {
                "image": cat_img,
                "subcategories": {},
                "direct_links": []
            }
            
        if not sub:
            data["categories"][cat]["direct_links"].append({
                "name": nom,
                "url": lien,
                "image": img_url
            })
        else:
            if sub not in data["categories"][cat]["subcategories"]:
                sub_key = strip_accents(sub)
                
                # Détection d'image pour la sous-catégorie (Excel prioritaire, puis locale, puis par défaut)
                sub_safe = re.sub(r'[^a-zA-Z0-9_\-]', '_', sub_key).strip('_')
                sub_img_local_png = f"sub_{sub_safe}.png"
                sub_img_local_jpg = f"sub_{sub_safe}.jpg"
                if (cat_key, sub_key) in custom_subcategory_images:
                    sub_img = custom_subcategory_images[(cat_key, sub_key)]
                elif os.path.exists(sub_img_local_png):
                    sub_img = sub_img_local_png
                elif os.path.exists(sub_img_local_jpg):
                    sub_img = sub_img_local_jpg
                else:
                    sub_img = SUBCATEGORY_IMAGES.get(sub_key, DEFAULT_DIVING_IMAGE)
                    
                data["categories"][cat]["subcategories"][sub] = {
                    "image": sub_img,
                    "links": []
                }
            data["categories"][cat]["subcategories"][sub]["links"].append({
                "name": nom,
                "url": lien,
                "image": img_url
            })

    # Sauvegarde dans data.js
    output_file = "data.js"
    with open(output_file, "w", encoding="utf-8") as f:
        f.write("// Ce fichier est généré automatiquement par parse_links.py. Ne pas modifier manuellement.\n")
        f.write("const PMP6_DATA = ")
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write(";\n")
        
    print(f"\nFichier {output_file} généré avec succès ! ({len(data['all_links'])} liens traités)")

if __name__ == "__main__":
    parse_excel()
