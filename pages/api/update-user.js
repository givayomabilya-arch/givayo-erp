import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { user_id, password } = req.body
  if (!user_id) return res.status(400).json({ error: 'user_id gerekli' })

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!key) return res.status(500).json({ error: 'Service role key eksik' })

  const supabaseAdmin = createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })

  if (password && password.length >= 6) {
    const { error } = await supabaseAdmin.auth.admin.updateUserById(user_id, { password })
    if (error) return res.status(400).json({ error: error.message, user_id, key_prefix: key.substring(0, 20) })
  }

  return res.status(200).json({ success: true })
}
