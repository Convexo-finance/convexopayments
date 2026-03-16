-- Increment user USDC balance in profiles table (for TOP_UP completions)
CREATE OR REPLACE FUNCTION increment_balance(user_id TEXT, amount NUMERIC)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE profiles
  SET usdc_balance = COALESCE(usdc_balance, 0) + amount,
      updated_at = now()
  WHERE user_id = (SELECT id FROM users WHERE privy_user_id = increment_balance.user_id);
END;
$$;

-- Decrement user USDC balance in profiles table (for WITHDRAWAL completions)
CREATE OR REPLACE FUNCTION decrement_balance(user_id TEXT, amount NUMERIC)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE profiles
  SET usdc_balance = GREATEST(COALESCE(usdc_balance, 0) - amount, 0),
      updated_at = now()
  WHERE user_id = (SELECT id FROM users WHERE privy_user_id = decrement_balance.user_id);
END;
$$;

-- Grant execute to authenticated and service roles
GRANT EXECUTE ON FUNCTION increment_balance(TEXT, NUMERIC) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION decrement_balance(TEXT, NUMERIC) TO authenticated, service_role;
