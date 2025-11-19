import { MODULE_ADDRESS } from "@/constants";
import { aptosClient } from "@/utils/aptosClient";
import { getDiaryObjectAddressFromGraphQL } from "./getDiaryObjectAddressFromGraphQL";

export type DiaryEntry = {
  date: number; // YYYYMMDD format
  content: string;
  timestamp?: string;
};

// Get diary object address for a user (blockchain fallback)
const getDiaryObjectAddress = async (userAddress: string): Promise<string | null> => {
  try {
    const result = await aptosClient().view<[string | null]>({
      payload: {
        function: `${MODULE_ADDRESS}::permanent_diary::get_diary_object_address`,
        functionArguments: [userAddress],
      },
    });
    return result[0];
  } catch (error) {
    console.error("Error getting diary object address:", error);
    return null;
  }
};

// Helper function to convert unix seconds (normalized to midnight) to YYYYMMDD format
const unixSecondsToYYYYMMDD = (unixSeconds: number): number => {
  const date = new Date(unixSeconds * 1000);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return parseInt(`${year}${month}${day}`, 10);
};

// Helper function to extract message from DiaryEntry enum
// DiaryEntry::MessageOnly { message: String }
// Structure: { __variant__: "MessageOnly", message: "..." }
const extractMessageFromEntry = (entry: any): string | null => {
  if (typeof entry === "string") {
    return entry;
  }
  
  if (typeof entry === "object" && entry !== null) {
    // Check for MessageOnly variant with __variant__ field
    if (entry.__variant__ === "MessageOnly" && "message" in entry) {
      return entry.message;
    }
    
    // Check for MessageOnly variant (nested structure)
    if ("MessageOnly" in entry) {
      const messageOnly = entry.MessageOnly;
      if (typeof messageOnly === "object" && messageOnly !== null && "message" in messageOnly) {
        return messageOnly.message;
      }
    }
    
    // Check if message is directly in the object
    if ("message" in entry) {
      return entry.message;
    }
  }
  
  return null;
};

// Helper function to recursively extract entries from BPlusTreeMap nodes
// Handles both leaf nodes and internal nodes
const extractEntriesFromNode = (node: any): Array<{ key: number; value: any }> => {
  const entries: Array<{ key: number; value: any }> = [];
  
  if (!node || typeof node !== "object") {
    return entries;
  }
  
  // If it's a leaf node, extract entries directly
  if (node.is_leaf === true && node.children) {
    const children = node.children;
    
    // Check if children has entries (SortedVectorMap structure)
    if (children.entries && Array.isArray(children.entries)) {
      for (const entry of children.entries) {
        if (entry && typeof entry === "object" && "key" in entry && "value" in entry) {
          // Key is unix timestamp as string, convert to number
          const key = typeof entry.key === "string" ? parseInt(entry.key, 10) : Number(entry.key);
          
          // Value structure: { __variant__: "Leaf", value: { __variant__: "MessageOnly", message: "..." } }
          // Or: { __variant__: "MessageOnly", message: "..." }
          // Extract the actual value (nested structure)
          let actualValue = entry.value;
          
          // If value has a nested structure with Leaf variant, get the inner value
          if (actualValue && typeof actualValue === "object" && actualValue.__variant__ === "Leaf" && actualValue.value) {
            actualValue = actualValue.value;
          }
          
          entries.push({ key, value: actualValue });
        }
      }
    }
  } else if (node.children && node.children.entries) {
    // Internal node - recursively extract from children
    // For internal nodes, we might need to traverse further, but for now
    // if there are entries, process them
    if (Array.isArray(node.children.entries)) {
      for (const entry of node.children.entries) {
        if (entry && typeof entry === "object" && "value" in entry) {
          // Recursively extract from child nodes
          const childEntries = extractEntriesFromNode(entry.value);
          entries.push(...childEntries);
        }
      }
    }
  }
  
  return entries;
};

// Helper function to parse BPlusTreeMap structure from Aptos resource
// BPlusTreeMap is the underlying structure for BigOrderedMap
const parseBigOrderedMap = (mapData: any): Array<{ key: number; value: any }> => {
  const entries: Array<{ key: number; value: any }> = [];
  
  if (!mapData || typeof mapData !== "object") {
    console.log("Map data is not an object");
    return entries;
  }
  
  // Check if it's a BPlusTreeMap structure
  if (mapData.__variant__ === "BPlusTreeMap" && mapData.root) {
    // Extract entries from the root node (recursively handles leaf and internal nodes)
    const rootEntries = extractEntriesFromNode(mapData.root);
    entries.push(...rootEntries);
  } else if (mapData.root) {
    // Try to extract even if __variant__ is not set
    const rootEntries = extractEntriesFromNode(mapData.root);
    entries.push(...rootEntries);
  } else {
    // Fallback: try other structures
    if (Array.isArray(mapData)) {
      // Direct array
      for (const item of mapData) {
        if (Array.isArray(item) && item.length >= 2) {
          const key = typeof item[0] === "string" ? parseInt(item[0], 10) : Number(item[0]);
          entries.push({ key, value: item[1] });
        } else if (typeof item === "object" && item !== null && "key" in item && "value" in item) {
          const key = typeof item.key === "string" ? parseInt(item.key, 10) : Number(item.key);
          entries.push({ key, value: item.value });
        }
      }
    } else if (mapData.handle) {
      console.warn("BigOrderedMap is a table handle - cannot directly access all entries");
      return entries;
    }
  }
  
  return entries;
};

export const getDiaryEntries = async (userAddress: string): Promise<DiaryEntry[]> => {
  try {
    // First, try to get the diary object address from GraphQL (fast, indexed)
    // Fall back to blockchain view function if GraphQL fails
    let diaryObjectAddress = await getDiaryObjectAddressFromGraphQL(userAddress);
    console.log("Diary object address from GraphQL:", diaryObjectAddress);
    
    // Fallback to blockchain view function if GraphQL didn't return an address
    if (!diaryObjectAddress) {
      diaryObjectAddress = await getDiaryObjectAddress(userAddress);
      console.log("Diary object address from blockchain:", diaryObjectAddress);
    }
    
    if (!diaryObjectAddress) {
      return [];
    }

    // Query the Diary resource from the object address
    if (!MODULE_ADDRESS) {
      throw new Error("MODULE_ADDRESS is not defined");
    }
    const resourceType = `${MODULE_ADDRESS}::permanent_diary::Diary` as `${string}::${string}::${string}`;
    const resource = await aptosClient().getAccountResource({
      accountAddress: diaryObjectAddress,
      resourceType,
    });

    console.log("Diary resource:", resource);

    if (!resource) {
      console.log("Diary resource not found or empty");
      return [];
    }

    // Extract daily_entries BigOrderedMap from resource
    // The structure is: resource.daily_entries (not resource.data.daily_entries)
    const dailyEntries = resource.daily_entries;
    if (!dailyEntries) {
      console.log("No daily_entries found in Diary resource");
      return [];
    }

    // Parse the BigOrderedMap structure
    const parsedEntries = parseBigOrderedMap(dailyEntries);
    console.log("Parsed entries:", parsedEntries);
    
    // Convert to DiaryEntry format
    const diaryEntries: DiaryEntry[] = [];
    for (const { key, value } of parsedEntries) {
      const message = extractMessageFromEntry(value);
      if (message !== null) {
        const dateYYYYMMDD = unixSecondsToYYYYMMDD(key);
        diaryEntries.push({
          date: dateYYYYMMDD,
          content: message,
          timestamp: new Date(key * 1000).toISOString(),
        });
      }
    }

    // Sort by date (newest first)
    diaryEntries.sort((a, b) => b.date - a.date);
    
    return diaryEntries;
  } catch (error: any) {
    // Handle case where resource doesn't exist (404)
    if (error?.status === 404 || error?.message?.includes("404") || error?.message?.includes("not found")) {
      console.log("Diary resource not found at object address");
      return [];
    }
    console.error("Error fetching diary entries:", error);
    return [];
  }
};

