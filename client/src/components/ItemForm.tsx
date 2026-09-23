import { useMemo, useState } from "react";
import { AutoComplete, Button, DatePicker, Form, Input, Radio } from "antd";
import type { Focus, Impact, Item, ItemInput } from "../types";
import { FOCUS, IMPACT } from "../labels";
import { ISO, dayjs, weekRange, type Dayjs } from "../dates";
import { TimeFields, type TimeValues } from "./TimeFields";

export interface FormDefaults {
  impact?: Impact;
  focus?: Focus;
  area?: string;
  deadline?: string | null;
}

interface Props {
  /** Task being edited, or null when creating. */
  item: Item | null;
  defaults?: FormDefaults;
  items: Item[];
  areas: string[];
  weeklyMinutes: number;
  saving: boolean;
  onSubmit: (values: ItemInput) => void;
  onCancel: () => void;
}

interface FormValues {
  title: string;
  area: string;
  category?: string;
  impact: Impact;
  focus: Focus;
  deadline: Dayjs | null;
  notes?: string;
}

export function ItemForm({ item, defaults, items, areas, weeklyMinutes, saving, onSubmit, onCancel }: Props) {
  const [form] = Form.useForm<FormValues>();
  const area = Form.useWatch("area", form);
  const [time, setTime] = useState<TimeValues>({
    allocated: item?.allocatedMinutes ?? 0,
    spent: item?.spentMinutes ?? 0,
    progress: item?.progress ?? 0,
  });

  const initialValues: FormValues = item
    ? {
        title: item.title,
        area: item.area,
        category: item.category,
        impact: item.impact,
        focus: item.focus,
        deadline: item.deadline ? dayjs(item.deadline) : null,
        notes: item.notes,
      }
    : {
        title: "",
        area: defaults?.area ?? areas[0] ?? "",
        category: "",
        impact: defaults?.impact ?? "P",
        focus: defaults?.focus ?? "S",
        deadline: defaults?.deadline ? dayjs(defaults.deadline) : null,
        notes: "",
      };

  const categoryOptions = useMemo(() => {
    const set = new Set(items.filter((i) => i.area === area && i.category).map((i) => i.category));
    return [...set].sort().map((value) => ({ value }));
  }, [items, area]);

  return (
    <Form<FormValues>
      form={form}
      layout="vertical"
      requiredMark={false}
      initialValues={initialValues}
      className="item-form"
      onFinish={(v) =>
        onSubmit({
          title: v.title,
          area: v.area,
          category: v.category ?? "",
          impact: v.impact,
          focus: v.focus,
          notes: v.notes ?? "",
          deadline: v.deadline ? v.deadline.format(ISO) : null,
          allocatedMinutes: time.allocated,
          spentMinutes: time.spent,
          progress: time.progress,
        })
      }
    >
      <Form.Item name="title" label="Title" rules={[{ required: true, whitespace: true, message: "Give the task a title" }]}>
        <Input autoFocus maxLength={200} placeholder="What needs doing?" size="large" />
      </Form.Item>

      <div className="form-row">
        <Form.Item name="area" label="Area" rules={[{ required: true, whitespace: true, message: "Pick or type an area" }]}>
          <AutoComplete options={areas.map((value) => ({ value }))} placeholder="Company" filterOption />
        </Form.Item>
        <Form.Item name="category" label="Category">
          <AutoComplete options={categoryOptions} placeholder="Optional, e.g. Projects" filterOption />
        </Form.Item>
      </div>

      <div className="form-row">
        <Form.Item name="impact" label="Impact">
          <Radio.Group
            optionType="button"
            buttonStyle="solid"
            block
            options={(["P", "V"] as const).map((k) => ({ value: k, label: `${IMPACT[k].name} (${k})` }))}
          />
        </Form.Item>
        <Form.Item name="focus" label="Focus">
          <Radio.Group
            optionType="button"
            buttonStyle="solid"
            block
            options={(["S", "L"] as const).map((k) => ({ value: k, label: `${FOCUS[k].name} (${k})` }))}
          />
        </Form.Item>
      </div>

      <Form.Item name="deadline" label="Deadline">
        <DatePicker
          allowClear
          format="ddd D MMM YYYY"
          placeholder="No deadline"
          style={{ width: "100%" }}
          presets={[
            { label: "Today", value: dayjs() },
            { label: "Tomorrow", value: dayjs().add(1, "day") },
            { label: "End of this week", value: dayjs(weekRange(0).end) },
            { label: "End of next week", value: dayjs(weekRange(1).end) },
          ]}
        />
      </Form.Item>

      <div className="form-section">
        <div className="form-section-title">Time &amp; progress</div>
        <TimeFields {...time} max={weeklyMinutes} onChange={setTime} />
      </div>

      <Form.Item name="notes" label="Notes">
        <Input.TextArea maxLength={2000} placeholder="Anything to remember about this task" autoSize={{ minRows: 3, maxRows: 8 }} />
      </Form.Item>

      <div className="form-actions">
        <Button onClick={onCancel}>Cancel</Button>
        <Button type="primary" htmlType="submit" loading={saving}>
          {item ? "Save changes" : "Add task"}
        </Button>
      </div>
    </Form>
  );
}
