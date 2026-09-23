import { useMemo } from "react";
import { CheckCircleFilled, ClockCircleOutlined } from "@ant-design/icons";
import type { Item } from "../types";
import { IMPACT } from "../labels";
import { formatMinutes } from "../time";
import { daysUntil, formatDate, formatDateTime, formatRange, rangeTitle } from "../dates";
import { buildReport } from "../reports";
import type { Filters } from "../filters";
import { FilterBar } from "./FilterBar";
import { ProgressRing } from "./ProgressRing";

interface Props {
  items: Item[];
  filters: Filters;
  onFiltersChange: (patch: Partial<Filters>) => void;
  areas: string[];
  onOpen: (item: Item) => void;
}

export function ReportsPage({ items, filters, onFiltersChange, areas, onOpen }: Props) {
  const r = useMemo(() => buildReport(items, filters), [items, filters]);

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Reports</h1>
          <p className="page-sub">
            <span>
              {rangeTitle(filters.range)} · {formatRange(filters.range)}
            </span>
            <span className="dot" />
            <span>
              {r.total} {r.total === 1 ? "task" : "tasks"} in range
            </span>
          </p>
        </div>
      </div>

      <FilterBar variant="reports" filters={filters} onChange={onFiltersChange} areas={areas} />

      {r.total === 0 ? (
        <div className="card report-empty-card">
          <p>No tasks fall in this range with the current filters.</p>
          <small>Try another week, or turn on "No deadline" under Show.</small>
        </div>
      ) : (
        <>
          <div className="kpis">
            <div className="kpi kpi-hero">
              <ProgressRing percent={r.progress} size={72} stroke={7} />
              <div>
                <div className="kpi-value">{r.progress}%</div>
                <div className="kpi-label">Overall progress</div>
                <div className="kpi-hint">Average across {r.total} tasks; done counts as 100%</div>
              </div>
            </div>
            <div className="kpi">
              <div className="kpi-value">
                {r.completed.length}
                <small>/ {r.total}</small>
              </div>
              <div className="kpi-label">Completed</div>
              <div className="kpi-hint">
                {r.completionRate}% done · {r.completedInRange.length} finished in this range
              </div>
            </div>
            <div className={`kpi${r.overdue.length ? " is-danger" : ""}`}>
              <div className="kpi-value">{r.overdue.length}</div>
              <div className="kpi-label">Overdue</div>
              <div className="kpi-hint">{r.dueInRange.length} still due in range</div>
            </div>
            <div className="kpi">
              <div className="kpi-value">{formatMinutes(r.spent)}</div>
              <div className="kpi-label">Time spent</div>
              <div className="kpi-hint">of {formatMinutes(r.allocated)} allocated</div>
            </div>
          </div>

          <div className="report-grid">
            <section className="card card-full">
              <header className="card-head">
                <h2>By area</h2>
              </header>
              <table className="area-table">
                <thead>
                  <tr>
                    <th>Area</th>
                    <th className="num-col">Tasks</th>
                    <th className="num-col">Done</th>
                    <th className="num-col">Overdue</th>
                    <th className="bar-col">Progress</th>
                    <th className="num-col">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {r.byArea.map((a) => (
                    <tr key={a.area}>
                      <td className="area-name">{a.area}</td>
                      <td className="num-col">{a.total}</td>
                      <td className="num-col">{a.done}</td>
                      <td className={`num-col${a.overdue ? " text-danger" : ""}`}>{a.overdue || "—"}</td>
                      <td className="bar-col">
                        <div className="bar">
                          <div className="bar-track">
                            <div className={`bar-fill${a.progress >= 100 ? " is-complete" : ""}`} style={{ width: `${a.progress}%` }} />
                          </div>
                          <span className="num bar-num">{a.progress}%</span>
                        </div>
                      </td>
                      <td className="num-col">
                        {formatMinutes(a.spent)}
                        <span className="muted"> / {formatMinutes(a.allocated)}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            <section className="card">
              <header className="card-head">
                <h2>Overdue</h2>
                <span className="count">{r.overdue.length}</span>
              </header>
              {r.overdue.length === 0 ? (
                <p className="report-empty">Nothing overdue. Nice.</p>
              ) : (
                <ul className="report-list">
                  {r.overdue.map((it) => (
                    <li key={it.id}>
                      <button type="button" className="report-item" onClick={() => onOpen(it)}>
                        <span className="label-code" style={{ background: IMPACT[it.impact].color }}>
                          {it.impact}
                          {it.focus}
                        </span>
                        <span className="report-item-main">
                          <span className="report-item-title">{it.title}</span>
                          <span className="report-item-sub">
                            {it.area}
                            {it.category ? ` · ${it.category}` : ""} · {it.progress}% done
                          </span>
                        </span>
                        <span className="report-item-end text-danger">
                          <ClockCircleOutlined /> {-daysUntil(it.deadline!)}d late
                          <small>{formatDate(it.deadline!, "D MMM")}</small>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="card">
              <header className="card-head">
                <h2>Completed</h2>
                <span className="count">{r.completed.length}</span>
              </header>
              {r.completed.length === 0 ? (
                <p className="report-empty">Nothing completed in this range yet.</p>
              ) : (
                <ul className="report-list">
                  {r.completed.map((it) => (
                    <li key={it.id}>
                      <button type="button" className="report-item" onClick={() => onOpen(it)}>
                        <CheckCircleFilled className="report-check" />
                        <span className="report-item-main">
                          <span className="report-item-title">{it.title}</span>
                          <span className="report-item-sub">
                            {it.area}
                            {it.category ? ` · ${it.category}` : ""}
                            {it.spentMinutes ? ` · ${formatMinutes(it.spentMinutes)} spent` : ""}
                          </span>
                        </span>
                        <span className="report-item-end muted">
                          {it.completedAt ? formatDateTime(it.completedAt) : "Done"}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </>
      )}
    </div>
  );
}
