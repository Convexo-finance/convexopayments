import { AdminGuard } from '@/components/auth/AdminGuard'
import { Sidebar } from '@/components/layout/Sidebar'

const ADMIN_NAV = [
  {
    group: 'Overview',
    items: [{ label: 'Dashboard', href: '/admin' }],
  },
  {
    group: 'Users',
    items: [{ label: 'Users', href: '/admin/usuarios' }],
  },
  {
    group: 'Orders',
    items: [
      { label: 'Pay Orders', href: '/admin/pagar' },
      { label: 'Collect Orders', href: '/admin/cobrar' },
      { label: 'OTC Orders', href: '/admin/cuenta' },
    ],
  },
  {
    group: 'Entities',
    items: [
      { label: 'Suppliers', href: '/admin/proveedores' },
      { label: 'Clients', href: '/admin/clientes' },
    ],
  },
  {
    group: 'Config',
    items: [
      { label: 'Convexo Config', href: '/admin/configuracion' },
      { label: 'Notifications', href: '/admin/notificaciones' },
    ],
  },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminGuard>
      <div style={{ display: 'flex', minHeight: '100vh' }}>
        <Sidebar isAdmin nav={ADMIN_NAV} />
        <main style={{ flex: 1, overflow: 'auto' }}>{children}</main>
      </div>
    </AdminGuard>
  )
}
