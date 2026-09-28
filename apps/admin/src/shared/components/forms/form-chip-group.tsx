import { Field, TagPicker } from "@jmurga97/components";
import { useController, useFormContext } from "react-hook-form";

import { i18n } from "~/lib/i18n";

import type { FieldPath, FieldValues } from "react-hook-form";

type ChipId = number | string;

interface FormChipGroupProps<TValues extends FieldValues> {
  disabled?: boolean;
  label: string;
  name: FieldPath<TValues>;
  options: { id: ChipId; label: string }[];
}
export function FormChipGroup<TValues extends FieldValues>({
  disabled,
  label,
  name,
  options,
}: FormChipGroupProps<TValues>) {
  const { control } = useFormContext<TValues>();
  const { field, fieldState } = useController({ control, name });
  const selected = Array.isArray(field.value) ? (field.value as ChipId[]) : [];
  const ids = new Map(options.map((option) => [String(option.id), option.id]));
  return (
    <Field
      disabled={disabled}
      error={fieldState.error?.message}
      invalid={Boolean(fieldState.error)}
      label={label}
      optionalLabel={i18n.t("shared___Optional")}
    >
      <TagPicker
        ariaLabel={label}
        disabled={disabled}
        emptyLabel={i18n.t("shared___No hay resultados")}
        onValueChange={(value) => field.onChange(value.map((id) => ids.get(id) ?? id))}
        options={options.map(({ id, label: optionLabel }) => ({ id: String(id), label: optionLabel }))}
        placeholder={i18n.t("shared___Buscar")}
        value={selected.map(String)}
      />
    </Field>
  );
}
