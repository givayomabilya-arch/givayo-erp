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

const ASAMA_SIRASI = [
  { tip: 'ebatlama', label: 'Kesim', icon: '✂️' },
  { tip: 'bantlama', label: 'Bant', icon: '📏' },
  { tip: 'delik', label: 'Delik', icon: '🔩' },
  { tip: 'aksesuar', label: 'Aksesuar', icon: '🔧' },
  { tip: 'kartoncu', label: 'Karton', icon: '📦' },
  { tip: 'paketci', label: 'Paket', icon: '🎁' },
]

function AsamaBar({ tamamlananTipler, aktifTip }) {
  return (
    <div className="flex items-center gap-1 mb-3 overflow-x-auto pb-1">
      {ASAMA_SIRASI.map((asama, idx) => {
        const tamam = tamamlananTipler.has(asama.tip)
        const aktif = asama.tip === aktifTip
        return (
          <div key={asama.tip} className="flex items-center">
            <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs whitespace-nowrap ${
              tamam ? 'bg-green-900 text-green-300' :
              aktif ? 'bg-blue-900 text-blue-300 ring-1 ring-blue-500' :
              'bg-gray-800 text-gray-500'
            }`}>
              <span>{asama.icon}</span>
              <span>{asama.label}</span>
              {tamam && <span>✓</span>}
            </div>
            {idx < ASAMA_SIRASI.length - 1 && (
              <span className={`text-xs mx-0.5 ${tamam ? 'text-green-700' : 'text-gray-700'}`}>→</span>
            )}
          </div>
        )
      })}
    </div>
  )
}

export default function Tablet({ profil }) {
  const [istasyon, setIstasyon] = useState('')
  const [isler, setIsler] = useState([]) // {ie_id, ie_no, tip, urunler, parcalar}
  const [tamamlananlar, setTamamlananlar] = useState({}) // "ie_id-tip" -> true
  const [loading, setLoading] = useState(false)
  const [belgeModal, setBelgeModal] = useState(null)
  const [gunBitti, setGunBitti] = useState(false)

  useEffect(() => {
    if (profil?.rol === 'eleman' && profil?.istasyon) {
      setIstasyon(profil.istasyon)
      yukle(profil.istasyon)
    }
  }, [profil])

  async function yukle(ist) {
    if (!ist) { setIsler([]); return }
    setLoading(true)

    const { data: emirler } = await supabase
      .from('is_emirleri')
      .select('*')
      .eq('durum', 'aktif')
      .order('uretim_tarihi', { ascending: true })

    const gorevler = []
    for (const ie of (emirler || [])) {
      const atamalar = ie.atamalar || {}
      for (const [tip, deger] of Object.entries(atamalar)) {
        if (tip === 'aksesuar' || tip === 'kartoncu') {
          if (deger === ist) {
            gorevler.push({ ie_id: ie.id, ie_no: ie.is_emri_no, tip, urunler: ie.urun_listesi })
          }
        } else if (Array.isArray(deger)) {
          for (const s of deger) {
            if (s.istasyon === ist) {
              gorevler.push({ ie_id: ie.id, ie_no: ie.is_emri_no, tip, parcalar: s.parcalar, urunler: ie.urun_listesi, uretim_tarihi: ie.uretim_tarihi })
            }
          }
        }
      }
    }

    const { data: tam } = await supabase
      .from('is_tamamlama')
      .select('*')
      .in('is_emri_id', (emirler || []).map(e => e.id))
      .eq('istasyon', ist)

    // Tüm tamamlananları çek (aşama göstermek için)
    const { data: tumTam } = await supabase
      .from('is_tamamlama')
      .select('is_emri_id,tip')
      .in('is_emri_id', (emirler || []).map(e => e.id))

    const tamMap = {}
    for (const t of (tam || [])) tamMap[`${t.is_emri_id}-${t.tip}`] = true

    // Her iş emri için tamamlanan tipler
    const tiplerMap = {}
    for (const t of (tumTam || [])) {
      if (!tiplerMap[t.is_emri_id]) tiplerMap[t.is_emri_id] = new Set()
      tiplerMap[t.is_emri_id].add(t.tip)
    }

    setIsler(gorevler.map(g => ({ ...g, tamamlananTipler: tiplerMap[g.ie_id] || new Set() })))
    setTamamlananlar(tamMap)
    setLoading(false)
  }

  async function urunTamamla(ie_id, tip) {
    const key = `${ie_id}-${tip}`
    const yeni = !tamamlananlar[key]
    setTamamlananlar(p => ({ ...p, [key]: yeni }))

    if (yeni) {
      await supabase.from('is_tamamlama').upsert({
        is_emri_id: ie_id,
        istasyon: istasyon,
        tip,
        tamamlandi_at: new Date().toISOString(),
      }, { onConflict: 'is_emri_id,istasyon,tip' })
    } else {
      await supabase.from('is_tamamlama').delete()
        .eq('is_emri_id', ie_id).eq('istasyon', istasyon).eq('tip', tip)
    }
  }

  async function gunuBitir() {
    if (!confirm('Bugünkü tüm işleri tamamladığınızı onaylıyor musunuz?')) return
    setGunBitti(true)
    // Tamamlanmamış kalanları da tamamla
    for (const g of isler) {
      const key = `${g.ie_id}-${g.tip}`
      if (!tamamlananlar[key]) {
        await supabase.from('is_tamamlama').upsert({
          is_emri_id: g.ie_id,
          istasyon: istasyon,
          tip: g.tip,
          tamamlandi_at: new Date().toISOString(),
        }, { onConflict: 'is_emri_id,istasyon,tip' })
      }
    }
    yukle(istasyon)
  }

  async function belgeBak(stok_kodu, tip) {
    const { data } = await supabase.from('urunler').select('kesim_listesi_url,delik_projesi_url,urun_adi').eq('stok_kodu', stok_kodu).single()
    if (!data) return alert('Bu ürün için dosya bulunamadı')
    if (tip === 'kesim') {
      if (!data.kesim_listesi_url) return alert('Bu ürün için kesim listesi yüklenmemiş')
      window.open(data.kesim_listesi_url, '_blank')
    } else {
      let parcalar = []
      const raw = data.delik_projesi_url
      if (!raw) return alert('Bu ürün için delik projesi yüklenmemiş')
      if (Array.isArray(raw)) parcalar = raw
      else if (typeof raw === 'object') parcalar = Object.values(raw)
      else if (typeof raw === 'string') { try { parcalar = JSON.parse(raw) } catch(e) { window.open(raw, '_blank'); return } }
      const yuklu = parcalar.filter(p => p && p.url)
      if (yuklu.length === 0) return alert('Bu ürün için delik projesi yüklenmemiş')
      if (yuklu.length === 1) window.open(yuklu[0].url, '_blank')
      else setBelgeModal({ stok_kodu, parcalar: yuklu })
    }
  }

  const tipLabel = { ebatlama: 'Ebatlama', bantlama: 'Bantlama', delik: 'Delik', aksesuar: 'Aksesuar', kartoncu: 'Kartoncu', paketci: 'Paketleme' }
  const bekleyenler = isler.filter(g => !tamamlananlar[`${g.ie_id}-${g.tip}`])
  const hepsiBitti = isler.length > 0 && bekleyenler.length === 0

  return (
    <div className="p-4 max-w-lg mx-auto">
      {/* İstasyon seçimi */}
      {profil?.rol !== 'eleman' && (
        <div className="card mb-4">
          <label className="label">İstasyon</label>
          <select className="input" value={istasyon} onChange={e => { setIstasyon(e.target.value); yukle(e.target.value) }}>
            {ISTASYON_LISTESI.map(i => <option key={i.value} value={i.value}>{i.label}</option>)}
          </select>
        </div>
      )}

      {profil?.rol === 'eleman' && istasyon && (
        <div className="card mb-4 flex justify-between items-center">
          <div>
            <div className="text-xs text-gray-500 mb-0.5">İstasyonunuz</div>
            <div className="font-medium text-blue-400">{istasyon}</div>
          </div>
          {hepsiBitti && !gunBitti && (
            <button className="btn-primary text-sm" onClick={gunuBitir}>✅ Günü Bitir</button>
          )}
        </div>
      )}

      {!istasyon ? (
        <div className="text-center py-12 text-gray-600"><div className="text-5xl mb-3">📱</div><div>İstasyonunuzu seçin</div></div>
      ) : loading ? (
        <div className="text-center py-8 text-gray-600">Yükleniyor…</div>
      ) : gunBitti ? (
        <div className="text-center py-12">
          <div className="text-5xl mb-3">🎉</div>
          <div className="text-green-400 font-medium text-lg">Günü tamamladınız!</div>
          <div className="text-gray-500 text-sm mt-1">Harika iş!</div>
        </div>
      ) : isler.length === 0 ? (
        <div className="text-center py-12 text-gray-600"><div className="text-4xl mb-3">✅</div><div>Bu istasyona atanmış iş yok</div></div>
      ) : (
        <div className="space-y-3">
          {/* Özet */}
          <div className="flex justify-between items-center px-1">
            <span className="text-sm text-gray-400">{isler.length} görev</span>
            <span className={`badge ${hepsiBitti ? 'badge-green' : 'badge-orange'}`}>
              {hepsiBitti ? '✓ Tümü Tamamlandı' : `${bekleyenler.length} bekliyor`}
            </span>
          </div>

          {/* İş emirleri gruplu - bekleyenler üstte */}
          {[...isler].sort((a, b) => {
            const aTam = !!tamamlananlar[`${a.ie_id}-${a.tip}`]
            const bTam = !!tamamlananlar[`${b.ie_id}-${b.tip}`]
            if (aTam !== bTam) return aTam ? 1 : -1
            return 0
          }).map((g, idx) => {
            const key = `${g.ie_id}-${g.tip}`
            const tam = !!tamamlananlar[key]
            return (
              <div key={idx} className={`card transition-all ${tam ? 'opacity-50 border-green-900' : ''}`}>
                {/* Başlık */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="badge badge-gray text-xs">{tipLabel[g.tip]}</span>
                    <span className="text-xs text-gray-500 font-mono">{g.ie_no}</span>
                    {g.uretim_tarihi && (
                      <span className="text-xs bg-blue-950 text-blue-300 px-2 py-0.5 rounded-full">
                        📅 {new Date(g.uretim_tarihi + 'T12:00:00').toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })}
                      </span>
                    )}
                    {g.parcalar && g.parcalar !== 'Tüm parçalar' && (
                      <span className="text-xs text-blue-400">Parça: {Array.isArray(g.parcalar) ? g.parcalar.join(', ') : g.parcalar}</span>
                    )}
                  </div>
                  {/* Büyük tik butonu */}
                  <button
                    className={`w-10 h-10 rounded-xl border-2 flex items-center justify-center text-xl transition-all ${
                      tam ? 'bg-green-700 border-green-600 text-white' : 'border-gray-600 bg-gray-800 hover:border-green-500'
                    }`}
                    onClick={() => urunTamamla(g.ie_id, g.tip)}
                  >
                    {tam ? '✓' : ''}
                  </button>
                </div>

                {/* Üretim aşaması */}
                <AsamaBar ie_id={g.ie_id} tamamlananTipler={g.tamamlananTipler || new Set()} aktifTip={g.tip} />

                {/* Ürün listesi */}
                <div className="space-y-1">
                  {g.urunler?.map((u, i) => (
                    <div key={i} className="flex items-center justify-between bg-gray-800 rounded-lg px-3 py-2">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-medium ${tam ? 'line-through text-gray-500' : 'text-gray-200'}`}>{u.stok_kodu}</span>
                        <span className="badge badge-blue text-xs">×{u.adet}</span>
                      </div>
                      <div className="flex gap-1">
                        {(g.tip === 'ebatlama' || g.tip === 'bantlama') && (
                          <button className="btn btn-sm text-xs" onClick={() => belgeBak(u.stok_kodu, 'kesim')}>📄</button>
                        )}
                        {g.tip === 'delik' && (
                          <button className="btn btn-sm text-xs" onClick={() => belgeBak(u.stok_kodu, 'delik')}>🔩</button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}

          {/* Günü Bitir butonu */}
          {hepsiBitti && !gunBitti && (
            <button className="btn-primary w-full py-3 text-base mt-2" onClick={gunuBitir}>
              ✅ Günü Bitir
            </button>
          )}

          <div className="text-center mt-2">
            <button className="btn text-sm" onClick={() => yukle(istasyon)}>🔄 Yenile</button>
          </div>
        </div>
      )}

      {/* Delik parça modal */}
      {belgeModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-sm">
            <div className="flex justify-between items-center p-4 border-b border-gray-800">
              <div>
                <h2 className="font-medium text-sm">Delik Projesi Seç</h2>
                <p className="text-xs text-gray-500 mt-0.5">{belgeModal.stok_kodu}</p>
              </div>
              <button className="btn btn-sm" onClick={() => setBelgeModal(null)}>✕</button>
            </div>
            <div className="p-4 space-y-2">
              {belgeModal.parcalar.map((p, i) => (
                <button key={i} className="w-full bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg p-3 text-left flex items-center gap-3 transition-colors" onClick={() => { window.open(p.url, '_blank'); setBelgeModal(null) }}>
                  <span className="text-lg">🔩</span>
                  <span className="font-medium text-sm">{p.ad || 'Parça ' + (i + 1)}</span>
                  <span className="ml-auto text-xs text-blue-400">Aç →</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
