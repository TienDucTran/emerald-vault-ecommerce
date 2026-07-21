/**
 * /api/admin/chatbot/leads — list chat_leads cho admin xem
 * Auth: requireAdmin
 */
import { NextResponse } from 'next/server';
import { authErrorResponse, requireAdmin } from '@/lib/auth/require-admin';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: Request) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '100', 10) || 100, 500);
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('chat_leads')
      .select('id, session_id, user_id, contact_type, contact_value, intent, matched_product_id, created_at')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) {
      return NextResponse.json({ error: 'DB_ERROR', message: error.message }, { status: 500 });
    }
    return NextResponse.json({ items: data ?? [] });
  } catch (e) {
    return authErrorResponse(e);
  }
}
