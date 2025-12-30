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

export default function DiaryPage() {
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
      console.error("Error submitting diary entry:", error);
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
      <div className="flex items-center justify-center px-4 py-12" style={{ minHeight: 'calc(100vh - 73px)' }}>
        <div className="max-w-2xl w-full">
          <div className="space-y-8">
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold text-foreground text-center">
                What's on your mind?
              </h2>
            </div>
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">
                {new Date().toLocaleDateString("en-US", { 
                  weekday: "long", 
                  year: "numeric", 
                  month: "long", 
                  day: "numeric" 
                })}
              </div>
              <div className="relative">
                <Textarea
                  value={diaryMessage}
                  onChange={(e) => setDiaryMessage(e.target.value)}
                  placeholder="Start writing..."
                  className="min-h-[450px] border shadow-md focus-visible:ring-1 focus-visible:ring-ring text-base resize-none bg-background p-6 pr-16 leading-relaxed"
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
              <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
                <span>Press ⌘ + Enter to save</span>
                <span>{diaryMessage.length} characters</span>
              </div>
            </div>
          </div>
          
          <Dialog open={isWalletDialogOpen} onOpenChange={setIsWalletDialogOpen}>
            <ConnectWalletDialog close={() => setIsWalletDialogOpen(false)} />
          </Dialog>
        </div>
      </div>
    </>
  );
}
