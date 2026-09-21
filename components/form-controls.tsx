"use client";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Combobox,
  ComboboxInput,
  ComboboxContent,
  ComboboxList,
  ComboboxItem,
  ComboboxEmpty,
} from "@/components/ui/combobox";
export function SelectField({
  id,
  label,
  value,
  onChange,
  options,
  disabled = false,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  disabled?: boolean;
}) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <Select
        value={value || "__empty"}
        onValueChange={(v) => onChange(v === "__empty" ? "" : v)}
        disabled={disabled}
      >
        <SelectTrigger id={id} className="w-full min-h-11 bg-white">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.value || "__empty"} value={o.value || "__empty"}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
export function CheckField({
  id,
  label,
  checked,
  onChange,
  disabled = false,
}: {
  id: string;
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="check-row">
      <Checkbox
        id={id}
        checked={checked}
        onCheckedChange={(v) => onChange(v === true)}
        disabled={disabled}
      />
      <label htmlFor={id}>{label}</label>
    </div>
  );
}
export function SearchSelect({
  id,
  label,
  value,
  onChange,
  options,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { id: string; nombre: string }[];
}) {
  const selected = options.find((o) => o.id === value) || null;
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <Combobox
        items={options}
        value={selected}
        onValueChange={(v) => onChange(v?.id || "")}
        itemToStringLabel={(v) => v.nombre}
      >
        <ComboboxInput
          id={id}
          placeholder="Buscar o seleccionar…"
          className="w-full min-h-11"
        />
        <ComboboxContent>
          <ComboboxEmpty>No se encontraron opciones.</ComboboxEmpty>
          <ComboboxList>
            {(item: { id: string; nombre: string }) => (
              <ComboboxItem key={item.id} value={item}>
                {item.nombre}
              </ComboboxItem>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
    </div>
  );
}
