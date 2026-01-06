# Template Preparation Guide

This document outlines what needs to be removed or modified to create a tutorial template from the fully built application. The goal is to keep all design/styling code while removing feature implementations (smart contract and blockchain interactions) so students can build them during the tutorial.

## Overview

**Keep:**
- All UI components and styling
- Layout structure
- Design system (shadcn/ui components)
- Navigation and routing
- Wallet connection UI
- Form inputs and buttons (but remove their functionality)

**Remove/Empty:**
- Smart contract implementation
- Entry functions (transaction builders)
- View functions (blockchain queries)
- GraphQL queries
- Transaction submission logic
- Data fetching logic
- Module address constants

---

## 1. Smart Contract Files

### Remove/Empty Contract Implementation

**File:** `contract/sources/permanent_diary.move`

**Action:** Replace the entire file with a minimal template that includes:
- Module structure with placeholder address
- Empty structs (keep the structure but remove implementations)
- Comment placeholders for functions to be implemented

**What to keep:**
- Module declaration
- Basic struct definitions (empty or with comments)
- Error constants (as placeholders)

**What to remove:**
- All function implementations (`add_daily_entry`, `delete_daily_entry_by_unixtimestamp`, etc.)
- Helper function implementations
- Event structs (or keep as placeholders)
- `init_module` implementation

**Example template structure:**
```move
module permanent_diary_addr::permanent_diary {
    // TODO: Add your structs here
    
    // TODO: Add your entry functions here
    
    // TODO: Add your view functions here
}
```

### Remove Contract Tests

**File:** `contract/tests/test_end_to_end.move`

**Action:** Empty the file or remove all test implementations, keeping only:
- Basic test structure
- Comment placeholders

### Remove Build Artifacts

**Directory:** `contract/build/`

**Action:** Delete the entire `build/` directory (it will be regenerated when students compile)

---

## 2. Frontend Entry Functions

### Remove Entry Function Implementations

**Files to modify:**
- `src/entry-functions/addDailyEntry.ts`
- `src/entry-functions/deleteDailyEntry.ts`

**Action:** Replace implementations with empty functions that return placeholder transaction data or throw "Not implemented" errors.

**Example for `addDailyEntry.ts`:**
```typescript
import { InputTransactionData } from "@aptos-labs/wallet-adapter-react";

export type AddDailyEntryArguments = {
  content: string;
};

export const addDailyEntry = (args: AddDailyEntryArguments): InputTransactionData => {
  // TODO: Implement this function
  // Return transaction data for add_daily_entry
  throw new Error("Not implemented yet");
};
```

---

## 3. Frontend View Functions

### Remove View Function Implementations

**Files to modify:**
- `src/view-functions/getDiaryEntries.ts`
- `src/view-functions/getDiaryObjectAddressFromGraphQL.ts`
- `src/view-functions/getMessageContent.ts` (if exists)
- `src/view-functions/getAccountBalance.ts` (if exists)

**Action:** Replace implementations with functions that return empty arrays/null or throw "Not implemented" errors.

**Example for `getDiaryEntries.ts`:**
```typescript
export type DiaryEntry = {
  unixTimestamp: number;
  content: string;
};

export const getDiaryEntries = async (userAddress: string): Promise<DiaryEntry[]> => {
  // TODO: Implement this function
  // Query the blockchain to get diary entries for the user
  return [];
};
```

---

## 4. Constants File

### Remove Module Address

**File:** `src/constants.ts`

**Action:** Remove or comment out `MODULE_ADDRESS`:

```typescript
import type { Network } from "@aptos-labs/wallet-adapter-react";

export const NETWORK: Network = (process.env.NEXT_PUBLIC_APP_NETWORK as Network) ?? "testnet";
// TODO: Set your module address after publishing the contract
export const MODULE_ADDRESS = process.env.NEXT_PUBLIC_MODULE_ADDRESS;
export const APTOS_API_KEY = process.env.NEXT_PUBLIC_APTOS_API_KEY;

// GraphQL Configuration
export const GRAPHQL_ENDPOINT = process.env.NEXT_PUBLIC_GRAPHQL_ENDPOINT;
export const GRAPHQL_API_KEY = process.env.NEXT_PUBLIC_GRAPHQL_API_KEY;
```

---

## 5. Page Components

### Modify Main Write Page

**File:** `src/app/page.tsx`

**Action:** Remove transaction submission logic but keep the UI:

**Remove:**
- Import of `addDailyEntry`
- Import of `aptosClient`
- The `handleSubmit` function implementation (or replace with placeholder)
- Transaction waiting logic

**Keep:**
- All UI components
- Form state management
- Design and styling
- Toast notifications (but remove success/error messages related to transactions)

**Example modification:**
```typescript
const handleSubmit = async () => {
  if (!account || !connected) {
    setIsWalletDialogOpen(true);
    return;
  }

  if (!diaryMessage.trim()) {
    toast({
      variant: "destructive",
      title: "Error",
      description: "Please write something",
    });
    return;
  }

  // TODO: Implement transaction submission
  // 1. Import addDailyEntry function
  // 2. Build transaction using addDailyEntry
  // 3. Sign and submit transaction
  // 4. Wait for transaction confirmation
  // 5. Show success message
  
  toast({
    title: "TODO",
    description: "Implement transaction submission",
  });
};
```

### Modify View Page

**File:** `src/app/view/page.tsx`

**Action:** Remove data fetching and deletion logic but keep the UI:

**Remove:**
- Import of `getDiaryEntries`
- Import of `deleteDailyEntry`
- Import of `aptosClient`
- The `useQuery` hook that fetches entries (or make it return empty array)
- The `handleDelete` function implementation (or replace with placeholder)

**Keep:**
- All UI components
- Pagination UI (even if it shows no entries)
- Design and styling
- Loading states (can show empty state instead)

**Example modification:**
```typescript
const { data: entries, isLoading, refetch } = useQuery({
  queryKey: ["diary-entries", account?.address?.toString()],
  queryFn: async () => {
    // TODO: Implement getDiaryEntries function
    // return await getDiaryEntries(account.address.toString());
    return [];
  },
  enabled: !!account && connected,
});

const handleDelete = async (unixTimestamp: number) => {
  // TODO: Implement deletion
  // 1. Import deleteDailyEntry function
  // 2. Build transaction using deleteDailyEntry
  // 3. Sign and submit transaction
  // 4. Wait for transaction confirmation
  // 5. Refetch entries
};
```

---

## 6. Utility Files

### Keep Aptos Client Setup

**File:** `src/utils/aptosClient.ts`

**Action:** Keep as-is (this is just configuration, not implementation)

### Remove GraphQL Query Implementation

**File:** `src/utils/graphqlClient.ts`

**Action:** Keep the client setup but you can add a comment that GraphQL queries will be implemented later, or keep as-is since it's just a utility.

**File:** `src/view-functions/getDiaryObjectAddressFromGraphQL.ts`

**Action:** Empty the implementation:

```typescript
export type DiaryObjectAddressResult = {
  address: string | null;
  source: 'graphql' | 'blockchain' | 'not_found';
  error?: string;
};

export const getDiaryObjectAddressFromGraphQL = async (
  userAddress: string
): Promise<DiaryObjectAddressResult> => {
  // TODO: Implement GraphQL query to get diary object address
  return {
    address: null,
    source: 'not_found',
  };
};
```

### Keep Helper Functions

**File:** `src/utils/helpers.ts`

**Action:** Keep as-is (these are general utilities, not feature-specific)

---

## 7. Environment Variables

### Update .env.example (if exists)

**Action:** Create or update `.env.example` with placeholder values:

```env
NEXT_PUBLIC_APP_NETWORK=testnet
NEXT_PUBLIC_MODULE_ADDRESS=
NEXT_PUBLIC_APTOS_API_KEY=
NEXT_PUBLIC_GRAPHQL_ENDPOINT=
NEXT_PUBLIC_GRAPHQL_API_KEY=
```

Add comments explaining that students will fill these in during the tutorial.

---

## 8. README Updates

### Update README.md

**File:** `README.md`

**Action:** Replace with tutorial-specific content:

- Remove references to completed features
- Add "Tutorial Template" section
- Explain that this is a starter template
- List what students will build
- Include setup instructions
- Link to tutorial video (when available)

---

## 9. Package.json

### Keep Dependencies

**File:** `package.json`

**Action:** Keep all dependencies as-is. Students will need them for the tutorial.

---

## 10. Component Files

### Keep All UI Components

**Files to keep unchanged:**
- `src/components/Header.tsx` ✅
- `src/components/WalletProvider.tsx` ✅
- `src/components/WalletSelector.tsx` ✅
- `src/components/WrongNetworkAlert.tsx` ✅
- `src/components/ReactQueryProvider.tsx` ✅
- `src/components/LabelValueGrid.tsx` ✅
- All files in `src/components/ui/` ✅

**Action:** No changes needed - these are all design/styling components.

---

## 11. Additional Files to Check

### Check for Other Implementation Files

**Action:** Search for any other files that might contain blockchain interaction logic:

```bash
# Search for transaction-related code
grep -r "signAndSubmitTransaction" src/
grep -r "waitForTransaction" src/
grep -r "MODULE_ADDRESS" src/
grep -r "permanent_diary" src/
```

Remove or comment out any found implementations.

---

## 12. Build and Test Scripts

### Keep Scripts

**Files:** `scripts/move/*.js`

**Action:** Keep all scripts - students will use them to compile, test, and publish their contracts.

---

## Summary Checklist

Before sharing the template, verify:

- [ ] Smart contract file is empty/templated
- [ ] Contract tests are removed/emptied
- [ ] Build directory is deleted
- [ ] Entry functions return placeholders/errors
- [ ] View functions return empty data/errors
- [ ] Constants file has MODULE_ADDRESS commented/removed
- [ ] Main page has transaction logic removed but UI intact
- [ ] View page has data fetching removed but UI intact
- [ ] GraphQL query implementations are removed
- [ ] README is updated for tutorial
- [ ] .env.example is created/updated
- [ ] All UI components remain unchanged
- [ ] No hardcoded module addresses in code
- [ ] All TODO comments are clear and actionable

---

## Testing the Template

After making changes:

1. **Verify the app runs:** `npm run dev` should start without errors
2. **Check UI renders:** All pages should display correctly (even if empty)
3. **Test wallet connection:** Wallet selector should work
4. **Verify no errors:** Console should not show implementation errors
5. **Check build:** `npm run build` should succeed

---

## Notes for Tutorial Video

When creating the tutorial, students will need to:

1. **Smart Contract:**
   - Implement structs (Diary, DiariesRegistry, etc.)
   - Implement entry functions (add_daily_entry, delete_daily_entry_by_unixtimestamp)
   - Implement view functions (get_diary_object_address, get_diary_content_by_date)
   - Implement helper functions
   - Publish the contract

2. **Frontend Entry Functions:**
   - Implement `addDailyEntry` transaction builder
   - Implement `deleteDailyEntry` transaction builder

3. **Frontend View Functions:**
   - Implement `getDiaryEntries` to query blockchain
   - Implement GraphQL queries (optional, for performance)

4. **Page Integration:**
   - Connect transaction submission in write page
   - Connect data fetching in view page
   - Connect deletion functionality

5. **Configuration:**
   - Set MODULE_ADDRESS in constants
   - Configure environment variables

