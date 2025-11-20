"use client";

import { useState } from "react";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { useQuery } from "@tanstack/react-query";
import { aptosClient } from "@/utils/aptosClient";
import { getDiaryEntries } from "@/view-functions/getDiaryEntries";
import { deleteDailyEntry } from "@/entry-functions/deleteDailyEntry";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import Link from "next/link";

const formatDate = (unixTimestamp: number): string => {
  const date = new Date(unixTimestamp * 1000);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const isToday = date.toDateString() === today.toDateString();
  const isYesterday = date.toDateString() === yesterday.toDateString();

  if (isToday) {
    return `Today, ${date.toLocaleTimeString("en-US", { 
      hour: "numeric", 
      minute: "2-digit",
      hour12: true 
    })}`;
  } else if (isYesterday) {
    return `Yesterday, ${date.toLocaleTimeString("en-US", { 
      hour: "numeric", 
      minute: "2-digit",
      hour12: true 
    })}`;
  } else {
    return date.toLocaleDateString("en-US", { 
      year: "numeric", 
      month: "long", 
      day: "numeric"
    });
  }
};

const parseContent = (content: string): { image?: string; message: string } => {
  try {
    const parsed = JSON.parse(content);
    return {
      image: parsed.image || undefined,
      message: parsed.message || "",
    };
  } catch {
    return { message: content };
  }
};

export default function ViewDiaryPage() {
  const { account, connected, signAndSubmitTransaction } = useWallet();
  const [deletingTimestamps, setDeletingTimestamps] = useState<Set<number>>(new Set());

  const { data: entries, isLoading, refetch } = useQuery({
    queryKey: ["diary-entries", account?.address?.toString()],
    queryFn: async () => {
      if (!account) return [];
      return await getDiaryEntries(account.address.toString());
    },
    enabled: !!account && connected,
  });

  const handleDelete = async (unixTimestamp: number) => {
    if (!account) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please connect your wallet",
      });
      return;
    }

    setDeletingTimestamps((prev) => new Set(prev).add(unixTimestamp));

    try {
      const committedTransaction = await signAndSubmitTransaction(
        deleteDailyEntry({
          unixTimestamp,
        })
      );

      await aptosClient().waitForTransaction({
        transactionHash: committedTransaction.hash,
      });

      toast({
        title: "Deleted",
        description: "Entry has been deleted",
      });

      await refetch();
    } catch (error: any) {
      console.error("Error deleting diary entry:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error?.message || "Failed to delete entry",
      });
    } finally {
      setDeletingTimestamps((prev) => {
        const next = new Set(prev);
        next.delete(unixTimestamp);
        return next;
      });
    }
  };

  if (!connected) {
    return (
      <>
        <Header />
        <div className="min-h-screen flex items-center justify-center px-4 py-12">
          <div className="max-w-2xl w-full">
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
                  Connect your wallet to view your entries
                </p>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header />
      <div className="min-h-screen py-12 px-4">
        <div className="max-w-2xl mx-auto">
          {isLoading ? (
            <div className="text-center py-16">
              <p className="text-muted-foreground">Loading your entries...</p>
            </div>
          ) : !entries || entries.length === 0 ? (
            <div className="text-center py-16 space-y-4">
              <p className="text-muted-foreground text-lg mb-2">No entries yet</p>
              <p className="text-sm text-muted-foreground/70 mb-6">Start writing to see your thoughts here</p>
              <Button asChild variant="outline">
                <Link href="/">Write your first entry</Link>
              </Button>
            </div>
          ) : (
            <>
              <div className="space-y-1 mb-4 pb-4 border-b border-border">
                <p className="text-sm text-muted-foreground">
                  {entries.length} {entries.length === 1 ? 'entry' : 'entries'}
                </p>
              </div>
              <div className="space-y-8">
              {entries.map((entry, index) => {
                const parsed = parseContent(entry.content);
                const isDeleting = deletingTimestamps.has(entry.unixTimestamp);
                return (
                  <div key={`${entry.unixTimestamp}-${index}`} className="space-y-4 py-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground font-medium">
                        {formatDate(entry.unixTimestamp)}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(entry.unixTimestamp)}
                        disabled={isDeleting}
                        className="text-muted-foreground hover:text-destructive h-auto py-1 px-2 text-xs"
                      >
                        {isDeleting ? "Deleting..." : "Delete"}
                      </Button>
                    </div>
                    
                    {parsed.image && (
                      <div className="w-full my-4">
                        <img
                          src={parsed.image}
                          alt={`Entry from ${formatDate(entry.unixTimestamp)}`}
                          className="max-w-full max-h-96 rounded object-contain"
                        />
                      </div>
                    )}
                    
                    {parsed.message && (
                      <div className="whitespace-pre-wrap text-base leading-relaxed text-foreground">
                        {parsed.message}
                      </div>
                    )}
                    
                    {index < entries.length - 1 && (
                      <div className="border-t border-border pt-8 mt-8" />
                    )}
                  </div>
                );
              })}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}

