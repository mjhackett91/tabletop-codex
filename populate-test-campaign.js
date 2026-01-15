// Script to populate a test campaign with sample data
// Uses built-in fetch (Node.js 18+)
//
// Usage: TEST_PASSWORD=yourpassword node populate-test-campaign.js
// Or: TEST_USERNAME=username TEST_PASSWORD=password node populate-test-campaign.js

const API_URL = process.env.API_URL || 'http://localhost:5050/api';
const USERNAME = process.env.TEST_USERNAME || 'mjhackett91';
const PASSWORD = process.env.TEST_PASSWORD;

let authToken = null;
let campaignId = null;

// Login and get token
async function login() {
  try {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: USERNAME, password: PASSWORD })
    });

    if (!response.ok) {
      throw new Error(`Login failed: ${response.statusText}`);
    }

    const data = await response.json();
    authToken = data.token;
    console.log('✅ Logged in successfully');
    return authToken;
  } catch (error) {
    console.error('❌ Login error:', error.message);
    throw error;
  }
}

// Get or create test campaign
async function getOrCreateTestCampaign() {
  try {
    // Get all campaigns
    const response = await fetch(`${API_URL}/campaigns`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch campaigns: ${response.statusText}`);
    }

    const campaigns = await response.json();
    
    // Look for existing test campaign
    let testCampaign = campaigns.find(c => c.name.toLowerCase().includes('test'));
    
    if (!testCampaign) {
      // Create new test campaign
      const createResponse = await fetch(`${API_URL}/campaigns`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: 'Test Campaign',
          description: 'A test campaign for development and testing purposes'
        })
      });

      if (!createResponse.ok) {
        throw new Error(`Failed to create campaign: ${createResponse.statusText}`);
      }

      testCampaign = await createResponse.json();
      console.log('✅ Created test campaign');
    } else {
      console.log('✅ Found existing test campaign');
    }

    campaignId = testCampaign.id;
    return campaignId;
  } catch (error) {
    console.error('❌ Error with campaign:', error.message);
    throw error;
  }
}

// Helper to make authenticated API calls
async function apiCall(endpoint, method = 'GET', body = null) {
  const options = {
    method,
    headers: {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json'
    }
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(`${API_URL}${endpoint}`, options);
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API call failed: ${response.status} ${response.statusText} - ${errorText}`);
  }

  if (response.status === 204) {
    return null;
  }

  return await response.json();
}

// Create sample characters
async function createCharacters() {
  console.log('\n📝 Creating characters...');
  
  // Helper to create a basic character sheet
  const createBasicSheet = (name, classType, level = 5) => ({
    name: name,
    class: classType,
    level: level,
    race: 'Human',
    background: 'Noble',
    stats: {
      strength: 16,
      dexterity: 14,
      constitution: 15,
      intelligence: 12,
      wisdom: 13,
      charisma: 18
    },
    hp: { current: 45, max: 45, temp: 0 },
    ac: 16,
    speed: 30,
    skills: {},
    savingThrows: {},
    features: [],
    traits: [],
    equipment: [],
    spells: [],
    proficiencies: {
      languages: ['Common', 'Elvish'],
      tools: [],
      weapons: ['Longsword', 'Bow'],
      armor: ['Medium Armor']
    },
    personality: {
      traits: 'Brave and noble',
      ideals: 'Protect the innocent',
      bonds: 'Loyal to friends',
      flaws: 'Sometimes too trusting'
    },
    backstory: `A legendary ${classType.toLowerCase()} known throughout the land.`
  });

  const characters = [
    { 
      type: 'player', 
      name: 'Aragorn', 
      description: 'Ranger and future king', 
      alignment: 'Lawful Good', 
      visibility: 'player-visible',
      character_sheet: createBasicSheet('Aragorn', 'Ranger', 8)
    },
    { 
      type: 'player', 
      name: 'Legolas', 
      description: 'Elven archer', 
      alignment: 'Chaotic Good', 
      visibility: 'player-visible',
      character_sheet: createBasicSheet('Legolas', 'Ranger', 7)
    },
    { 
      type: 'npc', 
      name: 'Gandalf', 
      description: 'Wise wizard and guide', 
      alignment: 'Neutral Good', 
      visibility: 'player-visible',
      character_sheet: createBasicSheet('Gandalf', 'Wizard', 20)
    },
    { 
      type: 'npc', 
      name: 'Bilbo Baggins', 
      description: 'Retired adventurer', 
      alignment: 'Neutral Good', 
      visibility: 'player-visible',
      character_sheet: createBasicSheet('Bilbo Baggins', 'Rogue', 5)
    },
    { 
      type: 'antagonist', 
      name: 'Sauron', 
      description: 'Dark Lord of Mordor', 
      alignment: 'Lawful Evil', 
      visibility: 'player-visible',
      character_sheet: createBasicSheet('Sauron', 'Warlock', 20)
    },
    { 
      type: 'antagonist', 
      name: 'Saruman', 
      description: 'Fallen wizard', 
      alignment: 'Lawful Evil', 
      visibility: 'player-visible',
      character_sheet: createBasicSheet('Saruman', 'Wizard', 18)
    }
  ];

  for (const char of characters) {
    try {
      await apiCall(`/campaigns/${campaignId}/characters`, 'POST', char);
      console.log(`  ✅ Created ${char.type}: ${char.name}`);
    } catch (error) {
      console.log(`  ⚠️  Failed to create ${char.name}: ${error.message}`);
    }
  }
}

// Create sample sessions
async function createSessions() {
  console.log('\n📅 Creating sessions...');
  
  const sessions = [
    { session_number: 1, title: 'The Journey Begins', date_played: '2024-01-15', summary: 'The party meets in a tavern and receives their first quest', visibility: 'player-visible' },
    { session_number: 2, title: 'Into the Dark Forest', date_played: '2024-01-22', summary: 'The party ventures into the mysterious forest', visibility: 'player-visible' },
    { session_number: 3, title: 'The Ancient Temple', date_played: '2024-01-29', summary: 'Exploring an ancient temple and discovering secrets', visibility: 'player-visible' },
    { session_number: 4, title: 'The Final Battle', date_played: '2024-02-05', summary: 'Epic confrontation with the main antagonist', visibility: 'player-visible' }
  ];

  for (const session of sessions) {
    try {
      await apiCall(`/campaigns/${campaignId}/sessions`, 'POST', session);
      console.log(`  ✅ Created session ${session.session_number}: ${session.title}`);
    } catch (error) {
      console.log(`  ⚠️  Failed to create session ${session.session_number}: ${error.message}`);
    }
  }
}

// Create sample quests
async function createQuests() {
  console.log('\n🎯 Creating quests...');
  
  const quests = [
    { 
      title: 'The Lost Artifact', 
      quest_type: 'main',
      status: 'active',
      short_summary: 'Find the ancient artifact before the enemy does',
      description: 'An ancient artifact of great power has been lost. The party must find it before the dark forces do.',
      visibility: 'player-visible'
    },
    { 
      title: 'Rescue the Merchant', 
      quest_type: 'side',
      status: 'active',
      short_summary: 'A merchant has been kidnapped by bandits',
      description: 'A local merchant has been taken by bandits. The party must rescue them.',
      visibility: 'player-visible'
    },
    { 
      title: 'Clear the Goblin Cave', 
      quest_type: 'side',
      status: 'completed',
      short_summary: 'Clear out the goblin infestation',
      description: 'Goblins have been terrorizing the nearby village. Clear them out.',
      visibility: 'player-visible'
    }
  ];

  for (const quest of quests) {
    try {
      await apiCall(`/campaigns/${campaignId}/quests`, 'POST', quest);
      console.log(`  ✅ Created quest: ${quest.title}`);
    } catch (error) {
      console.log(`  ⚠️  Failed to create quest ${quest.title}: ${error.message}`);
    }
  }
}

// Create sample locations
async function createLocations() {
  console.log('\n📍 Creating locations...');
  
  const locations = [
    { name: 'The Prancing Pony', location_type: 'Tavern', description: 'A cozy inn where travelers gather', visibility: 'player-visible' },
    { name: 'The Dark Forest', location_type: 'Wilderness', description: 'A mysterious and dangerous forest', visibility: 'player-visible' },
    { name: 'Ancient Temple', location_type: 'Dungeon', description: 'An ancient temple filled with traps and treasures', visibility: 'player-visible' },
    { name: 'The Capital City', location_type: 'City', description: 'The bustling capital of the kingdom', visibility: 'player-visible' }
  ];

  for (const location of locations) {
    try {
      await apiCall(`/campaigns/${campaignId}/locations`, 'POST', location);
      console.log(`  ✅ Created location: ${location.name}`);
    } catch (error) {
      console.log(`  ⚠️  Failed to create location ${location.name}: ${error.message}`);
    }
  }
}

// Create sample factions
async function createFactions() {
  console.log('\n⚔️  Creating factions...');
  
  const factions = [
    { name: 'The Order of Light', description: 'A noble order dedicated to fighting evil', alignment: 'Lawful Good', goals: 'Protect the innocent and maintain order', visibility: 'player-visible' },
    { name: 'The Shadow Cult', description: 'A dark cult serving the forces of evil', alignment: 'Chaotic Evil', goals: 'Bring about the return of the dark lord', visibility: 'player-visible' },
    { name: 'The Merchants Guild', description: 'A powerful trading organization', alignment: 'Neutral', goals: 'Maximize profits and control trade routes', visibility: 'player-visible' }
  ];

  for (const faction of factions) {
    try {
      await apiCall(`/campaigns/${campaignId}/factions`, 'POST', faction);
      console.log(`  ✅ Created faction: ${faction.name}`);
    } catch (error) {
      console.log(`  ⚠️  Failed to create faction ${faction.name}: ${error.message}`);
    }
  }
}

// Create sample world info
async function createWorldInfo() {
  console.log('\n📚 Creating world info...');
  
  const worldInfo = [
    { title: 'The History of the Kingdom', category: 'History', content: 'A detailed history of how the kingdom was founded and its major events.', visibility: 'player-visible' },
    { title: 'Magic System', category: 'Lore', content: 'How magic works in this world and who can use it.', visibility: 'player-visible' },
    { title: 'The Great War', category: 'History', content: 'The devastating war that shaped the current political landscape.', visibility: 'player-visible' }
  ];

  for (const info of worldInfo) {
    try {
      await apiCall(`/campaigns/${campaignId}/world-info`, 'POST', info);
      console.log(`  ✅ Created world info: ${info.title}`);
    } catch (error) {
      console.log(`  ⚠️  Failed to create world info ${info.title}: ${error.message}`);
    }
  }
}

// Create sample creatures
async function createCreatures() {
  console.log('\n🐉 Creating creatures...');
  
  const creatures = [
    {
      name: 'Goblin',
      sourceType: 'homebrew',
      visibility: 'player-visible',
      size: 'Small',
      creatureType: 'Humanoid',
      alignment: 'Neutral Evil',
      challengeRating: '1/4',
      proficiencyBonus: 2,
      armorClass: { value: 15, type: 'leather' },
      hitPoints: { average: 7, formula: '2d6' },
      hitDice: '2d6',
      abilities: { str: 8, dex: 14, con: 10, int: 10, wis: 8, cha: 8 },
      shortDescription: 'Small, cowardly humanoids that attack in groups'
    },
    {
      name: 'Dragon',
      sourceType: 'homebrew',
      visibility: 'player-visible',
      size: 'Huge',
      creatureType: 'Dragon',
      alignment: 'Chaotic Evil',
      challengeRating: '10',
      proficiencyBonus: 4,
      armorClass: { value: 18, type: 'natural' },
      hitPoints: { average: 200, formula: '16d12+96' },
      hitDice: '16d12',
      abilities: { str: 23, dex: 10, con: 21, int: 14, wis: 13, cha: 17 },
      shortDescription: 'A massive, fire-breathing dragon'
    }
  ];

  for (const creature of creatures) {
    try {
      await apiCall(`/campaigns/${campaignId}/creatures`, 'POST', creature);
      console.log(`  ✅ Created creature: ${creature.name}`);
    } catch (error) {
      console.log(`  ⚠️  Failed to create creature ${creature.name}: ${error.message}`);
    }
  }
}

// Main function
async function main() {
  console.log('🚀 Starting test campaign population...\n');

  if (!PASSWORD) {
    console.error('❌ ERROR: TEST_PASSWORD environment variable is required');
    console.log('\nUsage:');
    console.log('  TEST_PASSWORD=yourpassword node populate-test-campaign.js');
    console.log('  Or: TEST_USERNAME=username TEST_PASSWORD=password node populate-test-campaign.js\n');
    process.exit(1);
  }

  try {
    await login();
    await getOrCreateTestCampaign();
    
    await createCharacters();
    await createSessions();
    await createQuests();
    await createLocations();
    await createFactions();
    await createWorldInfo();
    await createCreatures();

    console.log('\n✅ Test campaign population complete!');
    console.log(`\nCampaign ID: ${campaignId}`);
    console.log('You can now view the statistics in the Dashboard.');
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

main();
