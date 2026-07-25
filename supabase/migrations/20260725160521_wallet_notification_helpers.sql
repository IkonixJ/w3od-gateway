/*
# W3OD Gateway: Wallet notification + history helpers

## Purpose
Adds SECURITY DEFINER helper functions for the wallet UI:
- `notify_transaction_sender` — sends the "Payment Sent" notification to the
  sender after a successful transfer (transfer_w3od already notifies the
  receiver; the sender notification is triggered from the client after the
  RPC returns the reference, so we expose a thin helper).
- `get_unread_notification_count` — returns the caller's unread notification
  count for the badge.
- `mark_all_notifications_read` — marks all of the caller's notifications read.

## Security
- All functions are SECURITY DEFINER and verify auth.uid() ownership.
- notify_transaction_sender confirms the reference belongs to a transaction
  where the caller is the sender before inserting the notification.
*/

-- Sender-side transfer notification helper
CREATE OR REPLACE FUNCTION public.notify_transaction_sender(p_reference text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tx public.transactions;
BEGIN
  SELECT * INTO v_tx FROM public.transactions WHERE reference = p_reference AND sender_id = auth.uid();
  IF NOT FOUND THEN
    RETURN;
  END IF;
  PERFORM public.create_notification(
    auth.uid(),
    'Payment Sent',
    'You sent ₦' || v_tx.amount::text || ' W3OD. Ref: ' || v_tx.reference,
    'transaction', 'cyan', 'reward',
    jsonb_build_object('reference', v_tx.reference, 'amount', v_tx.amount, 'type', 'send')
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.notify_transaction_sender(text) TO authenticated;

-- Unread count
CREATE OR REPLACE FUNCTION public.get_unread_notification_count()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  SELECT count(*) INTO v_count FROM public.notifications WHERE user_id = auth.uid() AND read = false;
  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_unread_notification_count() TO authenticated;

-- Mark all read
CREATE OR REPLACE FUNCTION public.mark_all_notifications_read()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.notifications SET read = true WHERE user_id = auth.uid() AND read = false;
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_all_notifications_read() TO authenticated;
