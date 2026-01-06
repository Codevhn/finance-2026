#!/bin/bash

# Script para corregir el bug de IndexedDB en todas las entidades de dominio
# El problema: las entidades inicializan id: null, pero IndexedDB rechaza null para autoIncrement

FILES=(
  "/home/frandArch/.gemini/antigravity/playground/ruby-disk/js/domain/Goal.js"
  "/home/frandArch/.gemini/antigravity/playground/ruby-disk/js/domain/Debt.js"
  "/home/frandArch/.gemini/antigravity/playground/ruby-disk/js/domain/Saving.js"
  "/home/frandArch/.gemini/antigravity/playground/ruby-disk/js/domain/Lottery.js"
  "/home/frandArch/.gemini/antigravity/playground/ruby-disk/js/domain/Transaction.js"
)

for file in "${FILES[@]}"; do
  echo "Procesando: $file"
  
  # Crear backup
  cp "$file" "$file.bak"
  
  # Aplicar corrección usando sed
  # Buscar el método toJSON y modificarlo para omitir id cuando es null
  sed -i '/toJSON() {/,/^  }$/ {
    /return {/,/};$/ {
      s/id: this\.id,//
      /^  }$/ i\    \n    \/\/ Solo incluir id si no es null (para IndexedDB autoIncrement)\n    if (this.id !== null) {\n      json.id = this.id;\n    }\n    \n    return json;
      s/return {/const json = {/
      s/};$/};/
    }
  }' "$file"
  
  echo "✓ Corregido: $file"
done

echo ""
echo "✅ Corrección completada en todas las entidades"
echo "📁 Backups guardados con extensión .bak"
