"use client";

import { useState, useCallback } from "react";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { aptosClient } from "@/utils/aptosClient";
import { addDailyEntry } from "@/entry-functions/addDailyEntry";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/use-toast";
import { Header } from "@/components/Header";
import { TopBanner } from "@/components/TopBanner";

export default function DiaryPage() {
  const { account, signAndSubmitTransaction, connected } = useWallet();
  
  const [diaryMessage, setDiaryMessage] = useState<string>("");
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Convert image to base64
  const convertImageToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // Handle file selection
  const handleFileSelect = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast({
        variant: "destructive",
        title: "Invalid file",
        description: "Please select an image file",
      });
      return;
    }

    setSelectedImage(file);
    const base64 = await convertImageToBase64(file);
    setImagePreview(base64);
  }, []);

  // Handle drag and drop
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const file = e.dataTransfer.files[0];
      if (file) {
        await handleFileSelect(file);
      }
    },
    [handleFileSelect]
  );

  // Handle file input change
  const handleFileInputChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        await handleFileSelect(file);
      }
    },
    [handleFileSelect]
  );

  // Get today's date in YYYYMMDD format
  const getTodayDate = (): number => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    return parseInt(`${year}${month}${day}`, 10);
  };

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

    if (!selectedImage && !diaryMessage.trim()) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please add an image or message",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Prepare content: combine image (base64) and message as JSON
      let imageBase64 = "";
      if (selectedImage) {
        imageBase64 = await convertImageToBase64(selectedImage);
      }

      const content = JSON.stringify({
        image: imageBase64,
        message: diaryMessage.trim(),
        timestamp: new Date().toISOString(),
      });

      const date = getTodayDate();

      const committedTransaction = await signAndSubmitTransaction(
        addDailyEntry({
          date,
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
      setSelectedImage(null);
      setImagePreview(null);
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
      <TopBanner />
      <Header />
      <div className="flex items-center justify-center flex-col min-h-screen py-8">
        <Card className="w-full max-w-2xl">
          <CardHeader>
            <CardTitle className="text-2xl">Permanent Diary</CardTitle>
            <p className="text-sm text-muted-foreground mt-2">
              Record your daily memory with one image and one message. Each entry is permanently stored on the Aptos blockchain.
            </p>
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
            {!connected ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Please connect your wallet to get started</p>
              </div>
            ) : (
              <>
                {/* Image Upload Area */}
                <div className="flex flex-col gap-2">
                  <Label htmlFor="image-upload">Daily Image</Label>
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`
                      border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
                      transition-colors
                      ${isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25"}
                      ${imagePreview ? "border-primary" : ""}
                    `}
                    onClick={() => document.getElementById("image-upload")?.click()}
                  >
                    <input
                      id="image-upload"
                      type="file"
                      accept="image/*"
                      onChange={handleFileInputChange}
                      className="hidden"
                    />
                    {imagePreview ? (
                      <div className="flex flex-col items-center gap-4">
                        <img
                          src={imagePreview}
                          alt="Preview"
                          className="max-h-64 max-w-full rounded-lg object-contain"
                        />
                        <p className="text-sm text-muted-foreground">
                          Click or drag to replace image
                        </p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2">
                        <p className="text-muted-foreground">
                          Drag and drop an image here, or click to select
                        </p>
                        <p className="text-xs text-muted-foreground">
                          One image per day
                        </p>
                      </div>
                    )}
                  </div>
                </div>

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
                    (!selectedImage && !diaryMessage.trim())
                  }
                  className="w-full"
                >
                  {isSubmitting ? "Recording..." : "Record Diary Entry"}
                </Button>

                {selectedImage && (
                  <p className="text-xs text-muted-foreground text-center">
                    Selected: {selectedImage.name} ({(selectedImage.size / 1024).toFixed(2)} KB)
                  </p>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

