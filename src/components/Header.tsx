import Link from "next/link";
import { WalletSelector } from "./WalletSelector";

export function Header() {
  return (
    <div className="flex items-center justify-between px-4 py-2 max-w-screen-xl mx-auto w-full flex-wrap">
      <Link href="/" className="hover:opacity-80 transition-opacity">
        <h1 className="display">Permanent Diary</h1>
      </Link>

      <div className="flex gap-2 items-center flex-wrap">
        <WalletSelector />
      </div>
    </div>
  );
}
