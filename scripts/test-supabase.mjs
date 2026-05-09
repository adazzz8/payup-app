import { createClient } from "@supabase/supabase-js";

const requiredVars = ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"];
const missingVars = requiredVars.filter((key) => !process.env[key]);

if (missingVars.length > 0) {
  console.error(`Missing required env vars: ${missingVars.join(", ")}`);
  process.exit(1);
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const testEmail = process.env.SUPABASE_TEST_EMAIL;
const testPassword = process.env.SUPABASE_TEST_PASSWORD;

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

async function checkTableExists(tableName) {
  const { error } = await supabase.from(tableName).select("id", { head: true, count: "exact" }).limit(1);
  if (error) {
    throw new Error(`Table check failed for "${tableName}": ${error.message}`);
  }
}

async function run() {
  console.log("1) Checking Supabase connection and table access...");
  await checkTableExists("users");
  await checkTableExists("customers");
  await checkTableExists("products");
  await checkTableExists("debts");
  await checkTableExists("messages");
  await checkTableExists("receipts");
  console.log("   OK: Connection works and core tables are reachable.");

  if (!testEmail || !testPassword) {
    console.log("2) Auth test skipped (SUPABASE_TEST_EMAIL / SUPABASE_TEST_PASSWORD not set).");
    return;
  }

  console.log("2) Checking Supabase Auth with test credentials...");
  const signInResult = await supabase.auth.signInWithPassword({
    email: testEmail,
    password: testPassword,
  });

  if (signInResult.error || !signInResult.data.user) {
    throw new Error(`Auth sign-in failed: ${signInResult.error?.message ?? "unknown error"}`);
  }

  const { data: userData, error: userError } = await supabase.auth.getUser(signInResult.data.session?.access_token);
  if (userError || !userData.user) {
    throw new Error(`Auth user fetch failed: ${userError?.message ?? "unknown error"}`);
  }

  console.log(`   OK: Auth works (user id: ${userData.user.id}).`);
}

run()
  .then(() => {
    console.log("Supabase connectivity test passed.");
  })
  .catch((error) => {
    console.error(`Supabase connectivity test failed: ${error.message}`);
    process.exit(1);
  });
