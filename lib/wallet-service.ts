import { supabase } from '@/lib/supabase';
import { hashPin } from '@/lib/security';
import type {
  Wallet,
  TransactionWithProfiles,
  RedemptionRow,
  BankAccount,
  WalletNotification,
  RecipientLookup,
  TransferResult,
  RedemptionResult,
  TransactionFilter,
} from '@/types/wallet';

const MIN_TRANSFER = 100;
const MAX_DAILY_TRANSFER = 20000;
const MIN_REDEMPTION = 100;
const MONIEPOINT_ACCOUNT_LENGTH = 10;

// ─── Wallet ──────────────────────────────────────────────────────────────────

export async function getMyWallet(): Promise<Wallet | null> {
  const { data, error } = await supabase.rpc('get_my_wallet');
  if (error) {
    console.warn('[wallet] get_my_wallet failed', error.message);
    return null;
  }
  return (data as Wallet) ?? null;
}

export function getWalletLimits() {
  return { minTransfer: MIN_TRANSFER, maxDailyTransfer: MAX_DAILY_TRANSFER, minRedemption: MIN_REDEMPTION };
}

// ─── Recipient lookup ────────────────────────────────────────────────────────

export async function lookupRecipient(identifier: string): Promise<RecipientLookup> {
  const { data, error } = await supabase.rpc('lookup_recipient', {
    p_identifier: identifier,
  });
  if (error) return { found: false };
  return (data as RecipientLookup) ?? { found: false };
}

// ─── Transfer ────────────────────────────────────────────────────────────────

export async function transferW3od(
  recipientIdentifier: string,
  amount: number,
  description: string,
  pin: string
): Promise<TransferResult> {
  if (amount < MIN_TRANSFER) {
    return { success: false, error: `Minimum transfer is ₦${MIN_TRANSFER}.` };
  }
  if (amount > MAX_DAILY_TRANSFER) {
    return { success: false, error: `Maximum single transfer is ₦${MAX_DAILY_TRANSFER}.` };
  }

  const pinHash = await hashPin(pin);

  const { data, error } = await supabase.rpc('transfer_w3od', {
    p_recipient_identifier: recipientIdentifier,
    p_amount: amount,
    p_description: description || null,
    p_pin_hash: pinHash,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  const result = data as TransferResult;
  if (result.success && result.reference) {
    // Fire-and-forget: notify the sender
    supabase.rpc('notify_transaction_sender', { p_reference: result.reference }).then(({ error: e }) => {
      if (e) console.warn('[wallet] sender notify failed', e.message);
    });
  }
  return result;
}

// ─── Redemption ──────────────────────────────────────────────────────────────

export async function submitRedemption(amount: number, pin: string): Promise<RedemptionResult> {
  if (amount < MIN_REDEMPTION) {
    return { success: false, error: `Minimum redemption is ₦${MIN_REDEMPTION}.` };
  }
  const pinHash = await hashPin(pin);
  const { data, error } = await supabase.rpc('submit_redemption', {
    p_amount: amount,
    p_pin_hash: pinHash,
  });
  if (error) return { success: false, error: error.message };
  return data as RedemptionResult;
}

export async function getRedemptions(): Promise<RedemptionRow[]> {
  const { data, error } = await supabase
    .from('redemptions')
    .select('*')
    .order('requested_at', { ascending: false });
  if (error || !data) return [];
  return data as RedemptionRow[];
}

export async function getNextProcessingDate(): Promise<string | null> {
  const { data, error } = await supabase.rpc('get_next_processing_date');
  if (error) return null;
  return data as string;
}

// ─── Bank account ────────────────────────────────────────────────────────────

export function validateAccountNumber(accountNumber: string): boolean {
  return new RegExp(`^\\d{${MONIEPOINT_ACCOUNT_LENGTH}}$`).test(accountNumber.trim());
}

export async function getBankAccount(): Promise<BankAccount | null> {
  const { data, error } = await supabase
    .from('bank_accounts')
    .select('*')
    .maybeSingle();
  if (error) {
    console.warn('[wallet] bank account fetch failed', error.message);
    return null;
  }
  return (data as BankAccount) ?? null;
}

export async function saveBankAccount(
  accountName: string,
  accountNumber: string
): Promise<{ error: string | null }> {
  const cleanName = accountName.trim();
  const cleanNum = accountNumber.trim();
  if (!cleanName) return { error: 'Account name is required.' };
  if (!validateAccountNumber(cleanNum)) {
    return { error: `Account number must be ${MONIEPOINT_ACCOUNT_LENGTH} digits.` };
  }

  // Upsert — one account per user (user_id is unique)
  const { error } = await supabase.from('bank_accounts').upsert(
    {
      account_name: cleanName,
      account_number: cleanNum,
      bank_name: 'Moniepoint',
    },
    { onConflict: 'user_id' }
  );

  if (error) return { error: error.message };
  return { error: null };
}

export async function deleteBankAccount(): Promise<{ error: string | null }> {
  const { error } = await supabase.from('bank_accounts').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (error) return { error: error.message };
  return { error: null };
}

// ─── Transactions ────────────────────────────────────────────────────────────

export async function getTransactions(
  filter: TransactionFilter = {}
): Promise<TransactionWithProfiles[]> {
  let query = supabase
    .from('transactions')
    .select(
      `
      id, reference, sender_id, receiver_id, amount, type, status, description, created_at,
      sender:sender_id ( username, display_name, avatar_url ),
      receiver:receiver_id ( username, display_name, avatar_url )
    `
    )
    .order('created_at', { ascending: false })
    .limit(200);

  if (filter.type && filter.type !== 'all') {
    query = query.eq('type', filter.type);
  }
  if (filter.status && filter.status !== 'all') {
    query = query.eq('status', filter.status);
  }
  if (filter.fromDate) {
    query = query.gte('created_at', filter.fromDate.toISOString());
  }
  if (filter.toDate) {
    const end = new Date(filter.toDate);
    end.setHours(23, 59, 59, 999);
    query = query.lte('created_at', end.toISOString());
  }

  const { data, error } = await query;
  if (error || !data) {
    console.warn('[wallet] transactions fetch failed', error?.message);
    return [];
  }

  const rows = (data as unknown[]).map((row) => {
    const r = row as Record<string, unknown>;
    const sender = (r.sender ?? {}) as Record<string, unknown>;
    const receiver = (r.receiver ?? {}) as Record<string, unknown>;
    return {
      id: r.id as string,
      reference: r.reference as string,
      sender_id: r.sender_id as string | null,
      receiver_id: r.receiver_id as string | null,
      amount: Number(r.amount),
      type: r.type as TransactionWithProfiles['type'],
      status: r.status as TransactionWithProfiles['status'],
      description: (r.description as string) ?? null,
      created_at: r.created_at as string,
      sender_username: (sender.username as string) ?? null,
      sender_display_name: (sender.display_name as string) ?? null,
      sender_avatar_url: (sender.avatar_url as string) ?? null,
      receiver_username: (receiver.username as string) ?? null,
      receiver_display_name: (receiver.display_name as string) ?? null,
      receiver_avatar_url: (receiver.avatar_url as string) ?? null,
    } as TransactionWithProfiles;
  });

  if (filter.search) {
    const q = filter.search.toLowerCase();
    return rows.filter(
      (tx) =>
        tx.reference.toLowerCase().includes(q) ||
        (tx.sender_username ?? '').toLowerCase().includes(q) ||
        (tx.receiver_username ?? '').toLowerCase().includes(q) ||
        (tx.sender_display_name ?? '').toLowerCase().includes(q) ||
        (tx.receiver_display_name ?? '').toLowerCase().includes(q) ||
        (tx.description ?? '').toLowerCase().includes(q)
    );
  }

  return rows;
}

export async function getTransactionByReference(reference: string): Promise<TransactionWithProfiles | null> {
  const { data, error } = await supabase
    .from('transactions')
    .select(
      `
      id, reference, sender_id, receiver_id, amount, type, status, description, created_at,
      sender:sender_id ( username, display_name, avatar_url ),
      receiver:receiver_id ( username, display_name, avatar_url )
    `
    )
    .eq('reference', reference)
    .maybeSingle();

  if (error || !data) return null;
  const r = data as Record<string, unknown>;
  const sender = (r.sender ?? {}) as Record<string, unknown>;
  const receiver = (r.receiver ?? {}) as Record<string, unknown>;
  return {
    id: r.id as string,
    reference: r.reference as string,
    sender_id: r.sender_id as string | null,
    receiver_id: r.receiver_id as string | null,
    amount: Number(r.amount),
    type: r.type as TransactionWithProfiles['type'],
    status: r.status as TransactionWithProfiles['status'],
    description: (r.description as string) ?? null,
    created_at: r.created_at as string,
    sender_username: (sender.username as string) ?? null,
    sender_display_name: (sender.display_name as string) ?? null,
    sender_avatar_url: (sender.avatar_url as string) ?? null,
    receiver_username: (receiver.username as string) ?? null,
    receiver_display_name: (receiver.display_name as string) ?? null,
    receiver_avatar_url: (receiver.avatar_url as string) ?? null,
  };
}

// ─── Notifications ───────────────────────────────────────────────────────────

export async function getNotifications(limit = 50): Promise<WalletNotification[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error || !data) return [];
  return data as WalletNotification[];
}

export async function getUnreadNotificationCount(): Promise<number> {
  const { data, error } = await supabase.rpc('get_unread_notification_count');
  if (error || data === null) return 0;
  return data as number;
}

export async function markAllNotificationsRead(): Promise<void> {
  await supabase.rpc('mark_all_notifications_read');
}

export async function markNotificationRead(id: string): Promise<void> {
  await supabase.from('notifications').update({ read: true }).eq('id', id);
}

// ─── Formatting helpers ──────────────────────────────────────────────────────

export function formatW3od(amount: number, hidden = false): string {
  if (hidden) return '₦ ••••••';
  return (
    '₦' +
    amount.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}

export function formatAmount(amount: number): string {
  return amount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
