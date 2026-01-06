import { executeQuery } from "@/utils/graphqlClient";

/**
 * Result type for diary object address retrieval
 */
export type DiaryObjectAddressResult = {
  address: string | null;
  source: 'graphql' | 'not_found';
};

/**
 * Helper function to extract address string from GraphQL response
 * 
 * GraphQL may return the address in different formats:
 * - Direct string: "0x123..."
 * - Wrapped in vec: { vec: ["0x123..."] }
 */
const extractAddressString = (value: any): string | null => {
  // If it's already a string, return it
  if (typeof value === 'string') {
    return value;
  }
  
  // If it's wrapped in a vec array, get the first element
  if (value?.vec && Array.isArray(value.vec) && value.vec.length > 0) {
    return String(value.vec[0]);
  }
  
  return null;
};

/**
 * Get diary object address for a user from GraphQL database
 * 
 * Aptos Indexer provides a GraphQL API that indexes blockchain data.
 * This is much faster than querying the blockchain directly because:
 * - It's indexed (fast lookups)
 * - It's optimized for queries
 * - It doesn't require blockchain RPC calls
 * 
 * The GraphQL schema includes a `user_to_diary_object` table that maps
 * user addresses to their diary object addresses.
 */
export const getDiaryObjectAddressFromGraphQL = async (
  userAddress: string
): Promise<DiaryObjectAddressResult> => {
  try {
    // GraphQL query to find the diary object address for this user
    const query = `
      query GetDiaryObjectAddress($userAddress: String!) {
        user_to_diary_object(
          where: { user_address: { _eq: $userAddress } }
          limit: 1
        ) {
          user_diary_object_address
        }
      }
    `;

    // Execute the query
    const data = await executeQuery<{
      user_to_diary_object?: Array<{
        user_diary_object_address: string | { vec?: string[] };
      }>;
    }>(query, {
      userAddress: userAddress.toLowerCase(),
    });

    // Check if we found a result
    const result = data?.user_to_diary_object?.[0];
    if (result?.user_diary_object_address) {
      const address = extractAddressString(result.user_diary_object_address);
      if (address) {
        return {
          address,
          source: 'graphql',
        };
      }
    }

    // No diary found for this user
    return {
      address: null,
      source: 'not_found',
    };
  } catch (error: any) {
    // If GraphQL fails, return not_found (caller can handle fallback)
    console.error("Error fetching diary object address from GraphQL:", error);
    return {
      address: null,
      source: 'not_found',
    };
  }
};

