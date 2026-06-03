import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";

const envPath = path.resolve(process.cwd(), ".env.local");
const rawEnv = fs.readFileSync(envPath, "utf8");
const env = Object.fromEntries(
  rawEnv
    .split(/\r?\n/)
    .filter(Boolean)
    .filter((line) => !line.startsWith("#"))
    .map((line) => {
      const [key, ...rest] = line.split("=");
      return [key, rest.join("=")];
    })
);

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(url, key);

async function main() {
  const { data: restaurants, error } = await supabase
    .from("restaurants")
    .select("*");
  console.log("All restaurants in DB:", restaurants, error);
}

main().catch(console.error);
