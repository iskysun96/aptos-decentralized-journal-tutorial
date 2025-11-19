import { InputTransactionData } from "@aptos-labs/wallet-adapter-react";
import { MODULE_ADDRESS } from "@/constants";

export type DeleteDailyEntryArguments = {
  unixTimestamp: number;
};

export const deleteDailyEntry = (args: DeleteDailyEntryArguments): InputTransactionData => {
  const { unixTimestamp } = args;
  return {
    data: {
      function: `${MODULE_ADDRESS}::permanent_diary::delete_daily_entry_by_unixtimestamp`,
      functionArguments: [unixTimestamp],
    },
  };
};

