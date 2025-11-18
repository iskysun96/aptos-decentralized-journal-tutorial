"use client";

import { useState } from "react";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { aptosClient } from "@/utils/aptosClient";
import { addDailyEntry } from "@/entry-functions/addDailyEntry";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/use-toast";
import { Header } from "@/components/Header";
import Link from "next/link";

export default function DiaryPage() {
  const { account, signAndSubmitTransaction, connected } = useWallet();
  
  const [diaryMessage, setDiaryMessage] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Submit diary entry
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
        description: "Please enter a diary message",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Pass the diary message string directly as content
      const content = diaryMessage.trim();

      const committedTransaction = await signAndSubmitTransaction(
        addDailyEntry({
          content,
        })
      );

      const executedTransaction = await aptosClient().waitForTransaction({
        transactionHash: committedTransaction.hash,
      });

      toast({
        title: "Success",
        description: `Diary entry recorded! Transaction hash: ${executedTransaction.hash}`,
      });

      // Reset form
      setDiaryMessage("");
    } catch (error: any) {
      console.error("Error submitting diary entry:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error?.message || "Failed to submit diary entry",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Header />
      <div className="flex items-center justify-center flex-col min-h-screen py-8">
        <Card className="w-full max-w-2xl">
          <CardHeader>
            <div className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-2xl">Permanent Diary</CardTitle>
                <p className="text-sm text-muted-foreground mt-2">
                  Record your daily thoughts. Each entry is permanently stored on the Aptos blockchain and can be updated throughout the day.
                </p>
              </div>
              {connected && (
                <Button variant="outline" asChild>
                  <Link href="/view">View My Entries</Link>
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
            {!connected ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Please connect your wallet to get started</p>
              </div>
            ) : (
              <>
                {/* Diary Message Input */}
                <div className="flex flex-col gap-2">
                  <Label htmlFor="diary-message">Daily Message</Label>
                  <Textarea
                    id="diary-message"
                    value={diaryMessage}
                    onChange={(e) => setDiaryMessage(e.target.value)}
                    placeholder="Write your daily thoughts here..."
                    className="min-h-[120px]"
                    disabled={!account}
                  />
                </div>

                {/* Submit Button */}
                <Button
                  onClick={handleSubmit}
                  disabled={
                    !account ||
                    isSubmitting ||
                    !diaryMessage.trim()
                  }
                  className="w-full"
                >
                  {isSubmitting ? "Recording..." : "Record Diary Entry"}
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
