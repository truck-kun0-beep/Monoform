import { cn } from "@/lib/utils";

type Tone = "info" | "success" | "error";

type Props = {
  tone?: Tone;
  title?: string;
  children: React.ReactNode;
  className?: string;
  role?: "alert" | "status";
};

const toneStyles: Record<Tone, string> = {
  info: "border-line bg-paper-warm text-ink",
  success: "border-success/40 bg-paper text-ink",
  error: "border-danger/40 bg-paper text-ink",
};

const titleToneStyles: Record<Tone, string> = {
  info: "text-ink-muted",
  success: "text-success",
  error: "text-danger",
};

/**
 * Inline message rendered above the auth form. Used for
 * verification-pending notices, neutral reset-link acknowledgements
 * and provider errors. The error variant is announced via
 * `role="alert"`.
 */
export function AuthMessage({
  tone = "info",
  title,
  children,
  className,
  role = tone === "error" ? "alert" : "status",
}: Props) {
  return (
    <div
      role={role}
      className={cn("border px-4 py-3 text-sm", toneStyles[tone], className)}
    >
      {title ? (
        <p className={cn("text-eyebrow uppercase", titleToneStyles[tone])}>
          {title}
        </p>
      ) : null}
      <div className="mt-1 text-ink-muted">{children}</div>
    </div>
  );
}
