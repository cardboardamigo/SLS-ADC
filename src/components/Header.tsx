"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

const pageTitles: Record<string, string> = {
  "/dashboard": "Census Tracker",
  "/admissions": "New Admission",
  "/discharges": "Discharge",
  "/rta": "Return to Acute",
  "/history": "Monthly History",
  "/bonus": "Bonus Tracker",
  "/profile": "My Profile",
};

export default function Header() {
  const pathname = usePathname();
  const title = pageTitles[pathname] || "Census Tracker";

  return (
    <header className="fixed top-0 left-0 right-0 bg-[#1e3a5f] text-white z-50 safe-area-top">
      <div className="flex items-center justify-between h-14 px-4 max-w-lg mx-auto">
        <div className="flex items-center gap-2">
          <Image
            src="/SLS-LOGO.png"
            alt="SLS Logo"
            width={32}
            height={32}
            className="rounded"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
          <h1 className="text-lg font-semibold">{title}</h1>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/history" className="p-2 hover:bg-white/10 rounded-lg transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
            </svg>
          </Link>
        </div>
      </div>
    </header>
  );
}
