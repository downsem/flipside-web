import { Button } from "./Button";

export function EmptyState({
  title,
  description,
  ctaLabel,
  onCta,
}: {
  title: string;
  description?: string;
  ctaLabel?: string;
  onCta?: () => void;
}) {
  return (
    <div className="mx-auto flex max-w-sm flex-col items-center text-center py-10">
      <div className="text-[var(--text-lg)] font-semibold">{title}</div>
      {description && (
        <div className="mt-2 text-[var(--text-sm)] text-neutral-600">
          {description}
        </div>
      )}
      {ctaLabel && onCta && (
        <Button className="mt-5" onClick={onCta}>
          {ctaLabel}
        </Button>
      )}
    </div>
  );
}
