import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Lazy: no instanciar en module-scope o el build falla al "collect page data"
// cuando NEXT_PUBLIC_SUPABASE_URL no está en el entorno de build (Vercel).
function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(request: NextRequest) {
  const supabaseAdmin = getSupabaseAdmin();
  try {
    const { subscription, userId, deviceInfo, oldEndpoint } = await request.json();

    if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
      return NextResponse.json({ error: 'Invalid subscription' }, { status: 400 });
    }

    // Si es un cambio de suscripcion, eliminar la anterior
    if (oldEndpoint) {
      await supabaseAdmin
        .from('push_subscriptions')
        .delete()
        .eq('endpoint', oldEndpoint);
    }

    // Check si ya existe
    const { data: existing } = await supabaseAdmin
      .from('push_subscriptions')
      .select('id')
      .eq('endpoint', subscription.endpoint)
      .single();

    if (existing) {
      await supabaseAdmin
        .from('push_subscriptions')
        .update({ last_used_at: new Date().toISOString() })
        .eq('id', existing.id);

      return NextResponse.json({ success: true, subscription_id: existing.id });
    }

    const { data, error } = await supabaseAdmin
      .from('push_subscriptions')
      .insert({
        user_id: userId || null,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        browser: deviceInfo?.browser,
        user_agent: deviceInfo?.userAgent || '',
      })
      .select('id')
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, subscription_id: data.id });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const supabaseAdmin = getSupabaseAdmin();
  try {
    const { endpoint } = await request.json();

    await supabaseAdmin
      .from('push_subscriptions')
      .delete()
      .eq('endpoint', endpoint);

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
