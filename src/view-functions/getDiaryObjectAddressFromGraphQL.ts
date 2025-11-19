import { executeQuery } from "@/utils/graphqlClient";

/**
 * Get diary object address for a user from GraphQL database
 * This queries the indexed events/data to quickly get the diary object address
 * without needing to call the slow blockchain view function
 */
// Helper function to safely extract address string from any format
const extractAddressString = (value: any): string | null => {
  if (typeof value === 'string') {
    return value;
  }
  
  if (typeof value === 'object' && value !== null) {
    // Check for vec property
    if ('vec' in value) {
      const vecValue = value.vec;
      if (Array.isArray(vecValue) && vecValue.length > 0) {
        const first = vecValue[0];
        return typeof first === 'string' ? first : String(first);
      }
      if (typeof vecValue === 'string') {
        return vecValue;
      }
      if (typeof vecValue === 'object' && vecValue !== null) {
        // Recursively search for string
        return extractAddressString(vecValue);
      }
    }
    
    // Search for any string property that looks like an address
    for (const key in value) {
      if (typeof value[key] === 'string' && value[key].startsWith('0x')) {
        return value[key];
      }
      if (typeof value[key] === 'object') {
        const nested = extractAddressString(value[key]);
        if (nested) return nested;
      }
    }
  }
  
  return null;
};

export const getDiaryObjectAddressFromGraphQL = async (
  userAddress: string
): Promise<string | null> => {
  try {
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

    const data = await executeQuery<{
      user_to_diary_object?: Array<{
        user_diary_object_address: string | { vec?: string[] } | any;
      }>;
    }>(query, {
      userAddress: userAddress.toLowerCase(),
    });

    if (
      data?.user_to_diary_object &&
      data.user_to_diary_object.length > 0 &&
      data.user_to_diary_object[0].user_diary_object_address
    ) {
      const addressValue = data.user_to_diary_object[0].user_diary_object_address;
      const extractedAddress = extractAddressString(addressValue);
      return extractedAddress;
    }

    return null;
  } catch (error: any) {
    console.error("Error fetching diary object address from GraphQL:", error?.message || error);
    return null;
  }
};

