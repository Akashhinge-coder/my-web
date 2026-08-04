const { createClient } = require("@supabase/supabase-js");

require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const { data, error } = await supabase
    .from("payments")
    .select(`
      id,
      payment_method,
      payment_status,
      session:sessions (
        id,
        restaurant_tables (
          table_number
        )
      )
    `)
    .eq("payment_method", "cash")
    .eq("payment_status", "pending");

  console.log("Error:", error);
  console.log("Data:", JSON.stringify(data, null, 2));
}

main();
