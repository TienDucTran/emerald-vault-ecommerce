'use client';

const subscribers = [
  { id: 1, email: 'huong.nguyen@gmail.com', source: 'home', active: true, date: '2026-07-15' },
  { id: 2, email: 'minh.tran@yahoo.com', source: 'checkout', active: true, date: '2026-07-14' },
  { id: 3, email: 'mai.le@outlook.com', source: 'home', active: true, date: '2026-07-13' },
  { id: 4, email: 'anh.pham@gmail.com', source: 'popup', active: false, date: '2026-07-10' },
  { id: 5, email: 'thu.dang@icloud.com', source: 'checkout', active: true, date: '2026-07-09' },
  { id: 6, email: 'nam.hoang@gmail.com', source: 'home', active: true, date: '2026-07-08' },
  { id: 7, email: 'lan.vu@yahoo.com', source: 'popup', active: true, date: '2026-07-07' },
  { id: 8, email: 'hai.ngo@gmail.com', source: 'checkout', active: false, date: '2026-07-05' },
];

export default function NewsletterPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-[#EAE1D4] tracking-tight">Newsletter</h1>
          <p className="text-sm text-[#D0C5AF]/60 mt-1">Manage email subscribers — {subscribers.filter(s => s.active).length} active</p>
        </div>
        <button
          className="px-4 py-2 rounded-sm text-xs font-heading tracking-[0.1em] uppercase border border-[rgba(242,202,80,0.2)] text-gold/80 hover:text-gold transition-colors"
          style={{ background: 'rgba(18, 36, 28, 0.6)', backdropFilter: 'blur(6px)' }}
        >
          📤 Export CSV
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="p-4 rounded-sm" style={{ background: 'rgba(18, 36, 28, 0.6)', backdropFilter: 'blur(6px)', border: '1px solid rgba(241, 229, 172, 0.1)' }}>
          <p className="text-[10px] font-heading tracking-[0.1em] uppercase text-[#D0C5AF]/50">Total</p>
          <p className="text-xl font-heading font-bold text-[#EAE1D4] mt-1">{subscribers.length}</p>
        </div>
        <div className="p-4 rounded-sm" style={{ background: 'rgba(18, 36, 28, 0.6)', backdropFilter: 'blur(6px)', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
          <p className="text-[10px] font-heading tracking-[0.1em] uppercase text-success">Active</p>
          <p className="text-xl font-heading font-bold text-success mt-1">{subscribers.filter(s => s.active).length}</p>
        </div>
        <div className="p-4 rounded-sm" style={{ background: 'rgba(18, 36, 28, 0.6)', backdropFilter: 'blur(6px)', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
          <p className="text-[10px] font-heading tracking-[0.1em] uppercase text-error">Unsubscribed</p>
          <p className="text-xl font-heading font-bold text-error mt-1">{subscribers.filter(s => !s.active).length}</p>
        </div>
        <div className="p-4 rounded-sm" style={{ background: 'rgba(18, 36, 28, 0.6)', backdropFilter: 'blur(6px)', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
          <p className="text-[10px] font-heading tracking-[0.1em] uppercase text-warning">This Week</p>
          <p className="text-xl font-heading font-bold text-warning mt-1">+12</p>
        </div>
      </div>

      {/* Table */}
      <div
        className="rounded-sm overflow-hidden"
        style={{
          background: 'rgba(18, 36, 28, 0.6)',
          backdropFilter: 'blur(6px)',
          border: '1px solid rgba(241, 229, 172, 0.1)',
        }}
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#4D4635]">
                <th className="text-left px-6 py-4 text-[10px] font-heading tracking-[0.1em] uppercase text-[#D0C5AF]/50">Email</th>
                <th className="text-left px-6 py-4 text-[10px] font-heading tracking-[0.1em] uppercase text-[#D0C5AF]/50">Source</th>
                <th className="text-left px-6 py-4 text-[10px] font-heading tracking-[0.1em] uppercase text-[#D0C5AF]/50">Status</th>
                <th className="text-left px-6 py-4 text-[10px] font-heading tracking-[0.1em] uppercase text-[#D0C5AF]/50">Subscribed</th>
              </tr>
            </thead>
            <tbody>
              {subscribers.map((sub) => (
                <tr key={sub.id} className="border-b border-[#4D4635]/10 hover:bg-[rgba(56,52,43,0.1)] transition-colors">
                  <td className="px-6 py-4">
                    <span className="text-xs text-[#D0C5AF]">{sub.email}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-[10px] px-2 py-0.5 rounded border border-[#4D4635]/30 text-[#D0C5AF]/60 bg-[#1F1B13]">
                      {sub.source}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-[10px] font-medium ${sub.active ? 'text-success' : 'text-error'}`}>
                      {sub.active ? 'Active' : 'Unsubscribed'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-[10px] text-[#D0C5AF]/40">{sub.date}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
