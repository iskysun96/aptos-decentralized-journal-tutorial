import { MODULE_ADDRESS } from "@/constants";
import { aptosClient } from "@/utils/aptosClient";
import { getDiaryObjectAddressFromGraphQL } from "./getDiaryObjectAddressFromGraphQL";

/**
 * Diary entry type matching the Move contract structure
 */
export type DiaryEntry = {
  unixTimestamp: number; // Unix timestamp in seconds
  content: string;
};

/**
 * Step 1: Extract the message content from a DiaryEntry enum
 * 
 * The Move contract defines DiaryEntry as:
 *   enum DiaryEntry { MessageOnly { message: String } }
 * 
 * When serialized from the blockchain, it becomes:
 *   { __variant__: "MessageOnly", message: "..." }
 */
const extractMessageFromEntry = (entry: any): string | null => {
  if (entry?.__variant__ === "Leaf" && entry?.value?.message) {
    return entry.value.message;
  }
  return null;
};

/**
 * Step 2: Extract entries from a BPlusTreeMap node
 * 
 * BigOrderedMap uses a B+ tree structure internally. Each node can be:
 * - A leaf node: contains actual key-value pairs (is_leaf: true)
 * - An internal node: contains pointers to child nodes (is_leaf: false)
 * 
 * For small maps (< 40 entries), the root is also a leaf node.
 * For larger maps, we need to recursively traverse internal nodes.
 */
const extractEntriesFromNode = (
  node: any,
  depth: number = 0,
  maxDepth: number = 20
): Array<{ key: number; value: any }> => {
  const entries: Array<{ key: number; value: any }> = [];

  // Safety check: prevent infinite recursion
  if (depth > maxDepth || !node || typeof node !== "object") {
    return entries;
  }

  // Leaf node: extract entries directly
  if (node.is_leaf === true && node.children?.entries) {
    for (const entry of node.children.entries) {
      if (entry?.key !== undefined && entry?.value !== undefined) {
        const key = typeof entry.key === "string" 
          ? parseInt(entry.key, 10) 
          : Number(entry.key);
        entries.push({ key, value: entry.value });
      }
    }
  } 
  // Internal node: recursively extract from child nodes
  else if (node.children?.entries) {
    for (const childEntry of node.children.entries) {
      if (childEntry?.value) {
        const childEntries = extractEntriesFromNode(
          childEntry.value,
          depth + 1,
          maxDepth
        );
        entries.push(...childEntries);
      }
    }
  }

  return entries;
};

/**
 * Main function: Fetch all diary entries for a user
 * 
 * This function:
 * 1. Gets the diary object address (from GraphQL)
 * 2. Queries the Diary resource from that object address
 * 3. Extracts entries from the BigOrderedMap (B+ tree structure)
 * 4. Converts entries to DiaryEntry format
 * 5. Sorts by timestamp (newest first)
 */
export const getDiaryEntries = async (userAddress: string): Promise<DiaryEntry[]> => {
  try {
    // Step 1: Get the diary object address
    const addressResult = await getDiaryObjectAddressFromGraphQL(userAddress);
    
    if (!addressResult.address) {
      return []; // No diary exists for this user
    }

    // Step 2: Query the Diary resource from the object address
    if (!MODULE_ADDRESS) {
      throw new Error("MODULE_ADDRESS is not defined");
    }

    const resourceType = `${MODULE_ADDRESS}::permanent_diary::Diary` as const;
    const resource = await aptosClient().getAccountResource({
      accountAddress: addressResult.address,
      resourceType,
    });

    if (!resource?.daily_entries?.root) {
      console.log("No daily entries found");
      return []; // Diary exists but has no entries
    }

    // Step 3: Extract entries from the BigOrderedMap (B+ tree structure)
    // The daily_entries is a BigOrderedMap, which uses a B+ tree internally
    const parsedEntries = extractEntriesFromNode(resource.daily_entries.root);
    // Step 4: Convert to DiaryEntry format
    const diaryEntries: DiaryEntry[] = [];
    for (const { key, value } of parsedEntries) {
      const message = extractMessageFromEntry(value);
      if (message !== null) {
        diaryEntries.push({
          unixTimestamp: key,
          content: message,
        });
      }
    }

    // Step 5: Sort by timestamp (newest first)
    diaryEntries.sort((a, b) => b.unixTimestamp - a.unixTimestamp);

    console.log("Diary entries:", diaryEntries);
    return diaryEntries;
  } catch (error: any) {
    // Handle case where resource doesn't exist
    if (error?.status === 404 || error?.message?.includes("not found")) {
      return [];
    }
    console.error("Error fetching diary entries:", error);
    throw error;
  }
};

