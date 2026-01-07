"use client";

import { useState, useMemo, useEffect } from "react";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { useQuery } from "@tanstack/react-query";
import { aptosClient } from "@/utils/aptosClient";
import { getJournalEntries } from "@/view-functions/getJournalEntries";
import { deleteDailyEntry } from "@/entry-functions/deleteDailyEntry";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import { ConnectWalletDialog } from "@/components/WalletSelector";
import Link from "next/link";

const ENTRIES_PER_PAGE = 5;

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

export default function ViewJournalPage() {
  const { account, connected, signAndSubmitTransaction } = useWallet();
  const [deletingTimestamps, setDeletingTimestamps] = useState<Set<number>>(new Set());
  const [isWalletDialogOpen, setIsWalletDialogOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const { data: entries, isLoading, refetch } = useQuery({
    queryKey: ["journal-entries", account?.address?.toString()],
    queryFn: async () => {
      if (!account) return [];
      return await getJournalEntries(account.address.toString());
    },
    enabled: !!account && connected,
  });

  // Calculate pagination
  const pagination = useMemo(() => {
    if (!entries || entries.length === 0) {
      return {
        totalPages: 0,
        currentPageEntries: [],
        startIndex: 0,
        endIndex: 0,
      };
    }

    const totalPages = Math.ceil(entries.length / ENTRIES_PER_PAGE);
    const startIndex = (currentPage - 1) * ENTRIES_PER_PAGE;
    const endIndex = startIndex + ENTRIES_PER_PAGE;
    const currentPageEntries = entries.slice(startIndex, endIndex);

    return {
      totalPages,
      currentPageEntries,
      startIndex,
      endIndex,
    };
  }, [entries, currentPage]);

  // Reset to page 1 when entries change and current page is out of bounds
  useEffect(() => {
    if (entries && entries.length > 0) {
      const totalPages = Math.ceil(entries.length / ENTRIES_PER_PAGE);
      if (currentPage > totalPages) {
        setCurrentPage(1);
      }
    }
  }, [entries]);

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
      console.error("Error deleting journal entry:", error);
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
            <div className="space-y-4">
              <p className="text-2xl font-light text-foreground">Login to view your journal</p>
              <div className="space-y-2 max-w-md mx-auto">
                <p className="text-lg text-foreground/80 leading-relaxed font-light italic">
                  Leave your mark on the world. Your words will outlive you, preserved forever.
                </p>
                <p className="text-xs text-muted-foreground/70 leading-relaxed">
                  Your notes belong to you. Only you can delete them. A small fee applies when saving.
                </p>
              </div>
            </div>
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
                  {pagination.totalPages > 1 && (
                    <span className="ml-2">
                      (Page {currentPage} of {pagination.totalPages})
                    </span>
                  )}
                </p>
              </div>
              <div className="space-y-8">
              {pagination.currentPageEntries.map((entry, index) => {
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
                    
                    {index < pagination.currentPageEntries.length - 1 && (
                      <div className="border-t border-border pt-8 mt-8" />
                    )}
                  </div>
                );
              })}
              </div>
              
              {/* Pagination Controls */}
              {pagination.totalPages > 1 && (
                <div className="flex items-center justify-between mt-8 pt-6 border-t border-border">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  
                  <div className="flex items-center gap-2">
                    {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((pageNum) => {
                      // Show first page, last page, current page, and pages around current
                      const showPage = 
                        pageNum === 1 ||
                        pageNum === pagination.totalPages ||
                        (pageNum >= currentPage - 1 && pageNum <= currentPage + 1);
                      
                      if (!showPage) {
                        // Show ellipsis
                        if (pageNum === currentPage - 2 || pageNum === currentPage + 2) {
                          return (
                            <span key={pageNum} className="text-muted-foreground px-2">
                              ...
                            </span>
                          );
                        }
                        return null;
                      }
                      
                      return (
                        <Button
                          key={pageNum}
                          variant={pageNum === currentPage ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentPage(pageNum)}
                          className="min-w-[2.5rem]"
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((prev) => Math.min(pagination.totalPages, prev + 1))}
                    disabled={currentPage === pagination.totalPages}
                  >
                    Next
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}

