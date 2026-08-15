import ComingSoon from '@/components/ui/ComingSoon'

export const metadata = { title: 'Onboarding de Modelos — OF Star Management' }

export default function Modulo10Page() {
  return (
    <ComingSoon
      moduleNumber={10}
      moduleName="Onboarding de Nuevas Modelos"
      description="Flujo automático al dar de alta una nueva modelo: carpeta en Google Drive, página en Notion, checklist de bienvenida y notificación al equipo."
      phase={11}
    />
  )
}
