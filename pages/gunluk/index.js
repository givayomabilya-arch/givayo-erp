import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useRouter } from 'next/router'

const ISTASYONLAR = {
  ebatlama: ['Ebatlama 1', 'Ebatlama 2', 'Ebatlama 3'],
  bantlama: ['Bantlama 1', 'Bantlama 2'],
  delik: ['Delik 1', 'Delik 2'],
  aksesuar: ['Aksesuar 1', 'Aksesuar 2'],
  kartoncu: ['Kartoncu 1', 'Kartoncu 2'],
  paketci: ['Paketçi 1', 'Paketçi 2', 'Paketçi 3'],
}

const PARCA_GRUPLARI = ['Tüm parçalar', 'Parçalar 1–3', 'Parçalar 4–6', 'Parçalar 7–8', 'Parçalar 1–4', 'Parçalar 5–8']

function IsEmriKart({ ie }) {
  const [tamamlananlar, setTamamlananlar] = useState([])
  const [yuklendi, setYuklendi] = useState(false)

  useEffect(() => {
    async function yukle() {
      const { data } = await supabase.from('is_tamamlama').select('istasyon,tip').eq('is_emri_id', ie.id)
      setTamamlananlar(data || [])
      setYuklendi(true)
    }
    yukle()
  }, [ie.id])

  // Tüm atanmış istasyonları listele
  const istasyonlar = []
  const atamalar = ie.atamalar || {}
  
  for (const [tip, deger] of Object.entries(atamalar)) {
    if (tip === 'aksesuar' || tip === 'kartoncu') {
      if (deger) istasyonlar.push({ istasyon: deger, tip })
    } else if (Array.isArray(deger)) {
      for (const s of deger) {
        if (s.istasyon) istasyonlar.push({ istasyon: s.istasyon, tip })
      }
    }
  }

  function durum(ist, tip) {
    const tamam = tamamlananlar.some(t => t.istasyon === ist && t.tip === tip)
    if (ie.durum === 'tamamlandi') return 'mavi'
    return tamam ? 'yesil' : 'kirmizi'
  }

  const renkler = {
    kirmizi: 'bg-red-500',
    yesil: 'bg-green-500',
    mavi: 'bg-blue-500',
  }

  return (
    <div className="card">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-medium text-blue-300 font-mono">{ie.is_emri_no}</span>
        <span className={`badge ${ie.durum === 'tamamlandi' ? 'badge-green' : 'badge-orange'}`}>
          {ie.durum === 'tamamlandi' ? 'Tamamlandı' : 'Aktif'}
        </span>
      </div>
      <div className="text-xs text-gray-500 mb-2">
        {ie.urun_listesi?.map(u => `${u.stok_kodu} ×${u.adet}`).join(' · ')}
      </div>
      {yuklendi && (
        <div className="flex flex-wrap gap-1.5">
          {istasyonlar.map((ist, i) => (
            <div key={i} className="flex items-center gap-1 bg-gray-800 rounded-full px-2 py-0.5">
              <span className={`w-2 h-2 rounded-full shrink-0 ${renkler[durum(ist.istasyon, ist.tip)]}`}></span>
              <span className="text-xs text-gray-300">{ist.istasyon}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function GunlukPlan({ profil }) {
  const router = useRouter()
  const [planlar, setPlanlar] = useState([])
  const [isEmirleri, setIsEmirleri] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [seciliGun, setSeciliGun] = useState(null)
  const [kayit, setKayit] = useState(false)
  const [atamalar, setAtamalar] = useState({
    ebatlama: [{ parcalar: 'Tüm parçalar', istasyon: 'Ebatlama 1' }],
    bantlama: [{ parcalar: 'Tüm parçalar', istasyon: 'Bantlama 1' }],
    delik: [{ parcalar: 'Tüm parçalar', istasyon: 'Delik 1' }],
    aksesuar: 'Aksesuar 1',
    kartoncu: 'Kartoncu 1',
    paketci: [{ adet: '', istasyon: 'Paketçi 1' }],
  })

  useEffect(() => {
    if (profil?.rol !== 'foremen' && profil?.rol !== 'yonetici') { router.push('/'); return }
    yukle()
  }, [profil])

  async function yukle() {
    setLoading(true)
    const [{ data: p }, { data: ie }] = await Promise.all([
      supabase.from('uretim_plani').select('*').gte('uretim_tarihi', new Date().toISOString().split('T')[0]).order('uretim_tarihi'),
      supabase.from('is_emirleri').select('*').order('created_at', { ascending: false }).limit(20)
    ])
    setPlanlar(p || [])
    setIsEmirleri(ie || [])
    setLoading(false)
  }

  function gunler() {
    const g = {}
    for (const p of planlar) {
      if (!g[p.uretim_tarihi]) g[p.uretim_tarihi] = []
      g[p.uretim_tarihi].push(p)
    }
    return Object.entries(g).sort(([a], [b]) => a.localeCompare(b))
  }

  function satirEkle(tip) {
    if (tip === 'paketci') {
      setAtamalar(p => ({ ...p, paketci: [...p.paketci, { adet: '', istasyon: 'Paketçi 1' }] }))
    } else {
      setAtamalar(p => ({ ...p, [tip]: [...p[tip], { parcalar: 'Tüm parçalar', istasyon: ISTASYONLAR[tip][0] }] }))
    }
  }

  function satirSil(tip, idx) {
    setAtamalar(p => ({ ...p, [tip]: p[tip].filter((_, i) => i !== idx) }))
  }

  function satirGuncelle(tip, idx, field, value) {
    setAtamalar(p => ({ ...p, [tip]: p[tip].map((s, i) => i === idx ? { ...s, [field]: value } : s) }))
  }

  async function isEmriOlustur() {
    if (!seciliGun) return
    setKayit(true)

    const urunListesi = seciliGun.urunler.map(u => ({ stok_kodu: u.urun_stok_kodu, adet: u.planlanan_adet }))
    const toplamAdet = seciliGun.urunler.reduce((t, u) => t + u.planlanan_adet, 0)
    const no = 'İE-' + new Date().getFullYear() + '-' + String(isEmirleri.length + 1).padStart(3, '0')

    // Bekleyen siparişleri bul
    const stokKodlari = seciliGun.urunler.map(u => u.urun_stok_kodu)
    const { data: siparisler } = await supabase
      .from('siparisler')
      .select('id')
      .eq('durum', 'beklemede')
      .in('urun_stok_kodu', stokKodlari)

    const siparsIds = (siparisler || []).map(s => s.id)

    const { error } = await supabase.from('is_emirleri').insert({
      is_emri_no: no,
      siparis_idler: siparsIds,
      urun_listesi: urunListesi,
      toplam_adet: toplamAdet,
      atamalar: atamalar,
      durum: 'aktif',
    })

    if (!error && siparsIds.length > 0) {
      await supabase.from('siparisler').update({ durum: 'uretimde' }).in('id', siparsIds)
    }

    // Planı tamamlandı olarak işaretle
    const planIds = seciliGun.urunler.map(u => u.id)
    await supabase.from('uretim_plani').update({ durum: 'is_emri_olusturuldu' }).in('id', planIds)

    setKayit(false)
    if (error) return alert('Hata: ' + error.message)
    setModal(false)
    setSeciliGun(null)
    yukle()
  }

  const bugun = new Date().toISOString().split('T')[0]

  const durumBadge = (d) => {
    const map = { aktif: 'badge-orange', tamamlandi: 'badge-green' }
    const label = { aktif: 'Aktif', tamamlandi: 'Tamamlandı' }
    return <span className={`badge ${map[d] || 'badge-gray'}`}>{label[d] || d}</span>
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-5">
        <div>
          <h1 className="text-xl font-semibold">Günlük Üretim Planı</h1>
          <p className="text-gray-500 text-sm mt-0.5">Sipariş yükleyici tarafından oluşturulan plan</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Günlük Plan */}
        <div className="space-y-3">
          <div className="text-sm font-medium text-gray-400 uppercase tracking-wide">Planlanan Günler</div>
          {loading ? (
            <div className="text-center py-8 text-gray-600">Yükleniyor…</div>
          ) : gunler().length === 0 ? (
            <div className="card text-center py-8 text-gray-600">
              <div className="text-3xl mb-2">📅</div>
              <div>Henüz plan oluşturulmamış</div>
            </div>
          ) : (
            gunler().map(([tarih, urunler]) => {
              const toplamAdet = urunler.reduce((t, u) => t + u.planlanan_adet, 0)
              const bugunMu = tarih === bugun
              const hepsiOlusturuldu = urunler.every(u => u.durum === 'is_emri_olusturuldu')
              return (
                <div key={tarih} className={`card ${bugunMu ? 'border-blue-700' : ''} ${hepsiOlusturuldu ? 'opacity-60' : ''}`}>
                  <div className="flex justify-between items-center mb-2">
                    <div>
                      <div className="font-medium text-gray-200 flex items-center gap-2">
                        {new Date(tarih + 'T12:00:00').toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' })}
                        {bugunMu && <span className="badge badge-blue text-xs">Bugün</span>}
                        {hepsiOlusturuldu && <span className="badge badge-green text-xs">✓ İş Emri Oluşturuldu</span>}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">Toplam: <span className="text-blue-400 font-medium">{toplamAdet} adet</span></div>
                    </div>
                    {!hepsiOlusturuldu && (
                      <button
                        className="btn-primary btn-sm text-xs"
                        onClick={() => { setSeciliGun({ tarih, urunler }); setModal(true) }}
                      >
                        İş Emri Oluştur
                      </button>
                    )}
                  </div>
                  <table className="w-full">
                    <tbody>
                      {[...urunler].sort((a,b) => (b.oncelikli ? 1 : 0) - (a.oncelikli ? 1 : 0)).map((u, i) => (
                        <tr key={i} className="border-t border-gray-800">
                          <td className="py-1.5 text-sm">
                            <div className="flex items-center gap-2">
                              {u.oncelikli && <span className="text-orange-400 text-xs font-bold">⚡ ÖNCELİKLİ</span>}
                              <span className={u.oncelikli ? 'text-orange-300 font-medium' : 'text-gray-200'}>{u.urun_stok_kodu}</span>
                            </div>
                          </td>
                          <td className="py-1.5 text-right">
                            <span className={`badge ${u.oncelikli ? 'badge-orange' : 'badge-blue'}`}>{u.planlanan_adet} adet</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            })
          )}
        </div>

        {/* Son İş Emirleri */}
        <div>
          <div className="text-sm font-medium text-gray-400 uppercase tracking-wide mb-3">İş Emirleri Durumu</div>
          <div className="space-y-3">
            {isEmirleri.slice(0, 10).map(ie => (
              <IsEmriKart key={ie.id} ie={ie} />
            ))}
          </div>
        </div>
      </div>

      {/* İş Emri Oluştur Modal */}
      {modal && seciliGun && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-2xl my-4">
            <div className="flex justify-between items-center p-4 border-b border-gray-800">
              <h2 className="font-medium">
                İş Emri Oluştur — {new Date(seciliGun.tarih + 'T12:00:00').toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
              </h2>
              <button className="btn btn-sm" onClick={() => setModal(false)}>✕</button>
            </div>
            <div className="p-4 space-y-4">
              {/* Ürünler */}
              <div>
                <div className="text-xs text-gray-400 uppercase tracking-wide mb-2">Üretilecek Ürünler</div>
                <div className="bg-gray-800 rounded-lg p-3">
                  {seciliGun.urunler.map((u, i) => (
                    <div key={i} className="flex justify-between items-center py-1 border-b border-gray-700 last:border-0">
                      <span className="text-sm font-medium">{u.urun_stok_kodu}</span>
                      <span className="badge badge-blue">{u.planlanan_adet} adet</span>
                    </div>
                  ))}
                  <div className="pt-2 text-right text-sm font-medium text-blue-400">
                    Toplam: {seciliGun.urunler.reduce((t, u) => t + u.planlanan_adet, 0)} adet
                  </div>
                </div>
              </div>

              {/* Ebatlama */}
              <AtamaBlok baslik="Ebatlama" satirlar={atamalar.ebatlama} istasyonlar={ISTASYONLAR.ebatlama} onEkle={() => satirEkle('ebatlama')} onSil={(i) => satirSil('ebatlama', i)} onGuncelle={(i, f, v) => satirGuncelle('ebatlama', i, f, v)} />
              <AtamaBlok baslik="Bantlama" satirlar={atamalar.bantlama} istasyonlar={ISTASYONLAR.bantlama} onEkle={() => satirEkle('bantlama')} onSil={(i) => satirSil('bantlama', i)} onGuncelle={(i, f, v) => satirGuncelle('bantlama', i, f, v)} />
              <AtamaBlok baslik="Delik İşleme" satirlar={atamalar.delik} istasyonlar={ISTASYONLAR.delik} onEkle={() => satirEkle('delik')} onSil={(i) => satirSil('delik', i)} onGuncelle={(i, f, v) => satirGuncelle('delik', i, f, v)} />

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-xs text-gray-400 uppercase tracking-wide mb-2">Aksesuar</div>
                  <select className="input" value={atamalar.aksesuar} onChange={e => setAtamalar(p => ({ ...p, aksesuar: e.target.value }))}>
                    {ISTASYONLAR.aksesuar.map(i => <option key={i}>{i}</option>)}
                  </select>
                </div>
                <div>
                  <div className="text-xs text-gray-400 uppercase tracking-wide mb-2">Kartoncu</div>
                  <select className="input" value={atamalar.kartoncu} onChange={e => setAtamalar(p => ({ ...p, kartoncu: e.target.value }))}>
                    {ISTASYONLAR.kartoncu.map(i => <option key={i}>{i}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <div className="text-xs text-gray-400 uppercase tracking-wide">Paketleme</div>
                  <button className="btn btn-sm text-xs" onClick={() => satirEkle('paketci')}>+ Satır</button>
                </div>
                {atamalar.paketci.map((s, i) => (
                  <div key={i} className="flex gap-2 mb-2">
                    <input type="number" className="input w-24" placeholder="Adet" value={s.adet} onChange={e => satirGuncelle('paketci', i, 'adet', e.target.value)} />
                    <select className="input" value={s.istasyon} onChange={e => satirGuncelle('paketci', i, 'istasyon', e.target.value)}>
                      {ISTASYONLAR.paketci.map(ist => <option key={ist}>{ist}</option>)}
                    </select>
                    {atamalar.paketci.length > 1 && (
                      <button className="btn btn-sm btn-danger" onClick={() => satirSil('paketci', i)}>✕</button>
                    )}
                  </div>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2 p-4 border-t border-gray-800">
              <button className="btn" onClick={() => setModal(false)}>İptal</button>
              <button className="btn-primary" onClick={isEmriOlustur} disabled={kayit}>
                {kayit ? 'Oluşturuluyor…' : 'İş Emrini Oluştur'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const MAX_PARCA = 12

function ParcaSecici({ secili, onChange }) {
  const tumSecili = secili.length === MAX_PARCA

  function toggleTum() {
    if (tumSecili) onChange([])
    else onChange(Array.from({ length: MAX_PARCA }, (_, i) => i + 1))
  }

  function toggleParca(n) {
    if (secili.includes(n)) onChange(secili.filter(x => x !== n))
    else onChange([...secili, n].sort((a, b) => a - b))
  }

  return (
    <div className="bg-gray-800 rounded-lg p-2">
      <label className="flex items-center gap-2 cursor-pointer mb-2 pb-2 border-b border-gray-700">
        <input type="checkbox" className="accent-blue-500" checked={tumSecili} onChange={toggleTum} />
        <span className="text-sm font-medium text-gray-200">Tüm Parçalar</span>
      </label>
      <div className="grid grid-cols-6 gap-1">
        {Array.from({ length: MAX_PARCA }, (_, i) => i + 1).map(n => (
          <label key={n} className="flex items-center gap-1 cursor-pointer">
            <input type="checkbox" className="accent-blue-500" checked={secili.includes(n)} onChange={() => toggleParca(n)} />
            <span className="text-xs text-gray-300">{n}</span>
          </label>
        ))}
      </div>
      {secili.length > 0 && !tumSecili && (
        <div className="text-xs text-blue-400 mt-1">Seçili: {secili.join(', ')}</div>
      )}
    </div>
  )
}

function AtamaBlok({ baslik, satirlar, istasyonlar, onEkle, onSil, onGuncelle }) {
  return (
    <div>
      <div className="flex justify-between items-center mb-2">
        <div className="text-xs text-gray-400 uppercase tracking-wide">{baslik}</div>
        <button className="btn btn-sm text-xs" onClick={onEkle}>+ Satır Ekle</button>
      </div>
      {satirlar.map((s, i) => (
        <div key={i} className="mb-3 bg-gray-800/50 rounded-lg p-2">
          <div className="flex gap-2 mb-2 items-center">
            <select className="input flex-1" value={s.istasyon} onChange={e => onGuncelle(i, 'istasyon', e.target.value)}>
              {istasyonlar.map(ist => <option key={ist}>{ist}</option>)}
            </select>
            {satirlar.length > 1 && (
              <button className="btn btn-sm text-red-400 shrink-0" onClick={() => onSil(i)}>✕</button>
            )}
          </div>
          <ParcaSecici
            secili={s.parcalar === 'Tüm parçalar' || !s.parcalar
              ? Array.from({ length: MAX_PARCA }, (_, j) => j + 1)
              : (Array.isArray(s.parcalar) ? s.parcalar : [])
            }
            onChange={v => onGuncelle(i, 'parcalar', v.length === MAX_PARCA ? 'Tüm parçalar' : v)}
          />
        </div>
      ))}
    </div>
  )
}
