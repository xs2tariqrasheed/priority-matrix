import { useState } from "react";
import { Button } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import type { Focus, Impact, Item } from "../types";
import { FOCUS, IMPACT } from "../labels";
import { ItemRow } from "./ItemRow";

interface Props {
  code: string;
  impact: Impact;
  focus: Focus;
  advice: string;
  items: Item[];
  onAdd: (impact: Impact, focus: Focus) => void;
  onDropItem: (id: number, impact: Impact, focus: Focus) => void;
  onToggle: (item: Item) => void;
  onEdit: (item: Item) => void;
  onDelete: (item: Item) => void;
  onSaveTime: (item: Item, allocatedMinutes: number, spentMinutes: number) => void;
  weeklyMinutes: number;
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
      style={{ "--accent": IMPACT[impact].color, "--tint": IMPACT[impact].tint } as React.CSSProperties}
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
        <div>
          <h2>
            <span className="code">{code}</span>
            {advice}
          </h2>
          <p className="slot">
            {open} open<span className="slot-sep" />{FOCUS[focus].slot}
          </p>
        </div>
        <Button size="small" icon={<PlusOutlined />} onClick={() => onAdd(impact, focus)}>
          Add
        </Button>
      </header>

      {items.length === 0 ? (
        <p className="empty">Nothing here. Add an item or drag one in.</p>
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
