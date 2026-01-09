// TODO: import necessary imports

/**
 * Result type for journal object address retrieval
 */
export type JournalObjectAddressResult = {
  address: string | null;
  source: 'graphql' | 'not_found';
  error?: string;
};

/*
 * Get journal object address for a user from GraphQL database
 * This queries the indexed events/data to quickly get the journal object address
 */
export const getJournalObjectAddressFromGraphQL = async (
  userAddress: string
): Promise<JournalObjectAddressResult> => {
  // TODO: Create a GraphQL query to get the journal object address for the user
  throw new Error("Not implemented yet");
};