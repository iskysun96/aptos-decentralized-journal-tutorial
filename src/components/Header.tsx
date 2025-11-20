"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { WalletSelector } from "./WalletSelector";

export function Header() {
  const pathname = usePathname();
  const isWritePage = pathname === "/";
  const isDiaryPage = pathname === "/view";

  return (
    <div className="w-full border-b border-border">
      <div className="flex items-center justify-between px-6 py-5 w-full relative">
        <Link href="/" className="hover:opacity-70 transition-opacity flex items-center">
          <h1 className="text-lg font-light">Lasting Words</h1>
        </Link>
        <nav className="flex items-center gap-6 absolute left-1/2 transform -translate-x-1/2">
          <Link
            href="/"
            className={`text-sm transition-colors pb-2 border-b-2 flex items-center ${
              isWritePage
                ? "text-foreground font-medium border-foreground"
                : "text-muted-foreground hover:text-foreground border-transparent"
            }`}
          >
            Write
          </Link>
          <Link
            href="/view"
            className={`text-sm transition-colors pb-2 border-b-2 flex items-center ${
              isDiaryPage
                ? "text-foreground font-medium border-foreground"
                : "text-muted-foreground hover:text-foreground border-transparent"
            }`}
          >
            My Diary
          </Link>
        </nav>
        <WalletSelector />
      </div>
    </div>
  );
}
