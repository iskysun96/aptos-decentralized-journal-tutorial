import { MODULE_ADDRESS } from "@/constants";
import { aptosClient } from "@/utils/aptosClient";

export type DiaryEntry = {
  date: number; // YYYYMMDD format
  content: string;
  timestamp?: string;
};

// Get diary object address for a user
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

// Helper function to add delay between requests
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const getDiaryEntries = async (userAddress: string): Promise<DiaryEntry[]> => {
  try {
    // First, get the diary object address
    const diaryObjectAddress = await getDiaryObjectAddress(userAddress);
    if (!diaryObjectAddress) {
      return [];
    }

    // Try to query events first (more efficient)
    try {
      // Query events from the diary object
      // Events are stored on the object that emitted them
      const events = await aptosClient().getEventsByEventHandle({
        eventHandle: `${diaryObjectAddress}::permanent_diary::AddDailyEntryEvent`,
      });

      if (events && events.length > 0) {
        const entries: DiaryEntry[] = events.map((event: any) => {
          const data = event.data as {
            user_diary_object_address: string;
            user_address: string;
            date: string;
            content: string;
          };

          // Filter by user address to ensure we only get this user's entries
          if (data.user_address.toLowerCase() === userAddress.toLowerCase()) {
            return {
              date: parseInt(data.date, 10),
              content: data.content,
              timestamp: event.sequence_number?.toString(),
            };
          }
          return null;
        }).filter((entry): entry is DiaryEntry => entry !== null);

        // Sort by date (newest first)
        entries.sort((a, b) => b.date - a.date);
        return entries;
      }
    } catch (eventError) {
      // If event querying fails, fall back to date-based querying
      console.log("Event querying not available, falling back to date-based query");
    }

    // Fallback: Query recent dates (last 30 days only to avoid rate limits)
    const today = new Date();
    const entriesFound: DiaryEntry[] = [];
    const daysToCheck = 30; // Reduced from 365 to avoid rate limits
    const batchSize = 5; // Reduced batch size
    const delayBetweenBatches = 500; // 500ms delay between batches

    for (let batchStart = 0; batchStart < daysToCheck; batchStart += batchSize) {
      const batchPromises = [];
      
      for (let i = batchStart; i < Math.min(batchStart + batchSize, daysToCheck); i++) {
        const checkDate = new Date(today);
        checkDate.setDate(checkDate.getDate() - i);
        const year = checkDate.getFullYear();
        const month = String(checkDate.getMonth() + 1).padStart(2, "0");
        const day = String(checkDate.getDate()).padStart(2, "0");
        const dateNum = parseInt(`${year}${month}${day}`, 10);
        
        batchPromises.push(
          aptosClient()
            .view<[string | null]>({
              payload: {
                function: `${MODULE_ADDRESS}::permanent_diary::get_diary_content_by_date`,
                functionArguments: [userAddress, dateNum],
              },
            })
            .then((content) => {
              if (content[0] !== null) {
                return {
                  date: dateNum,
                  content: content[0],
                };
              }
              return null;
            })
            .catch(() => null)
        );
      }
      
      try {
        const batchResults = await Promise.all(batchPromises);
        const validEntries = batchResults.filter((entry) => entry !== null) as DiaryEntry[];
        entriesFound.push(...validEntries);
      } catch (batchError: any) {
        // If we hit rate limits, stop querying
        if (batchError?.status === 429 || batchError?.message?.includes("429")) {
          console.warn("Rate limit hit, stopping queries");
          break;
        }
      }
      
      // Add delay between batches to avoid rate limiting
      if (batchStart + batchSize < daysToCheck) {
        await delay(delayBetweenBatches);
      }
    }
    
    // Sort by date (newest first)
    entriesFound.sort((a, b) => b.date - a.date);
    return entriesFound;
  } catch (error) {
    console.error("Error fetching diary entries:", error);
    return [];
  }
};

