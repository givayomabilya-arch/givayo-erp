import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Dashboard({ profil }) {
  const [istatistik, setIstatistik] = useState({
    bekleyen: 0, uretimde: 0, tamamlandi: 0, aktifIsEmri: 0
  })

  useEffect(() => { yukle() }, [])

  async function yukle() {
    const { data: siparisler } = await supabase.from('siparisler').select('durum')
    const { data: emirler } = await supabase.from('is_emirleri').select('durum')
    const s = siparisler || []
    const e = emirler || []
    setIstatistik({
      bekleyen: s.filter(x => x.durum === 'beklemede').length,
      uretimde: s.filter(x => x.durum === 'uretimde').length,
      tamamlandi: s.filter(x => x.durum === 'tamamlandi').length,
      aktifIsEmri: e.filter(x => x.durum === 'aktif').length,
    })
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-xl font-semibold">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-0.5">
          Hoş geldiniz, {profil?.ad_soyad || profil?.email}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <div className="card">
          <div className="text-3xl font-bold text-blue-400 mb-1">{istatistik.bekleyen}</div>
          <div className="text-sm text-gray-400">Bekleyen Sipariş</div>
        </div>
        <div className="card">
          <div className="text-3xl font-bold text-orange-400 mb-1">{istatistik.uretimde}</div>
          <div className="text-sm text-gray-400">Üretimdeki Sipariş</div>
        </div>
        <div className="card">
          <div className="text-3xl font-bold text-green-400 mb-1">{istatistik.tamamlandi}</div>
          <div className="text-sm text-gray-400">Tamamlanan Sipariş</div>
        </div>
        <div className="card">
          <div className="text-3xl font-bold text-purple-400 mb-1">{istatistik.aktifIsEmri}</div>
          <div className="text-sm text-gray-400">Aktif İş Emri</div>
        </div>
      </div>
    </div>
  )
}
