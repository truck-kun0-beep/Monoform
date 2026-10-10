"use client";

import type { ReactNode } from "react";
import { ToastProvider } from "@/components/ui";
import { GlobalMountPoints } from "@/components/global";
import { AuthProvider } from "@/lib/auth/react";

/**
 * Centralised client-side providers. The auth provider subscribes
 * to the Supabase session and re-renders consumers when the user
 * signs in / out, while the toast provider exposes the global
 * notification system. GlobalMountPoints mounts the cookie
 * consent banner and any other site-wide client-only utilities.
 */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <ToastProvider>
        {children}
        <GlobalMountPoints />
      </ToastProvider>
    </AuthProvider>
  );
}
