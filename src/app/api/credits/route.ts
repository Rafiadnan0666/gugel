import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/utils/supabase/server';
import { creditService } from '@/lib/credit-service';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userId, amount, reason } = await request.json();

    if (!userId || typeof userId !== 'string') {
      return NextResponse.json({ error: 'Valid user ID is required' }, { status: 400 });
    }

    if (typeof amount !== 'number' || !Number.isFinite(amount) || !Number.isInteger(amount)) {
      return NextResponse.json({ error: 'Amount must be a valid integer' }, { status: 400 });
    }

    if (Math.abs(amount) > 100000) {
      return NextResponse.json({ error: 'Amount exceeds maximum adjustment limit (100,000)' }, { status: 400 });
    }

    if (reason && typeof reason === 'string' && reason.length > 500) {
      return NextResponse.json({ error: 'Reason must be under 500 characters' }, { status: 400 });
    }

    const { data: userRoles } = await supabase
      .from('user_role_assignments')
      .select('user_roles!inner(name)')
      .eq('user_id', user.id);

    const isAdmin = userRoles?.some((assignment: any) => 
      assignment.user_roles.name === 'admin'
    );

    if (!isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const success = await creditService.adminAdjustUserCredits(userId, amount, reason);

    if (success) {
      const newBalance = await creditService.getUserCreditBalance(userId);
      return NextResponse.json({ 
        success: true, 
        newBalance,
        message: `Successfully ${amount > 0 ? 'added' : 'removed'} ${Math.abs(amount)} credits` 
      });
    } else {
      return NextResponse.json({ error: 'Failed to adjust credits' }, { status: 500 });
    }
  } catch (error) {
    console.error('Error in credit-adjustment API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (userId && userId !== user.id) {
      const { data: userRoles } = await supabase
        .from('user_role_assignments')
        .select('user_roles!inner(name)')
        .eq('user_id', user.id);

      const isAdmin = userRoles?.some((assignment: any) => 
        assignment.user_roles.name === 'admin'
      );

      if (!isAdmin) {
        return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
      }
    }

    const targetUserId = userId || user.id;
    const balance = await creditService.getUserCreditBalance(targetUserId);
    const history = await creditService.getCreditHistory(targetUserId);
    const stats = await creditService.getCreditUsageStats(targetUserId);

    return NextResponse.json({
      balance,
      history,
      stats,
      userId: targetUserId
    });
  } catch (error) {
    console.error('Error in credit API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}