import { useEffect, useState, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import * as XLSX from 'xlsx'

const DURUMLAR = [
  { value: 'beklemede', label: 'Beklemede', cls: 'badge-blue' },
  { value: 'uretimde', label: 'Üretimde', cls: 'badge-orange' },
  { value: 'kargoya_hazir', label: 'Kargoya Hazır', cls: 'badge-green' },
  { value: 'tamamlandi', label: 'Tamamlandı', cls: 'badge-gray' },
]

const PLATFORMLAR = ['Trendyol', 'Hepsiburada', 'Manuel', 'Toptan', 'Diğer']

export default function Siparisler() {
  const [siparisler, setSiparisler] = useState([])
  const [urunler, setUrunler] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null) // null | 'manuel' | 'excel' | 'detay'
  const [secili, setSecili] = useState(null)
  const [filtre, setFiltre] = useState({ arama: '', durum: '', platform: '' })
  const [sekme, setSekme] = useState('aktif')
  const [form, setForm] = useState({})
  const [excelOnizleme, setExcelOnizleme] = useState([])
  const [kayit, setKayit] = useState(false)
  const fileRef = useRef()


  useEffect(() => { yukle() }, [])

  async function yukle() {
    setLoading(true)
    const { data: s } = await supabase.from('siparisler').select('*').order('created_at', { ascending: false })
    const { data: u } = await supabase.from('urunler').select('stok_kodu,urun_adi,renk,fiyat').order('stok_kodu')
    setSiparisler(s || [])
    setUrunler(u || [])
    setLoading(false)
  }

  function filtreliSiparisler() {
    return siparisler.filter(s => {
      // Sekmeye göre filtrele
      if (sekme === 'aktif' && s.durum === 'tamamlandi') return false
      if (sekme === 'tamamlandi' && s.durum !== 'tamamlandi') return false
      if (filtre.arama) {
        const q = filtre.arama.toUpperCase()
        if (!s.siparis_no?.toUpperCase().includes(q) &&
            !s.musteri_adi?.toUpperCase().includes(q) &&
            !s.urun_stok_kodu?.toUpperCase().includes(q)) return false
      }
      if (filtre.durum && s.durum !== filtre.durum) return false
      if (filtre.platform && s.platform !== filtre.platform) return false
      return true
    })
  }

  async function manuelKaydet() {
    if (!form.musteri_adi || !form.urun_stok_kodu) return alert('Müşteri ve ürün zorunlu')
    setKayit(true)
    const siparis_no = 'MNL-' + Date.now().toString().slice(-8)
    const { error } = await supabase.from('siparisler').insert({
      siparis_no,
      platform: form.platform || 'Manuel',
      musteri_adi: form.musteri_adi,
      musteri_telefon: form.musteri_telefon || null,
      teslimat_adresi: form.teslimat_adresi || null,
      urun_stok_kodu: form.urun_stok_kodu,
      adet: parseInt(form.adet) || 1,
      birim_fiyat: parseFloat(form.birim_fiyat) || 0,
      durum: 'beklemede',
      aciklama: form.not || null,
    })
    setKayit(false)
    if (error) return alert('Hata: ' + error.message)
    setModal(null); setForm({})
    yukle()
  }

  function excelOku(e) {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const wb = XLSX.read(ev.target.result, { type: 'array' })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
      
      // Trendyol formatı: başlık satırı bul
      let headerRow = -1
      for (let i = 0; i < Math.min(data.length, 5); i++) {
        if (data[i].some(c => String(c).includes('Sipariş Numarası') || String(c).includes('Alıcı') || String(c).includes('Ürün'))) {
          headerRow = i; break
        }
      }

      let rows = []
      if (headerRow >= 0) {
        // Trendyol formatı
        const headers = data[headerRow].map(h => String(h).trim())
        const col = (name) => headers.findIndex(h => h.includes(name))
        const iSipNo = col('Sipariş Numarası')
        const iMusteri = col('Alıcı')
        const iUrun = col('Stok Kodu') >= 0 ? col('Stok Kodu') : col('Ürün Adı')
        const iAdet = col('Adet')
        const iFiyat = col('Satış Tutarı') >= 0 ? col('Satış Tutarı') : col('Birim Fiyat')
        const iAdres = col('Teslimat Adresi')

        for (let i = headerRow + 1; i < data.length; i++) {
          const r = data[i]
          const sipNo = String(r[iSipNo] || '').trim()
          const musteri = String(r[iMusteri] || '').trim()
          const urunKod = String(r[iUrun] || '').trim()
          if (!sipNo || !musteri || !urunKod) continue
          rows.push({
            siparis_no: sipNo,
            platform: 'Trendyol',
            musteri_adi: musteri,
            urun_stok_kodu: urunKod,
            adet: parseInt(r[iAdet]) || 1,
            birim_fiyat: parseFloat(r[iFiyat]) || 0,
            teslimat_adresi: String(r[iAdres] || '').trim(),
            durum: 'beklemede',
          })
        }
      } else {
        // Basit format: ürün adı + adet
        const kategoriler = ['SİYAH','BEYAZ','ANTRASİT','CEVİZ','KUMTAŞI','DESEN','ÇİFT RENK']
        for (const row of data) {
          const adi = String(row[1] || row[0] || '').trim()
          const adet = parseFloat(row[2] || row[1] || 0)
          if (!adi || !adet || isNaN(adet) || adet <= 0) continue
          if (kategoriler.includes(adi.toUpperCase())) continue
          if (adi.length < 3) continue
          rows.push({
            siparis_no: 'EXC-' + Date.now().toString().slice(-6) + '-' + Math.floor(Math.random()*1000),
            platform: 'Excel',
            musteri_adi: 'Toplu Sipariş',
            urun_stok_kodu: adi.toUpperCase(),
            adet: Math.round(adet),
            birim_fiyat: 0,
            durum: 'beklemede',
          })
        }
      }
      setExcelOnizleme(rows)
      setModal('excel')
    }
    reader.readAsArrayBuffer(file)
  }

  async function excelKaydet() {
    if (!excelOnizleme.length) return
    setKayit(true)
    const { error } = await supabase.from('siparisler').upsert(excelOnizleme, { onConflict: 'siparis_no', ignoreDuplicates: true })
    setKayit(false)
    if (error) return alert('Hata: ' + error.message)
    setModal(null); setExcelOnizleme([])
    yukle()
  }

  async function durumGuncelle(id, durum) {
    await supabase.from('siparisler').update({ durum }).eq('id', id)
    setSiparisler(prev => prev.map(s => s.id === id ? { ...s, durum } : s))
  }

  async function siparissSil(id) {
    if (!confirm('Bu siparişi silmek istediğinize emin misiniz?')) return
    await supabase.from('siparisler').delete().eq('id', id)
    setSiparisler(prev => prev.filter(s => s.id !== id))
    setModal(null)
  }

  function detayAc(s) {
    setSecili(s)
    setForm({
      musteri_adi: s.musteri_adi || '',
      musteri_telefon: s.musteri_telefon || '',
      teslimat_adresi: s.teslimat_adresi || '',
      urun_stok_kodu: s.urun_stok_kodu || '',
      adet: s.adet || 1,
      birim_fiyat: s.birim_fiyat || '',
      not: s.aciklama || '',
      platform: s.platform || 'Manuel',
      durum: s.durum || 'beklemede',
    })
    setModal('detay')
  }

  async function siparisDuzenle() {
    if (!form.musteri_adi || !form.urun_stok_kodu) return alert('Müşteri ve ürün zorunlu')
    const { error } = await supabase.from('siparisler').update({
      musteri_adi: form.musteri_adi,
      musteri_telefon: form.musteri_telefon || null,
      teslimat_adresi: form.teslimat_adresi || null,
      urun_stok_kodu: form.urun_stok_kodu,
      adet: parseInt(form.adet) || 1,
      birim_fiyat: parseFloat(form.birim_fiyat) || 0,
      aciklama: form.not || null,
      platform: form.platform,
      durum: form.durum,
    }).eq('id', secili.id)
    if (error) return alert('Hata: ' + error.message)
    setModal(null)
    yukle()
  }

  const durumBadge = (d) => {
    const item = DURUMLAR.find(x => x.value === d)
    return <span className={`badge ${item?.cls || 'badge-gray'}`}>{item?.label || d}</span>
  }

  const liste = filtreliSiparisler()

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-5">
        <div>
          <h1 className="text-xl font-semibold">Siparişler</h1>
          <p className="text-gray-500 text-sm mt-0.5">{siparisler.length} sipariş</p>
        </div>
        <div className="flex gap-2">
          <label className="btn cursor-pointer flex items-center gap-2">
            📤 Excel Yükle
            <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={excelOku} />
          </label>
          <button className="btn-primary" onClick={() => { setForm({}); setModal('manuel') }}>
            + Manuel Sipariş
          </button>
        </div>
      </div>

      {/* Sekmeler */}
      <div className="flex gap-0 border-b border-gray-800 mb-4">
        <button
          className={`px-5 py-2.5 text-sm border-b-2 transition-colors ${sekme === 'aktif' ? 'border-blue-500 text-blue-400 font-medium' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
          onClick={() => { setSekme('aktif'); setFiltre(p => ({...p, durum: ''})) }}
        >
          Aktif Siparişler
          <span className="ml-2 badge badge-blue">{siparisler.filter(s => s.durum !== 'tamamlandi').length}</span>
        </button>
        <button
          className={`px-5 py-2.5 text-sm border-b-2 transition-colors ${sekme === 'tamamlandi' ? 'border-green-500 text-green-400 font-medium' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
          onClick={() => { setSekme('tamamlandi'); setFiltre(p => ({...p, durum: ''})) }}
        >
          Tamamlananlar
          <span className="ml-2 badge badge-green">{siparisler.filter(s => s.durum === 'tamamlandi').length}</span>
        </button>
      </div>

      {/* Filtreler */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <input
          className="input w-56"
          placeholder="Sipariş no, müşteri, ürün ara…"
          value={filtre.arama}
          onChange={e => setFiltre(p => ({ ...p, arama: e.target.value }))}
        />
        <select className="input w-40" value={filtre.durum} onChange={e => setFiltre(p => ({ ...p, durum: e.target.value }))}>
          <option value="">Tüm Durumlar</option>
          {DURUMLAR.filter(d => sekme === 'aktif' ? d.value !== 'tamamlandi' : d.value === 'tamamlandi').map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
        </select>
        <select className="input w-40" value={filtre.platform} onChange={e => setFiltre(p => ({ ...p, platform: e.target.value }))}>
          <option value="">Tüm Platformlar</option>
          {PLATFORMLAR.map(p => <option key={p}>{p}</option>)}
        </select>
        <span className="text-xs text-gray-500 self-center">{liste.length} sonuç</span>
      </div>

      {/* Tablo */}
      <div className="card overflow-x-auto">
        {loading ? (
          <div className="text-center py-12 text-gray-600">Yükleniyor…</div>
        ) : liste.length === 0 ? (
          <div className="text-center py-12 text-gray-600">
            <div className="text-4xl mb-3">📦</div>
            <div>Sipariş bulunamadı</div>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr>
                <th className="th">Sipariş No</th>
                <th className="th">Platform</th>
                <th className="th">Müşteri</th>
                <th className="th">Ürün Stok Kodu</th>
                <th className="th">Adet</th>
                <th className="th">Tutar</th>
                <th className="th">Durum</th>
                <th className="th">Tarih</th>
                <th className="th"></th>
              </tr>
            </thead>
            <tbody>
              {liste.map(s => (
                <tr key={s.id} className="hover:bg-gray-800/40">
                  <td className="td font-mono text-xs text-blue-400">{s.siparis_no}</td>
                  <td className="td">
                    <span className={`badge ${s.platform === 'Trendyol' ? 'badge-blue' : s.platform === 'Hepsiburada' ? 'badge-orange' : 'badge-gray'}`}>
                      {s.platform}
                    </span>
                  </td>
                  <td className="td text-gray-200">{s.musteri_adi}</td>
                  <td className="td text-gray-300 font-medium">{s.urun_stok_kodu}</td>
                  <td className="td text-center">{s.adet}</td>
                  <td className="td text-right text-gray-300">
                    {s.birim_fiyat > 0 ? `₺${(s.birim_fiyat * s.adet).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}` : '—'}
                  </td>
                  <td className="td">{durumBadge(s.durum)}</td>
                  <td className="td text-xs text-gray-500">{new Date(s.created_at).toLocaleDateString('tr-TR')}</td>
                  <td className="td">
                    <select
                      className="text-xs bg-gray-800 border border-gray-700 rounded px-1 py-0.5 text-gray-300"
                      value={s.durum}
                      onChange={e => durumGuncelle(s.id, e.target.value)}
                    >
                      {DURUMLAR.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Detay / Düzenle Modal */}
      {modal === 'detay' && secili && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-lg max-h-screen overflow-y-auto">
            <div className="flex justify-between items-center p-4 border-b border-gray-800">
              <h2 className="font-medium">Sipariş Düzenle — {secili.siparis_no}</h2>
              <button className="btn btn-sm" onClick={() => setModal(null)}>✕</button>
            </div>
            <div className="p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Platform</label>
                  <select className="input" value={form.platform} onChange={e => setForm(p => ({ ...p, platform: e.target.value }))}>
                    {PLATFORMLAR.map(p => <option key={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Durum</label>
                  <select className="input" value={form.durum} onChange={e => setForm(p => ({ ...p, durum: e.target.value }))}>
                    {DURUMLAR.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="label">Müşteri Adı *</label>
                <input className="input" value={form.musteri_adi} onChange={e => setForm(p => ({ ...p, musteri_adi: e.target.value }))} />
              </div>
              <div>
                <label className="label">Telefon</label>
                <input className="input" value={form.musteri_telefon} onChange={e => setForm(p => ({ ...p, musteri_telefon: e.target.value }))} />
              </div>
              <div>
                <label className="label">Teslimat Adresi</label>
                <textarea className="input" rows={2} value={form.teslimat_adresi} onChange={e => setForm(p => ({ ...p, teslimat_adresi: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Ürün Stok Kodu *</label>
                  <input className="input" value={form.urun_stok_kodu} onChange={e => setForm(p => ({ ...p, urun_stok_kodu: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Adet</label>
                  <input type="number" className="input" value={form.adet} onChange={e => setForm(p => ({ ...p, adet: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="label">Birim Fiyat (₺)</label>
                <input type="number" className="input" value={form.birim_fiyat} onChange={e => setForm(p => ({ ...p, birim_fiyat: e.target.value }))} />
              </div>
              <div>
                <label className="label">Not</label>
                <textarea className="input" rows={2} value={form.not} onChange={e => setForm(p => ({ ...p, not: e.target.value }))} />
              </div>
            </div>
            <div className="flex justify-between p-4 border-t border-gray-800">
              <button className="btn-danger btn-sm" onClick={() => siparissSil(secili.id)}>Siparişi Sil</button>
              <div className="flex gap-2">
                <button className="btn" onClick={() => setModal(null)}>İptal</button>
                <button className="btn-primary" onClick={siparisDuzenle}>Kaydet</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Manuel Sipariş Modal */}
      {modal === 'manuel' && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-lg max-h-screen overflow-y-auto">
            <div className="flex justify-between items-center p-4 border-b border-gray-800">
              <h2 className="font-medium">Yeni Manuel Sipariş</h2>
              <button className="btn btn-sm" onClick={() => setModal(null)}>✕</button>
            </div>
            <div className="p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Platform</label>
                  <select className="input" value={form.platform || 'Manuel'} onChange={e => setForm(p => ({ ...p, platform: e.target.value }))}>
                    {PLATFORMLAR.map(p => <option key={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Müşteri Adı *</label>
                  <input className="input" value={form.musteri_adi || ''} onChange={e => setForm(p => ({ ...p, musteri_adi: e.target.value }))} placeholder="Ad Soyad / Firma" />
                </div>
              </div>
              <div>
                <label className="label">Telefon</label>
                <input className="input" value={form.musteri_telefon || ''} onChange={e => setForm(p => ({ ...p, musteri_telefon: e.target.value }))} placeholder="05XX XXX XX XX" />
              </div>
              <div>
                <label className="label">Teslimat Adresi</label>
                <textarea className="input" rows={2} value={form.teslimat_adresi || ''} onChange={e => setForm(p => ({ ...p, teslimat_adresi: e.target.value }))} placeholder="Tam adres…" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Ürün (Stok Kodu) *</label>
                  <input
                    className="input"
                    list="urun-list"
                    value={form.urun_stok_kodu || ''}
                    onChange={e => {
                      const v = e.target.value
                      setForm(p => ({ ...p, urun_stok_kodu: v }))
                      const bulunan = urunler.find(u => u.stok_kodu === v)
                      if (bulunan) setForm(p => ({ ...p, urun_stok_kodu: v, birim_fiyat: bulunan.fiyat }))
                    }}
                    placeholder="Stok kodu yaz veya seç…"
                  />
                  <datalist id="urun-list">
                    {urunler.map(u => <option key={u.stok_kodu} value={u.stok_kodu}>{u.urun_adi} — {u.renk}</option>)}
                  </datalist>
                </div>
                <div>
                  <label className="label">Adet</label>
                  <input type="number" className="input" min="1" value={form.adet || 1} onChange={e => setForm(p => ({ ...p, adet: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="label">Birim Fiyat (₺)</label>
                <input type="number" className="input" value={form.birim_fiyat || ''} onChange={e => setForm(p => ({ ...p, birim_fiyat: e.target.value }))} placeholder="0.00" />
              </div>
              <div>
                <label className="label">Not</label>
                <textarea className="input" rows={2} value={form.not || ''} onChange={e => setForm(p => ({ ...p, not: e.target.value }))} placeholder="Özel istek, renk notu…" />
              </div>
            </div>
            <div className="flex justify-end gap-2 p-4 border-t border-gray-800">
              <button className="btn" onClick={() => setModal(null)}>İptal</button>
              <button className="btn-primary" onClick={manuelKaydet} disabled={kayit}>
                {kayit ? 'Kaydediliyor…' : 'Siparişi Kaydet'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Excel Önizleme Modal */}
      {modal === 'excel' && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-3xl max-h-screen overflow-y-auto">
            <div className="flex justify-between items-center p-4 border-b border-gray-800">
              <h2 className="font-medium">Excel Önizleme — {excelOnizleme.length} sipariş bulundu</h2>
              <button className="btn btn-sm" onClick={() => { setModal(null); setExcelOnizleme([]) }}>✕</button>
            </div>
            <div className="p-4">
              {excelOnizleme.length === 0 ? (
                <div className="text-center py-8 text-gray-500">Uygun satır bulunamadı. Dosya formatını kontrol edin.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr>
                        <th className="th">Sipariş No</th>
                        <th className="th">Müşteri</th>
                        <th className="th">Ürün</th>
                        <th className="th">Adet</th>
                        <th className="th">Fiyat</th>
                      </tr>
                    </thead>
                    <tbody>
                      {excelOnizleme.slice(0, 20).map((r, i) => (
                        <tr key={i} className="hover:bg-gray-800/40">
                          <td className="td text-xs text-blue-400 font-mono">{r.siparis_no}</td>
                          <td className="td">{r.musteri_adi}</td>
                          <td className="td font-medium">{r.urun_stok_kodu}</td>
                          <td className="td text-center">{r.adet}</td>
                          <td className="td text-right">{r.birim_fiyat > 0 ? `₺${r.birim_fiyat.toLocaleString('tr-TR')}` : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {excelOnizleme.length > 20 && (
                    <div className="text-center text-xs text-gray-500 py-2">… ve {excelOnizleme.length - 20} satır daha</div>
                  )}
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 p-4 border-t border-gray-800">
              <button className="btn" onClick={() => { setModal(null); setExcelOnizleme([]); if(fileRef.current) fileRef.current.value='' }}>İptal</button>
              <button className="btn-primary" onClick={excelKaydet} disabled={kayit || excelOnizleme.length === 0}>
                {kayit ? 'Aktarılıyor…' : `${excelOnizleme.length} Siparişi İçe Aktar`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
