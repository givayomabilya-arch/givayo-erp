import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { email, password, ad_soyad, rol, istasyon } = req.body
  if (!email || !password || !ad_soyad) return res.status(400).json({ error: 'Eksik alan' })

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { ad_soyad, rol: rol || 'eleman' }
  })

  if (error) return res.status(400).json({ error: error.message })

  await supabaseAdmin.from('kullanicilar').upsert({
    id: data.user.id,
    email,
    ad_soyad,
    rol: rol || 'eleman',
    istasyon: istasyon || null,
    aktif: true
  })

  return res.status(200).json({ id: data.user.id })
}
