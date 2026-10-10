import Link from "next/link";
import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "link";
type Size = "sm" | "md" | "lg";

type CommonProps = {
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
  loading?: boolean;
  children: ReactNode;
  className?: string;
};

const baseStyles =
  "inline-flex items-center justify-center gap-2 font-sans tracking-wide " +
  "transition-colors duration-base ease-out-soft " +
  "disabled:cursor-not-allowed disabled:opacity-50 " +
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink";

const sizeStyles: Record<Size, string> = {
  sm: "h-9 px-4 text-xs uppercase tracking-[0.18em]",
  md: "h-11 px-6 text-xs uppercase tracking-[0.18em]",
  lg: "h-12 px-8 text-sm uppercase tracking-[0.2em]",
};

const variantStyles: Record<Variant, string> = {
  primary:
    "bg-ink text-paper hover:bg-ink-soft active:bg-ink " +
    "border border-ink",
  secondary:
    "bg-transparent text-ink border border-line-strong " +
    "hover:bg-ink hover:text-paper",
  ghost:
    "bg-transparent text-ink hover:text-ink-soft " +
    "border border-transparent",
  link:
    "bg-transparent text-ink underline-offset-4 hover:underline " +
    "border border-transparent px-0 h-auto",
};

type ButtonAsButtonProps = CommonProps &
  Omit<ComponentPropsWithoutRef<"button">, "children" | "className"> & {
    href?: undefined;
  };

type ButtonAsLinkProps = CommonProps &
  Omit<ComponentPropsWithoutRef<typeof Link>, "children" | "className"> & {
    href: string;
  };

export type ButtonProps = ButtonAsButtonProps | ButtonAsLinkProps;

/**
 * Polymorphic button.
 *
 * Renders as a real `<button>` by default, or as a Next.js `<Link>`
 * when an `href` is supplied. The link variant is intended for
 * in-app navigation only — pass a plain anchor for external links.
 */
export function Button(props: ButtonProps) {
  const {
    variant = "primary",
    size = "md",
    fullWidth = false,
    loading = false,
    className,
    children,
  } = props;

  const classes = cn(
    baseStyles,
    sizeStyles[size],
    variantStyles[variant],
    fullWidth && "w-full",
    className,
  );

  if ("href" in props && props.href !== undefined) {
    const { href, variant: _v, size: _s, fullWidth: _f, loading: _l, className: _c, children: _ch, ...rest } =
      props;
    return (
      <Link href={href} className={classes} {...rest}>
        {loading ? <ButtonSpinner /> : null}
        <span>{children}</span>
      </Link>
    );
  }

  const { variant: _v, size: _s, fullWidth: _f, loading: _l, className: _c, children: _ch, disabled, type, ...rest } =
    props as ButtonAsButtonProps;
  return (
    <button
      type={type ?? "button"}
      className={classes}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? <ButtonSpinner /> : null}
      <span>{children}</span>
    </button>
  );
}

function ButtonSpinner() {
  return (
    <span
      aria-hidden="true"
      className="inline-block h-3 w-3 animate-spin rounded-full border border-current border-t-transparent"
    />
  );
}
