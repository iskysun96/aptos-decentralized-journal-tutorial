import { executeQuery } from "@/utils/graphqlClient";

/**
 * Result type for journal object address retrieval
 */
export type JournalObjectAddressResult = {
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

//Get journal object address for a user from GraphQL database
export const getJournalObjectAddressFromGraphQL = async (
  userAddress: string
): Promise<JournalObjectAddressResult> => {
  console.log('userAddress', userAddress);
  try {
    // GraphQL query to find the journal object address for this user
    const query = `
      query GetJournalObjectAddress($userAddress: String!) {
        user_to_journal_object(
          where: { user_address: { _eq: $userAddress } }
          limit: 1
        ) {
          user_journal_object_address
        }
      }
    `;

    console.log('query', query);

    // Execute the query
    const data = await executeQuery<{
      user_to_journal_object?: Array<{
        user_journal_object_address: string | { vec?: string[] };
      }>;
    }>(query, {
      userAddress: userAddress.toLowerCase(),
    });
    console.log('data', data);

    // Check if we found a result
    const result = data?.user_to_journal_object?.[0];
    if (result?.user_journal_object_address) {
      const address = extractAddressString(result.user_journal_object_address);
      if (address) {
        return {
          address,
          source: 'graphql',
        };
      }
    }

    // No journal found for this user
    return {
      address: null,
      source: 'not_found',
    };
  } catch (error: any) {
    // If GraphQL fails, return not_found (caller can handle fallback)
    console.error("Error fetching journal object address from GraphQL:", error);
    return {
      address: null,
      source: 'not_found',
    };
  }
};

