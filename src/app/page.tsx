"use client";

import { useState } from "react";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { aptosClient } from "@/utils/aptosClient";
import { addDailyEntry } from "@/entry-functions/addDailyEntry";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/use-toast";
import { Header } from "@/components/Header";
import { WalletSelector } from "@/components/WalletSelector";

export default function DiaryPage() {
  const { account, signAndSubmitTransaction, connected } = useWallet();
  
  const [diaryMessage, setDiaryMessage] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!account) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please connect your wallet",
      });
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
          {!connected ? (
            <div className="space-y-12 py-8">
              <div className="space-y-6 text-center">
                <h2 className="text-3xl font-light text-foreground">
                  Your thoughts, permanently yours
                </h2>
                <p className="text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
                  A simple diary that stores your words on the blockchain. 
                  Write freely, knowing your entries are secure and truly yours.
                </p>
              </div>

              <div className="grid gap-6 md:grid-cols-3 pt-8">
                <div className="space-y-3">
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="text-foreground"
                    >
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    </svg>
                  </div>
                  <h3 className="font-medium text-center">Secure</h3>
                  <p className="text-sm text-muted-foreground text-center">
                    Your entries are stored on the blockchain, protected by cryptography
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="text-foreground"
                    >
                      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                      <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                      <line x1="12" y1="22.08" x2="12" y2="12" />
                    </svg>
                  </div>
                  <h3 className="font-medium text-center">Permanent</h3>
                  <p className="text-sm text-muted-foreground text-center">
                    Your words are stored permanently. Only you can read or delete them
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="text-foreground"
                    >
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                      <line x1="16" y1="13" x2="8" y2="13" />
                      <line x1="16" y1="17" x2="8" y2="17" />
                      <polyline points="10 9 9 9 8 9" />
                    </svg>
                  </div>
                  <h3 className="font-medium text-center">Simple</h3>
                  <p className="text-sm text-muted-foreground text-center">
                    Clean, minimal interface focused on your writing experience
                  </p>
                </div>
              </div>

              <div className="pt-8 text-center space-y-4">
                <p className="text-muted-foreground">
                  Connect your wallet to start writing
                </p>
                <div className="flex justify-center">
                  <WalletSelector />
                </div>
              </div>
            </div>
          ) : (
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
                    disabled={!account || isSubmitting}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                        handleSubmit();
                      }
                    }}
                  />
                  <Button
                    onClick={handleSubmit}
                    disabled={
                      !account ||
                      isSubmitting ||
                      !diaryMessage.trim()
                    }
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
          )}
        </div>
      </div>
    </>
  );
}
