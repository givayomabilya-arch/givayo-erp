import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useRouter } from 'next/router'

export default function GunlukPlan({ profil }) {
  const router = useRouter()
  const [planlar, setPlanlar] = useState([])
  const [loading, setLoading] = useState(true)
  const [seciliTarih, setSeciliTarih] = useState(new Date().toISOString().split('T')[0])

  useEffect(() => {
    if (profil?.rol !== 'foremen' && profil?.rol !== 'yonetici') { router.push('/'); return }
    yukle()
  }, [profil])

  async function yukle() {
    setLoading(true)
    const { data } = await supabase
      .from('uretim_plani')
      .select('*')
      .gte('uretim_tarihi', new Date().toISOString().split('T')[0])
      .order('uretim_tarihi')
    setPlanlar(data || [])
    setLoading(false)
  }

  // Tarihlere göre grupla
  function gunler() {
    const g = {}
    for (const p of planlar) {
      if (!g[p.uretim_tarihi]) g[p.uretim_tarihi] = []
      g[p.uretim_tarihi].push(p)
    }
    return Object.entries(g).sort(([a], [b]) => a.localeCompare(b))
  }

  const bugun = new Date().toISOString().split('T')[0]

  return (
    <div className="p-6">
      <div className="mb-5">
        <h1 className="text-xl font-semibold">Günlük Üretim Planı</h1>
        <p className="text-gray-500 text-sm mt-0.5">Sipariş yükleyici tarafından oluşturulan plan</p>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-600">Yükleniyor…</div>
      ) : gunler().length === 0 ? (
        <div className="text-center py-12 text-gray-600">
          <div className="text-4xl mb-3">📅</div>
          <div>Henüz plan oluşturulmamış</div>
        </div>
      ) : (
        <div className="space-y-4">
          {gunler().map(([tarih, urunler]) => {
            const toplamAdet = urunler.reduce((t, u) => t + u.planlanan_adet, 0)
            const bugunMu = tarih === bugun
            return (
              <div key={tarih} className={`card ${bugunMu ? 'border-blue-700' : ''}`}>
                <div className="flex justify-between items-center mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-base font-semibold text-gray-200">
                      📅 {new Date(tarih + 'T12:00:00').toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                    </span>
                    {bugunMu && <span className="badge badge-blue">Bugün</span>}
                  </div>
                  <span className="text-sm text-gray-400">Toplam: <span className="text-blue-400 font-medium">{toplamAdet} adet</span></span>
                </div>
                <table className="w-full">
                  <thead>
                    <tr>
                      <th className="th">Ürün</th>
                      <th className="th text-center">Üretilecek Adet</th>
                    </tr>
                  </thead>
                  <tbody>
                    {urunler.map((u, i) => (
                      <tr key={i} className="hover:bg-gray-800/40">
                        <td className="td font-medium text-gray-200">{u.urun_stok_kodu}</td>
                        <td className="td text-center">
                          <span className="badge badge-blue text-sm font-bold">{u.planlanan_adet}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
