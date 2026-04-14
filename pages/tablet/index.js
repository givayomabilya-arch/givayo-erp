import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

const ISTASYON_LISTESI = [
  { value: '', label: '— İstasyon Seçin —' },
  { value: 'Ebatlama 1', label: 'Ebatlama Tezgahı 1' },
  { value: 'Ebatlama 2', label: 'Ebatlama Tezgahı 2' },
  { value: 'Ebatlama 3', label: 'Ebatlama Tezgahı 3' },
  { value: 'Bantlama 1', label: 'Bantlama Tezgahı 1' },
  { value: 'Bantlama 2', label: 'Bantlama Tezgahı 2' },
  { value: 'Delik 1', label: 'Delik Tezgahı 1' },
  { value: 'Delik 2', label: 'Delik Tezgahı 2' },
  { value: 'Aksesuar 1', label: 'Aksesuar Personeli 1' },
  { value: 'Aksesuar 2', label: 'Aksesuar Personeli 2' },
  { value: 'Kartoncu 1', label: 'Kartoncu 1' },
  { value: 'Kartoncu 2', label: 'Kartoncu 2' },
  { value: 'Paketçi 1', label: 'Paketçi 1' },
  { value: 'Paketçi 2', label: 'Paketçi 2' },
  { value: 'Paketçi 3', label: 'Paketçi 3' },
]

export default function Tablet() {
  const [istasyon, setIstasyon] = useState('')
  const [isler, setIsler] = useState([])
  const [loading, setLoading] = useState(false)
  const [tamamlananlar, setTamamlananlar] = useState({}) // is_id -> parcalar[]
  const [belge, setBelge] = useState(null)
  const [belgeModal, setBelgeModal] = useState(null)

  async function yukle(ist) {
    if (!ist) { setIsler([]); return }
    setLoading(true)
    const { data: emirler } = await supabase
      .from('is_emirleri')
      .select('*')
      .eq('durum', 'aktif')
      .order('created_at')

    const gorevler = []
    for (const ie of (emirler || [])) {
      const atamalar = ie.atamalar || {}
      for (const [tip, satirlarVeyaDeger] of Object.entries(atamalar)) {
        if (tip === 'aksesuar' || tip === 'kartoncu') {
          if (satirlarVeyaDeger === ist) {
            gorevler.push({ ie_id: ie.id, ie_no: ie.is_emri_no, tip, parcalar: 'Tüm ürünler', urunler: ie.urun_listesi })
          }
        } else if (Array.isArray(satirlarVeyaDeger)) {
          for (const s of satirlarVeyaDeger) {
            if (s.istasyon === ist) {
              gorevler.push({ ie_id: ie.id, ie_no: ie.is_emri_no, tip, parcalar: s.parcalar || s.adet, urunler: ie.urun_listesi })
            }
          }
        }
      }
    }

    // Tamamlananları yükle
    const { data: tam } = await supabase.from('is_tamamlama').select('*').in('is_emri_id', (emirler || []).map(e => e.id)).eq('istasyon', ist)
    const tamMap = {}
    for (const t of (tam || [])) tamMap[`${t.is_emri_id}-${t.tip}`] = true

    setIsler(gorevler)
    setTamamlananlar(tamMap)
    setLoading(false)
  }

  async function tamamla(gorev) {
    const key = `${gorev.ie_id}-${gorev.tip}`
    const yeniDurum = !tamamlananlar[key]
    setTamamlananlar(p => ({ ...p, [key]: yeniDurum }))
    if (yeniDurum) {
      await supabase.from('is_tamamlama').upsert({
        is_emri_id: gorev.ie_id,
        istasyon: istasyon,
        tip: gorev.tip,
        tamamlandi_at: new Date().toISOString(),
      }, { onConflict: 'is_emri_id,istasyon,tip' })
    } else {
      await supabase.from('is_tamamlama').delete().eq('is_emri_id', gorev.ie_id).eq('istasyon', istasyon).eq('tip', gorev.tip)
    }
  }

  async function belgeBak(stok_kodu, tip) {
    const { data } = await supabase.from('urunler').select('kesim_listesi_url,delik_projesi_url,urun_adi').eq('stok_kodu', stok_kodu).single()
    if (!data) return alert('Bu ürün için dosya bulunamadı')
    
    if (tip === 'kesim') {
      if (!data.kesim_listesi_url) return alert('Bu ürün için kesim listesi yüklenmemiş')
      window.open(data.kesim_listesi_url, '_blank')
    } else {
      // Delik projesi - JSON array formatı veya eski tek URL
      let parcalar = []
      try {
        if (Array.isArray(data.delik_projesi_url)) {
          parcalar = data.delik_projesi_url
        } else if (typeof data.delik_projesi_url === 'string' && data.delik_projesi_url.startsWith('[')) {
          parcalar = JSON.parse(data.delik_projesi_url)
        } else if (data.delik_projesi_url) {
          window.open(data.delik_projesi_url, '_blank')
          return
        }
      } catch(e) {}
      
      const yukluParcalar = parcalar.filter(p => p.url)
      if (yukluParcalar.length === 0) return alert('Bu ürün için delik projesi yüklenmemiş')
      if (yukluParcalar.length === 1) {
        window.open(yukluParcalar[0].url, '_blank')
      } else {
        // Birden fazla parça varsa seçim modal aç
        setBelgeModal({ stok_kodu, parcalar: yukluParcalar })
      }
    }
  }

  const tipLabel = { ebatlama: 'Ebatlama', bantlama: 'Bantlama', delik: 'Delik İşleme', aksesuar: 'Aksesuar', kartoncu: 'Kartoncu', paketci: 'Paketleme' }
  const bekleyen = isler.filter(g => !tamamlananlar[`${g.ie_id}-${g.tip}`]).length

  return (
    <div className="p-4 max-w-lg mx-auto">
      {/* Giriş */}
      <div className="card mb-4">
        <label className="label">İstasyon</label>
        <select
          className="input"
          value={istasyon}
          onChange={e => { setIstasyon(e.target.value); yukle(e.target.value) }}
        >
          {ISTASYON_LISTESI.map(i => <option key={i.value} value={i.value}>{i.label}</option>)}
        </select>
      </div>

      {!istasyon ? (
        <div className="text-center py-12 text-gray-600">
          <div className="text-5xl mb-3">📱</div>
          <div>İstasyonunuzu seçin</div>
        </div>
      ) : loading ? (
        <div className="text-center py-8 text-gray-600">Yükleniyor…</div>
      ) : isler.length === 0 ? (
        <div className="text-center py-12 text-gray-600">
          <div className="text-4xl mb-3">✅</div>
          <div>Bu istasyona atanmış iş yok</div>
        </div>
      ) : (
        <>
          {/* Header */}
          <div className="flex justify-between items-center mb-3">
            <div className="text-sm font-medium">{ISTASYON_LISTESI.find(i => i.value === istasyon)?.label}</div>
            <span className={`badge ${bekleyen === 0 ? 'badge-green' : 'badge-orange'}`}>
              {bekleyen === 0 ? '✓ Tümü Tamamlandı' : `${bekleyen} iş bekliyor`}
            </span>
          </div>

          {/* İş Listesi */}
          <div className="space-y-2">
            {isler.map((g, idx) => {
              const key = `${g.ie_id}-${g.tip}`
              const tam = !!tamamlananlar[key]
              return (
                <div key={idx} className={`card transition-all ${tam ? 'opacity-60' : ''}`}>
                  <div className="flex gap-3">
                    {/* Checkbox */}
                    <button
                      className={`shrink-0 w-8 h-8 rounded-lg border-2 flex items-center justify-center transition-all mt-0.5 ${
                        tam ? 'bg-green-700 border-green-600 text-white' : 'border-gray-600 bg-gray-800 hover:border-green-500'
                      }`}
                      onClick={() => tamamla(g)}
                    >
                      {tam && '✓'}
                    </button>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="badge badge-gray text-xs">{tipLabel[g.tip]}</span>
                        <span className="text-xs text-gray-500 font-mono">{g.ie_no}</span>
                      </div>
                      <div className={`text-sm font-medium mb-1 ${tam ? 'line-through text-gray-500' : 'text-gray-200'}`}>
                        {g.parcalar !== 'Tüm ürünler' ? g.parcalar : ''}
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {g.urunler?.map((u, i) => (
                          <span key={i} className="text-xs bg-gray-800 text-gray-400 rounded px-1.5 py-0.5">
                            {u.stok_kodu} ×{u.adet}
                          </span>
                        ))}
                      </div>

                      {/* Belge Butonları */}
                      <div className="flex gap-2 mt-2 flex-wrap">
                        {(g.tip === 'ebatlama' || g.tip === 'bantlama') && g.urunler?.map((u, i) => (
                          <button key={i} className="btn btn-sm text-xs" onClick={() => belgeBak(u.stok_kodu, 'kesim')}>
                            📄 {u.stok_kodu} Kesim
                          </button>
                        ))}
                        {g.tip === 'delik' && g.urunler?.map((u, i) => (
                          <button key={i} className="btn btn-sm text-xs" onClick={() => belgeBak(u.stok_kodu, 'delik')}>
                            🔩 {u.stok_kodu} Delik
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Güncelle butonu */}
          <div className="mt-4 text-center">
            <button className="btn text-sm" onClick={() => yukle(istasyon)}>🔄 Listeyi Yenile</button>
          </div>
        </>
      )}
    </div>
  )
}
