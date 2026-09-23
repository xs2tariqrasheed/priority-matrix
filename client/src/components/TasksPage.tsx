import { useMemo } from "react";
import { Button } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import type { Focus, Impact, Item, TimePatch } from "../types";
import { FOCUS, IMPACT, QUADRANTS } from "../labels";
import { formatRange, inRange, rangeTitle } from "../dates";
import { applyFilters, budgetItems, isOverdue, sortItems, type Filters, type Sort } from "../filters";
import { useCellSelection } from "../lib/selection";
import type { FormDefaults } from "./ItemForm";
import { FilterBar, type View } from "./FilterBar";
import { ListView } from "./ListView";
import { Quadrant } from "./Quadrant";
import { StatusBar } from "./StatusBar";
import { WeeklyBudget } from "./WeeklyBudget";

interface Props {
  items: Item[];
  filters: Filters;
  onFiltersChange: (patch: Partial<Filters>) => void;
  areas: string[];
  weeklyMinutes: number;
  onWeeklyChange: (minutes: number) => Promise<void>;
  view: View;
  onViewChange: (view: View) => void;
  onOpen: (item: Item) => void;
  onAdd: (defaults?: FormDefaults) => void;
  onToggleDone: (item: Item) => void;
  onSaveTime: (item: Item, patch: TimePatch) => void;
  onDrop: (id: number, impact: Impact, focus: Focus) => void;
}

export function TasksPage({
  items,
  filters,
  onFiltersChange,
  areas,
  weeklyMinutes,
  onWeeklyChange,
  view,
  onViewChange,
  onOpen,
  onAdd,
  onToggleDone,
  onSaveTime,
  onDrop,
}: Props) {
  const visible = useMemo(() => sortItems(applyFilters(items, filters), filters.sort), [items, filters]);
  const openCount = visible.filter((i) => !i.done).length;
  const overdueCount = visible.filter(isOverdue).length;
  const dueCount = visible.filter((i) => !i.done && i.deadline !== null && inRange(i.deadline, filters.range)).length;
  const rowHandlers = { weeklyMinutes, onOpen, onToggleDone, onSaveTime };

  // The budget counts what is booked in the selected range, whatever the area, label or search filters say.
  const budgeted = useMemo(() => budgetItems(items, filters.range), [items, filters.range]);

  const rowIds = useMemo(() => visible.map((i) => i.id), [visible]);
  const selection = useCellSelection(rowIds);
  const isList = view === "list";

  return (
    <div className={`page${isList ? " has-status-bar" : ""}`}>
      <div className="page-head">
        <div>
          <h1>Tasks</h1>
          <p className="page-sub">
            <span>
              {rangeTitle(filters.range)} · {formatRange(filters.range)}
            </span>
            <span className="dot" />
            <span>
              {openCount} open{dueCount ? `, ${dueCount} due in range` : ""}
            </span>
            {overdueCount > 0 && (
              <>
                <span className="dot" />
                <span className="text-danger">{overdueCount} overdue</span>
              </>
            )}
          </p>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => onAdd()}>
          Add task
        </Button>
      </div>

      <WeeklyBudget weeklyMinutes={weeklyMinutes} items={budgeted} range={filters.range} onChangeWeekly={onWeeklyChange} />

      <FilterBar variant="tasks" filters={filters} onChange={onFiltersChange} areas={areas} view={view} onViewChange={onViewChange} />

      {isList ? (
        <>
          <ListView
            items={visible}
            sort={filters.sort}
            onSortChange={(sort: Sort) => onFiltersChange({ sort })}
            selection={selection}
            {...rowHandlers}
          />
          <StatusBar items={visible} selection={selection} />
        </>
      ) : (
        <>
          <div className="matrix">
            <div className="corner" />
            {(["P", "V"] as const).map((k) => (
              <div key={k} className="axis axis-col" style={{ color: IMPACT[k].color }}>
                <strong>{IMPACT[k].name}</strong>
                <span>{IMPACT[k].hint}</span>
              </div>
            ))}
            {(["S", "L"] as const).map((focus) => (
              <div key={focus} className="matrix-row">
                <div className="axis axis-row">
                  <strong>{FOCUS[focus].name}</strong>
                </div>
                {QUADRANTS.filter((q) => q.focus === focus).map((q) => (
                  <Quadrant
                    key={q.key}
                    code={q.key}
                    impact={q.impact}
                    focus={q.focus}
                    advice={q.advice}
                    items={visible.filter((i) => i.impact === q.impact && i.focus === q.focus)}
                    onAdd={(impact, f) => onAdd({ impact, focus: f })}
                    onDropItem={onDrop}
                    {...rowHandlers}
                  />
                ))}
              </div>
            ))}
          </div>
          <p className="hint">Drag a task to another quadrant to relabel it. Click a task to open it.</p>
        </>
      )}
    </div>
  );
}
