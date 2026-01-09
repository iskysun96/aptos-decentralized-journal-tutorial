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
  
  return {
    data: {
      function: `${MODULE_ADDRESS}::decentralized_journal::delete_journal_entry_by_unixtimestamp`,
      functionArguments: [unixTimestamp],
    },
  };
};

