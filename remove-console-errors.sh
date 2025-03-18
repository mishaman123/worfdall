#!/bin/bash

# Find all JavaScript and TypeScript files and remove console.error statements
find src -type f \( -name "*.js" -o -name "*.jsx" -o -name "*.ts" -o -name "*.tsx" \) -exec sed -i '' -E 's/console\.error\([^)]*\);?//g' {} \;

echo "Removed console.error statements from all JS and TS files" 