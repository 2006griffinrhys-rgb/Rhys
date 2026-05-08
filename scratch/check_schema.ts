import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
  const { data, error } = await supabase
    .from('email_connections')
    .select('*')
    .limit(1);

  if (error) {
    console.error("Error fetching email_connections:", error);
    return;
  }

  if (data && data.length > 0) {
    console.log("Columns in email_connections:", Object.keys(data[0]));
  } else {
    console.log("No data in email_connections, cannot determine columns this way.");
    // Try to get column info from information_schema if possible
    const { data: cols, error: colError } = await supabase.rpc('get_table_columns', { table_name: 'email_connections' });
    if (colError) {
        console.log("RPC get_table_columns not available.");
    } else {
        console.log("Columns:", cols);
    }
  }
}

checkSchema();
