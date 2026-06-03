import fs from "fs";
import path from "path";

const rootDir = "c:\\Users\\ishaj\\OneDrive\\Desktop\\Project";

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      if (!file.startsWith(".") && file !== "node_modules" && file !== ".next" && file !== "menuara") {
        results = results.concat(walk(filePath));
      }
    } else {
      if (file.endsWith(".tsx") || file.endsWith(".ts") || file.endsWith(".js") || file.endsWith(".jsx")) {
        results.push(filePath);
      }
    }
  });
  return results;
}

function search() {
  const files = walk(rootDir);
  console.log(`Found ${files.length} non-menuara source files. Searching for useCustomerMenu...`);
  for (const file of files) {
    const content = fs.readFileSync(file, "utf8");
    if (content.includes("useCustomerMenu")) {
      console.log(`Found match in file: ${file}`);
    }
  }
}

search();
