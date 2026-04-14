import '../styles/globals.css'
import Layout from '../components/Layout'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useRouter } from 'next/router'

export default function App({ Component, pageProps }) {
  const [kullanici, setKullanici] = useState(null)
  const [profil, setProfil] = useState(null)
  const [yukleniyor, setYukleniyor] = useState(true)
  const router = useRouter()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setKullanici(session.user)
        profilYukle(session.user.id)
      } else {
        setYukleniyor(false)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setKullanici(session.user)
        profilYukle(session.user.id)
      } else {
        setKullanici(null)
        setProfil(null)
        setYukleniyor(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function profilYukle(userId) {
    const { data } = await supabase.from('kullanicilar').select('*').eq('id', userId).single()
    setProfil(data)
    setYukleniyor(false)
  }

  if (router.pathname === '/login') {
    return <Component {...pageProps} />
  }

  if (yukleniyor) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-gray-500">Yükleniyor…</div>
      </div>
    )
  }

  if (!kullanici || !profil) {
    if (typeof window !== 'undefined') router.push('/login')
    return null
  }

  if (!profil.aktif) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center text-gray-400">
          <div className="text-4xl mb-3">🚫</div>
          <div>Hesabınız devre dışı bırakılmış.</div>
          <div className="text-sm mt-1">Yönetici ile iletişime geçin.</div>
        </div>
      </div>
    )
  }

  return (
    <Layout kullanici={kullanici} profil={profil}>
      <Component {...pageProps} profil={profil} />
    </Layout>
  )
}
