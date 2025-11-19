"use client";

import { useState } from "react";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { useQuery } from "@tanstack/react-query";
import { aptosClient } from "@/utils/aptosClient";
import { getDiaryEntries } from "@/view-functions/getDiaryEntries";
import { deleteDailyEntry } from "@/entry-functions/deleteDailyEntry";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import Link from "next/link";

// Format unix timestamp to readable date and time
const formatTimestamp = (unixTimestamp: number): string => {
  const date = new Date(unixTimestamp * 1000);
  return date.toLocaleString("en-US", { 
    year: "numeric", 
    month: "long", 
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
};

// Parse content JSON to extract image and message
const parseContent = (content: string): { image?: string; message: string; timestamp?: string } => {
  try {
    const parsed = JSON.parse(content);
    return {
      image: parsed.image || undefined,
      message: parsed.message || "",
      timestamp: parsed.timestamp || undefined,
    };
  } catch {
    // If not JSON, treat as plain message
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

      const executedTransaction = await aptosClient().waitForTransaction({
        transactionHash: committedTransaction.hash,
      });

      toast({
        title: "Success",
        description: `Diary entry deleted! Transaction hash: ${executedTransaction.hash}`,
      });

      // Refetch entries to update the list
      await refetch();
    } catch (error: any) {
      console.error("Error deleting diary entry:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error?.message || "Failed to delete diary entry",
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
        <div className="flex items-center justify-center flex-col min-h-screen py-8">
          <Card className="w-full max-w-4xl">
            <CardHeader>
              <CardTitle className="text-2xl">My Diary Entries</CardTitle>
            </CardHeader>
            <CardContent className="text-center py-8">
              <p className="text-muted-foreground">Please connect your wallet to view your diary entries</p>
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  return (
    <>
      <Header />
      <div className="flex items-center justify-center flex-col min-h-screen py-8">
        <Card className="w-full max-w-4xl">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-2xl">My Diary Entries</CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => refetch()}>
                Refresh
              </Button>
              <Button asChild>
                <Link href="/">Add Entry</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Loading diary entries...</p>
              </div>
            ) : !entries || entries.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">No diary entries yet.</p>
                <Button asChild>
                  <Link href="/">Create Your First Entry</Link>
                </Button>
              </div>
            ) : (
              <div className="flex flex-col gap-6">
                {entries.map((entry) => {
                  const parsed = parseContent(entry.content);
                  const isDeleting = deletingTimestamps.has(entry.unixTimestamp);
                  return (
                    <Card key={entry.unixTimestamp} className="w-full">
                      <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle className="text-lg">
                          {formatTimestamp(entry.unixTimestamp)}
                        </CardTitle>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDelete(entry.unixTimestamp)}
                          disabled={isDeleting}
                        >
                          {isDeleting ? "Deleting..." : "Delete"}
                        </Button>
                      </CardHeader>
                      <CardContent className="flex flex-col gap-4">
                        {parsed.image && (
                          <div className="w-full">
                            <img
                              src={parsed.image}
                              alt={`Diary entry for ${formatTimestamp(entry.unixTimestamp)}`}
                              className="max-w-full max-h-96 rounded-lg object-contain mx-auto"
                            />
                          </div>
                        )}
                        {parsed.message && (
                          <div className="whitespace-pre-wrap text-sm">
                            {parsed.message}
                          </div>
                        )}
                        {!parsed.image && !parsed.message && (
                          <p className="text-muted-foreground text-sm">No content</p>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

