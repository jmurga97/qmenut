export interface SegmentedOption<T extends string> {
  label: string;
  value: T;
}

interface SegmentedToggleProps<T extends string> {
  ariaLabel: string;
  className?: string;
  onChange: (value: T) => void;
  options: ReadonlyArray<SegmentedOption<T>>;
  value: T;
}

export function SegmentedToggle<T extends string>({
  ariaLabel,
  className,
  onChange,
  options,
  value,
}: SegmentedToggleProps<T>) {
  return (
    <div aria-label={ariaLabel} className={className ? `admin-segmented ${className}` : "admin-segmented"} role="group">
      {options.map((option) => (
        <button
          aria-pressed={option.value === value}
          key={option.value}
          onClick={() => onChange(option.value)}
          type="button"
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
