import { Redirect, useFocusEffect, useRouter } from 'expo-router';
import { type ReactNode, useCallback } from 'react';

import { useAuth } from '@/context/AuthProvider';
import type { UserRole } from '@/types';

export const ROLE_RANK: Record<UserRole, number> = {
  member: 0,
  moderator: 1,
  admin: 2,
};

export function hasRole(actual: UserRole, required: UserRole): boolean {
  return ROLE_RANK[actual] >= ROLE_RANK[required];
}

export function useRole(): UserRole {
  const { role } = useAuth();
  return role;
}

export function RequireRole({
  role,
  fallback = '/(tabs)',
  children,
}: {
  role: UserRole;
  fallback?: string;
  children: ReactNode;
}) {
  const { role: current, initializing } = useAuth();
  const router = useRouter();

  useFocusEffect(
    useCallback(() => {
      if (!initializing && !hasRole(current, role)) {
        router.replace(fallback as never);
      }
    }, [current, role, initializing, fallback, router])
  );

  if (initializing) return null;
  if (!hasRole(current, role)) return <Redirect href={fallback as never} />;
  return <>{children}</>;
}
