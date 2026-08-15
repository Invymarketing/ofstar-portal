import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import DashboardShell from '@/components/layout/DashboardShell'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Verificar sesión con el cliente normal (anon key + cookies)
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Leer perfil con service role para bypassar RLS
  const admin = createAdminClient()
  const { data: profile, error } = await admin
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile || error) {
    const errorMsg = error?.message ?? 'Perfil no encontrado'
    return (
      <div
        className="min-h-screen flex items-center justify-center px-4"
        style={{ backgroundColor: '#0A0A0F' }}
      >
        <div
          className="max-w-md w-full rounded-2xl border p-8 text-center"
          style={{ backgroundColor: '#13131A', borderColor: '#1E1E2E' }}
        >
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4"
            style={{ backgroundColor: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.2)' }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"
                fill="#C9A84C"
              />
            </svg>
          </div>
          <h2 className="text-lg font-semibold mb-2" style={{ color: '#F0F0F5' }}>
            Perfil no encontrado
          </h2>
          <p className="text-sm mb-3" style={{ color: '#6B6B80' }}>
            Usuario: <span style={{ color: '#F0F0F5' }}>{user.email}</span>
          </p>
          <p className="text-xs mb-6" style={{ color: '#6B6B80' }}>
            Error: {errorMsg}
          </p>
          <div
            className="rounded-xl p-4 text-left text-xs font-mono mb-6"
            style={{ backgroundColor: '#0A0A0F', color: '#6B6B80', border: '1px solid #1E1E2E' }}
          >
            <p style={{ color: '#C9A84C' }}>-- Ejecuta en Supabase SQL Editor:</p>
            <p className="mt-2">INSERT INTO public.profiles</p>
            <p>(id, full_name, role)</p>
            <p>SELECT id, &apos;Aleix&apos;, &apos;admin&apos;</p>
            <p>FROM auth.users</p>
            <p>WHERE email = &apos;{user.email}&apos;;</p>
          </div>
        </div>
      </div>
    )
  }

  return <DashboardShell profile={profile}>{children}</DashboardShell>
}
