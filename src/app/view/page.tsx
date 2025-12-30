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
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import { ConnectWalletDialog } from "@/components/WalletSelector";
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
  const [isWalletDialogOpen, setIsWalletDialogOpen] = useState(false);

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
      <div className="h-screen flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="text-center space-y-6">
            <p className="text-2xl font-light text-foreground">Login to view your diary</p>
            <Dialog open={isWalletDialogOpen} onOpenChange={setIsWalletDialogOpen}>
              <DialogTrigger asChild>
                <Button>Login or Sign Up</Button>
              </DialogTrigger>
              <ConnectWalletDialog close={() => setIsWalletDialogOpen(false)} />
            </Dialog>
          </div>
        </div>
      </div>
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

