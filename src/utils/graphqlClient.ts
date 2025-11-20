import { GraphQLClient } from "graphql-request";
import { GRAPHQL_ENDPOINT, GRAPHQL_API_KEY } from "@/constants";

// Validate required environment variables
if (!GRAPHQL_ENDPOINT) {
  throw new Error("GRAPHQL_ENDPOINT environment variable is required but not set.");
}
if (!GRAPHQL_API_KEY) {
  throw new Error("GRAPHQL_API_KEY environment variable is required but not set.");
}

// Create GraphQL client with authentication
export const graphqlClient = new GraphQLClient(GRAPHQL_ENDPOINT, {
  headers: {
    Authorization: `Bearer ${GRAPHQL_API_KEY}`,
    "Content-Type": "application/json",
  },
});

// Execute a GraphQL query
export async function executeQuery<T = any>(
  query: string,
  variables?: Record<string, any>
): Promise<T> {
  try {
    const data = await graphqlClient.request<T>(query, variables);
    return data;
  } catch (error: any) {
    console.error("GraphQL query error:", error);
    // Re-throw to allow caller to handle
    throw error;
  }
}

