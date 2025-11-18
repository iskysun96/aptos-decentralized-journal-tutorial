import { InputTransactionData } from "@aptos-labs/wallet-adapter-react";
import { MODULE_ADDRESS } from "@/constants";

export type AddDailyEntryArguments = {
  date: number; // Date in YYYYMMDD format (e.g., 20241031)
  content: string; // Combined content with image and message
};

export const addDailyEntry = (args: AddDailyEntryArguments): InputTransactionData => {
  const { date, content } = args;
  return {
    data: {
      function: `${MODULE_ADDRESS}::permanent_diary::add_daily_entry`,
      functionArguments: [date, content],
    },
  };
};

