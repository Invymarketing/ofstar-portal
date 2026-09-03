interface Row {
  chatter_id: string
  nombre: string
  errores_totales: number
  sancion_usd: number
  disparos: number
  escalada: string
  puntaje: number
}

export default function PanelCalidad({ ranking }: { ranking: Row[] }) {
  if (ranking.length === 0) {
    return (
      <div className="rounded-2xl border p-6 text-sm text-center"
        style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--muted)' }}>
        Aún no hay chatters registrados. Agrega chatters para verlos aquí.
      </div>
    )
  }

  return (
    <div className="rounded-2xl border overflow-hidden" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
      <table className="w-full text-sm">
        <thead>
          <tr style={{ color: 'var(--muted)', borderBottom: '1px solid var(--border)' }}>
            <th className="text-left font-medium px-4 py-3">#</th>
            <th className="text-left font-medium px-4 py-3">Chatter</th>
            <th className="text-left font-medium px-4 py-3">Estado</th>
            <th className="text-right font-medium px-4 py-3">Errores</th>
            <th className="text-right font-medium px-4 py-3">Sanciones</th>
            <th className="text-right font-medium px-4 py-3">Sanción $</th>
            <th className="text-right font-medium px-4 py-3">Puntaje</th>
          </tr>
        </thead>
        <tbody>
          {ranking.map((r, i) => (
            <tr key={r.chatter_id} style={{ borderBottom: '1px solid #1A1A24', color: 'var(--foreground)' }}>
              <td className="px-4 py-3" style={{ color: 'var(--muted)' }}>{i + 1}</td>
              <td className="px-4 py-3 font-medium">{r.nombre}</td>
              <td className="px-4 py-3">{r.escalada}</td>
              <td className="px-4 py-3 text-right">{r.errores_totales}</td>
              <td className="px-4 py-3 text-right">{r.disparos}</td>
              <td className="px-4 py-3 text-right font-semibold"
                style={{ color: r.sancion_usd > 0 ? '#EF4444' : 'var(--muted)' }}>
                ${r.sancion_usd}
              </td>
              <td className="px-4 py-3 text-right font-bold"
                style={{ color: r.puntaje >= 90 ? '#22C55E' : r.puntaje >= 70 ? '#EAB308' : '#EF4444' }}>
                {r.puntaje}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
