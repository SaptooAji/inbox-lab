export interface TextFieldProps {
  readonly id: string;
  readonly label: string;
  readonly name: string;
  readonly type: "text" | "email";
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly error: string | undefined;
  readonly hint: string | undefined;
  readonly required: boolean;
  readonly autoComplete: string | undefined;
  readonly maxLength: number;
}

export function TextField({
  id,
  label,
  name,
  type,
  value,
  onChange,
  error,
  hint,
  required,
  autoComplete,
  maxLength,
}: TextFieldProps) {
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = [hint === undefined ? "" : hintId, error === undefined ? "" : errorId]
    .filter((part) => part !== "")
    .join(" ");

  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium">
        {label}
        {required ? <span aria-hidden="true"> *</span> : null}
      </label>
      <input
        id={id}
        name={name}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        autoComplete={autoComplete}
        maxLength={maxLength}
        aria-invalid={error === undefined ? undefined : true}
        aria-describedby={describedBy === "" ? undefined : describedBy}
        className="mt-1 block w-full rounded-md border border-control bg-surface px-3 py-2 text-text aria-invalid:border-2 aria-invalid:border-error"
      />
      {hint === undefined ? null : (
        <p id={hintId} className="mt-1 text-sm text-muted">
          {hint}
        </p>
      )}
      {error === undefined ? null : (
        <p id={errorId} className="mt-1 text-sm font-medium text-error">
          {error}
        </p>
      )}
    </div>
  );
}
