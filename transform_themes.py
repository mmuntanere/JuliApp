import os
import re
import json
import datetime

DATA_DIR = "/Users/iedib/Documents/JuliAPP/JuliApp/src/data/themes"

def transform_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Extract variable name and array content
    match = re.search(r'export const (\w+) = (\[[\s\S]*?\]);', content)
    if not match:
        print(f"Skipping {filepath}: No match found")
        return

    var_name = match.group(1)
    json_str = match.group(2)
    
    try:
        data = json.loads(json_str)
    except json.JSONDecodeError as e:
        print(f"JSON Error in {filepath}: {e}")
        return

    filename = os.path.basename(filepath).replace('.js', '')
    
    new_structure = {
        "metadata": {
            "category": "Subaltern",
            "type": "Theme",
            "subcategory": filename,
            "created_at": datetime.date.today().isoformat(),
            "author": "Admin"
        },
        "questions": []
    }

    for item in data:
        options = []
        correct_index = -1
        correct_text_full = item.get('resposta_correcta', '')
        
        correct_match = re.match(r'\([a-z]\)\s*(.*)', correct_text_full)
        # Also handle "a) " format which appeared in tema1.js
        if not correct_match:
             correct_match = re.match(r'[a-z]\)\s*(.*)', correct_text_full)
             
        correct_text_clean = correct_match.group(1) if correct_match else correct_text_full

        for i, opt in enumerate(item.get('opcions', [])):
            opt_clean_match = re.match(r'\([a-z]\)\s*(.*)', opt)
            if not opt_clean_match:
                opt_clean_match = re.match(r'[a-z]\)\s*(.*)', opt)
                
            opt_clean = opt_clean_match.group(1) if opt_clean_match else opt
            options.append(opt_clean)

            if opt_clean == correct_text_clean:
                correct_index = i
            elif opt == correct_text_full:
                correct_index = i

        new_q = {
            "id": item.get('id'),
            "question": item.get('pregunta'),
            "image": None,
            "options": options,
            "correct_answer": correct_index,
            "explanation": item.get('explicacio')
        }
        new_structure['questions'].append(new_q)

    new_content = f"export const {var_name} = {json.dumps(new_structure, indent=2, ensure_ascii=False)};\n"
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(new_content)
    
    print(f"Transformed {filepath}")

def main():
    if not os.path.exists(DATA_DIR):
        print(f"Directory not found: {DATA_DIR}")
        return
        
    for filename in os.listdir(DATA_DIR):
        if filename.endswith('.js'):
            transform_file(os.path.join(DATA_DIR, filename))

if __name__ == "__main__":
    main()
