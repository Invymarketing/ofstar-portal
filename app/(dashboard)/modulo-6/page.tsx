import ComingSoon from '@/components/ui/ComingSoon'

export const metadata = { title: 'Pipeline de Reclutamiento — Skeilab' }

export default function Modulo6Page() {
  return (
    <ComingSoon
      moduleNumber={6}
      moduleName="Pipeline de Reclutamiento de Modelos"
      description="Kanban de candidatas desde la aplicación hasta la firma. Sincronización bidireccional con Airtable. Al firmar, lanza automáticamente el onboarding."
      phase={9}
    />
  )
}
