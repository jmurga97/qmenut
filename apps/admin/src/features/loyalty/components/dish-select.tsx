import { Select } from "@base-ui/react/select";
import { Field } from "@jmurga97/components";
import { CheckIcon, ChevronDownIcon } from "lucide-react";
import { Fragment } from "react";
import { useController, useFormContext } from "react-hook-form";

import { i18n } from "~/lib/i18n";

import type { DishGroup, LoyaltyProgramFormValues } from "~/features/loyalty/types";

interface DishSelectProps {
  disabled?: boolean;
  groups: DishGroup[];
  label: string;
  name: `rewards.${number}.freeDishId`;
}

// Ming's Select has no groups, so this mirrors its styling on Base UI with one group per branch.
export function DishSelect({ disabled, groups, label, name }: DishSelectProps) {
  const { control, formState, getFieldState } = useFormContext<LoyaltyProgramFormValues>();
  const { field } = useController({ control, name });
  const error = getFieldState(name, formState).error?.message;
  const items = groups.flatMap((group) =>
    group.options.map((option) => ({ label: `${option.label} · ${group.label}`, value: option.id })),
  );
  return (
    <Field error={error} invalid={Boolean(error)} label={label} optionalLabel={i18n.t("shared___Optional")}>
      <Select.Root
        disabled={disabled}
        items={items}
        name={field.name}
        onValueChange={(value) => field.onChange(value ?? "")}
        value={field.value || null}
      >
        <Select.Trigger className="dish-select__trigger">
          <Select.Value placeholder={i18n.t("shared___Selecciona…")} />
          <Select.Icon aria-hidden="true" className="dish-select__icon">
            <ChevronDownIcon />
          </Select.Icon>
        </Select.Trigger>
        <Select.Portal>
          <Select.Positioner alignItemWithTrigger={false} className="dish-select__positioner" sideOffset={4}>
            <Select.Popup className="dish-select__popup">
              <Select.List>
                {groups.map((group, index) => (
                  <Fragment key={`${index}:${group.label}`}>
                    {index > 0 ? <Select.Separator className="dish-select__separator" /> : null}
                    <Select.Group>
                      <Select.GroupLabel className="dish-select__group">{group.label}</Select.GroupLabel>
                      {group.options.map((option) => (
                        <Select.Item
                          className="dish-select__item"
                          key={option.id}
                          label={option.label}
                          value={option.id}
                        >
                          <Select.ItemIndicator aria-hidden="true" className="dish-select__indicator">
                            <CheckIcon />
                          </Select.ItemIndicator>
                          <Select.ItemText>{option.label}</Select.ItemText>
                        </Select.Item>
                      ))}
                    </Select.Group>
                  </Fragment>
                ))}
              </Select.List>
            </Select.Popup>
          </Select.Positioner>
        </Select.Portal>
      </Select.Root>
    </Field>
  );
}
