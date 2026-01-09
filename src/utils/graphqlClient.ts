import { GraphQLClient } from "graphql-request";
import { GRAPHQL_ENDPOINT, GRAPHQL_API_KEY } from "@/constants";

// Validate required environment variables
if (!GRAPHQL_ENDPOINT) {
  throw new Error("GRAPHQL_ENDPOINT environment variable is required but not set.");
}
if (!GRAPHQL_API_KEY) {
  throw new Error("GRAPHQL_API_KEY environment variable is required but not set.");
}

// TODO: Create GraphQL client with authentication


// TODO: Create a function to execute a GraphQL query


