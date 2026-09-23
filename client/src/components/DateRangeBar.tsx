import { Button, DatePicker } from "antd";
import { CalendarOutlined, LeftOutlined, RightOutlined } from "@ant-design/icons";
import { ISO, dayjs, nextDays, presetOf, shiftRange, weekRange, type DateRange } from "../dates";

interface Props {
  range: DateRange;
  onChange: (range: DateRange) => void;
}

const toPicker = (r: DateRange): [ReturnType<typeof dayjs>, ReturnType<typeof dayjs>] => [dayjs(r.start), dayjs(r.end)];

/** Quick "This week / Next 3 days / Next week" chips plus a stepper and calendar picker for any custom range. */
export function DateRangeBar({ range, onChange }: Props) {
  const preset = presetOf(range);
  return (
    <div className="range-bar" role="group" aria-label="Date range">
      <div className="range-presets">
        <button type="button" className={`chip${preset === "this" ? " is-active" : ""}`} onClick={() => onChange(weekRange(0))}>
          This week
        </button>
        <button
          type="button"
          className={`chip${preset === "next3" ? " is-active" : ""}`}
          title="Tasks due today, tomorrow and the day after"
          onClick={() => onChange(nextDays(3))}
        >
          Next 3 days
        </button>
        <button type="button" className={`chip${preset === "next" ? " is-active" : ""}`} onClick={() => onChange(weekRange(1))}>
          Next week
        </button>
      </div>
      <div className="range-nav">
        <Button type="text" size="small" icon={<LeftOutlined />} aria-label="Previous period" onClick={() => onChange(shiftRange(range, -1))} />
        <DatePicker.RangePicker
          className="range-picker"
          value={toPicker(range)}
          allowClear={false}
          format="D MMM"
          separator="–"
          suffixIcon={<CalendarOutlined />}
          variant="borderless"
          size="small"
          onChange={(v) => {
            if (v && v[0] && v[1]) onChange({ start: v[0].format(ISO), end: v[1].format(ISO) });
          }}
          presets={[
            { label: "This week", value: toPicker(weekRange(0)) },
            { label: "Next 3 days", value: toPicker(nextDays(3)) },
            { label: "Next week", value: toPicker(weekRange(1)) },
            { label: "Last week", value: toPicker(weekRange(-1)) },
            { label: "This month", value: [dayjs().startOf("month"), dayjs().endOf("month")] },
            { label: "Next 30 days", value: [dayjs(), dayjs().add(29, "day")] },
          ]}
        />
        <Button type="text" size="small" icon={<RightOutlined />} aria-label="Next period" onClick={() => onChange(shiftRange(range, 1))} />
      </div>
    </div>
  );
}
