import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { user_id, password } = req.body
  if (!user_id) return res.status(400).json({ error: 'user_id gerekli' })

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  if (password && password.length >= 6) {
    const { error } = await supabaseAdmin.rpc('update_user_password_v2', {
      p_user_id: user_id,
      p_password: password
    })
    if (error) return res.status(400).json({ error: error.message })
  }

  return res.status(200).json({ success: true })
}
