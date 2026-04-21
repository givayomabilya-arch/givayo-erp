import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useRouter } from 'next/router'

export default function UretimPlaniSayfa({ profil }) {
  const router = useRouter()
  const [siparisler, setSiparisler] = useState([])
  const [planlar, setPlanlar] = useState([])
  const [loading, setLoading] = useState(true)
  const [kayit, setKayit] = useState(false)
  const [basari, setBasari] = useState('')
  const [planForm, setPlanForm] = useState({})
  const [aktifUrun, setAktifUrun] = useState(null)

  useEffect(() => {
    if (profil?.rol !== 'siparis' && profil?.rol !== 'yonetici') { router.push('/'); return }
    yukle()
  }, [profil])

  async function yukle() {
    setLoading(true)
    const [{ data: s }, { data: p }] = await Promise.all([
      supabase.from('siparisler').select('*').neq('durum', 'tamamlandi').order('urun_stok_kodu'),
      supabase.from('uretim_plani').select('*').order('uretim_tarihi')
    ])
    setSiparisler(s || [])
    setPlanlar(p || [])
    setLoading(false)
  }

  function gruplar() {
    const g = {}
    for (const s of siparisler) {
      if (!g[s.urun_stok_kodu]) g[s.urun_stok_kodu] = { stok: s.urun_stok_kodu, toplamAdet: 0, planlanan: 0 }
      g[s.urun_stok_kodu].toplamAdet += s.adet || 0
    }
    for (const p of planlar) {
      if (g[p.urun_stok_kodu]) g[p.urun_stok_kodu].planlanan += p.planlanan_adet
    }
    return Object.values(g).sort((a,b) => b.toplamAdet - a.toplamAdet)
  }

  function urunPlanSatirlari(stok) {
    return planForm[stok] || [{ tarih: '', adet: '', oncelikli: false }]
  }

  function satirGuncelle(stok, idx, field, value) {
    const satirlar = [...urunPlanSatirlari(stok)]
    satirlar[idx] = { ...satirlar[idx], [field]: value }
    setPlanForm(p => ({ ...p, [stok]: satirlar }))
  }

  function satirEkle(stok) {
    setPlanForm(p => ({ ...p, [stok]: [...urunPlanSatirlari(stok), { tarih: '', adet: '' }] }))
  }

  function satirSil(stok, idx) {
    const satirlar = urunPlanSatirlari(stok).filter((_, i) => i !== idx)
    setPlanForm(p => ({ ...p, [stok]: satirlar.length ? satirlar : [{ tarih: '', adet: '' }] }))
  }

  async function planKaydet(stok) {
    const satirlar = urunPlanSatirlari(stok).filter(s => s.tarih && parseInt(s.adet) > 0)
    if (!satirlar.length) return alert('Tarih ve adet girin')
    setKayit(true)
    await supabase.from('uretim_plani').delete().eq('urun_stok_kodu', stok).eq('durum', 'planli')
    await supabase.from('uretim_plani').insert(
      satirlar.map(s => ({
        urun_stok_kodu: stok,
        uretim_tarihi: s.tarih,
        planlanan_adet: parseInt(s.adet),
        oncelikli: s.oncelikli || false,
        durum: 'planli'
      }))
    )
    setKayit(false)
    setAktifUrun(null)
    setBasari(`${stok} planı kaydedildi`)
    setTimeout(() => setBasari(''), 3000)
    yukle()
  }

  function planDuzenle(stok) {
    const mevcutPlanlar = planlar.filter(p => p.urun_stok_kodu === stok)
    if (mevcutPlanlar.length) {
      setPlanForm(p => ({ ...p, [stok]: mevcutPlanlar.map(p => ({ tarih: p.uretim_tarihi, adet: p.planlanan_adet, oncelikli: p.oncelikli || false })) }))
    }
    setAktifUrun(stok)
  }

  const liste = gruplar()
  const toplamAdet = liste.reduce((t, g) => t + g.toplamAdet, 0)
  const toplamPlanlanan = liste.reduce((t, g) => t + g.planlanan, 0)

  return (
    <div className="p-6">
      <div className="mb-5">
        <h1 className="text-xl font-semibold">Üretim Planla <span className="text-xs bg-yellow-600 text-yellow-100 px-2 py-0.5 rounded-full ml-2">TEST</span></h1>
        <p className="text-gray-500 text-sm mt-0.5">
          Toplam <span className="text-blue-400 font-medium">{toplamAdet} adet</span> sipariş · 
          <span className="text-green-400 font-medium"> {toplamPlanlanan} adet</span> planlandı · 
          <span className="text-orange-400 font-medium"> {toplamAdet - toplamPlanlanan} adet</span> planlanmadı
        </p>
      </div>

      {basari && <div className="mb-4 text-green-400 text-sm bg-green-950 rounded-lg px-3 py-2">✓ {basari}</div>}

      {loading ? (
        <div className="text-center py-12 text-gray-600">Yükleniyor…</div>
      ) : liste.length === 0 ? (
        <div className="text-center py-12 text-gray-600">Aktif sipariş yok</div>
      ) : (
        <div className="space-y-3">
          {liste.map(g => {
            const kalan = g.toplamAdet - g.planlanan
            const urunPlanlar = planlar.filter(p => p.urun_stok_kodu === g.stok)
            return (
              <div key={g.stok} className="card">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="font-medium text-gray-200">{g.stok}</div>
                    <div className="text-xs text-gray-500 mt-0.5 flex gap-3">
                      <span>Toplam: <span className="text-blue-400">{g.toplamAdet}</span></span>
                      {g.planlanan > 0 && <span>Planlandı: <span className="text-green-400">{g.planlanan}</span></span>}
                      {kalan > 0 && <span>Kalan: <span className="text-orange-400">{kalan}</span></span>}
                    </div>
                  </div>
                  <button
                    className="btn btn-sm text-xs"
                    onClick={() => aktifUrun === g.stok ? setAktifUrun(null) : planDuzenle(g.stok)}
                  >
                    {aktifUrun === g.stok ? 'Kapat' : (g.planlanan > 0 ? '✏️ Düzenle' : '+ Plan Ekle')}
                  </button>
                </div>

                {urunPlanlar.length > 0 && aktifUrun !== g.stok && (
                  <div className="flex flex-wrap gap-2 mt-1">
                    {urunPlanlar.map((p, i) => (
                      <span key={i} className="text-xs bg-gray-800 text-gray-300 rounded px-2 py-1">
                        📅 {new Date(p.uretim_tarihi).toLocaleDateString('tr-TR')} — <span className="text-blue-400 font-medium">{p.planlanan_adet} adet</span>
                      </span>
                    ))}
                  </div>
                )}

                {aktifUrun === g.stok && (
                  <div className="border-t border-gray-800 pt-3 mt-2">
                    <div className="text-xs text-gray-500 mb-2">Hangi gün kaç adet üretilsin?</div>
                    {urunPlanSatirlari(g.stok).map((s, idx) => (
                      <div key={idx} className="flex gap-2 mb-2 items-center">
                        <input type="date" className="input w-44" value={s.tarih} onChange={e => satirGuncelle(g.stok, idx, 'tarih', e.target.value)} />
                        <input type="number" className="input w-24" placeholder="Adet" value={s.adet} onChange={e => satirGuncelle(g.stok, idx, 'adet', e.target.value)} />
                        <label className="flex items-center gap-1 cursor-pointer">
                          <input type="checkbox" className="accent-orange-500" checked={s.oncelikli || false} onChange={e => satirGuncelle(g.stok, idx, 'oncelikli', e.target.checked)} />
                          <span className="text-xs text-orange-400">Öncelikli</span>
                        </label>
                        {urunPlanSatirlari(g.stok).length > 1 && (
                          <button className="text-red-400 text-xs hover:text-red-300" onClick={() => satirSil(g.stok, idx)}>✕</button>
                        )}
                      </div>
                    ))}
                    <div className="flex gap-2 mt-3">
                      <button className="btn btn-sm text-xs" onClick={() => satirEkle(g.stok)}>+ Gün Ekle</button>
                      <button className="btn-primary btn-sm" onClick={() => planKaydet(g.stok)} disabled={kayit}>
                        {kayit ? 'Kaydediliyor…' : 'Planı Kaydet'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
