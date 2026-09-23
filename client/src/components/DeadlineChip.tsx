import { Tooltip } from "antd";
import { CalendarOutlined, ClockCircleOutlined } from "@ant-design/icons";
import type { Item } from "../types";
import { formatDate, relativeDeadline, shortDeadline, urgencyOf } from "../dates";

/** Due-date pill coloured by urgency: overdue, today, soon (≤3 days) or later. */
export function DeadlineChip({ item }: { item: Item }) {
  if (!item.deadline) return null;
  const urgency = urgencyOf(item.deadline, item.done);
  const text = urgency === "overdue" ? `Overdue · ${formatDate(item.deadline, "D MMM")}` : shortDeadline(item.deadline);
  return (
    <Tooltip title={`${formatDate(item.deadline, "dddd D MMMM YYYY")} · ${relativeDeadline(item.deadline)}`}>
      <span className={`deadline-chip is-${urgency}${item.done ? " is-done" : ""}`}>
        {urgency === "overdue" ? <ClockCircleOutlined /> : <CalendarOutlined />}
        {text}
      </span>
    </Tooltip>
  );
}
