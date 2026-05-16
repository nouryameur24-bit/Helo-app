import { supabase, isSupabaseConfigured } from '@/lib/supabase';

const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function generatePartnerCode(): string {
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += CHARS[Math.floor(Math.random() * CHARS.length)];
  }
  return code;
}

export async function upsertProfile(params: {
  userId: string;
  firstName?: string;
  dueDate?: string | null;
  trimester?: number | null;
  partnerCode?: string | null;
  pushToken?: string | null;
}): Promise<void> {
  if (!isSupabaseConfigured) return;

  const row: Record<string, unknown> = {
    id: params.userId,
  };

  if (params.firstName !== undefined) row.first_name = params.firstName;
  if (params.dueDate !== undefined) row.due_date = params.dueDate;
  if (params.trimester !== undefined) row.trimester = params.trimester;
  if (params.partnerCode !== undefined) row.partner_code = params.partnerCode;
  if (params.pushToken !== undefined) row.push_token = params.pushToken;

  const { error } = await supabase.from('profiles').upsert(row, { onConflict: 'id' });
  if (error) throw new Error(error.message);
}

export async function upsertProfileSafe(params: Parameters<typeof upsertProfile>[0]): Promise<void> {
  try {
    await upsertProfile(params);
  } catch (err) {
    if (__DEV__) console.warn('[upsertProfile] error:', err instanceof Error ? err.message : err);
  }
}

export async function lookupPartnerCode(code: string): Promise<{ userId: string; firstName: string } | null> {
  if (!isSupabaseConfigured) return null;
  const { data, error } = await supabase
    .from('profiles')
    .select('id, first_name')
    .eq('partner_code', code.toUpperCase())
    .maybeSingle();

  if (error || !data) return null;
  return { userId: data.id, firstName: data.first_name };
}

export async function linkPartner(pregnantUserId: string, partnerUserId: string): Promise<void> {
  if (!isSupabaseConfigured) return;
  await supabase.from('partner_links').delete().eq('partner_user_id', partnerUserId);
  const { error } = await supabase.from('partner_links').insert({
    pregnant_user_id: pregnantUserId,
    partner_user_id: partnerUserId,
  });
  if (error) throw new Error(error.message);
}

export async function unlinkPartner(params: { userId: string; role: 'pregnant' | 'partner' }): Promise<void> {
  if (!isSupabaseConfigured) return;
  if (params.role === 'pregnant') {
    await supabase.from('partner_links').delete().eq('pregnant_user_id', params.userId);
  } else {
    await supabase.from('partner_links').delete().eq('partner_user_id', params.userId);
  }
}

export async function regeneratePartnerCode(userId: string, maxRetries = 3): Promise<string> {
  if (!isSupabaseConfigured) return generatePartnerCode();

  await supabase.from('partner_links').delete().eq('pregnant_user_id', userId);

  let lastError: Error | null = null;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const newCode = generatePartnerCode();
    try {
      await upsertProfile({ userId, partnerCode: newCode });
      return newCode;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      const msg = lastError.message.toLowerCase();
      if (!msg.includes('unique') && !msg.includes('duplicate')) {
        throw lastError;
      }
    }
  }
  throw lastError ?? new Error('Failed to generate unique partner code');
}
