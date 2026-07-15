'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export function AdminHeader() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    if (signingOut) return;
    setSigningOut(true);
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch {
      // ignore — server-side logout endpoint vẫn sẽ clear cookies khi navigate.
    }
    router.push('/admin/login');
    router.refresh();
  }

  return (
    <header className="fixed top-0 right-0 z-30 h-16 flex items-center justify-between px-6 bg-[rgba(13,17,23,0.8)] backdrop-blur-[6px] border-b border-[#4D4635]"
      style={{ left: '256px' }}
    >
      {/* Left: Breadcrumb / Page Title */}
      <div className="flex items-center gap-4">
        <span className="font-heading text-xs font-bold text-gold tracking-[0.1em] uppercase">
          Overview
        </span>
        <div className="flex items-center gap-2 text-[#D0C5AF]/50">
          <span className="text-xs">/</span>
          <span className="text-xs font-heading tracking-[0.05em]">Dashboard</span>
        </div>
      </div>

      {/* Right: Search + Notifications + Profile */}
      <div className="flex items-center gap-4">
        {/* Search */}
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#D0C5AF]/40"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-64 pl-10 pr-4 py-2 bg-[#1F1B13] border border-[#4D4635] rounded-xl text-xs text-[#D0C5AF] placeholder-[#D0C5AF]/30 focus:outline-none focus:border-gold/40 transition-colors"
          />
        </div>

        {/* Notifications */}
        <button className="relative p-2 text-[#D0C5AF]/60 hover:text-gold transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          <span className="absolute top-1 right-1 w-2 h-2 bg-gold rounded-full" />
        </button>

        {/* Profile */}
        <div className="flex items-center gap-3 pl-4 border-l border-[#4D4635]">
          <div className="text-right">
            <p className="text-xs font-medium text-[#D0C5AF]">Admin</p>
            <p className="text-[10px] text-[#D0C5AF]/50">admin@emerald-vault.vn</p>
          </div>
          <div className="w-8 h-8 rounded-full bg-gold/20 border border-gold/30 flex items-center justify-center">
            <span className="text-xs font-bold text-gold">A</span>
          </div>
        </div>

        {/* Logout */}
        <button
          type="button"
          onClick={handleSignOut}
          disabled={signingOut}
          className="flex items-center gap-2 pl-4 border-l border-[#4D4635] text-[#D0C5AF]/60 hover:text-gold transition-colors disabled:opacity-50"
          title="Đăng xuất"
        >
          <LogOut className="w-4 h-4" />
          <span className="text-[10px] font-heading tracking-[0.1em] uppercase">
            {signingOut ? 'Đang thoát...' : 'Đăng xuất'}
          </span>
        </button>
      </div>
    </header>
  );
}