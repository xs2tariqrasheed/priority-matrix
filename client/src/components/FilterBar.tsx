import { Button, Checkbox, Input, Popover, Segmented, Select } from "antd";
import {
  AppstoreOutlined,
  EyeOutlined,
  SearchOutlined,
  SortAscendingOutlined,
  SortDescendingOutlined,
  UnorderedListOutlined,
} from "@ant-design/icons";
import type { Impact, QuadrantKey } from "../types";
import { FOCUS, IMPACT, QUADRANTS } from "../labels";
import { SORT_OPTIONS, type Filters, type SortKey } from "../filters";

export type View = "matrix" | "list";

interface Props {
  filters: Filters;
  onChange: (patch: Partial<Filters>) => void;
  areas: string[];
  /** The Reports page reuses the range, area, label and visibility filters but not search or sort. */
  variant: "tasks" | "reports";
  view?: View;
  onViewChange?: (view: View) => void;
}

export function FilterBar({ filters, onChange, areas, variant, view, onViewChange }: Props) {
  const isTasks = variant === "tasks";
  return (
    <div className="toolbar">
      {isTasks && view && onViewChange && (
        <Segmented<View>
          value={view}
          onChange={onViewChange}
          aria-label="View"
          options={[
            { value: "matrix", label: "Matrix", icon: <AppstoreOutlined /> },
            { value: "list", label: "List", icon: <UnorderedListOutlined /> },
          ]}
        />
      )}
      <Segmented
        className="area-filter"
        options={["All", ...areas]}
        value={filters.area}
        onChange={(v) => onChange({ area: String(v) })}
        aria-label="Area"
      />
      <Select<QuadrantKey[]>
        mode="multiple"
        allowClear
        placeholder="All labels"
        value={filters.labels}
        onChange={(labels) => onChange({ labels })}
        className="label-filter"
        popupMatchSelectWidth={false}
        maxTagCount="responsive"
        aria-label="Filter by label"
        options={QUADRANTS.map((q) => ({
          value: q.key,
          label: (
            <span className="label-option">
              <span className="label-code" style={{ background: IMPACT[q.impact].color }}>
                {q.key}
              </span>
              {IMPACT[q.impact].name} · {FOCUS[q.focus].name}
            </span>
          ),
        }))}
        labelRender={({ value }) => (
          <span className="label-code label-code-sm" style={{ background: IMPACT[String(value)[0] as Impact].color }}>
            {String(value)}
          </span>
        )}
      />
      {isTasks && (
        <Input
          allowClear
          prefix={<SearchOutlined />}
          placeholder="Search tasks"
          value={filters.query}
          onChange={(e) => onChange({ query: e.target.value })}
          className="search"
          aria-label="Search tasks"
        />
      )}
      <div className="toolbar-spacer" />
      <Popover
        trigger="click"
        placement="bottomRight"
        title="Also show"
        content={
          <div className="show-menu">
            <Checkbox checked={filters.includeOverdue} onChange={(e) => onChange({ includeOverdue: e.target.checked })}>
              <span className="show-label">
                Overdue tasks <small>Past their deadline, still open</small>
              </span>
            </Checkbox>
            <Checkbox checked={filters.includeUndated} onChange={(e) => onChange({ includeUndated: e.target.checked })}>
              <span className="show-label">
                No deadline <small>Tasks without a due date</small>
              </span>
            </Checkbox>
            {isTasks && (
              <Checkbox checked={filters.includeDone} onChange={(e) => onChange({ includeDone: e.target.checked })}>
                <span className="show-label">
                  Completed <small>Tasks marked done</small>
                </span>
              </Checkbox>
            )}
          </div>
        }
      >
        <Button icon={<EyeOutlined />} className="show-btn">
          Show
        </Button>
      </Popover>
      {isTasks && (
        <div className="sort-control">
          <Select<SortKey>
            value={filters.sort.key}
            onChange={(key) => onChange({ sort: { key, dir: key === "deadline" ? "asc" : filters.sort.dir } })}
            options={SORT_OPTIONS}
            popupMatchSelectWidth={false}
            className="sort-select"
            aria-label="Sort by"
            prefix={<span className="sort-prefix">Sort</span>}
          />
          <Button
            icon={filters.sort.dir === "asc" ? <SortAscendingOutlined /> : <SortDescendingOutlined />}
            aria-label={filters.sort.dir === "asc" ? "Ascending; switch to descending" : "Descending; switch to ascending"}
            title={filters.sort.dir === "asc" ? "Ascending" : "Descending"}
            onClick={() => onChange({ sort: { ...filters.sort, dir: filters.sort.dir === "asc" ? "desc" : "asc" } })}
          />
        </div>
      )}
    </div>
  );
}
