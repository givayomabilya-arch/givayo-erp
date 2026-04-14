import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useRouter } from 'next/router'

export default function Login() {
  const [email, setEmail] = useState('')
  const [sifre, setSifre] = useState('')
  const [hata, setHata] = useState('')
  const [yukleniyor, setYukleniyor] = useState(false)
  const router = useRouter()

  async function girisYap(e) {
    e.preventDefault()
    setHata('')
    setYukleniyor(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password: sifre })
    if (error) {
      setHata('E-posta veya şifre hatalı')
      setYukleniyor(false)
      return
    }
    router.push('/')
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-blue-400 font-bold text-3xl tracking-wide">GİVAYO</div>
          <div className="text-gray-500 text-sm tracking-widest mt-1">ÜRETİM SİSTEMİ</div>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h1 className="text-lg font-medium mb-5">Giriş Yap</h1>
          <form onSubmit={girisYap} className="space-y-4">
            <div>
              <label className="label">E-posta</label>
              <input
                type="email"
                className="input"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="ad@givayo.com.tr"
                required
              />
            </div>
            <div>
              <label className="label">Şifre</label>
              <input
                type="password"
                className="input"
                value={sifre}
                onChange={e => setSifre(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>
            {hata && (
              <div className="text-red-400 text-sm bg-red-950 rounded-lg px-3 py-2">{hata}</div>
            )}
            <button type="submit" className="btn-primary w-full py-2.5" disabled={yukleniyor}>
              {yukleniyor ? 'Giriş yapılıyor…' : 'Giriş Yap'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
