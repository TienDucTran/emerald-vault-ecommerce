'use client';

const payments = [
  { id: 'MOMO-001', orderCode: '#EV-2026-002', amount: '₫12,800,000', method: 'MOMO', resultCode: 0, status: 'SUCCESS', ipnReceived: true, date: '2026-07-15 14:23' },
  { id: 'MOMO-002', orderCode: '#EV-2026-004', amount: '₫3,600,000', method: 'MOMO', resultCode: 0, status: 'SUCCESS', ipnReceived: true, date: '2026-07-15 12:15' },
  { id: 'MOMO-003', orderCode: '#EV-2026-005', amount: '₫24,500,000', method: 'MOMO', resultCode: 0, status: 'SUCCESS', ipnReceived: true, date: '2026-07-14 16:45' },
  { id: 'MOMO-004', orderCode: '#EV-2026-007', amount: '₫15,300,000', method: 'MOMO', resultCode: 0, status: 'REDIRECTED', ipnReceived: false, date: '2026-07-14 10:30' },
  { id: 'MOMO-005', orderCode: '#EV-2026-009', amount: '₫9,400,000', method: 'MOMO', resultCode: 9000, status: 'FAILED', ipnReceived: true, date: '2026-07-13 09:12' },
];

const statusColors: Record<string, string> = {
  SUCCESS: 'text-success bg-success/10 border-success/30',
  REDIRECTED: 'text-warning bg-warning/10 border-warning/30',
  FAILED: 'text-error bg-error/10 border-error/30',
  CREATED: 'text-[#D0C5AF]/50 border-[#4D4635]/30',
};

const statusIcons: Record<string, string> = {
  SUCCESS: '🟢',
  REDIRECTED: '🟡',
  FAILED: '🔴',
  CREATED: '⚪',
};

export default function PaymentsPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-[#EAE1D4] tracking-tight">Payments</h1>
          <p className="text-sm text-[#D0C5AF]/60 mt-1">Monitor MoMo transactions</p>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-4 gap-4">
        <div className="p-4 rounded-sm" style={{ background: 'rgba(18, 36, 28, 0.6)', backdropFilter: 'blur(6px)', border: '1px solid rgba(241, 229, 172, 0.1)' }}>
          <p className="text-[10px] font-heading tracking-[0.1em] uppercase text-[#D0C5AF]/50">Today</p>
          <p className="text-xl font-heading font-bold text-[#EAE1D4] mt-1">₫16.4M</p>
        </div>
        <div className="p-4 rounded-sm" style={{ background: 'rgba(18, 36, 28, 0.6)', backdropFilter: 'blur(6px)', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
          <p className="text-[10px] font-heading tracking-[0.1em] uppercase text-success">Success</p>
          <p className="text-xl font-heading font-bold text-success mt-1">3</p>
        </div>
        <div className="p-4 rounded-sm" style={{ background: 'rgba(18, 36, 28, 0.6)', backdropFilter: 'blur(6px)', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
          <p className="text-[10px] font-heading tracking-[0.1em] uppercase text-error">Failed</p>
          <p className="text-xl font-heading font-bold text-error mt-1">1</p>
        </div>
        <div className="p-4 rounded-sm" style={{ background: 'rgba(18, 36, 28, 0.6)', backdropFilter: 'blur(6px)', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
          <p className="text-[10px] font-heading tracking-[0.1em] uppercase text-warning">Pending IPN</p>
          <p className="text-xl font-heading font-bold text-warning mt-1">1</p>
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
                <th className="text-left px-6 py-4 text-[10px] font-heading tracking-[0.1em] uppercase text-[#D0C5AF]/50">Date</th>
                <th className="text-left px-6 py-4 text-[10px] font-heading tracking-[0.1em] uppercase text-[#D0C5AF]/50">Order</th>
                <th className="text-left px-6 py-4 text-[10px] font-heading tracking-[0.1em] uppercase text-[#D0C5AF]/50">Amount</th>
                <th className="text-left px-6 py-4 text-[10px] font-heading tracking-[0.1em] uppercase text-[#D0C5AF]/50">Result</th>
                <th className="text-left px-6 py-4 text-[10px] font-heading tracking-[0.1em] uppercase text-[#D0C5AF]/50">Status</th>
                <th className="text-left px-6 py-4 text-[10px] font-heading tracking-[0.1em] uppercase text-[#D0C5AF]/50">IPN</th>
                <th className="text-right px-6 py-4 text-[10px] font-heading tracking-[0.1em] uppercase text-[#D0C5AF]/50">Actions</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((payment) => (
                <tr
                  key={payment.id}
                  className="border-b border-[#4D4635]/10 hover:bg-[rgba(56,52,43,0.1)] transition-colors"
                >
                  <td className="px-6 py-4">
                    <span className="text-[10px] text-[#D0C5AF]/70">{payment.date}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs text-gold font-heading">{payment.orderCode}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs text-[#EAE1D4] font-medium">{payment.amount}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-xs ${payment.resultCode === 0 ? 'text-success' : 'text-error'}`}>
                      {payment.resultCode}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium rounded border ${statusColors[payment.status] || ''}`}>
                      {statusIcons[payment.status]} {payment.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-[10px] ${payment.ipnReceived ? 'text-success' : 'text-warning'}`}>
                      {payment.ipnReceived ? '✓ Received' : '◌ Pending'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="text-[10px] text-gold/60 hover:text-gold transition-colors">
                      Recheck
                    </button>
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
