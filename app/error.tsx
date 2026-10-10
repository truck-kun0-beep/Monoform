"use client";

import { useEffect } from "react";
import { Button, ErrorMessage } from "@/components/ui";

/**
 * Global error boundary. Catches uncaught client errors and offers a
 * way to retry.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Hook for future telemetry — intentionally a no-op in the
    // foundation so we don't fake a backend integration.
  }, [error]);

  return (
    <section className="container-bleed py-section">
      <ErrorMessage title="Something went wrong">
        <p>
          An unexpected error occurred while rendering this page. You can try
          again, or return to the homepage.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Button onClick={reset}>Try Again</Button>
          <Button href="/" variant="secondary">
            Return Home
          </Button>
        </div>
      </ErrorMessage>
    </section>
  );
}
