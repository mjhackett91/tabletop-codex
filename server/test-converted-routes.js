// Quick test script for converted PostgreSQL routes
// Using Node.js built-in fetch (Node 18+)

const BASE_URL = "http://localhost:5050/api";

async function test() {
  console.log("🧪 Testing Converted PostgreSQL Routes\n");

  try {
    // Test 1: Health check (no DB)
    console.log("Test 1: Health Check");
    const healthRes = await fetch(`${BASE_URL}/ping`);
    const healthData = await healthRes.json();
    console.log("✅ Health check:", healthData);
    console.log("");

    // Test 2: Register a test user
    console.log("Test 2: Register User");
    const registerRes = await fetch(`${BASE_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: `testuser_${Date.now()}`,
        email: `test_${Date.now()}@example.com`,
        password: "testpass123"
      })
    });
    
    if (registerRes.status === 201) {
      const registerData = await registerRes.json();
      console.log("✅ User registered:", registerData.user.username);
      const token = registerData.token;
      const userId = registerData.user.id;
      console.log("");

      // Test 3: Login
      console.log("Test 3: Login");
      const loginRes = await fetch(`${BASE_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: registerData.user.username,
          password: "testpass123"
        })
      });
      
      if (loginRes.status === 200) {
        const loginData = await loginRes.json();
        console.log("✅ Login successful:", loginData.user.username);
        console.log("");

        // Test 4: Create Campaign
        console.log("Test 4: Create Campaign");
        const campaignRes = await fetch(`${BASE_URL}/campaigns`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({
            name: "Test Campaign",
            description: "Testing PostgreSQL migration"
          })
        });

        if (campaignRes.status === 201) {
          const campaignData = await campaignRes.json();
          console.log("✅ Campaign created:", campaignData.name, "(ID:", campaignData.id + ")");
          const campaignId = campaignData.id;
          console.log("");

          // Test 5: Get Campaigns
          console.log("Test 5: Get Campaigns");
          const getCampaignsRes = await fetch(`${BASE_URL}/campaigns`, {
            headers: { "Authorization": `Bearer ${token}` }
          });
          
          if (getCampaignsRes.status === 200) {
            const campaigns = await getCampaignsRes.json();
            console.log(`✅ Retrieved ${campaigns.length} campaign(s)`);
            console.log("");

            // Test 6: Create Character
            console.log("Test 6: Create Character");
            const characterRes = await fetch(`${BASE_URL}/campaigns/${campaignId}/characters`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
              },
              body: JSON.stringify({
                type: "player",
                name: "Test Character",
                description: "A test character",
                alignment: "Neutral Good"
              })
            });

            if (characterRes.status === 201) {
              const characterData = await characterRes.json();
              console.log("✅ Character created:", characterData.name);
              console.log("");

              // Test 7: Get Characters
              console.log("Test 7: Get Characters");
              const getCharsRes = await fetch(`${BASE_URL}/campaigns/${campaignId}/characters`, {
                headers: { "Authorization": `Bearer ${token}` }
              });

              if (getCharsRes.status === 200) {
                const characters = await getCharsRes.json();
                console.log(`✅ Retrieved ${characters.length} character(s)`);
                console.log("");

                console.log("🎉 All converted routes working!");
                console.log("\n✅ PostgreSQL migration successful for:");
                console.log("   - Auth routes (register, login)");
                console.log("   - Campaign routes (create, get)");
                console.log("   - Character routes (create, get)");
              } else {
                console.log("❌ Get characters failed:", getCharsRes.status, await getCharsRes.text());
              }
            } else {
              console.log("❌ Create character failed:", characterRes.status, await characterRes.text());
            }
          } else {
            console.log("❌ Get campaigns failed:", getCampaignsRes.status, await getCampaignsRes.text());
          }
        } else {
          console.log("❌ Create campaign failed:", campaignRes.status, await campaignRes.text());
        }
      } else {
        console.log("❌ Login failed:", loginRes.status, await loginRes.text());
      }
    } else {
      const errorText = await registerRes.text();
      console.log("❌ Register failed:", registerRes.status, errorText);
    }

  } catch (error) {
    console.error("❌ Test error:", error.message);
    if (error.code === "ECONNREFUSED") {
      console.error("\n⚠️  Server not running! Start it with:");
      console.error("   cd server && node index.js");
    }
  }
}

test();
