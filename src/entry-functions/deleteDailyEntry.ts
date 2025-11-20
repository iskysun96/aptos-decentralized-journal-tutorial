import { InputTransactionData } from "@aptos-labs/wallet-adapter-react";
import { MODULE_ADDRESS } from "@/constants";

export type DeleteDailyEntryArguments = {
  unixTimestamp: number;
};

export const deleteDailyEntry = (args: DeleteDailyEntryArguments): InputTransactionData => {
  const { unixTimestamp } = args;
  
  // Validate unixTimestamp
  if (typeof unixTimestamp !== 'number' || !Number.isFinite(unixTimestamp)) {
    throw new Error('unixTimestamp must be a valid number');
  }
  
  if (unixTimestamp < 0) {
    throw new Error('unixTimestamp must be a positive number (cannot be before Unix epoch)');
  }
  
  // Check if timestamp is not too far in the future (e.g., not more than 100 years from now)
  // 100 years = 100 * 365.25 * 24 * 60 * 60 seconds ≈ 3,155,760,000 seconds
  const maxReasonableTimestamp = Math.floor(Date.now() / 1000) + (100 * 365.25 * 24 * 60 * 60);
  if (unixTimestamp > maxReasonableTimestamp) {
    throw new Error('unixTimestamp is too far in the future (more than 100 years from now)');
  }
  
  return {
    data: {
      function: `${MODULE_ADDRESS}::permanent_diary::delete_daily_entry_by_unixtimestamp`,
      functionArguments: [unixTimestamp],
    },
  };
};

