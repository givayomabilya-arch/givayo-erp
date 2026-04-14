import Link from 'next/link'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'

const ROL_MENULERI = {
  yonetici: [
    { href: '/', label: 'Dashboard', icon: '📊' },
    { href: '/siparisler', label: 'Siparişler', icon: '📦' },
    { href: '/uretim', label: 'Üretim Planı', icon: '🏭' },
    { href: '/katalog', label: 'Katalog', icon: '🗂️' },
    { href: '/tablet', label: 'Eleman Tableti', icon: '📱' },
    { href: '/yonetim', label: 'Kullanıcılar', icon: '👥' },
  ],
  foremen: [
    { href: '/', label: 'Dashboard', icon: '📊' },
    { href: '/uretim', label: 'Üretim Planı', icon: '🏭' },
    { href: '/katalog', label: 'Katalog', icon: '🗂️' },
  ],
  siparis: [
    { href: '/siparisler', label: 'Siparişler', icon: '📦' },
  ],
  eleman: [
    { href: '/tablet', label: 'İş Listem', icon: '📱' },
  ],
}

const ROL_ETIKET = {
  yonetici: 'Yönetici',
  foremen: 'Foremen',
  siparis: 'Sipariş',
  eleman: 'Eleman',
}

export default function Layout({ children, kullanici, profil }) {
  const router = useRouter()
  const menu = ROL_MENULERI[profil?.rol] || ROL_MENULERI.eleman

  async function cikisYap() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div className="flex min-h-screen">
      <aside className="w-52 shrink-0 bg-gray-900 border-r border-gray-800 flex flex-col">
        <div className="px-4 py-5 border-b border-gray-800">
          <div className="text-blue-400 font-bold text-lg tracking-wide">GİVAYO</div>
          <div className="text-gray-500 text-xs tracking-widest mt-0.5">ÜRETİM SİSTEMİ</div>
        </div>

        <nav className="flex-1 py-3">
          {menu.map(item => {
            const active = router.pathname === item.href || router.pathname.startsWith(item.href + '/')
            return (
              <Link key={item.href} href={item.href}>
                <span className={`flex items-center gap-2.5 px-4 py-2.5 text-sm cursor-pointer border-l-2 transition-colors
                  ${active
                    ? 'text-blue-400 border-blue-500 bg-blue-950/40'
                    : 'text-gray-400 border-transparent hover:text-gray-200 hover:bg-gray-800'}`}>
                  <span className="text-base">{item.icon}</span>
                  {item.label}
                </span>
              </Link>
            )
          })}
        </nav>

        <div className="px-4 py-3 border-t border-gray-800">
          <div className="text-xs text-gray-300 font-medium truncate">{profil?.ad_soyad || kullanici?.email}</div>
          <div className="text-xs text-gray-600 mb-2">{ROL_ETIKET[profil?.rol] || profil?.rol}</div>
          <button onClick={cikisYap} className="w-full text-xs text-gray-500 hover:text-red-400 transition-colors text-left">
            ← Çıkış Yap
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}
