import Link from 'next/link'
import { useRouter } from 'next/router'

const navItems = [
  { href: '/', label: 'Dashboard', icon: '📊' },
  { href: '/siparisler', label: 'Siparişler', icon: '📦' },
  { href: '/uretim', label: 'Üretim Planı', icon: '🏭' },
  { href: '/katalog', label: 'Katalog', icon: '🗂️' },
  { href: '/tablet', label: 'Eleman Tableti', icon: '📱' },
]

export default function Layout({ children }) {
  const router = useRouter()

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-52 shrink-0 bg-gray-900 border-r border-gray-800 flex flex-col">
        <div className="px-4 py-5 border-b border-gray-800">
          <div className="text-blue-400 font-bold text-lg tracking-wide">GİVAYO</div>
          <div className="text-gray-500 text-xs tracking-widest mt-0.5">ÜRETİM SİSTEMİ</div>
        </div>
        <nav className="flex-1 py-3">
          {navItems.map(item => {
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
        <div className="px-4 py-3 border-t border-gray-800 text-xs text-gray-600">
          v1.0 · Givayo Mobilya
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}
