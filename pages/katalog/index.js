import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

const KATEGORILER = [
  'TV Sehpa & Ünitesi', 'Dresuar', 'Dolap ve Gardırop', 'Çalışma Masası',
  'Ofis Masası', 'Kitaplık', 'Komodin', 'Konsol', 'Çok Amaçlı Dolap',
  'Makyaj Masası & Tuvalet Masası', 'Orta Sehpa', 'Mutfak Adası',
  'Mutfak Rafı', 'Duvar Rafı', 'Banyo Dolabı Seti', 'Servis Seti',
  'Oyuncu Masası', 'Ofis Dolapları', 'Diğer'
]

const bosForm = {
  stok_kodu: '', model_kodu: '', urun_adi: '', renk: '',
  kategori: 'TV Sehpa & Ünitesi', barkod: '', fiyat: '', aciklama: ''
}

export default function Katalog() {
  const [urunler, setUrunler] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)
  const [secili, setSecili] = useState(null)
  const [form, setForm] = useState(bosForm)
  const [arama, setArama] = useState('')
  const [katFiltre, setKatFiltre] = useState('')
  const [kayit, setKayit] = useState(false)
  const [sayfa, setSayfa] = useState(1)
  const [yukleniyor, setYukleniyor] = useState({})
  const [yeniParcaAdi, setYeniParcaAdi] = useState('')
  const SAYFA = 30

  useEffect(() => { yukle() }, [])

  async function yukle() {
    setLoading(true)
    const { data } = await supabase.from('urunler').select('*').order('stok_kodu')
    setUrunler(data || [])
    setLoading(false)
  }

  function filtreli() {
    return urunler.filter(u => {
      if (arama) {
        const q = arama.toUpperCase()
        if (!u.stok_kodu?.toUpperCase().includes(q) &&
            !u.urun_adi?.toUpperCase().includes(q) &&
            !u.renk?.toUpperCase().includes(q) &&
            !u.model_kodu?.toUpperCase().includes(q)) return false
      }
      if (katFiltre && u.kategori !== katFiltre) return false
      return true
    })
  }

  async function kaydet() {
    if (!form.stok_kodu || !form.urun_adi) return alert('Stok kodu ve ürün adı zorunlu')
    setKayit(true)
    const payload = {
      stok_kodu: form.stok_kodu.trim().toUpperCase(),
      model_kodu: form.model_kodu?.trim() || null,
      urun_adi: form.urun_adi?.trim(),
      renk: form.renk?.trim() || null,
      kategori: form.kategori,
      barkod: form.barkod?.trim() || null,
      fiyat: parseFloat(form.fiyat) || 0,
      aciklama: form.aciklama?.trim() || null,
    }
    let error
    if (modal === 'yeni') {
      ({ error } = await supabase.from('urunler').insert(payload))
    } else {
      ({ error } = await supabase.from('urunler').update(payload).eq('id', secili.id))
    }
    setKayit(false)
    if (error) return alert('Hata: ' + error.message)
    setModal(null); setForm(bosForm); setSecili(null)
    yukle()
  }

  async function sil(id) {
    if (!confirm('Bu ürünü katalogdan kaldır?')) return
    await supabase.from('urunler').delete().eq('id', id)
    setUrunler(prev => prev.filter(u => u.id !== id))
    setModal(null)
  }

  function duzenle(u) {
    setSecili(u)
    setForm({
      stok_kodu: u.stok_kodu || '',
      model_kodu: u.model_kodu || '',
      urun_adi: u.urun_adi || '',
      renk: u.renk || '',
      kategori: u.kategori || 'TV Sehpa & Ünitesi',
      barkod: u.barkod || '',
      fiyat: u.fiyat || '',
      aciklama: u.aciklama || '',
    })
    setModal('duzenle')
  }

  // Kesim listesi yükleme (tek dosya)
  async function kesimYukle(e) {
    const file = e.target.files[0]
    if (!file || !secili) return
    setYukleniyor(p => ({ ...p, kesim: true }))
    const dosyaAdi = `${secili.stok_kodu.replace(/[^a-zA-Z0-9]/g, '_')}_kesim.${file.name.split('.').pop()}`
    const { error } = await supabase.storage.from('uretim-dosyalari').upload(dosyaAdi, file, { upsert: true })
    if (error) { setYukleniyor(p => ({ ...p, kesim: false })); return alert('Hata: ' + error.message) }
    const { data: urlData } = supabase.storage.from('uretim-dosyalari').getPublicUrl(dosyaAdi)
    await supabase.from('urunler').update({ kesim_listesi_url: urlData.publicUrl }).eq('id', secili.id)
    setSecili(prev => ({ ...prev, kesim_listesi_url: urlData.publicUrl }))
    setUrunler(prev => prev.map(u => u.id === secili.id ? { ...u, kesim_listesi_url: urlData.publicUrl } : u))
    setYukleniyor(p => ({ ...p, kesim: false }))
    e.target.value = ''
  }

  async function kesimSil() {
    if (!confirm('Kesim listesini kaldır?')) return
    await supabase.from('urunler').update({ kesim_listesi_url: null }).eq('id', secili.id)
    setSecili(prev => ({ ...prev, kesim_listesi_url: null }))
    setUrunler(prev => prev.map(u => u.id === secili.id ? { ...u, kesim_listesi_url: null } : u))
  }

  // Delik projeleri - jsonb array: [{ad, url}]
  function delikProjeler() {
    if (!secili) return []
    try {
      if (Array.isArray(secili.delik_projesi_url)) return secili.delik_projesi_url
      if (typeof secili.delik_projesi_url === 'string' && secili.delik_projesi_url.startsWith('[')) return JSON.parse(secili.delik_projesi_url)
      if (secili.delik_projesi_url && typeof secili.delik_projesi_url === 'object') return secili.delik_projesi_url
      if (secili.delik_projesi_url) return [{ ad: 'Delik Projesi', url: secili.delik_projesi_url }]
    } catch (e) {}
    return []
  }

  async function delikParcaEkle() {
    const ad = yeniParcaAdi.trim() || `Parça ${delikProjeler().length + 1}`
    const yeniListe = [...delikProjeler(), { ad, url: null }]
    await supabase.from('urunler').update({ delik_projesi_url: yeniListe }).eq('id', secili.id)
    setSecili(prev => ({ ...prev, delik_projesi_url: yeniListe }))
    setYeniParcaAdi('')
  }

  async function delikDosyaYukle(e, idx) {
    const file = e.target.files[0]
    if (!file || !secili) return
    setYukleniyor(p => ({ ...p, [`delik_${idx}`]: true }))
    const parca = delikProjeler()[idx]
    const dosyaAdi = `${secili.stok_kodu.replace(/[^a-zA-Z0-9]/g, '_')}_delik_${idx + 1}.${file.name.split('.').pop()}`
    const { error } = await supabase.storage.from('uretim-dosyalari').upload(dosyaAdi, file, { upsert: true })
    if (error) { setYukleniyor(p => ({ ...p, [`delik_${idx}`]: false })); return alert('Hata: ' + error.message) }
    const { data: urlData } = supabase.storage.from('uretim-dosyalari').getPublicUrl(dosyaAdi)
    const yeniListe = delikProjeler().map((p, i) => i === idx ? { ...p, url: urlData.publicUrl } : p)
    await supabase.from('urunler').update({ delik_projesi_url: yeniListe }).eq('id', secili.id)
    setSecili(prev => ({ ...prev, delik_projesi_url: yeniListe }))
    setUrunler(prev => prev.map(u => u.id === secili.id ? { ...u, delik_projesi_url: yeniListe } : u))
    setYukleniyor(p => ({ ...p, [`delik_${idx}`]: false }))
    e.target.value = ''
  }

  async function delikParcaSil(idx) {
    if (!confirm('Bu parçayı kaldır?')) return
    const yeniListe = delikProjeler().filter((_, i) => i !== idx)
    await supabase.from('urunler').update({ delik_projesi_url: yeniListe }).eq('id', secili.id)
    setSecili(prev => ({ ...prev, delik_projesi_url: yeniListe }))
    setUrunler(prev => prev.map(u => u.id === secili.id ? { ...u, delik_projesi_url: yeniListe } : u))
  }

  const liste = filtreli()
  const toplamSayfa = Math.ceil(liste.length / SAYFA)
  const sayfalanan = liste.slice((sayfa - 1) * SAYFA, sayfa * SAYFA)

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-5">
        <div>
          <h1 className="text-xl font-semibold">Ürün Kataloğu</h1>
          <p className="text-gray-500 text-sm mt-0.5">{urunler.length} ürün</p>
        </div>
        <button className="btn-primary" onClick={() => { setForm(bosForm); setSecili(null); setModal('yeni') }}>
          + Yeni Ürün Ekle
        </button>
      </div>

      <div className="flex gap-3 mb-4 flex-wrap">
        <input className="input w-64" placeholder="Stok kodu, ürün adı, renk ara…" value={arama} onChange={e => { setArama(e.target.value); setSayfa(1) }} />
        <select className="input w-52" value={katFiltre} onChange={e => { setKatFiltre(e.target.value); setSayfa(1) }}>
          <option value="">Tüm Kategoriler</option>
          {KATEGORILER.map(k => <option key={k}>{k}</option>)}
        </select>
        <span className="text-xs text-gray-500 self-center">{liste.length} sonuç</span>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-600">Yükleniyor…</div>
      ) : sayfalanan.length === 0 ? (
        <div className="text-center py-12 text-gray-600"><div className="text-4xl mb-3">🗂️</div><div>Ürün bulunamadı</div></div>
      ) : (
        <div className="grid grid-cols-3 gap-3 xl:grid-cols-4">
          {sayfalanan.map(u => {
            const dp = (() => { try { if (Array.isArray(u.delik_projesi_url)) return u.delik_projesi_url; if (typeof u.delik_projesi_url === 'string' && u.delik_projesi_url.startsWith('[')) return JSON.parse(u.delik_projesi_url); if (u.delik_projesi_url) return [{}]; } catch(e){} return [] })()
            const dosyaVar = u.kesim_listesi_url || dp.length > 0
            return (
              <div key={u.id} className="card hover:border-gray-600 cursor-pointer transition-colors" onClick={() => { setSecili(u); setModal('detay') }}>
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs text-gray-500 font-mono">{u.stok_kodu}</span>
                  {dosyaVar ? (
                    <span className="text-xs bg-green-900 text-green-300 px-1.5 py-0.5 rounded">📄 {dp.filter(p=>p.url).length > 0 ? dp.filter(p=>p.url).length + ' delik' : ''}</span>
                  ) : (
                    <span className="text-xs bg-gray-800 text-gray-500 px-1.5 py-0.5 rounded">—</span>
                  )}
                </div>
                <div className="text-sm font-medium text-gray-200 mb-1 leading-tight">{u.urun_adi}</div>
                <div className="text-xs text-gray-500 mb-3">{u.renk} · {u.kategori}</div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-blue-400">
                    {u.fiyat > 0 ? `₺${u.fiyat.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}` : '—'}
                  </span>
                  <span className="text-xs text-gray-600">{u.barkod}</span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {toplamSayfa > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <button className="btn btn-sm" onClick={() => setSayfa(p => Math.max(1, p - 1))} disabled={sayfa === 1}>‹</button>
          {Array.from({ length: Math.min(toplamSayfa, 7) }, (_, i) => {
            const p = sayfa <= 4 ? i + 1 : i + sayfa - 3
            if (p > toplamSayfa) return null
            return <button key={p} className={`btn btn-sm ${p === sayfa ? 'btn-primary' : ''}`} onClick={() => setSayfa(p)}>{p}</button>
          })}
          <button className="btn btn-sm" onClick={() => setSayfa(p => Math.min(toplamSayfa, p + 1))} disabled={sayfa === toplamSayfa}>›</button>
          <span className="text-xs text-gray-500">{sayfa}/{toplamSayfa}</span>
        </div>
      )}

      {/* Detay Modal */}
      {modal === 'detay' && secili && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-4 border-b border-gray-800">
              <h2 className="font-medium">{secili.stok_kodu}</h2>
              <button className="btn btn-sm" onClick={() => setModal(null)}>✕</button>
            </div>
            <div className="p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><div className="text-xs text-gray-500 mb-1">ÜRÜN ADI</div><div className="font-medium">{secili.urun_adi}</div></div>
                <div><div className="text-xs text-gray-500 mb-1">KATEGORİ</div><div>{secili.kategori}</div></div>
                <div><div className="text-xs text-gray-500 mb-1">RENK</div><div>{secili.renk || '—'}</div></div>
                <div><div className="text-xs text-gray-500 mb-1">BARKOD</div><div className="font-mono text-xs">{secili.barkod || '—'}</div></div>
                <div><div className="text-xs text-gray-500 mb-1">FİYAT</div><div className="text-blue-400 font-medium">₺{(secili.fiyat || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</div></div>
                <div><div className="text-xs text-gray-500 mb-1">MODEL</div><div>{secili.model_kodu || '—'}</div></div>
              </div>

              {/* KESİM LİSTESİ */}
              <div className="border-t border-gray-800 pt-3">
                <div className="text-xs text-gray-500 uppercase tracking-wide mb-2">📄 Kesim Listesi</div>
                <div className="bg-gray-800 rounded-lg p-3">
                  {secili.kesim_listesi_url ? (
                    <div className="flex gap-2">
                      <a href={secili.kesim_listesi_url} target="_blank" rel="noreferrer" className="btn btn-sm btn-success flex-1 text-center text-xs">📥 İndir / Görüntüle</a>
                      <button className="btn btn-sm btn-danger text-xs" onClick={kesimSil}>Kaldır</button>
                    </div>
                  ) : (
                    <label className="flex items-center justify-center gap-2 border border-dashed border-gray-600 rounded-lg p-2 cursor-pointer hover:border-blue-500 hover:bg-blue-950/20 transition-colors">
                      {yukleniyor.kesim ? <span className="text-xs text-gray-400">Yükleniyor…</span> : (
                        <><span className="text-xs text-gray-400">📤 Kesim listesi yükle (.xlsx, .pdf)</span><input type="file" accept=".xlsx,.xls,.pdf" className="hidden" onChange={kesimYukle} /></>
                      )}
                    </label>
                  )}
                </div>
              </div>

              {/* DELİK PROJELERİ */}
              <div className="border-t border-gray-800 pt-3">
                <div className="flex justify-between items-center mb-2">
                  <div className="text-xs text-gray-500 uppercase tracking-wide">🔩 Delik Projeleri</div>
                  <span className="text-xs text-gray-500">{delikProjeler().length} parça</span>
                </div>

                {/* Mevcut parçalar */}
                <div className="space-y-2 mb-3">
                  {delikProjeler().map((parca, idx) => (
                    <div key={idx} className="bg-gray-800 rounded-lg p-3">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-gray-200">{parca.ad || `Parça ${idx + 1}`}</span>
                        <button className="text-xs text-red-400 hover:text-red-300" onClick={() => delikParcaSil(idx)}>× Kaldır</button>
                      </div>
                      {parca.url ? (
                        <div className="flex gap-2">
                          <a href={parca.url} target="_blank" rel="noreferrer" className="btn btn-sm btn-success flex-1 text-center text-xs">📥 İndir / Görüntüle</a>
                          <label className="btn btn-sm text-xs cursor-pointer">
                            🔄 Değiştir
                            <input type="file" accept=".pdf" className="hidden" onChange={e => delikDosyaYukle(e, idx)} />
                          </label>
                        </div>
                      ) : (
                        <label className="flex items-center justify-center gap-2 border border-dashed border-gray-600 rounded-lg p-2 cursor-pointer hover:border-blue-500 hover:bg-blue-950/20 transition-colors">
                          {yukleniyor[`delik_${idx}`] ? <span className="text-xs text-gray-400">Yükleniyor…</span> : (
                            <><span className="text-xs text-gray-400">📤 PDF yükle</span><input type="file" accept=".pdf" className="hidden" onChange={e => delikDosyaYukle(e, idx)} /></>
                          )}
                        </label>
                      )}
                    </div>
                  ))}
                </div>

                {/* Yeni parça ekle */}
                <div className="flex gap-2">
                  <input
                    className="input flex-1 text-sm"
                    placeholder="Parça adı (örn: Yan Panel)"
                    value={yeniParcaAdi}
                    onChange={e => setYeniParcaAdi(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && delikParcaEkle()}
                  />
                  <button className="btn btn-sm btn-primary" onClick={delikParcaEkle}>+ Parça Ekle</button>
                </div>
              </div>
            </div>
            <div className="flex justify-between p-4 border-t border-gray-800">
              <button className="btn-danger btn-sm" onClick={() => sil(secili.id)}>Sil</button>
              <div className="flex gap-2">
                <button className="btn" onClick={() => setModal(null)}>Kapat</button>
                <button className="btn-primary" onClick={() => duzenle(secili)}>Düzenle</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Yeni / Düzenle Modal */}
      {(modal === 'yeni' || modal === 'duzenle') && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-lg max-h-screen overflow-y-auto">
            <div className="flex justify-between items-center p-4 border-b border-gray-800">
              <h2 className="font-medium">{modal === 'yeni' ? 'Yeni Ürün Ekle' : 'Ürünü Düzenle'}</h2>
              <button className="btn btn-sm" onClick={() => setModal(null)}>✕</button>
            </div>
            <div className="p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Stok Kodu *</label><input className="input" value={form.stok_kodu} onChange={e => setForm(p => ({ ...p, stok_kodu: e.target.value }))} placeholder="MİLAN ANTRASİT" /></div>
                <div><label className="label">Model Kodu</label><input className="input" value={form.model_kodu} onChange={e => setForm(p => ({ ...p, model_kodu: e.target.value }))} placeholder="MİLAN" /></div>
              </div>
              <div><label className="label">Ürün Adı *</label><input className="input" value={form.urun_adi} onChange={e => setForm(p => ({ ...p, urun_adi: e.target.value }))} placeholder="MİLAN TV ÜNİTESİ" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Renk</label><input className="input" value={form.renk} onChange={e => setForm(p => ({ ...p, renk: e.target.value }))} placeholder="ANTRASİT" /></div>
                <div><label className="label">Kategori</label>
                  <select className="input" value={form.kategori} onChange={e => setForm(p => ({ ...p, kategori: e.target.value }))}>
                    {KATEGORILER.map(k => <option key={k}>{k}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Barkod</label><input className="input" value={form.barkod} onChange={e => setForm(p => ({ ...p, barkod: e.target.value }))} placeholder="757222XXXXXX" /></div>
                <div><label className="label">Satış Fiyatı (₺)</label><input type="number" className="input" value={form.fiyat} onChange={e => setForm(p => ({ ...p, fiyat: e.target.value }))} placeholder="0.00" /></div>
              </div>
              <div><label className="label">Not</label><textarea className="input" rows={2} value={form.aciklama} onChange={e => setForm(p => ({ ...p, aciklama: e.target.value }))} placeholder="Ürün notu…" /></div>
            </div>
            <div className="flex justify-end gap-2 p-4 border-t border-gray-800">
              <button className="btn" onClick={() => setModal(null)}>İptal</button>
              <button className="btn-primary" onClick={kaydet} disabled={kayit}>{kayit ? 'Kaydediliyor…' : (modal === 'yeni' ? 'Ekle' : 'Güncelle')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
