import os
import re
import json
import unicodedata
import subprocess
import pandas as pd
from flask import Flask, request, jsonify, send_from_directory
from werkzeug.utils import secure_filename

app = Flask(__name__, static_folder='.', static_url_path='')

def strip_accents(text):
    text = unicodedata.normalize('NFD', text)
    text = text.encode('ascii', 'ignore').decode('utf-8')
    return text.lower().strip()

def safe_filename(text):
    text = strip_accents(text)
    text = re.sub(r'[^a-zA-Z0-9_\-]', '_', text)
    return text.strip('_')

# Route pour servir l'application principale
@app.route('/')
def index():
    return send_from_directory('.', 'index.html')

# Endpoint API : Téléverser une image locale
@app.route('/api/upload', methods=['POST'])
def upload_image():
    try:
        card_type = request.form.get('type')
        category = request.form.get('category', '').strip()
        subcategory = request.form.get('subcategory', '').strip()
        name = request.form.get('name', '').strip()
        
        if 'file' not in request.files:
            return jsonify({"success": False, "error": "Aucun fichier fourni"}), 400
            
        file = request.files['file']
        if file.filename == '':
            return jsonify({"success": False, "error": "Nom de fichier vide"}), 400
            
        # Obtenir l'extension du fichier d'origine (.png, .jpg, etc.)
        _, ext = os.path.splitext(file.filename.lower())
        if ext not in ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg']:
            return jsonify({"success": False, "error": "Extension de fichier non autorisée"}), 400

        # Déterminer le nom de destination
        if card_type == 'link':
            dest_filename = f"img_{safe_filename(name)}{ext}"
        elif card_type == 'category':
            dest_filename = f"cat_{safe_filename(category)}{ext}"
        elif card_type == 'subcategory':
            dest_filename = f"sub_{safe_filename(subcategory)}{ext}"
        else:
            return jsonify({"success": False, "error": "Type de bouton inconnu"}), 400

        # Enregistrer le fichier
        file.save(dest_filename)
        print(f"[Upload] Fichier enregistré : '{dest_filename}'")

        # Mettre à jour le fichier Excel liens.xlsx
        excel_file = "liens.xlsx"
        if os.path.exists(excel_file):
            try:
                df = pd.read_excel(excel_file)
                
                # Identifier les colonnes
                col_cat = [c for c in df.columns if 'categorie' in strip_accents(c)][0]
                col_sub = [c for c in df.columns if 'sous-categorie' in strip_accents(c) or 'sous_categorie' in strip_accents(c)][0]
                col_nom = [c for c in df.columns if 'nom' in strip_accents(c)][0]
                col_img = [c for c in df.columns if 'image' in strip_accents(c)][0]
                
                # Trouver la ligne correspondante selon le type
                match_mask = None
                if card_type == 'link':
                    match_mask = (
                        (df[col_cat].astype(str).str.strip().apply(strip_accents) == strip_accents(category)) &
                        (df[col_nom].astype(str).str.strip().apply(strip_accents) == strip_accents(name))
                    )
                    if subcategory:
                        match_mask = match_mask & (df[col_sub].astype(str).str.strip().apply(strip_accents) == strip_accents(subcategory))
                    else:
                        match_mask = match_mask & (df[col_sub].isna() | (df[col_sub].astype(str).str.strip() == ""))
                elif card_type == 'category':
                    match_mask = (
                        (df[col_cat].astype(str).str.strip().apply(strip_accents) == strip_accents(category)) &
                        (df[col_nom].isna() | (df[col_nom].astype(str).str.strip() == "")) &
                        (df[col_sub].isna() | (df[col_sub].astype(str).str.strip() == ""))
                    )
                elif card_type == 'subcategory':
                    match_mask = (
                        (df[col_cat].astype(str).str.strip().apply(strip_accents) == strip_accents(category)) &
                        (df[col_sub].astype(str).str.strip().apply(strip_accents) == strip_accents(subcategory)) &
                        (df[col_nom].isna() | (df[col_nom].astype(str).str.strip() == ""))
                    )
                
                if match_mask is not None:
                    matched_rows = df[match_mask]
                    if not matched_rows.empty:
                        # Mettre à jour l'image
                        row_idx = matched_rows.index[0]
                        df.at[row_idx, col_img] = dest_filename
                        df.to_excel(excel_file, index=False)
                        print(f"[Excel] Fichier Excel mis à jour : Ligne {row_idx} -> '{dest_filename}'")
                    else:
                        print(f"[Excel] Aucune ligne trouvée dans Excel pour {card_type} '{category}'/'{subcategory}'/'{name}'")
                        
            except PermissionError:
                return jsonify({
                    "success": False, 
                    "error": "Impossible de modifier 'liens.xlsx'. Veuillez fermer le fichier s'il est ouvert dans Excel."
                }), 403
            except Exception as e:
                return jsonify({"success": False, "error": f"Erreur lors de la mise à jour Excel : {str(e)}"}), 500

        # Régénérer le fichier data.js
        subprocess.run(["python", "parse_links.py"], check=True)
        
        return jsonify({"success": True, "image": dest_filename})
        
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

if __name__ == '__main__':
    # Lance le serveur sur le port 8000
    app.run(host='0.0.0.0', port=8000, debug=True)
