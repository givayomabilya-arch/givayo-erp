import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useRouter } from 'next/router'

const ROLLER = [
  { value: 'yonetici', label: 'Yönetici' },
  { value: 'foremen', label: 'Foreman' },
  { value: 'siparis', label: 'Sipariş Yükleyici' },
  { value: 'eleman', label: 'Eleman' },
]

const TIP_LISTESI = [
  { value: 'ebatlama', label: 'Ebatlama' },
  { value: 'bantlama', label: 'Bantlama' },
  { value: 'delik', label: 'Delik' },
  { value: 'aksesuar', label: 'Aksesuar' },
  { value: 'kartoncu', label: 'Kartoncu' },
  { value: 'paketci', label: 'Paketçi' },
]

export default function Yonetim({ profil }) {
  const router = useRouter()
  const [sekme, setSekme] = useState('kullanicilar')
  const [kullanicilar, setKullanicilar] = useState([])
  const [istasyonlar, setIstasyonlar] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)
  const [secili, setSecili] = useState(null)
  const [form, setForm] = useState({ email: '', ad_soyad: '', sifre: '', rol: 'eleman', istasyon: '' })
  const [istasyonForm, setIstasyonForm] = useState({ tip: 'ebatlama', ad: '' })
  const [kayit, setKayit] = useState(false)
  const [hata, setHata] = useState('')
  const [basari, setBasari] = useState('')

  useEffect(() => {
    if (profil?.rol !== 'yonetici') { router.push('/'); return }
    yukle()
  }, [profil])

  async function yukle() {
    setLoading(true)
    const [{ data: k }, { data: i }] = await Promise.all([
      supabase.from('kullanicilar').select('*').order('created_at', { ascending: false }),
      supabase.from('istasyonlar').select('*').order('tip').order('sira')
    ])
    setKullanicilar(k || [])
    setIstasyonlar(i || [])
    setLoading(false)
  }

  // İstasyon listesi - eleman seçimi için
  function istasyonSecenekleri() {
    return istasyonlar.filter(i => i.aktif).map(i => i.ad)
  }

  async function kullaniciEkle() {
    if (!form.email || !form.sifre || !form.ad_soyad) return setHata('Tüm alanları doldurun')
    if (form.sifre.length < 6) return setHata('Şifre en az 6 karakter olmalı')
    setKayit(true); setHata('')

    const res = await fetch('/api/create-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: form.email, password: form.sifre, ad_soyad: form.ad_soyad, rol: form.rol, istasyon: form.istasyon || null })
    })
    const data = await res.json()
    if (!res.ok) { setHata('Hata: ' + data.error); setKayit(false); return }

    setKayit(false); setModal(null)
    setForm({ email: '', ad_soyad: '', sifre: '', rol: 'eleman', istasyon: '' })
    setBasari('Kullanıcı oluşturuldu!'); setTimeout(() => setBasari(''), 3000)
    yukle()
  }

  async function kullaniciGuncelle() {
    if (!form.ad_soyad) return setHata('Ad soyad zorunlu')
    setKayit(true); setHata('')
    await supabase.from('kullanicilar').update({ ad_soyad: form.ad_soyad, rol: form.rol, istasyon: form.istasyon || null }).eq('id', secili.id)
    if (form.sifre && form.sifre.length >= 6) {
      await fetch('/api/update-user', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: secili.id, password: form.sifre }) })
    }
    setKayit(false); setModal(null); setSecili(null)
    setBasari('Güncellendi!'); setTimeout(() => setBasari(''), 3000)
    yukle()
  }

  async function aktifToggle(id, aktif) {
    await supabase.from('kullanicilar').update({ aktif: !aktif }).eq('id', id)
    setKullanicilar(prev => prev.map(u => u.id === id ? { ...u, aktif: !aktif } : u))
  }

  function duzenleAc(u) {
    setSecili(u)
    setForm({ email: u.email, ad_soyad: u.ad_soyad || '', sifre: '', rol: u.rol, istasyon: u.istasyon || '' })
    setHata(''); setModal('duzenle')
  }

  // İstasyon fonksiyonları
  async function istasyonEkle() {
    if (!istasyonForm.ad.trim()) return setHata('İstasyon adı zorunlu')
    setKayit(true)
    const maxSira = Math.max(0, ...istasyonlar.filter(i => i.tip === istasyonForm.tip).map(i => i.sira))
    await supabase.from('istasyonlar').insert({ tip: istasyonForm.tip, ad: istasyonForm.ad.trim(), sira: maxSira + 1, aktif: true })
    setIstasyonForm({ tip: 'ebatlama', ad: '' })
    setKayit(false); setModal(null)
    setBasari('İstasyon eklendi!'); setTimeout(() => setBasari(''), 3000)
    yukle()
  }

  async function istasyonToggle(id, aktif) {
    await supabase.from('istasyonlar').update({ aktif: !aktif }).eq('id', id)
    setIstasyonlar(prev => prev.map(i => i.id === id ? { ...i, aktif: !aktif } : i))
  }

  async function istasyonSil(id) {
    if (!confirm('Bu istasyonu silmek istediğinize emin misiniz?')) return
    await supabase.from('istasyonlar').delete().eq('id', id)
    setIstasyonlar(prev => prev.filter(i => i.id !== id))
  }

  const rolLabel = { yonetici: 'Yönetici', foremen: 'Foreman', siparis: 'Sipariş', eleman: 'Eleman' }
  const rolRenk = { yonetici: 'badge-blue', foremen: 'badge-orange', siparis: 'badge-green', eleman: 'badge-gray' }
  const tipLabel = { ebatlama: 'Ebatlama', bantlama: 'Bantlama', delik: 'Delik', aksesuar: 'Aksesuar', kartoncu: 'Kartoncu', paketci: 'Paketçi' }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-5">
        <h1 className="text-xl font-semibold">Yönetim</h1>
        <button className="btn-primary" onClick={() => {
          if (sekme === 'kullanicilar') { setForm({ email: '', ad_soyad: '', sifre: '', rol: 'eleman', istasyon: '' }); setHata(''); setModal('yeni') }
          else { setIstasyonForm({ tip: 'ebatlama', ad: '' }); setHata(''); setModal('istasyon') }
        }}>
          {sekme === 'kullanicilar' ? '+ Yeni Kullanıcı' : '+ Yeni İstasyon'}
        </button>
      </div>

      {basari && <div className="mb-4 text-green-400 text-sm bg-green-950 rounded-lg px-3 py-2">✓ {basari}</div>}

      {/* Sekmeler */}
      <div className="flex gap-0 border-b border-gray-800 mb-4">
        <button className={`px-5 py-2.5 text-sm border-b-2 transition-colors ${sekme === 'kullanicilar' ? 'border-blue-500 text-blue-400 font-medium' : 'border-transparent text-gray-500 hover:text-gray-300'}`} onClick={() => setSekme('kullanicilar')}>
          👥 Kullanıcılar <span className="ml-1 badge badge-gray">{kullanicilar.length}</span>
        </button>
        <button className={`px-5 py-2.5 text-sm border-b-2 transition-colors ${sekme === 'istasyonlar' ? 'border-blue-500 text-blue-400 font-medium' : 'border-transparent text-gray-500 hover:text-gray-300'}`} onClick={() => setSekme('istasyonlar')}>
          🏭 İstasyonlar <span className="ml-1 badge badge-gray">{istasyonlar.filter(i => i.aktif).length}</span>
        </button>
      </div>

      {/* Kullanıcılar */}
      {sekme === 'kullanicilar' && (
        <div className="card overflow-x-auto">
          {loading ? <div className="text-center py-8 text-gray-600">Yükleniyor…</div> : (
            <table className="w-full">
              <thead><tr>
                <th className="th">Ad Soyad</th><th className="th">E-posta</th>
                <th className="th">Rol</th><th className="th">İstasyon</th>
                <th className="th">Durum</th><th className="th"></th>
              </tr></thead>
              <tbody>
                {kullanicilar.map(u => (
                  <tr key={u.id} className="hover:bg-gray-800/40">
                    <td className="td font-medium">{u.ad_soyad}</td>
                    <td className="td text-gray-400 text-xs">{u.email}</td>
                    <td className="td"><span className={`badge ${rolRenk[u.rol] || 'badge-gray'}`}>{rolLabel[u.rol] || u.rol}</span></td>
                    <td className="td text-xs text-gray-400">{u.istasyon || '—'}</td>
                    <td className="td"><span className={`badge ${u.aktif ? 'badge-green' : 'badge-red'}`}>{u.aktif ? 'Aktif' : 'Pasif'}</span></td>
                    <td className="td">
                      <div className="flex gap-1">
                        <button className="btn btn-sm text-xs" onClick={() => duzenleAc(u)}>Düzenle</button>
                        <button className={`btn btn-sm text-xs ${u.aktif ? 'text-red-400' : 'text-green-400'}`} onClick={() => aktifToggle(u.id, u.aktif)}>
                          {u.aktif ? 'Devre Dışı' : 'Aktif Et'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* İstasyonlar */}
      {sekme === 'istasyonlar' && (
        <div className="space-y-4">
          {TIP_LISTESI.map(tip => {
            const tipIstasyonlar = istasyonlar.filter(i => i.tip === tip.value)
            return (
              <div key={tip.value} className="card">
                <div className="font-medium text-gray-300 mb-3">{tip.label}</div>
                <div className="space-y-2">
                  {tipIstasyonlar.map(ist => (
                    <div key={ist.id} className="flex items-center justify-between bg-gray-800 rounded-lg px-3 py-2">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${ist.aktif ? 'bg-green-500' : 'bg-gray-600'}`}></span>
                        <span className={`text-sm ${ist.aktif ? 'text-gray-200' : 'text-gray-500'}`}>{ist.ad}</span>
                      </div>
                      <div className="flex gap-1">
                        <button className={`btn btn-sm text-xs ${ist.aktif ? 'text-red-400' : 'text-green-400'}`} onClick={() => istasyonToggle(ist.id, ist.aktif)}>
                          {ist.aktif ? 'Devre Dışı' : 'Aktif Et'}
                        </button>
                        <button className="btn btn-sm text-xs text-gray-500" onClick={() => istasyonSil(ist.id)}>Sil</button>
                      </div>
                    </div>
                  ))}
                  {tipIstasyonlar.length === 0 && <div className="text-xs text-gray-600 py-2">İstasyon yok</div>}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Kullanıcı Modal */}
      {(modal === 'yeni' || modal === 'duzenle') && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-md">
            <div className="flex justify-between items-center p-4 border-b border-gray-800">
              <h2 className="font-medium">{modal === 'yeni' ? 'Yeni Kullanıcı' : 'Kullanıcı Düzenle'}</h2>
              <button className="btn btn-sm" onClick={() => setModal(null)}>✕</button>
            </div>
            <div className="p-4 space-y-3">
              <div><label className="label">Ad Soyad *</label><input className="input" value={form.ad_soyad} onChange={e => setForm(p => ({ ...p, ad_soyad: e.target.value }))} placeholder="Ahmet Yılmaz" /></div>
              {modal === 'yeni' ? (
                <div><label className="label">E-posta *</label><input type="email" className="input" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="ahmet@givayo.com.tr" /></div>
              ) : (
                <div className="bg-gray-800 rounded-lg px-3 py-2 text-xs text-gray-500">E-posta: {form.email}</div>
              )}
              <div><label className="label">{modal === 'duzenle' ? 'Yeni Şifre (boş = değişmez)' : 'Şifre *'}</label><input type="password" className="input" value={form.sifre} onChange={e => setForm(p => ({ ...p, sifre: e.target.value }))} placeholder="En az 6 karakter" /></div>
              <div><label className="label">Rol</label>
                <select className="input" value={form.rol} onChange={e => setForm(p => ({ ...p, rol: e.target.value }))}>
                  {ROLLER.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>
              {form.rol === 'eleman' && (
                <div><label className="label">İstasyon</label>
                  <select className="input" value={form.istasyon} onChange={e => setForm(p => ({ ...p, istasyon: e.target.value }))}>
                    <option value="">— İstasyon Seçin —</option>
                    {istasyonSecenekleri().map(ist => <option key={ist}>{ist}</option>)}
                  </select>
                </div>
              )}
              {hata && <div className="text-red-400 text-sm bg-red-950 rounded px-3 py-2">{hata}</div>}
            </div>
            <div className="flex justify-end gap-2 p-4 border-t border-gray-800">
              <button className="btn" onClick={() => setModal(null)}>İptal</button>
              <button className="btn-primary" onClick={modal === 'yeni' ? kullaniciEkle : kullaniciGuncelle} disabled={kayit}>
                {kayit ? 'Kaydediliyor…' : (modal === 'yeni' ? 'Oluştur' : 'Güncelle')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* İstasyon Ekle Modal */}
      {modal === 'istasyon' && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-sm">
            <div className="flex justify-between items-center p-4 border-b border-gray-800">
              <h2 className="font-medium">Yeni İstasyon Ekle</h2>
              <button className="btn btn-sm" onClick={() => setModal(null)}>✕</button>
            </div>
            <div className="p-4 space-y-3">
              <div><label className="label">Tür</label>
                <select className="input" value={istasyonForm.tip} onChange={e => setIstasyonForm(p => ({ ...p, tip: e.target.value }))}>
                  {TIP_LISTESI.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div><label className="label">İstasyon Adı *</label>
                <input className="input" value={istasyonForm.ad} onChange={e => setIstasyonForm(p => ({ ...p, ad: e.target.value }))} placeholder="Ebatlama 4" />
              </div>
              {hata && <div className="text-red-400 text-sm bg-red-950 rounded px-3 py-2">{hata}</div>}
            </div>
            <div className="flex justify-end gap-2 p-4 border-t border-gray-800">
              <button className="btn" onClick={() => setModal(null)}>İptal</button>
              <button className="btn-primary" onClick={istasyonEkle} disabled={kayit}>{kayit ? 'Ekleniyor…' : 'Ekle'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
