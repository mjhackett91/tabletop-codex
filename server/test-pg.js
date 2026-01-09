// Test script for PostgreSQL connection and basic operations
import { query, get, all, pool } from "./db-pg.js";

async function runTests() {
  console.log("🧪 Testing PostgreSQL Connection...\n");

  try {
    // Test 1: Basic connection
    console.log("Test 1: Basic Connection");
    const connectionTest = await query("SELECT NOW() as current_time, version() as pg_version");
    console.log("✅ Connected to PostgreSQL");
    console.log(`   Time: ${connectionTest.rows[0].current_time}`);
    console.log(`   Version: ${connectionTest.rows[0].pg_version.split(' ')[0]} ${connectionTest.rows[0].pg_version.split(' ')[1]}\n`);

    // Test 2: Check if tables exist
    console.log("Test 2: Verify Tables Exist");
    const tables = await all(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);
    console.log(`✅ Found ${tables.length} tables:`);
    tables.forEach(t => console.log(`   - ${t.table_name}`));
    console.log("");

    // Test 3: Test INSERT with RETURNING (PostgreSQL-specific)
    console.log("Test 3: INSERT with RETURNING");
    const insertResult = await query(
      `INSERT INTO users (username, email, password_hash) 
       VALUES ($1, $2, $3) 
       RETURNING id, username, email, created_at`,
      ["test_user", "test@example.com", "hashed_password"]
    );
    const newUserId = insertResult.rows[0].id;
    console.log(`✅ Created test user: ID=${newUserId}, username=${insertResult.rows[0].username}\n`);

    // Test 4: Test SELECT (get single row)
    console.log("Test 4: SELECT (get single row)");
    const user = await get("SELECT * FROM users WHERE id = $1", [newUserId]);
    console.log(`✅ Retrieved user: ${user.username} (${user.email})\n`);

    // Test 5: Test SELECT (get all rows)
    console.log("Test 5: SELECT (get all rows)");
    const allUsers = await all("SELECT id, username, email FROM users ORDER BY id");
    console.log(`✅ Retrieved ${allUsers.length} users`);
    allUsers.forEach(u => console.log(`   - ${u.username} (ID: ${u.id})`));
    console.log("");

    // Test 6: Test UPDATE
    console.log("Test 6: UPDATE");
    await query(
      "UPDATE users SET email = $1 WHERE id = $2",
      ["updated@example.com", newUserId]
    );
    const updatedUser = await get("SELECT * FROM users WHERE id = $1", [newUserId]);
    console.log(`✅ Updated user email to: ${updatedUser.email}\n`);

    // Test 7: Test transaction
    console.log("Test 7: Transaction");
    const transaction = await pool.connect();
    try {
      await transaction.query("BEGIN");
      await transaction.query(
        "INSERT INTO campaigns (user_id, name, description) VALUES ($1, $2, $3) RETURNING id",
        [newUserId, "Test Campaign", "A test campaign"]
      );
      await transaction.query("COMMIT");
      console.log("✅ Transaction completed successfully\n");
    } catch (error) {
      await transaction.query("ROLLBACK");
      throw error;
    } finally {
      transaction.release();
    }

    // Test 8: Test DELETE
    console.log("Test 8: DELETE");
    const campaigns = await all("SELECT id FROM campaigns WHERE user_id = $1", [newUserId]);
    for (const campaign of campaigns) {
      await query("DELETE FROM campaigns WHERE id = $1", [campaign.id]);
    }
    await query("DELETE FROM users WHERE id = $1", [newUserId]);
    console.log("✅ Cleaned up test data\n");

    // Test 9: Test parameterized queries with multiple params
    console.log("Test 9: Parameterized Queries ($1, $2, $3...)");
    const testResult = await query(
      "SELECT $1::text as param1, $2::integer as param2, $3::boolean as param3",
      ["test", 123, true]
    );
    console.log(`✅ Parameterized query works: ${JSON.stringify(testResult.rows[0])}\n`);

    // Test 10: Test foreign key constraints
    console.log("Test 10: Foreign Key Constraints");
    try {
      await query(
        "INSERT INTO campaigns (user_id, name) VALUES ($1, $2)",
        [99999, "Should Fail"]
      );
      console.log("❌ Foreign key constraint NOT working (this is bad!)");
    } catch (error) {
      if (error.code === "23503") { // Foreign key violation
        console.log("✅ Foreign key constraints working correctly\n");
      } else {
        throw error;
      }
    }

    console.log("🎉 All tests passed! PostgreSQL is ready for migration.\n");
    console.log("Next steps:");
    console.log("1. Convert routes from SQLite to PostgreSQL");
    console.log("2. Migrate existing data from SQLite to PostgreSQL");
    console.log("3. Test all CRUD operations");

  } catch (error) {
    console.error("❌ Test failed:", error.message);
    console.error("Stack:", error.stack);
    process.exit(1);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

runTests();
