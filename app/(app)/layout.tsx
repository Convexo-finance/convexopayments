import { AppGuard } from '@/components/auth/AppGuard'
import { Sidebar } from '@/components/layout/Sidebar'
import { MobilePadding } from '@/components/layout/MobilePadding'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppGuard>
      <div style={{ display: 'flex', minHeight: '100vh', background: '#02001A' }}>
        <Sidebar isAdmin={false} />
        <main
          style={{
            flex: 1,
            overflow: 'auto',
            background: 'linear-gradient(160deg, #02001A 0%, #110020 50%, #02001A 100%)',
          }}
        >
          <MobilePadding>
            {children}
          </MobilePadding>
        </main>
      </div>
    </AppGuard>
  )
}
