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
      {label && <label htmlFor={id}>{label}</label>}
      <Select
        value={value || "__empty"}
        onValueChange={(v) => onChange(v === "__empty" ? "" : v)}
        disabled={disabled}
      >
        <SelectTrigger
          id={id}
          className="w-full min-h-[44px] bg-white border-slate-300 text-sm overflow-hidden text-ellipsis"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="max-h-72">
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
    <div className="flex items-start gap-3 py-1 cursor-pointer select-none">
      <Checkbox
        id={id}
        checked={checked}
        onCheckedChange={(v) => onChange(v === true)}
        disabled={disabled}
        className="w-5 h-5 mt-0.5 shrink-0 rounded border-slate-400"
      />
      <label htmlFor={id} className="text-xs sm:text-sm text-slate-700 leading-snug cursor-pointer">
        {label}
      </label>
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
    <div className="civic-input-field">
      {label && <label htmlFor={id}>{label}</label>}
      <Combobox
        items={options}
        value={selected}
        onValueChange={(v) => onChange(v?.id || "")}
        itemToStringLabel={(v) => v.nombre}
      >
        <ComboboxInput
          id={id}
          placeholder="Buscar o seleccionar comunidad…"
          className="w-full min-h-[48px] text-base bg-white border-slate-300"
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
