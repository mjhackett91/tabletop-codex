# Visibility & Sharing Testing Guide

This guide will help you test the player/DM visibility features and campaign sharing functionality.

## Prerequisites

You need **at least 2 user accounts**:
1. **DM Account** - Campaign owner/creator
2. **Player Account** - Participant invited to campaigns

### Quick Setup (if you don't have 2 accounts yet)

1. Register Account 1 (will be your DM):
   - Go to `/register`
   - Create account (e.g., `dm@test.com` / `password123`)

2. Register Account 2 (will be your Player):
   - Logout
   - Go to `/register`  
   - Create account (e.g., `player@test.com` / `password123`)

---

## Testing Method 1: Using Two Separate Browsers/Incognito Windows (Recommended)

This is the most realistic way to test, as it simulates real-world usage.

### Step 1: Share a Campaign (as DM)

1. **Login as DM account** (`dm@test.com`)
2. Go to **Dashboard**
3. Create a new campaign (or use an existing one)
4. Click the **Share icon (🔗)** on a campaign card
5. In the "Share Campaign" dialog:
   - Enter your **Player account's email** (`player@test.com`)
   - Select role: **"Player"**
   - Click **"Invite"**
6. You should see a success message and the player should appear in the participants list

### Step 2: Accept the Invitation (as Player)

1. **Login as Player account** (`player@test.com`)
2. Go to **Dashboard**
3. You should now see the campaign you were invited to
4. Click **"Open"** to access the campaign

### Step 3: Test Visibility Settings (as DM)

1. **Switch back to DM account** (keep both browsers open side-by-side)
2. Navigate to the shared campaign
3. Test different entity types with different visibility settings:

#### Test: Characters
- Go to **Characters** tab
- Create a new **Player Character**:
  - Name: "Test Hero"
  - Visibility: **"DM Only"**
  - Click "Create"
- Create another **NPC**:
  - Name: "Secret NPC"
  - Visibility: **"DM Only"**
- Create a third **NPC**:
  - Name: "Public NPC"
  - Visibility: **"DM & Players"**

#### Test: Locations
- Go to **Locations** tab
- Create a location:
  - Name: "Hidden Cave"
  - Visibility: **"DM Only"**
- Create another:
  - Name: "Public Tavern"
  - Visibility: **"DM & Players"**

#### Test: Factions, World Info, Quests, Sessions
- Repeat the same pattern for each entity type
- Create some with **"DM Only"** visibility
- Create others with **"DM & Players"** visibility

### Step 4: Verify Visibility (as Player)

1. **Switch to Player account browser**
2. Navigate to the same campaign
3. Check each section:

#### Expected Results:
- **Characters Tab**: 
  - ✅ Should see "Public NPC" (visibility: DM & Players)
  - ❌ Should NOT see "Secret NPC" (visibility: DM Only)
  - ⚠️ **Special case for Player Characters**: Players can see their own assigned characters even if visibility is "DM Only"
  
- **Locations Tab**:
  - ✅ Should see "Public Tavern" (visibility: DM & Players)
  - ❌ Should NOT see "Hidden Cave" (visibility: DM Only)

- **Factions, World Info, Quests, Sessions**:
  - ✅ Should see entities with "DM & Players" visibility
  - ❌ Should NOT see entities with "DM Only" visibility

### Step 5: Test Player Character Ownership (as DM)

1. **Switch to DM account**
2. Go to **Characters** → **Player Characters** tab
3. Create or edit a player character
4. In the character form, you should see an **"Assign Player"** dropdown
5. Select your **Player account** from the dropdown
6. Set Visibility to **"DM Only"** (to test that assigned players can still see their own characters)
7. Save the character

### Step 6: Verify Player Can See Their Assigned Character (as Player)

1. **Switch to Player account**
2. Go to **Characters** → **Player Characters** tab
3. ✅ You should see the character assigned to you, even though visibility is "DM Only"
4. ✅ The character should show a **"Your Character"** chip
5. Click on the character to edit it
6. ✅ You should be able to edit:
   - Description
   - Character Sheet (HP, stats, equipment, etc.)
7. ❌ You should NOT be able to edit:
   - Name (read-only)
   - Type (read-only)
   - Alignment (read-only)
   - Visibility (read-only)
   - Player Assignment (read-only)

### Step 7: Test Player Session Notes (as Player)

1. **Switch to Player account**
2. Go to **Sessions** tab
3. The DM should have created at least one session first (with "DM & Players" visibility)
4. Click on a session to view/edit it
5. Scroll down to the **"Player Notes"** section at the bottom
6. Add a new player note:
   - Enter some text in the rich text editor
   - Choose visibility: **"DM Only"** or **"DM & Players"**
   - Click **"Add Note"**
7. ✅ Your note should appear with your username and timestamp
8. ✅ Notes with "DM Only" visibility should only be visible to you and the DM
9. ✅ Notes with "DM & Players" visibility should be visible to all participants

### Step 8: Verify Player Notes Are Visible (as DM)

1. **Switch to DM account**
2. Go to **Sessions** tab
3. Open the same session
4. Scroll to the **"Player Notes"** section
5. ✅ You should see ALL player notes (regardless of their visibility setting)
6. ✅ You should be able to see who wrote each note

### Step 9: Test Player Cannot Create Non-Player Entities

1. **Switch to Player account**
2. Try to create:
   - ❌ An **NPC** or **Antagonist** (should fail or be disabled)
   - ❌ A **Location** (should fail or be disabled - only DMs can create)
   - ❌ A **Faction** (should fail or be disabled)
   - ❌ **World Info** (should fail or be disabled)
   - ❌ A **Quest** (should fail or be disabled)
   - ❌ A **Session** (should fail or be disabled)
3. ✅ Players should only be able to create:
   - Player Characters (their own)
   - Player Session Notes

---

## Testing Method 2: Using Dev Role Switcher (Quick Testing)

If you only have one account or want to quickly toggle between roles:

1. **Login with your DM account**
2. Navigate to any campaign (e.g., `/campaigns/4/characters`)
3. Look for the **"DEV"** button in the bottom-right corner
4. Click it to expand the Dev Role Switcher
5. You can toggle between:
   - **None** (Actual role - DM)
   - **DM** (Simulated DM role)
   - **Player** (Simulated Player role)
6. When you change roles, the page will reload and you'll see the Player view

### Limitations of Dev Role Switcher:
- ⚠️ Only works in development mode
- ⚠️ Only simulates the role - you're still logged in as the same user
- ⚠️ Some features (like player character assignment) won't work correctly because you're still the DM user
- ✅ Best for quickly testing visibility filtering

### Use Dev Role Switcher to Test:
- ✅ Visibility filtering (what players can/can't see)
- ✅ Permission checks (what actions players can/can't take)
- ❌ **Don't use it for**: Player character assignment (need real separate accounts)

---

## Test Checklist

### Campaign Sharing
- [ ] DM can invite a player by email
- [ ] Player appears in participants list after invitation
- [ ] Player can see the campaign on their dashboard
- [ ] Player can access the campaign

### Visibility Settings (DM Side)
- [ ] Can create entities with "DM Only" visibility
- [ ] Can create entities with "DM & Players" visibility
- [ ] Can create entities with "Hidden" visibility
- [ ] Can change visibility of existing entities

### Visibility Filtering (Player Side)
- [ ] Players see entities with "DM & Players" visibility
- [ ] Players do NOT see entities with "DM Only" visibility
- [ ] Players do NOT see entities with "Hidden" visibility
- [ ] Players can see their own assigned characters (even if "DM Only")

### Player Character Assignment
- [ ] DM can assign a player character to a user
- [ ] Assigned player can see their character (even if "DM Only")
- [ ] Assigned player can edit their character (description, character sheet)
- [ ] Assigned player cannot edit restricted fields (name, type, alignment, visibility, assignment)

### Player Session Notes
- [ ] Players can add notes to sessions (if session is visible to them)
- [ ] Players can set note visibility to "DM Only" or "DM & Players"
- [ ] DM can see all player notes (regardless of visibility)
- [ ] Other players can see notes with "DM & Players" visibility
- [ ] Other players cannot see notes with "DM Only" visibility
- [ ] Players can edit/delete their own notes

### Permission Checks
- [ ] Players cannot create NPCs/Antagonists
- [ ] Players cannot create Locations
- [ ] Players cannot create Factions
- [ ] Players cannot create World Info
- [ ] Players cannot create Quests
- [ ] Players cannot create Sessions
- [ ] Players cannot delete entities (only DM)
- [ ] Players cannot change entity visibility
- [ ] Players cannot manage campaign participants

---

## Troubleshooting

### Issue: Player doesn't see the campaign after invitation
- **Check**: Make sure you logged in with the correct email address
- **Check**: DM should see the player in the participants list
- **Check**: Player account email must match exactly (case-sensitive)

### Issue: Player sees entities they shouldn't
- **Check**: Verify the entity's visibility is set to "DM Only" (not "DM & Players")
- **Check**: Make sure you're testing with a real player account, not the DM account
- **Check**: Clear browser cache and refresh

### Issue: Player cannot edit their assigned character
- **Check**: Make sure the character's `player_user_id` matches the player's user ID
- **Check**: Make sure you're testing with a real player account, not using Dev Role Switcher
- **Check**: The character type must be "player" (not "npc" or "antagonist")

### Issue: Dev Role Switcher doesn't change anything
- **Check**: Make sure you're in development mode (`npm run dev`)
- **Check**: The page should reload after changing roles
- **Check**: Check browser console for any errors

---

## What to Remove Before Production

⚠️ **IMPORTANT**: Before deploying to production, remove the Dev Role Switcher:

1. Delete `/client/src/components/DevRoleSwitcher.jsx`
2. Remove the import from `/client/src/components/Layout.jsx`
3. See `docs/REMOVE_DEV_ROLE_SWITCHER.md` for detailed instructions
