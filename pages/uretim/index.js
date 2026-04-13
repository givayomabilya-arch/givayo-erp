import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

const ISTASYONLAR = {
  ebatlama: ['Ebatlama 1', 'Ebatlama 2', 'Ebatlama 3'],
  bantlama: ['Bantlama 1', 'Bantlama 2'],
  delik: ['Delik 1', 'Delik 2'],
  aksesuar: ['Aksesuar 1', 'Aksesuar 2'],
  kartoncu: ['Kartoncu 1', 'Kartoncu 2'],
  paketci: ['Paketçi 1', 'Paketçi 2', 'Paketçi 3'],
}

const PARCA_GRUPLARI = ['Tüm parçalar', 'Parçalar 1–3', 'Parçalar 4–6', 'Parçalar 7–8', 'Parçalar 1–4', 'Parçalar 5–8']

export default function Uretim() {
  const [bekleyenler, setBekleyenler] = useState([])
  const [isEmirleri, setIsEmirleri] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [seciliUrunler, setSeciliUrunler] = useState([]) // stok_kodu listesi
  const [atamalar, setAtamalar] = useState({
    ebatlama: [{ parcalar: 'Tüm parçalar', istasyon: 'Ebatlama 1' }],
    bantlama: [{ parcalar: 'Tüm parçalar', istasyon: 'Bantlama 1' }],
    delik: [{ parcalar: 'Tüm parçalar', istasyon: 'Delik 1' }],
    aksesuar: 'Aksesuar 1',
    kartoncu: 'Kartoncu 1',
    paketci: [{ adet: '', istasyon: 'Paketçi 1' }],
  })
  const [kayit, setKayit] = useState(false)

  useEffect(() => { yukle() }, [])

  async function yukle() {
    setLoading(true)
    const [{ data: b }, { data: ie }] = await Promise.all([
      supabase.from('siparisler').select('id,siparis_no,musteri_adi,urun_stok_kodu,adet,durum,platform').eq('durum', 'beklemede').order('urun_stok_kodu'),
      supabase.from('is_emirleri').select('*').order('created_at', { ascending: false }).limit(20),
    ])
    setBekleyenler(b || [])
    setIsEmirleri(ie || [])
    setLoading(false)
  }

  // Siparişleri ürüne göre grupla
  function gruplar() {
    const g = {}
    for (const s of bekleyenler) {
      if (!g[s.urun_stok_kodu]) g[s.urun_stok_kodu] = { stok: s.urun_stok_kodu, adet: 0, ids: [], sayi: 0 }
      g[s.urun_stok_kodu].adet += s.adet
      g[s.urun_stok_kodu].ids.push(s.id)
      g[s.urun_stok_kodu].sayi++
    }
    return Object.values(g).sort((a, b) => b.adet - a.adet)
  }

  function toggleUrun(stok) {
    setSeciliUrunler(prev =>
      prev.includes(stok) ? prev.filter(x => x !== stok) : [...prev, stok]
    )
  }

  function tumunuSec() {
    const hepsi = gruplar().map(g => g.stok)
    setSeciliUrunler(prev => prev.length === hepsi.length ? [] : hepsi)
  }

  function satirEkle(tip) {
    if (tip === 'paketci') {
      setAtamalar(p => ({ ...p, paketci: [...p.paketci, { adet: '', istasyon: 'Paketçi 1' }] }))
    } else {
      setAtamalar(p => ({
        ...p, [tip]: [...p[tip], { parcalar: 'Tüm parçalar', istasyon: ISTASYONLAR[tip][0] }]
      }))
    }
  }

  function satirSil(tip, idx) {
    setAtamalar(p => ({ ...p, [tip]: p[tip].filter((_, i) => i !== idx) }))
  }

  function satirGuncelle(tip, idx, field, value) {
    setAtamalar(p => ({
      ...p, [tip]: p[tip].map((s, i) => i === idx ? { ...s, [field]: value } : s)
    }))
  }

  async function isEmriOlustur() {
    if (!seciliUrunler.length) return alert('En az bir ürün seçin')
    setKayit(true)

    const secilenGruplar = gruplar().filter(g => seciliUrunler.includes(g.stok))
    const tumIds = secilenGruplar.flatMap(g => g.ids)
    const toplamAdet = secilenGruplar.reduce((s, g) => s + g.adet, 0)
    const no = 'İE-' + new Date().getFullYear() + '-' + String(isEmirleri.length + 1).padStart(3, '0')

    const { error } = await supabase.from('is_emirleri').insert({
      is_emri_no: no,
      siparis_idler: tumIds,
      urun_listesi: secilenGruplar.map(g => ({ stok_kodu: g.stok, adet: g.adet })),
      toplam_adet: toplamAdet,
      atamalar: atamalar,
      durum: 'aktif',
    })

    if (!error) {
      await supabase.from('siparisler').update({ durum: 'uretimde' }).in('id', tumIds)
    }

    setKayit(false)
    if (error) return alert('Hata: ' + error.message)
    setModal(false)
    setSeciliUrunler([])
    yukle()
  }

  const durumBadge = (d) => {
    const map = { aktif: 'badge-orange', tamamlandi: 'badge-green', iptal: 'badge-red' }
    const label = { aktif: 'Aktif', tamamlandi: 'Tamamlandı', iptal: 'İptal' }
    return <span className={`badge ${map[d] || 'badge-gray'}`}>{label[d] || d}</span>
  }

  const liste = gruplar()
  const seciliAdet = liste.filter(g => seciliUrunler.includes(g.stok)).reduce((s, g) => s + g.adet, 0)

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-5">
        <div>
          <h1 className="text-xl font-semibold">Üretim Planı</h1>
          <p className="text-gray-500 text-sm mt-0.5">Foremen iş emri yönetimi</p>
        </div>
        <button className="btn-primary" onClick={() => setModal(true)}>+ İş Emri Oluştur</button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Bekleyen Siparişler - Ürüne Göre Gruplu */}
        <div className="card">
          <div className="flex justify-between items-center mb-3">
            <div className="text-sm font-medium text-gray-300">
              Bekleyen Siparişler
              <span className="ml-2 badge badge-blue">{bekleyenler.length} sipariş</span>
              <span className="ml-1 badge badge-gray">{liste.length} ürün çeşidi</span>
            </div>
            {liste.length > 0 && (
              <button className="btn btn-sm text-xs" onClick={tumunuSec}>
                {seciliUrunler.length === liste.length ? 'Seçimi Kaldır' : 'Tümünü Seç'}
              </button>
            )}
          </div>
          {loading ? (
            <div className="text-center py-6 text-gray-600">Yükleniyor…</div>
          ) : liste.length === 0 ? (
            <div className="text-center py-6 text-gray-600">Bekleyen sipariş yok</div>
          ) : (
            <table className="w-full">
              <thead>
                <tr>
                  <th className="th w-8"></th>
                  <th className="th">Ürün (Stok Kodu)</th>
                  <th className="th text-center">Sipariş</th>
                  <th className="th text-center">Toplam Adet</th>
                </tr>
              </thead>
              <tbody>
                {liste.map(g => (
                  <tr
                    key={g.stok}
                    className={`hover:bg-gray-800/40 cursor-pointer ${seciliUrunler.includes(g.stok) ? 'bg-blue-950/30' : ''}`}
                    onClick={() => toggleUrun(g.stok)}
                  >
                    <td className="td">
                      <input
                        type="checkbox"
                        checked={seciliUrunler.includes(g.stok)}
                        onChange={() => toggleUrun(g.stok)}
                        className="accent-blue-500"
                      />
                    </td>
                    <td className="td font-medium text-sm">{g.stok}</td>
                    <td className="td text-center">
                      <span className="text-xs text-gray-500">{g.sayi} müşteri</span>
                    </td>
                    <td className="td text-center">
                      <span className="badge badge-blue text-sm font-bold">{g.adet}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {seciliUrunler.length > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-800 flex justify-between items-center">
              <span className="text-sm text-gray-400">
                {seciliUrunler.length} çeşit · toplam <span className="text-blue-400 font-semibold">{seciliAdet} adet</span>
              </span>
              <button className="btn-primary btn-sm" onClick={() => setModal(true)}>
                İş Emri Oluştur →
              </button>
            </div>
          )}
        </div>

        {/* Aktif İş Emirleri */}
        <div className="card">
          <div className="text-sm font-medium text-gray-300 mb-3">
            İş Emirleri
            <span className="ml-2 badge badge-orange">{isEmirleri.filter(x => x.durum === 'aktif').length} aktif</span>
          </div>
          {isEmirleri.length === 0 ? (
            <div className="text-center py-6 text-gray-600">Henüz iş emri yok</div>
          ) : (
            <div className="space-y-2">
              {isEmirleri.map(ie => (
                <div key={ie.id} className="bg-gray-800 rounded-lg p-3">
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-sm font-medium text-blue-300 font-mono">{ie.is_emri_no}</span>
                    {durumBadge(ie.durum)}
                  </div>
                  <div className="text-xs text-gray-400 mb-1">
                    {ie.urun_listesi?.map(u => `${u.stok_kodu} ×${u.adet}`).join(' · ')}
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-gray-600">{new Date(ie.created_at).toLocaleString('tr-TR')}</span>
                    <span className="text-xs text-gray-500">Toplam: {ie.toplam_adet} adet</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* İş Emri Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-2xl my-4">
            <div className="flex justify-between items-center p-4 border-b border-gray-800">
              <h2 className="font-medium">İş Emri Oluştur</h2>
              <button className="btn btn-sm" onClick={() => setModal(false)}>✕</button>
            </div>
            <div className="p-4 space-y-4">
              {/* Seçili Ürünler */}
              <div>
                <div className="text-xs text-gray-400 uppercase tracking-wide mb-2">Seçili Ürünler</div>
                {seciliUrunler.length === 0 ? (
                  <div className="text-sm text-gray-500 bg-gray-800 rounded-lg p-3">
                    Sol panelden ürün seçin
                  </div>
                ) : (
                  <div className="bg-gray-800 rounded-lg p-3">
                    {gruplar().filter(g => seciliUrunler.includes(g.stok)).map(g => (
                      <div key={g.stok} className="flex justify-between items-center py-1 border-b border-gray-700 last:border-0">
                        <span className="text-sm font-medium text-gray-200">{g.stok}</span>
                        <span className="badge badge-blue">{g.adet} adet · {g.sayi} sipariş</span>
                      </div>
                    ))}
                    <div className="pt-2 mt-1 text-right text-sm font-medium text-blue-400">
                      Toplam: {seciliAdet} adet
                    </div>
                  </div>
                )}
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
              <button className="btn-primary" onClick={isEmriOlustur} disabled={kayit || !seciliUrunler.length}>
                {kayit ? 'Oluşturuluyor…' : `İş Emrini Oluştur (${seciliAdet} adet)`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function AtamaBlok({ baslik, satirlar, istasyonlar, onEkle, onSil, onGuncelle }) {
  return (
    <div>
      <div className="flex justify-between items-center mb-2">
        <div className="text-xs text-gray-400 uppercase tracking-wide">{baslik}</div>
        <button className="btn btn-sm text-xs" onClick={onEkle}>+ Satır</button>
      </div>
      {satirlar.map((s, i) => (
        <div key={i} className="flex gap-2 mb-2">
          <select className="input" value={s.parcalar} onChange={e => onGuncelle(i, 'parcalar', e.target.value)}>
            {PARCA_GRUPLARI.map(p => <option key={p}>{p}</option>)}
          </select>
          <select className="input" value={s.istasyon} onChange={e => onGuncelle(i, 'istasyon', e.target.value)}>
            {istasyonlar.map(ist => <option key={ist}>{ist}</option>)}
          </select>
          {satirlar.length > 1 && (
            <button className="btn btn-sm btn-danger shrink-0" onClick={() => onSil(i)}>✕</button>
          )}
        </div>
      ))}
    </div>
  )
}
