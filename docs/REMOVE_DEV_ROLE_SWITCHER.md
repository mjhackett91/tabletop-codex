# Remove Dev Role Switcher Before Production

## ⚠️ IMPORTANT: This file lists all dev-only code that must be removed before production deployment.

### Files to Delete:
1. `client/src/components/DevRoleSwitcher.jsx` - Delete this entire file

### Files to Modify:

1. **`client/src/components/Layout.jsx`**
   - Remove the import: `import DevRoleSwitcher from "./DevRoleSwitcher";`
   - Remove the component usage: `{isLoggedIn && !isPublicPage && <DevRoleSwitcher />}`

2. **`client/src/services/apiClient.js`**
   - Remove the dev role header section (lines with `X-Dev-Simulated-Role` header)
   - Look for comment: `⚠️ DEV MODE ONLY - Remove before production!`

3. **`server/utils/participantAccess.js`**
   - Remove dev mode role simulation code in `getUserCampaignRole()` function
   - Remove `req` parameter usage for dev mode checks
   - Remove console.log statements related to dev mode

4. **`server/middleware/participantAccess.js`**
   - Remove comment about dev mode support
   - Ensure `req` parameter is still passed (for other reasons if needed)

### Testing Checklist Before Removal:
- [ ] Verify campaign sharing works with real multiple accounts
- [ ] Test player view with actual player account
- [ ] Verify visibility filtering works correctly
- [ ] Test all entity CRUD operations with real player account
- [ ] Ensure no console errors or warnings

### After Removal:
- [ ] Run full test suite
- [ ] Test with multiple real user accounts
- [ ] Verify production build works without dev mode code
