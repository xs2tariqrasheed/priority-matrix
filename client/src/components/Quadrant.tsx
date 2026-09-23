import { useState, type CSSProperties } from "react";
import { Button } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import type { Focus, Impact, Item, TimePatch } from "../types";
import { FOCUS, IMPACT } from "../labels";
import { ItemRow } from "./ItemRow";

interface Props {
  code: string;
  impact: Impact;
  focus: Focus;
  advice: string;
  items: Item[];
  weeklyMinutes: number;
  onAdd: (impact: Impact, focus: Focus) => void;
  onDropItem: (id: number, impact: Impact, focus: Focus) => void;
  onOpen: (item: Item) => void;
  onToggleDone: (item: Item) => void;
  onSaveTime: (item: Item, patch: TimePatch) => void;
}

export function Quadrant({ code, impact, focus, advice, items, onAdd, onDropItem, ...rowHandlers }: Props) {
  const [over, setOver] = useState(false);
  const open = items.filter((i) => !i.done).length;

  // Group by area so long quadrants stay scannable.
  const groups = new Map<string, Item[]>();
  for (const it of items) groups.set(it.area, [...(groups.get(it.area) ?? []), it]);

  return (
    <section
      className={`quadrant${over ? " is-over" : ""}`}
      style={{ "--q-accent": IMPACT[impact].color, "--q-tint": IMPACT[impact].tint } as CSSProperties}
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setOver(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        const id = Number(e.dataTransfer.getData("text/plain"));
        if (id) onDropItem(id, impact, focus);
      }}
      aria-label={`${IMPACT[impact].name}, ${FOCUS[focus].name}`}
    >
      <header className="quadrant-head">
        <div className="quadrant-title">
          <span className="label-code">{code}</span>
          <div>
            <h2>{advice}</h2>
            <p className="slot">
              {open} open
              <span className="slot-sep" />
              {FOCUS[focus].slot}
            </p>
          </div>
        </div>
        <Button size="small" type="text" icon={<PlusOutlined />} onClick={() => onAdd(impact, focus)} aria-label={`Add a ${code} task`}>
          Add
        </Button>
      </header>

      {items.length === 0 ? (
        <p className="empty">Nothing here. Add a task or drag one in.</p>
      ) : (
        <div className="groups">
          {[...groups].map(([area, list]) => (
            <div key={area} className="group">
              <h3>{area}</h3>
              <ul>
                {list.map((it) => (
                  <ItemRow key={it.id} item={it} {...rowHandlers} />
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
