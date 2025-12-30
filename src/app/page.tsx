"use client";

import { useState } from "react";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { aptosClient } from "@/utils/aptosClient";
import { addDailyEntry } from "@/entry-functions/addDailyEntry";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/use-toast";
import { Header } from "@/components/Header";
import { Dialog } from "@/components/ui/dialog";
import { ConnectWalletDialog } from "@/components/WalletSelector";

export default function JournalPage() {
  const { account, signAndSubmitTransaction, connected } = useWallet();
  
  const [diaryMessage, setDiaryMessage] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isWalletDialogOpen, setIsWalletDialogOpen] = useState(false);

  const handleSubmit = async () => {
    if (!account || !connected) {
      setIsWalletDialogOpen(true);
      return;
    }

    if (!diaryMessage.trim()) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please write something",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const content = diaryMessage.trim();

      const committedTransaction = await signAndSubmitTransaction(
        addDailyEntry({
          content,
        })
      );

      await aptosClient().waitForTransaction({
        transactionHash: committedTransaction.hash,
      });

      toast({
        title: "Saved",
        description: "Your entry has been saved",
      });

      setDiaryMessage("");
    } catch (error: any) {
      console.error("Error submitting journal entry:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error?.message || "Failed to save entry",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Header />
      <main className="w-full">
        <div className="max-w-[720px] mx-auto w-full px-4 sm:px-6 pt-10 sm:pt-12 pb-16">
          <section className="text-center space-y-1">
            <p className="text-base sm:text-lg font-medium text-zinc-700">
              Save thoughts you don't want to lose.
            </p>
            <p className="text-sm text-zinc-500">
              Your notes belong to you. Only you can delete them.
            </p>
          </section>

          <h1 className="mt-6 sm:mt-7 text-center text-2xl sm:text-3xl font-semibold text-zinc-900">
            What's on your mind?
          </h1>

          <p className="mt-5 text-sm text-zinc-500">
            {new Date().toLocaleDateString("en-US", { 
              weekday: "long", 
              year: "numeric", 
              month: "long", 
              day: "numeric" 
            })}
          </p>

          <div className="mt-2 sm:mt-3 relative rounded-xl border border-zinc-200 bg-white shadow-sm">
            <Textarea
              value={diaryMessage}
              onChange={(e) => setDiaryMessage(e.target.value)}
              placeholder="Write whatever you don't want to lose…"
              className="w-full min-h-[420px] resize-none rounded-xl p-6 pr-16 text-zinc-900 placeholder:text-zinc-400 focus:outline-none text-base leading-relaxed"
              disabled={isSubmitting}
              maxLength={10000}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  handleSubmit();
                }
              }}
            />
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || !diaryMessage.trim()}
              size="icon"
              className="absolute bottom-4 right-4 h-10 w-10 rounded-full bg-foreground text-background hover:bg-foreground/90 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 19V5" />
                <path d="M5 12l7-7 7 7" />
              </svg>
            </Button>
          </div>

          <div className="mt-2 flex items-center justify-between text-xs text-zinc-500">
            <span>⌘ + Enter to save</span>
            <span className="hidden sm:inline">
              Stored on Aptos blockchain • Network fee applies
            </span>
            <span>{diaryMessage.length} characters</span>
          </div>
          
          <Dialog open={isWalletDialogOpen} onOpenChange={setIsWalletDialogOpen}>
            <ConnectWalletDialog close={() => setIsWalletDialogOpen(false)} />
          </Dialog>
        </div>
      </main>
    </>
  );
}
