import { MODULE_ADDRESS } from "@/constants";
import { aptosClient } from "@/utils/aptosClient";
import { getJournalObjectAddressFromGraphQL } from "./getJournalObjectAddressFromGraphQL";

/**
 * Journal entry type matching the Move contract structure
 */
export type JournalEntry = {
  unixTimestamp: number; // Unix timestamp in seconds
  content: string;
};

// Extract the message content from a JournalEntry enum
const extractMessageFromEntry = (entry: any): string | null => {
  if (entry?.__variant__ === "Leaf" && entry?.value?.message) {
    return entry.value.message;
  }
  return null;
};

/**
 * Extract entries from a BPlusTreeMap node
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
      if (entry?.key && entry?.value) {
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
 * Main function: Fetch all journal entries for a user
 * 
 * This function:
 * 1. Gets the journal object address (from GraphQL)
 * 2. Queries the Journal resource from that object address
 * 3. Extracts entries from the BigOrderedMap (B+ tree structure)
 * 4. Converts entries to JournalEntry format
 * 5. Sorts by timestamp (newest first)
 */
export const getJournalEntries = async (userAddress: string): Promise<JournalEntry[]> => {
  try {
    // Get the journal object address
    const addressResult = await getJournalObjectAddressFromGraphQL(userAddress);
    
    if (!addressResult.address) {
      return []; // No journal exists for this user
    }

    // Query the Journal resource from the object address
    if (!MODULE_ADDRESS) {
      throw new Error("MODULE_ADDRESS is not defined");
    }

    const resourceType = `${MODULE_ADDRESS}::decentralized_journal::UserJournalEntries` as const;
    const resource = await aptosClient().getAccountResource({
      accountAddress: addressResult.address,
      resourceType,
    });

    if (!resource?.daily_entries?.root) {
      console.log("No daily entries found");
      return []; // Journal exists but has no entries
    }

    // Extract entries from the BigOrderedMap (B+ tree structure)
    // The daily_entries is a BigOrderedMap, which uses a B+ tree internally
    const parsedEntries = extractEntriesFromNode(resource.daily_entries.root);
    // Convert to JournalEntry format
    const journalEntries: JournalEntry[] = [];
    for (const { key, value } of parsedEntries) {
      const message = extractMessageFromEntry(value);
      if (message !== null) {
        journalEntries.push({
          unixTimestamp: key,
          content: message,
        });
      }
    }

    // Sort by timestamp (newest first)
    journalEntries.sort((a, b) => b.unixTimestamp - a.unixTimestamp);

    console.log("Journal entries:", journalEntries);
    return journalEntries;
  } catch (error: any) {
    // Handle case where resource doesn't exist
    if (error?.status === 404 || error?.message?.includes("not found")) {
      return [];
    }
    console.error("Error fetching journal entries:", error);
    throw error;
  }
};

