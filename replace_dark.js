const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'src', 'frontend', 'components', 'customer', 'CustomerMenuView.tsx');
let content = fs.readFileSync(file, 'utf8');

content = content.replace(/bg-dark-card/g, 'bg-midnight-card');
content = content.replace(/bg-dark-tertiary/g, 'bg-midnight-tertiary');
content = content.replace(/border-dark-border/g, 'border-midnight-border');
content = content.replace(/from-dark-card/g, 'from-midnight-card');
content = content.replace(/to-dark-card/g, 'to-midnight-card');
content = content.replace(/bg-dark/g, 'bg-midnight');

fs.writeFileSync(file, content, 'utf8');
console.log('Replaced dark with midnight in CustomerMenuView.tsx');
