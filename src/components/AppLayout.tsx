"use client";

import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import Sidebar from "@/components/Sidebar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <Sidebar />
      <main
        id="main-content"
        className="min-h-screen lg:ml-[260px]"
        style={{ background: "var(--bg)" }}
      >
        {children}
      </main>
      <BottomNav />
    </>
  );
}
