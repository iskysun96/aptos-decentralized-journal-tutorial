import { InputTransactionData } from "@aptos-labs/wallet-adapter-react";
import { MODULE_ADDRESS } from "@/constants";

export type AddDailyEntryArguments = {
  content: string;
};

export const addDailyEntry = (args: AddDailyEntryArguments): InputTransactionData => {
  const { content } = args;
  return {
    data: {
      function: `${MODULE_ADDRESS}::decentralized_journal::add_journal_entry`,
      functionArguments: [content],
    },
  };
};

