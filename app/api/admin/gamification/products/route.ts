/**
 * GET /api/admin/gamification/products
 * Returns SS/S products available for gift pool (admin only)
 */

import { NextResponse } from 'next/server';
import { authErrorResponse, requireAdmin } from '@/lib/auth/require-admin';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await requireAdmin();
    const supabase = createAdminClient();
    // Get all SS/S products (gift pool eligible)
    const { data, error } = await supabase
      .from('products')
      .select('id, title, price, quality_tier, is_gift')
      .in('quality_tier', ['SS', 'S'])
      .order('title', { ascending: true });

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, data: data ?? [] });
  } catch (err) {
    return authErrorResponse(err, 'admin/gamification/products');
  }
}