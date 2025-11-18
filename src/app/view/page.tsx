"use client";

import { useState, useEffect } from "react";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { useQuery } from "@tanstack/react-query";
import { aptosClient } from "@/utils/aptosClient";
import { getDiaryEntries, type DiaryEntry } from "@/view-functions/getDiaryEntries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import Link from "next/link";

// Format date from YYYYMMDD to readable format
const formatDate = (dateNum: number): string => {
  const dateStr = dateNum.toString();
  if (dateStr.length !== 8) return dateStr;
  
  const year = dateStr.substring(0, 4);
  const month = dateStr.substring(4, 6);
  const day = dateStr.substring(6, 8);
  
  const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  return date.toLocaleDateString("en-US", { 
    year: "numeric", 
    month: "long", 
    day: "numeric" 
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
  const { account, connected } = useWallet();

  const { data: entries, isLoading, refetch } = useQuery({
    queryKey: ["diary-entries", account?.address],
    queryFn: async () => {
      if (!account) return [];
      return await getDiaryEntries(account.address.toStringLong());
    },
    enabled: !!account && connected,
    refetchInterval: 10_000,
  });

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
                {entries.map((entry, index) => {
                  const parsed = parseContent(entry.content);
                  return (
                    <Card key={`${entry.date}-${index}`} className="w-full">
                      <CardHeader>
                        <CardTitle className="text-lg">
                          {formatDate(entry.date)}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="flex flex-col gap-4">
                        {parsed.image && (
                          <div className="w-full">
                            <img
                              src={parsed.image}
                              alt={`Diary entry for ${formatDate(entry.date)}`}
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

