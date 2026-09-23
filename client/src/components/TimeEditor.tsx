import { useEffect, useState, type ReactNode } from "react";
import { Popover } from "antd";
import type { Item } from "../types";
import { TimeSliders } from "./TimeSliders";

interface Props {
  item: Item;
  weeklyMinutes: number;
  onSave: (item: Item, allocatedMinutes: number, spentMinutes: number) => void;
  children: ReactNode;
}

/** Popover with the time sliders; saves each time a slider is released. */
export function TimeEditor({ item, weeklyMinutes, onSave, children }: Props) {
  const [draft, setDraft] = useState({ allocated: item.allocatedMinutes, spent: item.spentMinutes });

  useEffect(() => {
    setDraft({ allocated: item.allocatedMinutes, spent: item.spentMinutes });
  }, [item.allocatedMinutes, item.spentMinutes]);

  return (
    <Popover
      trigger="click"
      title={item.title}
      destroyOnHidden
      content={
        <div style={{ width: 280 }}>
          <TimeSliders
            allocated={draft.allocated}
            spent={draft.spent}
            max={weeklyMinutes}
            onChange={(allocated, spent) => setDraft({ allocated, spent })}
            onChangeComplete={(allocated, spent) => {
              if (allocated !== item.allocatedMinutes || spent !== item.spentMinutes) onSave(item, allocated, spent);
            }}
          />
        </div>
      }
    >
      {children}
    </Popover>
  );
}
