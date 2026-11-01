"use client";

import Checkbox from "@mui/material/Checkbox";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import ListItemText from "@mui/material/ListItemText";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";

type Option = { value: string; label: string };

/** Dropdown, dessen Einträge Checkboxen sind (Mehrfachauswahl). */
export function MultiCheckDropdown({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: Option[];
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  const id = `multi-${label.toLowerCase().replace(/\s+/g, "-")}`;
  return (
    <FormControl fullWidth size="small">
      <InputLabel id={`${id}-label`} shrink>
        {label}
      </InputLabel>
      <Select
        labelId={`${id}-label`}
        id={id}
        multiple
        displayEmpty
        label={label}
        notched
        value={selected}
        onChange={(e) => {
          const v = e.target.value;
          onChange(typeof v === "string" ? v.split(",") : v);
        }}
        renderValue={(sel) =>
          sel.length === 0
            ? "Alle"
            : options
                .filter((o) => sel.includes(o.value))
                .map((o) => o.label.replace(" Zimmer", ""))
                .join(", ")
        }
        MenuProps={{ slotProps: { paper: { sx: { maxHeight: 320 } } } }}
      >
        {options.map((o) => (
          <MenuItem key={o.value} value={o.value} dense>
            <Checkbox checked={selected.includes(o.value)} size="small" color="secondary" />
            <ListItemText primary={o.label} />
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}
