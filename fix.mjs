import fs from 'fs';
import path from 'path';

function walkDir(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach((file) => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) { 
            results = results.concat(walkDir(file));
        } else { 
            if (file.endsWith('route.ts')) results.push(file);
        }
    });
    return results;
}

const routes = walkDir('./src/app/api');
let modified = 0;
for (const route of routes) {
    const content = fs.readFileSync(route, 'utf-8');
    if (content.includes('export async function GET') && !content.includes('export const dynamic')) {
        console.log('Modifying:', route);
        fs.writeFileSync(route, content + '\nexport const dynamic = \'force-dynamic\';\n');
        modified++;
    }
}
console.log('Modified files:', modified);
