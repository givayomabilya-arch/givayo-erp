import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import Link from 'next/link'

export default function Dashboard() {
  const [stats, setStats] = useState({ siparisler: 0, uretimde: 0, kargoya: 0, katalog: 0 })
  const [sonSiparisler, setSonSiparisler] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [{ count: sCnt }, { count: uCnt }, { count: kCnt }, { count: katCnt }, { data: son }] = await Promise.all([
        supabase.from('siparisler').select('*', { count: 'exact', head: true }).neq('durum', 'tamamlandi'),
        supabase.from('siparisler').select('*', { count: 'exact', head: true }).eq('durum', 'uretimde'),
        supabase.from('siparisler').select('*', { count: 'exact', head: true }).eq('durum', 'kargoya_hazir'),
        supabase.from('urunler').select('*', { count: 'exact', head: true }),
        supabase.from('siparisler').select('id,siparis_no,musteri_adi,urun_stok_kodu,adet,durum,created_at').order('created_at', { ascending: false }).limit(8)
      ])
      setStats({ siparisler: sCnt || 0, uretimde: uCnt || 0, kargoya: kCnt || 0, katalog: katCnt || 0 })
      setSonSiparisler(son || [])
      setLoading(false)
    }
    load()
  }, [])

  const durumBadge = (d) => {
    const map = {
      'beklemede': 'badge-blue',
      'uretimde': 'badge-orange',
      'kargoya_hazir': 'badge-green',
      'tamamlandi': 'badge-gray',
    }
    const label = { beklemede: 'Beklemede', uretimde: 'Üretimde', kargoya_hazir: 'Kargoya Hazır', tamamlandi: 'Tamamlandı' }
    return <span className={`badge ${map[d] || 'badge-gray'}`}>{label[d] || d}</span>
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-xl font-semibold">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Givayo Mobilya Üretim Takip Sistemi</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Aktif Sipariş', value: stats.siparisler, color: 'text-blue-400', icon: '📦' },
          { label: 'Üretimde', value: stats.uretimde, color: 'text-orange-400', icon: '🏭' },
          { label: 'Kargoya Hazır', value: stats.kargoya, color: 'text-green-400', icon: '✅' },
          { label: 'Katalog Ürün', value: stats.katalog, color: 'text-purple-400', icon: '🗂️' },
        ].map(s => (
          <div key={s.label} className="card">
            <div className="flex justify-between items-start mb-3">
              <span className="text-xs text-gray-500 uppercase tracking-wide">{s.label}</span>
              <span className="text-lg">{s.icon}</span>
            </div>
            <div className={`text-3xl font-semibold ${s.color}`}>{loading ? '—' : s.value}</div>
          </div>
        ))}
      </div>

      {/* Son Siparişler */}
      <div className="card">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-sm font-medium text-gray-300">Son Siparişler</h2>
          <Link href="/siparisler"><span className="text-xs text-blue-400 hover:underline cursor-pointer">Tümünü Gör →</span></Link>
        </div>
        {loading ? (
          <div className="text-center py-8 text-gray-600">Yükleniyor…</div>
        ) : sonSiparisler.length === 0 ? (
          <div className="text-center py-8 text-gray-600">
            <div className="text-3xl mb-2">📦</div>
            <div>Henüz sipariş yok.</div>
            <Link href="/siparisler"><span className="text-blue-400 text-sm hover:underline cursor-pointer">Sipariş ekle →</span></Link>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr>
                <th className="th">Sipariş No</th>
                <th className="th">Müşteri</th>
                <th className="th">Ürün</th>
                <th className="th">Adet</th>
                <th className="th">Durum</th>
                <th className="th">Tarih</th>
              </tr>
            </thead>
            <tbody>
              {sonSiparisler.map(s => (
                <tr key={s.id} className="hover:bg-gray-800/50">
                  <td className="td text-blue-400 font-mono text-xs">{s.siparis_no}</td>
                  <td className="td">{s.musteri_adi}</td>
                  <td className="td text-gray-300">{s.urun_stok_kodu}</td>
                  <td className="td">{s.adet}</td>
                  <td className="td">{durumBadge(s.durum)}</td>
                  <td className="td text-gray-500 text-xs">{new Date(s.created_at).toLocaleDateString('tr-TR')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
