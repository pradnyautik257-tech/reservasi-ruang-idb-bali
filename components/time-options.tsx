import { timeLabel, toMinutes, toTime } from "@/lib/format";
import type { Settings } from "@/lib/types";

export function TimeOptions({
  settings,
  allowEmpty = false,
  placeholder = "Semua",
}: {
  settings: Settings;
  allowEmpty?: boolean;
  placeholder?: string;
}) {
  const open = toMinutes(settings.openHour);
  const close = toMinutes(settings.closeHour);
  const options: string[] = [];
  for (let minute = open; minute <= close; minute += 30) {
    options.push(toTime(minute));
  }

  return (
    <>
      {allowEmpty ? <option value="">{placeholder}</option> : null}
      {options.map((value) => (
        <option key={value} value={value}>
          {timeLabel(value)}
        </option>
      ))}
    </>
  );
}
