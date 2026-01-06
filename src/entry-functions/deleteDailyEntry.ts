import { InputTransactionData } from "@aptos-labs/wallet-adapter-react";

export type DeleteDailyEntryArguments = {
  unixTimestamp: number;
};

export const deleteDailyEntry = (args: DeleteDailyEntryArguments): InputTransactionData => {
  // TODO: Implement this function
  // Return transaction data for delete_daily_entry_by_unixtimestamp
  throw new Error("Not implemented yet");
};

