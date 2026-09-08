import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/utils/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { to, subject, body, type } = await request.json();

    if (!to || !subject || !body) {
      return NextResponse.json({ error: 'Missing required fields: to, subject, body' }, { status: 400 });
    }

    // Check user notification preferences
    const { data: profile } = await supabase
      .from('profiles')
      .select('settings')
      .eq('id', to)
      .single();

    const settings = (profile?.settings as any) || {};
    if (settings.email_notifications === false) {
      return NextResponse.json({ success: true, skipped: true, reason: 'User has email notifications disabled' });
    }

    // Create in-app notification
    await supabase
      .from('notifications')
      .insert({
        user_id: to,
        message: body,
        type: type || 'general',
        read: false,
      });

    // Email sending - uses Supabase Edge Functions or external service
    // For now, we create the notification record. To send actual emails,
    // configure Resend, SendGrid, or use Supabase's built-in email.
    const emailEnabled = !!process.env.RESEND_API_KEY || !!process.env.SENDGRID_API_KEY;

    if (emailEnabled && process.env.RESEND_API_KEY) {
      try {
        const emailResponse = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: process.env.EMAIL_FROM || 'noreply@tabwise.app',
            to: [to],
            subject,
            html: body,
          }),
        });

        if (!emailResponse.ok) {
          console.error('Resend email failed:', await emailResponse.text());
        }
      } catch (emailErr) {
        console.error('Email send error:', emailErr);
      }
    }

    return NextResponse.json({ success: true, emailEnabled });
  } catch (error) {
    console.error('Notification error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
