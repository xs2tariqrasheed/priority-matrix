import { useEffect, useMemo, useState } from "react";
import { AutoComplete, Form, Input, Modal, Radio } from "antd";
import type { Item, ItemInput, Focus, Impact } from "../types";
import { FOCUS, IMPACT } from "../labels";
import { TimeSliders } from "./TimeSliders";

interface Props {
  open: boolean;
  /** Item being edited, or null when creating. */
  item: Item | null;
  /** Pre-selected labels when adding from inside a quadrant. */
  defaults?: { impact?: Impact; focus?: Focus };
  items: Item[];
  areas: string[];
  saving: boolean;
  weeklyMinutes: number;
  onCancel: () => void;
  onSubmit: (values: ItemInput) => void;
}

export function ItemFormModal({ open, item, defaults, items, areas, saving, weeklyMinutes, onCancel, onSubmit }: Props) {
  const [form] = Form.useForm<ItemInput>();
  const area = Form.useWatch("area", form);
  const [time, setTime] = useState({ allocated: 0, spent: 0 });

  useEffect(() => {
    if (!open) return;
    setTime({ allocated: item?.allocatedMinutes ?? 0, spent: item?.spentMinutes ?? 0 });
    form.resetFields();
    form.setFieldsValue(
      item
        ? { title: item.title, area: item.area, category: item.category, impact: item.impact, focus: item.focus, notes: item.notes }
        : { area: areas[0], category: "", impact: defaults?.impact ?? "P", focus: defaults?.focus ?? "S", notes: "" }
    );
  }, [open, item, defaults, areas, form]);

  const categoryOptions = useMemo(() => {
    const set = new Set(items.filter((i) => i.area === area && i.category).map((i) => i.category));
    return [...set].sort().map((value) => ({ value }));
  }, [items, area]);

  return (
    <Modal
      open={open}
      title={item ? "Edit item" : "Add item"}
      okText={item ? "Save changes" : "Add item"}
      confirmLoading={saving}
      onCancel={onCancel}
      onOk={() => form.submit()}
      destroyOnHidden
    >
      <Form form={form} layout="vertical" requiredMark={false} onFinish={(values) => onSubmit({ ...values, allocatedMinutes: time.allocated, spentMinutes: time.spent })} style={{ marginTop: 16 }}>
        <Form.Item name="title" label="Title" rules={[{ required: true, whitespace: true, message: "Give the item a title" }]}>
          <Input placeholder="e.g. RC Support Agent" autoFocus maxLength={200} />
        </Form.Item>

        <div className="form-row">
          <Form.Item name="area" label="Area" rules={[{ required: true, whitespace: true, message: "Pick or type an area" }]}>
            <AutoComplete options={areas.map((value) => ({ value }))} placeholder="Company" filterOption />
          </Form.Item>
          <Form.Item name="category" label="Category (optional)">
            <AutoComplete options={categoryOptions} placeholder="e.g. Projects" filterOption />
          </Form.Item>
        </div>

        <Form.Item name="impact" label="Impact">
          <Radio.Group optionType="button" buttonStyle="solid" block>
            {(["P", "V"] as const).map((k) => (
              <Radio.Button key={k} value={k}>
                {IMPACT[k].name} ({k})
              </Radio.Button>
            ))}
          </Radio.Group>
        </Form.Item>

        <Form.Item name="focus" label="Focus">
          <Radio.Group optionType="button" buttonStyle="solid" block>
            {(["S", "L"] as const).map((k) => (
              <Radio.Button key={k} value={k}>
                {FOCUS[k].name} ({k})
              </Radio.Button>
            ))}
          </Radio.Group>
        </Form.Item>

        <Form.Item label="Time">
          <TimeSliders
            allocated={time.allocated}
            spent={time.spent}
            max={weeklyMinutes}
            onChange={(allocated, spent) => setTime({ allocated, spent })}
          />
        </Form.Item>

        <Form.Item name="notes" label="Notes (optional)">
          <Input.TextArea rows={3} maxLength={2000} placeholder="Anything to remember about this item" />
        </Form.Item>
      </Form>
    </Modal>
  );
}
