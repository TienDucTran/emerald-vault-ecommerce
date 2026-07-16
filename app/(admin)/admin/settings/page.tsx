'use client';

export default function SettingsPage() {
  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-heading text-xl sm:text-2xl font-bold text-[#EAE1D4] tracking-tight">Settings</h1>
          <p className="text-sm text-[#D0C5AF]/60 mt-1">Configure site settings, shipping, and payment</p>
        </div>
      </div>

      {/* Site Settings */}
      <div
        className="p-4 sm:p-6 rounded-sm space-y-5"
        style={{
          background: 'rgba(18, 36, 28, 0.6)',
          backdropFilter: 'blur(6px)',
          border: '1px solid rgba(241, 229, 172, 0.1)',
        }}
      >
        <h2 className="font-heading text-sm font-bold text-[#EAE1D4] tracking-[0.05em] uppercase">Site Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
          <div>
            <label className="block text-[10px] font-heading tracking-[0.1em] uppercase text-[#D0C5AF]/50 mb-1.5">Site Name</label>
            <input type="text" defaultValue="Emerald Vault" className="w-full px-4 py-2 bg-[#1F1B13] border border-[#4D4635] rounded-sm text-xs text-[#D0C5AF] focus:outline-none focus:border-gold/40" />
          </div>
          <div>
            <label className="block text-[10px] font-heading tracking-[0.1em] uppercase text-[#D0C5AF]/50 mb-1.5">Contact Email</label>
            <input type="email" defaultValue="hello@emerald-vault.vn" className="w-full px-4 py-2 bg-[#1F1B13] border border-[#4D4635] rounded-sm text-xs text-[#D0C5AF] focus:outline-none focus:border-gold/40" />
          </div>
          <div>
            <label className="block text-[10px] font-heading tracking-[0.1em] uppercase text-[#D0C5AF]/50 mb-1.5">Contact Phone</label>
            <input type="text" defaultValue="0901 234 567" className="w-full px-4 py-2 bg-[#1F1B13] border border-[#4D4635] rounded-sm text-xs text-[#D0C5AF] focus:outline-none focus:border-gold/40" />
          </div>
          <div>
            <label className="block text-[10px] font-heading tracking-[0.1em] uppercase text-[#D0C5AF]/50 mb-1.5">Address</label>
            <input type="text" defaultValue="12 Nguyen Hue, District 1, HCMC" className="w-full px-4 py-2 bg-[#1F1B13] border border-[#4D4635] rounded-sm text-xs text-[#D0C5AF] focus:outline-none focus:border-gold/40" />
          </div>
        </div>
      </div>

      {/* Shipping */}
      <div
        className="p-4 sm:p-6 rounded-sm space-y-5"
        style={{
          background: 'rgba(18, 36, 28, 0.6)',
          backdropFilter: 'blur(6px)',
          border: '1px solid rgba(241, 229, 172, 0.1)',
        }}
      >
        <h2 className="font-heading text-sm font-bold text-[#EAE1D4] tracking-[0.05em] uppercase">Shipping</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
          <div>
            <label className="block text-[10px] font-heading tracking-[0.1em] uppercase text-[#D0C5AF]/50 mb-1.5">Default Shipping Fee</label>
            <input type="text" defaultValue="₫30,000" className="w-full px-4 py-2 bg-[#1F1B13] border border-[#4D4635] rounded-sm text-xs text-[#D0C5AF] focus:outline-none focus:border-gold/40" />
          </div>
          <div>
            <label className="block text-[10px] font-heading tracking-[0.1em] uppercase text-[#D0C5AF]/50 mb-1.5">Free Shipping Threshold</label>
            <input type="text" defaultValue="₫3,000,000" className="w-full px-4 py-2 bg-[#1F1B13] border border-[#4D4635] rounded-sm text-xs text-[#D0C5AF] focus:outline-none focus:border-gold/40" />
          </div>
        </div>
      </div>

      {/* MoMo Status */}
      <div
        className="p-4 sm:p-6 rounded-sm space-y-5"
        style={{
          background: 'rgba(18, 36, 28, 0.6)',
          backdropFilter: 'blur(6px)',
          border: '1px solid rgba(241, 229, 172, 0.1)',
        }}
      >
        <h2 className="font-heading text-sm font-bold text-[#EAE1D4] tracking-[0.05em] uppercase">Payment — MoMo</h2>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
            <span className="text-xs text-[#D0C5AF]">Production (Live)</span>
          </div>
          <button className="px-4 py-2 rounded-sm text-[10px] font-heading tracking-[0.1em] uppercase border border-gold/20 text-gold/70 hover:text-gold transition-colors self-start sm:self-auto">
            Test Connection
          </button>
        </div>
        <p className="text-[10px] text-[#D0C5AF]/30">Partner Code: MOMO-EMERALD-2026</p>
      </div>

      {/* Save Button */}
      <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2 sm:gap-3 pt-4 border-t border-[#4D4635]/30">
        <button className="w-full sm:w-auto px-6 py-2.5 rounded-sm text-xs font-heading tracking-[0.15em] uppercase font-bold bg-gold text-[#3C2F00] hover:bg-gold/90 transition-colors">
          Save Changes
        </button>
      </div>
    </div>
  );
}
