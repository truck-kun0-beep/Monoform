import { Spinner } from "@/components/ui";

/**
 * Global loading state shown on navigations. App Router automatically
 * wraps the loading boundary around the matched route.
 */
export default function Loading() {
  return (
    <div className="flex min-h-[50dvh] items-center justify-center">
      <Spinner label="Loading page" />
    </div>
  );
}
