import fs from "fs";
import path from "path";

const root = path.resolve("src");
const reps = [
  ["@/lib/supabase/client", "@/config/supabase/client"],
  ["@/lib/supabase/server", "@/config/supabase/server"],
  ["@/components/admin/", "@/frontend/components/admin/"],
  ["@/components/ServiceWorker", "@/frontend/components/shared/ServiceWorker"],
  ["@/hooks/", "@/frontend/hooks/"],
  ['from "@/types"', 'from "@/types/domain"'],
  ['import("@/types")', 'import("@/types/domain")'],
  ["@/lib/menu/foodType", "@/lib/foodType"],
];

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!["node_modules", ".next"].includes(entry.name)) walk(full);
    } else if (/\.(tsx?|jsx?)$/.test(entry.name)) {
      let content = fs.readFileSync(full, "utf8");
      let next = content;
      for (const [from, to] of reps) next = next.split(from).join(to);
      if (next !== content) fs.writeFileSync(full, next);
    }
  }
}

walk(root);
console.log("imports fixed");
