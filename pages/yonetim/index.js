import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useRouter } from 'next/router'

const ROLLER = [
  { value: 'yonetici', label: 'Yönetici' },
  { value: 'foremen', label: 'Foremen' },
  { value: 'siparis', label: 'Sipariş Yükleyici' },
  { value: 'eleman', label: 'Eleman' },
]

const ISTASYONLAR = [
  'Ebatlama 1', 'Ebatlama 2', 'Ebatlama 3',
  'Bantlama 1', 'Bantlama 2',
  'Delik 1', 'Delik 2',
  'Aksesuar 1', 'Aksesuar 2',
  'Kartoncu 1', 'Kartoncu 2',
  'Paketçi 1', 'Paketçi 2', 'Paketçi 3',
]

export default function Yonetim({ profil }) {
  const router = useRouter()
  const [kullanicilar, setKullanicilar] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null) // null | 'yeni' | 'duzenle'
  const [secili, setSecili] = useState(null)
  const [form, setForm] = useState({ email: '', ad_soyad: '', sifre: '', rol: 'eleman', istasyon: '' })
  const [kayit, setKayit] = useState(false)
  const [hata, setHata] = useState('')
  const [basari, setBasari] = useState('')

  useEffect(() => {
    if (profil?.rol !== 'yonetici') { router.push('/'); return }
    yukle()
  }, [profil])

  async function yukle() {
    setLoading(true)
    const { data } = await supabase.from('kullanicilar').select('*').order('created_at', { ascending: false })
    setKullanicilar(data || [])
    setLoading(false)
  }

  async function kullaniciEkle() {
    if (!form.email || !form.sifre || !form.ad_soyad) return setHata('Tüm alanları doldurun')
    if (form.sifre.length < 6) return setHata('Şifre en az 6 karakter olmalı')
    setKayit(true); setHata('')

    const res = await fetch('/api/create-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: form.email,
        password: form.sifre,
        ad_soyad: form.ad_soyad,
        rol: form.rol,
        istasyon: form.istasyon || null
      })
    })
    const data = await res.json()

    if (!res.ok) { setHata('Hata: ' + data.error); setKayit(false); return }

    setKayit(false); setModal(null)
    setForm({ email: '', ad_soyad: '', sifre: '', rol: 'eleman', istasyon: '' })
    setBasari('Kullanıcı oluşturuldu!')
    setTimeout(() => setBasari(''), 3000)
    yukle()
  }

  async function kullaniciGuncelle() {
    if (!form.ad_soyad) return setHata('Ad soyad zorunlu')
    setKayit(true); setHata('')

    // Profil güncelle
    const { error } = await supabase.from('kullanicilar').update({
      ad_soyad: form.ad_soyad,
      rol: form.rol,
      istasyon: form.istasyon || null,
    }).eq('id', secili.id)

    if (error) { setHata('Hata: ' + error.message); setKayit(false); return }

    // Şifre değiştirildiyse
    if (form.sifre && form.sifre.length >= 6) {
      await fetch('/api/update-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: secili.id, password: form.sifre })
      })
    }

    setKayit(false); setModal(null); setSecili(null)
    setBasari('Kullanıcı güncellendi!')
    setTimeout(() => setBasari(''), 3000)
    yukle()
  }

  async function aktifToggle(id, aktif) {
    await supabase.from('kullanicilar').update({ aktif: !aktif }).eq('id', id)
    setKullanicilar(prev => prev.map(u => u.id === id ? { ...u, aktif: !aktif } : u))
  }

  function duzenleAc(u) {
    setSecili(u)
    setForm({ email: u.email, ad_soyad: u.ad_soyad || '', sifre: '', rol: u.rol, istasyon: u.istasyon || '' })
    setHata('')
    setModal('duzenle')
  }

  const rolLabel = { yonetici: 'Yönetici', foremen: 'Foremen', siparis: 'Sipariş', eleman: 'Eleman' }
  const rolRenk = { yonetici: 'badge-blue', foremen: 'badge-orange', siparis: 'badge-green', eleman: 'badge-gray' }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-5">
        <div>
          <h1 className="text-xl font-semibold">Kullanıcı Yönetimi</h1>
          <p className="text-gray-500 text-sm mt-0.5">{kullanicilar.length} kullanıcı</p>
        </div>
        <button className="btn-primary" onClick={() => { setForm({ email: '', ad_soyad: '', sifre: '', rol: 'eleman', istasyon: '' }); setHata(''); setModal('yeni') }}>
          + Yeni Kullanıcı
        </button>
      </div>

      {basari && <div className="mb-4 text-green-400 text-sm bg-green-950 rounded-lg px-3 py-2">✓ {basari}</div>}

      <div className="card overflow-x-auto">
        {loading ? (
          <div className="text-center py-8 text-gray-600">Yükleniyor…</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr>
                <th className="th">Ad Soyad</th>
                <th className="th">E-posta</th>
                <th className="th">Rol</th>
                <th className="th">İstasyon</th>
                <th className="th">Durum</th>
                <th className="th"></th>
              </tr>
            </thead>
            <tbody>
              {kullanicilar.map(u => (
                <tr key={u.id} className="hover:bg-gray-800/40">
                  <td className="td font-medium">{u.ad_soyad}</td>
                  <td className="td text-gray-400 text-xs">{u.email}</td>
                  <td className="td">
                    <span className={`badge ${rolRenk[u.rol] || 'badge-gray'}`}>{rolLabel[u.rol] || u.rol}</span>
                  </td>
                  <td className="td text-xs text-gray-400">{u.istasyon || '—'}</td>
                  <td className="td">
                    <span className={`badge ${u.aktif ? 'badge-green' : 'badge-red'}`}>
                      {u.aktif ? 'Aktif' : 'Pasif'}
                    </span>
                  </td>
                  <td className="td">
                    <div className="flex gap-1">
                      <button className="btn btn-sm text-xs" onClick={() => duzenleAc(u)}>Düzenle</button>
                      <button
                        className={`btn btn-sm text-xs ${u.aktif ? 'text-red-400' : 'text-green-400'}`}
                        onClick={() => aktifToggle(u.id, u.aktif)}
                      >
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

      {/* Yeni / Düzenle Modal */}
      {(modal === 'yeni' || modal === 'duzenle') && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-md">
            <div className="flex justify-between items-center p-4 border-b border-gray-800">
              <h2 className="font-medium">{modal === 'yeni' ? 'Yeni Kullanıcı Ekle' : 'Kullanıcı Düzenle'}</h2>
              <button className="btn btn-sm" onClick={() => setModal(null)}>✕</button>
            </div>
            <div className="p-4 space-y-3">
              <div>
                <label className="label">Ad Soyad *</label>
                <input className="input" value={form.ad_soyad} onChange={e => setForm(p => ({ ...p, ad_soyad: e.target.value }))} placeholder="Ahmet Yılmaz" />
              </div>
              {modal === 'yeni' && (
                <div>
                  <label className="label">E-posta *</label>
                  <input type="email" className="input" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="ahmet@givayo.com.tr" />
                </div>
              )}
              {modal === 'duzenle' && (
                <div className="bg-gray-800 rounded-lg px-3 py-2 text-xs text-gray-500">
                  E-posta: {form.email}
                </div>
              )}
              <div>
                <label className="label">{modal === 'duzenle' ? 'Yeni Şifre (boş bırakırsanız değişmez)' : 'Şifre *'}</label>
                <input type="password" className="input" value={form.sifre} onChange={e => setForm(p => ({ ...p, sifre: e.target.value }))} placeholder="En az 6 karakter" />
              </div>
              <div>
                <label className="label">Rol</label>
                <select className="input" value={form.rol} onChange={e => setForm(p => ({ ...p, rol: e.target.value }))}>
                  {ROLLER.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>
              {form.rol === 'eleman' && (
                <div>
                  <label className="label">İstasyon</label>
                  <select className="input" value={form.istasyon} onChange={e => setForm(p => ({ ...p, istasyon: e.target.value }))}>
                    <option value="">— İstasyon Seçin —</option>
                    {ISTASYONLAR.map(ist => <option key={ist}>{ist}</option>)}
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
    </div>
  )
}
