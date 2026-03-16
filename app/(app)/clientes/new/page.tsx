import { Topbar } from '@/components/layout/Topbar'
import { EntityWizard } from '@/components/entities/EntityWizard'

export default function NewClientPage() {
  return (
    <div>
      <Topbar title="New Client" breadcrumb="Clientes" />
      <div style={{ padding: 24 }}>
        <EntityWizard entityType="client" />
      </div>
    </div>
  )
}
