#!/bin/bash

# Find all JavaScript and TypeScript files and remove console.log statements
find src -type f \( -name "*.js" -o -name "*.jsx" -o -name "*.ts" -o -name "*.tsx" \) -exec sed -i '' -E 's/console\.log\([^)]*\);?//g' {} \;

echo "Removed console.log statements from all JS and TS files" 