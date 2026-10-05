interface Option<T extends string> {
  readonly value: T;
  readonly label: string;
}

interface SegmentedControlProps<T extends string> {
  readonly legend: string;
  readonly name: string;
  readonly options: readonly Option<T>[];
  readonly value: T;
  readonly onChange: (value: T) => void;
  readonly disabled?: boolean;
}

export function SegmentedControl<T extends string>({
  legend,
  name,
  options,
  value,
  onChange,
  disabled,
}: SegmentedControlProps<T>) {
  return (
    <fieldset disabled={disabled} className="group min-w-0">
      <legend className="mb-1 text-sm font-medium text-muted">{legend}</legend>
      <div className="inline-flex overflow-hidden rounded-md border border-control group-disabled:opacity-50">
        {options.map((option) => (
          <label key={option.value} className="block">
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={option.value === value}
              onChange={() => onChange(option.value)}
              className="peer sr-only"
            />
            <span className="block cursor-pointer px-3 py-1.5 text-sm peer-checked:bg-primary peer-checked:text-on-primary peer-focus-visible:outline-2 peer-focus-visible:-outline-offset-4 peer-focus-visible:outline-text">
              {option.label}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
