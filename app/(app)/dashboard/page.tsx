import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { Topbar } from '@/components/layout/Topbar'
import { getOrders } from '@/lib/actions/orders'
import { getSuppliers, getClients } from '@/lib/actions/entities'
import { getWalletData } from '@/lib/actions/wallet'

export default async function DashboardPage() {
  const cookieStore = await cookies()
  const privyToken = cookieStore.get('privy-token')?.value
  if (!privyToken) redirect('/login')

  const [payOrders, collectOrders, suppliersData, clientsData, walletData] = await Promise.all([
    getOrders(privyToken, 'PAY',     { page: 1 }).catch(() => ({ data: [], total: 0 })),
    getOrders(privyToken, 'COLLECT', { page: 1 }).catch(() => ({ data: [], total: 0 })),
    getSuppliers(privyToken).catch(() => ({ data: [], total: 0 })),
    getClients(privyToken).catch(() => ({ data: [], total: 0 })),
    getWalletData(privyToken).catch(() => ({ balance: 0, requests: [] as { type: string; amount: number; status?: string }[] })),
  ])

  const totalPaid      = (payOrders.data ?? []).filter(o => o.status === 'PAGADO').reduce((s, o) => s + Number(o.amount), 0)
  const totalCollected = (collectOrders.data ?? []).filter(o => o.status === 'PAGADO').reduce((s, o) => s + Number(o.amount), 0)

  const requests = (walletData.requests ?? []) as { type: string; amount: number }[]
  const totalCashIn  = requests.filter(r => r.type === 'CASH_IN').reduce((s, r)  => s + Number(r.amount), 0)
  const totalCashOut = requests.filter(r => r.type === 'CASH_OUT').reduce((s, r) => s + Number(r.amount), 0)

  // Monthly volume (last 6 months)
  const now = new Date()
  const months: { label: string; pay: number; collect: number; total: number }[] = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const label = d.toLocaleString('en', { month: 'short' })
    const y = d.getFullYear(); const m = d.getMonth()
    const pay = (payOrders.data ?? [])
      .filter(o => { const od = new Date(o.created_at ?? 0); return od.getFullYear() === y && od.getMonth() === m })
      .reduce((s, o) => s + Number(o.amount), 0)
    const collect = (collectOrders.data ?? [])
      .filter(o => { const od = new Date(o.created_at ?? 0); return od.getFullYear() === y && od.getMonth() === m })
      .reduce((s, o) => s + Number(o.amount), 0)
    months.push({ label, pay, collect, total: pay + collect })
  }
  const maxMonthly = Math.max(...months.map(m => m.total), 1)
  const grandTotal = months.reduce((s, m) => s + m.total, 0)

  const userEmail = cookieStore.get('privy-user-email')?.value ?? ''
  const firstName = userEmail ? userEmail.split('@')[0] : ''

  return (
    <div>
      <Topbar
        title="Dashboard"
        breadcrumb={firstName ? `Welcome back, ${firstName}` : 'Overview'}
      />
      <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* ── Stat cards ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
          {[
            { label: 'USDC Balance',    value: `$${Number(walletData.balance).toLocaleString('en', { minimumFractionDigits: 2 })}`, sub: 'Available',        color: '#BAD6EB' },
            { label: 'Total Paid',      value: `$${totalPaid.toLocaleString('en', { maximumFractionDigits: 0 })}`,      sub: 'Completed payments',   color: '#10b981' },
            { label: 'Total Collected', value: `$${totalCollected.toLocaleString('en', { maximumFractionDigits: 0 })}`, sub: 'Completed collections', color: '#a78bfa' },
            { label: 'Cash In',         value: `$${totalCashIn.toLocaleString('en',  { maximumFractionDigits: 0 })}`,   sub: 'Total deposited',      color: '#34d399' },
            { label: 'Cash Out',        value: `$${totalCashOut.toLocaleString('en', { maximumFractionDigits: 0 })}`,   sub: 'Total withdrawn',      color: '#f87171' },
            { label: 'Suppliers',       value: suppliersData.total, sub: 'Active',                                      color: 'rgba(186,214,235,0.6)' },
            { label: 'Clients',         value: clientsData.total,   sub: 'Active',                                      color: 'rgba(186,214,235,0.6)' },
          ].map((s) => (
            <div key={s.label} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(186,214,235,0.1)', borderRadius: 12, padding: '16px 18px' }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: 'rgba(186,214,235,0.4)', marginBottom: 10 }}>
                {s.label}
              </div>
              <div style={{ fontSize: 24, fontWeight: 800, color: s.color, lineHeight: 1 }}>
                {s.value}
              </div>
              <div style={{ fontSize: 11, color: 'rgba(186,214,235,0.35)', marginTop: 5 }}>{s.sub}</div>
            </div>
          ))}
        </div>

        {/* ── Monthly volume ── */}
        <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(186,214,235,0.1)', borderRadius: 12, padding: '18px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.8)', marginBottom: 2 }}>Monthly Volume</div>
              <div style={{ fontSize: 11, color: 'rgba(186,214,235,0.4)' }}>Pay vs Collect — last 6 months</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: 'rgba(255,255,255,0.9)' }}>
                ${grandTotal.toLocaleString('en', { maximumFractionDigits: 0 })}
              </div>
              <div style={{ fontSize: 10, color: 'rgba(186,214,235,0.4)', marginTop: 2 }}>Total 6-month volume</div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
            {[{ color: '#60a5fa', label: 'Pay' }, { color: '#a78bfa', label: 'Collect' }].map(l => (
              <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 10, height: 10, borderRadius: 2, background: l.color }} />
                <span style={{ fontSize: 11, color: 'rgba(186,214,235,0.5)' }}>{l.label}</span>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 110 }}>
            {months.map((m) => (
              <div key={m.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
                <div style={{ fontSize: 9, color: 'rgba(186,214,235,0.4)', marginBottom: 4 }}>
                  {m.total > 0 ? `$${m.total >= 1000 ? (m.total / 1000).toFixed(0) + 'k' : m.total}` : ''}
                </div>
                <div style={{ width: '100%', display: 'flex', gap: 2, alignItems: 'flex-end', justifyContent: 'center' }}>
                  <div style={{ width: '46%', height: Math.max(3, (m.pay     / maxMonthly) * 88), background: '#60a5fa', borderRadius: '3px 3px 0 0', opacity: 0.85 }} />
                  <div style={{ width: '46%', height: Math.max(3, (m.collect / maxMonthly) * 88), background: '#a78bfa', borderRadius: '3px 3px 0 0', opacity: 0.85 }} />
                </div>
                <span style={{ fontSize: 9, color: 'rgba(186,214,235,0.35)', marginTop: 5 }}>{m.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Volume split ── */}
        <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(186,214,235,0.1)', borderRadius: 12, padding: '18px 20px' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.8)', marginBottom: 4 }}>Volume Split</div>
          <div style={{ fontSize: 11, color: 'rgba(186,214,235,0.4)', marginBottom: 16 }}>Payments vs Collections — all time</div>
          {(() => {
            const total = totalPaid + totalCollected || 1
            const payPct = Math.round((totalPaid / total) * 100)
            const colPct = 100 - payPct
            return (
              <>
                <div style={{ height: 10, borderRadius: 5, background: 'rgba(255,255,255,0.06)', overflow: 'hidden', display: 'flex' }}>
                  <div style={{ width: `${payPct}%`, background: '#60a5fa', borderRadius: '5px 0 0 5px' }} />
                  <div style={{ width: `${colPct}%`, background: '#a78bfa', borderRadius: '0 5px 5px 0' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10 }}>
                  <span style={{ fontSize: 11, color: '#60a5fa' }}>Pay {payPct}% · ${totalPaid.toLocaleString('en', { maximumFractionDigits: 0 })}</span>
                  <span style={{ fontSize: 11, color: '#a78bfa' }}>Collect {colPct}% · ${totalCollected.toLocaleString('en', { maximumFractionDigits: 0 })}</span>
                </div>
              </>
            )
          })()}
        </div>

      </div>
    </div>
  )
}
