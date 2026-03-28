import { Button } from "./Button";

export function ErrorState({
  title = "Something went wrong",
  description,
  onRetry,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="mx-auto flex max-w-sm flex-col items-center text-center py-10">
      <div className="text-[var(--text-lg)] font-semibold">{title}</div>
      {description && (
        <div className="mt-2 text-[var(--text-sm)] text-neutral-600">
          {description}
        </div>
      )}
      {onRetry && (
        <Button variant="secondary" className="mt-5" onClick={onRetry}>
          Retry
        </Button>
      )}
    </div>
  );
}
