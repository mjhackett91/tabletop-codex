// server/test-pg-integration.js - Comprehensive PostgreSQL integration test
// Tests all converted routes against PostgreSQL database

const BASE_URL = process.env.TEST_URL || "http://localhost:5050/api";

let authToken = null;
let userId = null;
let campaignId = null;
let characterId = null;
let locationId = null;
let factionId = null;
let worldInfoId = null;
let questId = null;
let sessionId = null;
let creatureId = null;
let tagId = null;
let imageId = null;

// Helper function to make API requests
async function apiRequest(method, endpoint, body = null, token = authToken, isFormData = false) {
  const options = {
    method,
    headers: {},
  };

  if (token) {
    options.headers.Authorization = `Bearer ${token}`;
  }

  if (isFormData && body instanceof FormData) {
    // Don't set Content-Type for FormData - browser will set it with boundary
    options.body = body;
  } else if (body) {
    options.headers["Content-Type"] = "application/json";
    options.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, options);
    let data;
    const text = await response.text();
    try {
      data = JSON.parse(text);
    } catch {
      data = { error: text };
    }
    return { ok: response.ok, status: response.status, data };
  } catch (error) {
    return { ok: false, status: 0, error: error.message, data: null };
  }
}

// Test functions
async function testHealthCheck() {
  console.log("\n[1] Testing Health Check...");
  const result = await apiRequest("GET", "/ping", null, null);
  if (result.ok && result.data?.ok) {
    console.log("✅ Health check passed");
    return true;
  } else {
    console.error("❌ Health check failed:", result);
    return false;
  }
}

async function testRegister() {
  console.log("\n[2] Testing User Registration...");
  const username = `testuser_${Date.now()}`;
  const email = `${username}@test.com`;
  const password = "testpassword123";

  const result = await apiRequest("POST", "/auth/register", {
    username,
    email,
    password,
  }, null);

  if (result.ok && result.data?.token) {
    authToken = result.data.token;
    userId = result.data.user.id;
    console.log(`✅ User registered: ${username} (ID: ${userId})`);
    return true;
  } else {
    console.error("❌ Registration failed:", result);
    return false;
  }
}

async function testLogin() {
  console.log("\n[3] Testing User Login...");
  const username = `testuser_${Date.now()}`;
  const email = `${username}@test.com`;
  const password = "testpassword123";

  await apiRequest("POST", "/auth/register", {
    username,
    email,
    password,
  }, null);

  const result = await apiRequest("POST", "/auth/login", {
    username,
    password,
  }, null);

  if (result.ok && result.data?.token) {
    authToken = result.data.token;
    userId = result.data.user.id;
    console.log(`✅ Login successful: ${username} (ID: ${userId})`);
    return true;
  } else {
    console.error("❌ Login failed:", result);
    return false;
  }
}

async function testCreateCampaign() {
  console.log("\n[4] Testing Campaign Creation...");
  const result = await apiRequest("POST", "/campaigns", {
    name: "Test Campaign",
    description: "A test campaign for PostgreSQL integration",
  });

  if (result.ok && result.data?.id) {
    campaignId = result.data.id;
    console.log(`✅ Campaign created: ${result.data.name} (ID: ${campaignId})`);
    return true;
  } else {
    console.error("❌ Campaign creation failed:", result);
    return false;
  }
}

async function testGetCampaigns() {
  console.log("\n[5] Testing Get Campaigns...");
  const result = await apiRequest("GET", "/campaigns");

  if (result.ok && Array.isArray(result.data)) {
    console.log(`✅ Retrieved ${result.data.length} campaign(s)`);
    return true;
  } else {
    console.error("❌ Get campaigns failed:", result);
    return false;
  }
}

async function testCreateCharacter() {
  console.log("\n[6] Testing Character Creation...");
  const result = await apiRequest("POST", `/campaigns/${campaignId}/characters`, {
    type: "player",
    name: "Test Character",
    description: "A test character",
    character_sheet: {
      level: 5,
      class: "Fighter",
      race: "Human",
      hp: { current: 45, max: 50 }
    },
    visibility: "player-visible"
  });

  if (result.ok && result.data?.id) {
    characterId = result.data.id;
    console.log(`✅ Character created: ${result.data.name} (ID: ${characterId})`);
    return true;
  } else {
    console.error("❌ Character creation failed:", result);
    return false;
  }
}

async function testGetCharacters() {
  console.log("\n[7] Testing Get Characters...");
  const result = await apiRequest("GET", `/campaigns/${campaignId}/characters`);

  if (result.ok && Array.isArray(result.data)) {
    console.log(`✅ Retrieved ${result.data.length} character(s)`);
    return true;
  } else {
    console.error("❌ Get characters failed:", result);
    return false;
  }
}

async function testCreateLocation() {
  console.log("\n[8] Testing Location Creation...");
  const result = await apiRequest("POST", `/campaigns/${campaignId}/locations`, {
    name: "Test Location",
    description: "A test location",
    location_type: "City",
    visibility: "player-visible"
  });

  if (result.ok && result.data?.id) {
    locationId = result.data.id;
    console.log(`✅ Location created: ${result.data.name} (ID: ${locationId})`);
    return true;
  } else {
    console.error("❌ Location creation failed:", result);
    return false;
  }
}

async function testGetLocations() {
  console.log("\n[9] Testing Get Locations...");
  const result = await apiRequest("GET", `/campaigns/${campaignId}/locations`);

  if (result.ok && Array.isArray(result.data)) {
    console.log(`✅ Retrieved ${result.data.length} location(s)`);
    return true;
  } else {
    console.error("❌ Get locations failed:", result);
    return false;
  }
}

async function testCreateFaction() {
  console.log("\n[10] Testing Faction Creation...");
  const result = await apiRequest("POST", `/campaigns/${campaignId}/factions`, {
    name: "Test Faction",
    description: "A test faction",
    alignment: "Neutral",
    visibility: "player-visible"
  });

  if (result.ok && result.data?.id) {
    factionId = result.data.id;
    console.log(`✅ Faction created: ${result.data.name} (ID: ${factionId})`);
    return true;
  } else {
    console.error("❌ Faction creation failed:", result);
    return false;
  }
}

async function testCreateWorldInfo() {
  console.log("\n[11] Testing World Info Creation...");
  const result = await apiRequest("POST", `/campaigns/${campaignId}/world-info`, {
    title: "Test World Info",
    content: "Some test world information",
    category: "History",
    visibility: "player-visible"
  });

  if (result.ok && result.data?.id) {
    worldInfoId = result.data.id;
    console.log(`✅ World Info created: ${result.data.title} (ID: ${worldInfoId})`);
    return true;
  } else {
    console.error("❌ World Info creation failed:", result);
    return false;
  }
}

async function testCreateQuest() {
  console.log("\n[12] Testing Quest Creation...");
  const result = await apiRequest("POST", `/campaigns/${campaignId}/quests`, {
    title: "Test Quest",
    quest_type: "main",
    status: "active",
    short_summary: "A test quest",
    description: "This is a test quest for PostgreSQL integration",
    visibility: "player-visible"
  });

  if (result.ok && result.data?.id) {
    questId = result.data.id;
    console.log(`✅ Quest created: ${result.data.title} (ID: ${questId})`);
    return true;
  } else {
    console.error("❌ Quest creation failed:");
    console.error("   Status:", result.status);
    console.error("   Error:", result.data?.error);
    console.error("   Details:", result.data?.details || result.data);
    return false;
  }
}

async function testCreateQuestLink() {
  console.log("\n[13] Testing Quest Link Creation...");
  if (!questId || !characterId) {
    console.log("⚠️  Skipping - quest or character not created");
    return true;
  }

  const result = await apiRequest("POST", `/campaigns/${campaignId}/quests/${questId}/links`, {
    entity_type: "character",
    entity_id: characterId,
    role: "protagonist",
    visibility: "player-visible"
  });

  if (result.ok && result.data?.id) {
    console.log(`✅ Quest link created (ID: ${result.data.id})`);
    return true;
  } else {
    console.error("❌ Quest link creation failed:", result);
    return false;
  }
}

async function testCreateQuestObjective() {
  console.log("\n[14] Testing Quest Objective Creation...");
  if (!questId) {
    console.log("⚠️  Skipping - quest not created");
    return true;
  }

  const result = await apiRequest("POST", `/campaigns/${campaignId}/quests/${questId}/objectives`, {
    objective_type: "primary",
    title: "Test Objective",
    description: "A test quest objective",
    status: "incomplete"
  });

  if (result.ok && result.data?.id) {
    console.log(`✅ Quest objective created (ID: ${result.data.id})`);
    return true;
  } else {
    console.error("❌ Quest objective creation failed:", result);
    return false;
  }
}

async function testCreateSession() {
  console.log("\n[15] Testing Session Creation...");
  const result = await apiRequest("POST", `/campaigns/${campaignId}/sessions`, {
    session_number: 1,
    title: "Test Session",
    date_played: "2024-01-15",
    summary: "A test session",
    visibility: "player-visible"
  });

  if (result.ok && result.data?.id) {
    sessionId = result.data.id;
    console.log(`✅ Session created: Session #${result.data.session_number} (ID: ${sessionId})`);
    return true;
  } else {
    console.error("❌ Session creation failed:", result);
    return false;
  }
}

async function testCreateTag() {
  console.log("\n[16] Testing Tag Creation...");
  const result = await apiRequest("POST", `/campaigns/${campaignId}/tags`, {
    name: "Test Tag",
    color: "#FF5733",
    is_premade: false
  });

  if (result.ok && result.data?.id) {
    tagId = result.data.id;
    console.log(`✅ Tag created: ${result.data.name} (ID: ${tagId})`);
    return true;
  } else {
    console.error("❌ Tag creation failed:", result);
    return false;
  }
}

async function testGetTags() {
  console.log("\n[17] Testing Get Tags...");
  const result = await apiRequest("GET", `/campaigns/${campaignId}/tags`);

  if (result.ok && Array.isArray(result.data)) {
    console.log(`✅ Retrieved ${result.data.length} tag(s)`);
    return true;
  } else {
    console.error("❌ Get tags failed:", result);
    return false;
  }
}

async function testTagEntity() {
  console.log("\n[18] Testing Entity Tagging...");
  if (!tagId || !characterId) {
    console.log("⚠️  Skipping - tag or character not created");
    return true;
  }

  const result = await apiRequest("POST", `/campaigns/${campaignId}/entities/character/${characterId}/tags`, {
    tagIds: [tagId]
  });

  if (result.ok && Array.isArray(result.data)) {
    console.log(`✅ Tagged character with ${result.data.length} tag(s)`);
    return true;
  } else {
    console.error("❌ Entity tagging failed:", result);
    return false;
  }
}

async function testCreateCreature() {
  console.log("\n[19] Testing Creature Creation...");
  const result = await apiRequest("POST", `/campaigns/${campaignId}/creatures`, {
    name: "Test Creature",
    size: "Medium",
    creatureType: "Beast",
    sourceType: "homebrew",
    armorClass: { value: 15, type: "natural" },
    hitPoints: { average: 30, formula: "3d8+9" },
    abilities: {
      str: 16,
      dex: 14,
      con: 16,
      int: 8,
      wis: 12,
      cha: 10
    },
    visibility: "player-visible"
  });

  if (result.ok && result.data?.id) {
    creatureId = result.data.id;
    console.log(`✅ Creature created: ${result.data.name} (ID: ${creatureId})`);
    return true;
  } else {
    console.error("❌ Creature creation failed:", result);
    return false;
  }
}

async function testGetParticipantRole() {
  console.log("\n[20] Testing Get Participant Role...");
  const result = await apiRequest("GET", `/campaigns/${campaignId}/my-role`);

  if (result.ok && result.data?.role) {
    console.log(`✅ Retrieved role: ${result.data.role} (isDM: ${result.data.isDM})`);
    return true;
  } else {
    console.error("❌ Get participant role failed:", result);
    return false;
  }
}

async function testUpdateQuest() {
  console.log("\n[21] Testing Quest Update...");
  if (!questId) {
    console.log("⚠️  Skipping - quest not created");
    return true;
  }

  const result = await apiRequest("PUT", `/campaigns/${campaignId}/quests/${questId}`, {
    title: "Updated Test Quest",
    status: "active",
    short_summary: "Updated summary",
    visibility: "player-visible"
  });

  if (result.ok && result.data?.id) {
    console.log(`✅ Quest updated: ${result.data.title}`);
    return true;
  } else {
    console.error("❌ Quest update failed:", result);
    return false;
  }
}

async function testGetQuestWithRelations() {
  console.log("\n[22] Testing Get Quest With Relations...");
  if (!questId) {
    console.log("⚠️  Skipping - quest not created");
    return true;
  }

  const result = await apiRequest("GET", `/campaigns/${campaignId}/quests/${questId}`);

  if (result.ok && result.data?.id) {
    const quest = result.data;
    console.log(`✅ Quest retrieved with relations:`);
    console.log(`   - Links: ${quest.links?.length || 0}`);
    console.log(`   - Objectives: ${quest.objectives?.length || 0}`);
    console.log(`   - Milestones: ${quest.milestones?.length || 0}`);
    console.log(`   - Sessions: ${quest.sessions?.length || 0}`);
    console.log(`   - Tags: ${quest.tags?.length || 0}`);
    return true;
  } else {
    console.error("❌ Get quest with relations failed:", result);
    return false;
  }
}

async function testUploadImage() {
  console.log("\n[23] Testing Image Upload...");
  if (!characterId) {
    console.log("⚠️  Skipping - character not created");
    return true;
  }

  // Create a small test PNG image (1x1 transparent pixel)
  // Minimal valid PNG structure
  const pngBuffer = Buffer.from([
    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
    0x00, 0x00, 0x00, 0x0D, // IHDR chunk length
    0x49, 0x48, 0x44, 0x52, // IHDR
    0x00, 0x00, 0x00, 0x01, // width: 1
    0x00, 0x00, 0x00, 0x01, // height: 1
    0x08, 0x06, 0x00, 0x00, 0x00, // bit depth, color type, etc.
    0x1F, 0x15, 0xC4, 0x89, // CRC
    0x00, 0x00, 0x00, 0x0A, // IDAT chunk length
    0x49, 0x44, 0x41, 0x54, // IDAT
    0x78, 0x9C, 0x63, 0x00, 0x01, 0x00, 0x00, 0x05, 0x00, 0x01, // minimal zlib data
    0x0D, 0x0A, 0x2D, 0xB4, // CRC
    0x00, 0x00, 0x00, 0x00, // IEND chunk length
    0x49, 0x45, 0x4E, 0x44, // IEND
    0xAE, 0x42, 0x60, 0x82  // CRC
  ]);

  // Node.js 18+ has FormData and Blob built-in
  const FormDataClass = globalThis.FormData;
  const BlobClass = globalThis.Blob;
  
  if (!FormDataClass || !BlobClass) {
    console.log("⚠️  Skipping - FormData/Blob not available (need Node.js 18+)");
    return true;
  }

  const formData = new FormDataClass();
  
  // Create a Blob from the buffer and append to FormData
  const fileBlob = new BlobClass([pngBuffer], { type: 'image/png' });
  formData.append('image', fileBlob, 'test-image.png');

  const options = {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${authToken}`,
      // Don't set Content-Type - FormData will set it with boundary
    },
    body: formData
  };

  try {
    const response = await fetch(`${BASE_URL}/campaigns/${campaignId}/images/character/${characterId}`, options);
    let data;
    const text = await response.text();
    try {
      data = JSON.parse(text);
    } catch {
      data = { error: text };
    }

    if (response.ok && data?.id) {
      imageId = data.id;
      console.log(`✅ Image uploaded (ID: ${imageId}, Size: ${data.file_size} bytes)`);
      return true;
    } else {
      console.error("❌ Image upload failed:", { status: response.status, data });
      return false;
    }
  } catch (error) {
    console.error("❌ Image upload error:", error.message);
    return false;
  }
}

async function testGetImages() {
  console.log("\n[24] Testing Get Images for Entity...");
  if (!characterId) {
    console.log("⚠️  Skipping - character not created");
    return true;
  }

  const result = await apiRequest("GET", `/campaigns/${campaignId}/images/character/${characterId}`);

  if (result.ok && Array.isArray(result.data)) {
    console.log(`✅ Retrieved ${result.data.length} image(s) for character`);
    if (result.data.length > 0 && result.data[0].id) {
      imageId = result.data[0].id; // Update imageId if we got images
    }
    return true;
  } else {
    console.error("❌ Get images failed:", result);
    return false;
  }
}

async function testGetImageFile() {
  console.log("\n[25] Testing Get Image File...");
  if (!imageId) {
    console.log("⚠️  Skipping - no image uploaded");
    return true;
  }

  const options = {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${authToken}`,
    },
  };

  try {
    const response = await fetch(`${BASE_URL}/campaigns/${campaignId}/images/${imageId}/file`, options);
    
    if (response.ok) {
      const contentType = response.headers.get('content-type');
      const contentLength = response.headers.get('content-length');
      console.log(`✅ Image file retrieved (Content-Type: ${contentType}, Size: ${contentLength} bytes)`);
      return true;
    } else {
      console.error(`❌ Get image file failed: ${response.status}`);
      return false;
    }
  } catch (error) {
    console.error("❌ Get image file error:", error.message);
    return false;
  }
}

// Main test runner
async function runTests() {
  console.log("=".repeat(60));
  console.log("PostgreSQL Integration Test Suite");
  console.log("=".repeat(60));
  console.log(`Testing against: ${BASE_URL}`);
  console.log("=".repeat(60));

  const tests = [
    testHealthCheck,
    testRegister,
    testLogin,
    testCreateCampaign,
    testGetCampaigns,
    testCreateCharacter,
    testGetCharacters,
    testCreateLocation,
    testGetLocations,
    testCreateFaction,
    testCreateWorldInfo,
    testCreateQuest,
    testCreateQuestLink,
    testCreateQuestObjective,
    testCreateSession,
    testCreateTag,
    testGetTags,
    testTagEntity,
    testCreateCreature,
    testGetParticipantRole,
    testUpdateQuest,
    testGetQuestWithRelations,
    testUploadImage,
    testGetImages,
    testGetImageFile,
  ];

  const results = [];
  for (const test of tests) {
    try {
      const passed = await test();
      results.push({ name: test.name, passed });
    } catch (error) {
      console.error(`❌ Test ${test.name} threw error:`, error);
      results.push({ name: test.name, passed: false, error: error.message });
    }
  }

  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("Test Summary");
  console.log("=".repeat(60));
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  console.log(`✅ Passed: ${passed}/${results.length}`);
  console.log(`❌ Failed: ${failed}/${results.length}`);

  if (failed > 0) {
    console.log("\nFailed tests:");
    results.filter(r => !r.passed).forEach(r => {
      console.log(`  - ${r.name}${r.error ? `: ${r.error}` : ""}`);
    });
  }

  console.log("=".repeat(60));

  // Cleanup summary
  console.log("\nTest Data Created:");
  console.log(`  Campaign ID: ${campaignId || "N/A"}`);
  console.log(`  Character ID: ${characterId || "N/A"}`);
  console.log(`  Location ID: ${locationId || "N/A"}`);
  console.log(`  Faction ID: ${factionId || "N/A"}`);
  console.log(`  World Info ID: ${worldInfoId || "N/A"}`);
  console.log(`  Quest ID: ${questId || "N/A"}`);
  console.log(`  Session ID: ${sessionId || "N/A"}`);
  console.log(`  Creature ID: ${creatureId || "N/A"}`);
  console.log(`  Tag ID: ${tagId || "N/A"}`);
  console.log(`  Image ID: ${imageId || "N/A"}`);

  process.exit(failed > 0 ? 1 : 0);
}

// Run tests
runTests().catch(error => {
  console.error("Fatal error running tests:", error);
  process.exit(1);
});
