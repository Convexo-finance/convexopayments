import { Topbar } from '@/components/layout/Topbar'
import { EntityWizard } from '@/components/entities/EntityWizard'

export default function NewSupplierPage() {
  return (
    <div>
      <Topbar title="New Supplier" breadcrumb="Proveedores" />
      <div style={{ padding: 24 }}>
        <EntityWizard entityType="supplier" />
      </div>
    </div>
  )
}
