import ComingSoon from '@/components/ui/ComingSoon'

export const metadata = { title: 'Sistema de Alertas — OF Star Management' }

export default function Modulo8Page() {
  return (
    <ComingSoon
      moduleNumber={8}
      moduleName="Sistema de Alertas Internas"
      description="Detección automática de situaciones críticas: cuentas sin crecimiento, modelos sin entrega, chatters por debajo de objetivo y facturas pendientes."
      phase={7}
    />
  )
}
