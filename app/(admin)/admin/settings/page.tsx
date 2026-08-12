'use client';

import { useState } from 'react';
import { Settings, Image as ImageIcon, Megaphone, PanelBottom, Gift } from 'lucide-react';
import { SiteInfoTab } from '@/components/admin/settings/site-info-tab';
import { BannersTab } from '@/components/admin/settings/banners-tab';
import { AnnouncementTab } from '@/components/admin/settings/announcement-tab';
import { FooterTab } from '@/components/admin/settings/footer-tab';
import { LoyaltyTab } from '@/components/admin/settings/loyalty-tab';

type TabId = 'site-info' | 'banners' | 'announcement' | 'footer' | 'loyalty';

const TABS: { id: TabId; label: string; icon: typeof Settings }[] = [
  { id: 'site-info', label: 'Site Info', icon: Settings },
  { id: 'banners', label: 'Homepage Banners', icon: ImageIcon },
  { id: 'announcement', label: 'Announcement Bar', icon: Megaphone },
  { id: 'footer', label: 'Footer', icon: PanelBottom },
  { id: 'loyalty', label: 'Loyalty & Rewards', icon: Gift },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<TabId>('site-info');

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-heading text-xl sm:text-2xl font-bold text-[#EAE1D4] tracking-tight">
            Settings
          </h1>
          <p className="text-sm text-[#D0C5AF]/60 mt-1">
            Quản lý nội dung động trên homepage, footer, announcement bar
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 border-b border-[#4D4635]/30">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`inline-flex items-center gap-2 px-4 py-2.5 text-xs font-heading tracking-[0.1em] uppercase transition-colors border-b-2 -mb-px ${
                isActive
                  ? 'text-gold border-gold'
                  : 'text-[#D0C5AF]/50 border-transparent hover:text-[#D0C5AF]/80 hover:border-[#4D4635]/30'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      {activeTab === 'site-info' && <SiteInfoTab />}
      {activeTab === 'banners' && <BannersTab />}
      {activeTab === 'announcement' && <AnnouncementTab />}
      {activeTab === 'footer' && <FooterTab />}
      {activeTab === 'loyalty' && <LoyaltyTab />}
    </div>
  );
}