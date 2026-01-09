import { executeQuery } from "@/utils/graphqlClient";

/**
 * Result type for journal object address retrieval
 */
export type JournalObjectAddressResult = {
  address: string | null;
  source: 'graphql' | 'not_found';
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

    // Execute the query
    const data = await executeQuery<{
      user_to_journal_object?: Array<{
        user_journal_object_address: string
      }>;
    }>(query, {
      userAddress: userAddress.toLowerCase(),
    });

    // Check if we found a result
    const result = data?.user_to_journal_object?.[0];
    if (result?.user_journal_object_address) {
      return {
        address: result.user_journal_object_address,
        source: 'graphql',
      };
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

