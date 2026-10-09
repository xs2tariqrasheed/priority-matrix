import type { ReactNode } from "react";
import { Dropdown } from "antd";
import { AppstoreOutlined, BarChartOutlined, LogoutOutlined } from "@ant-design/icons";
import type { User } from "../types";
import type { DateRange } from "../dates";
import { initialsOf } from "../people";
import { BrandMark } from "./Brand";
import { DateRangeBar } from "./DateRangeBar";
import { InvitationsBell } from "./InvitationsBell";
import { ThemeSwitcher } from "./ThemeSwitcher";

export type Page = "tasks" | "reports";

interface Props {
  page: Page;
  onNavigate: (page: Page) => void;
  range: DateRange;
  onRangeChange: (range: DateRange) => void;
  user: User;
  onLogout: () => void;
  /** An invitation was accepted; reload so the shared epic shows. */
  onInvitationAccepted: () => void;
  children: ReactNode;
}

/** Sticky header with navigation, the shared date range, theme and account controls. */
export function AppShell({ page, onNavigate, range, onRangeChange, user, onLogout, onInvitationAccepted, children }: Props) {
  return (
    <div className="shell">
      <header className="shell-head">
        <div className="shell-inner">
          <a
            className="brand"
            href="#tasks"
            onClick={(e) => {
              e.preventDefault();
              onNavigate("tasks");
            }}
          >
            <BrandMark />
            <span>Priority matrix</span>
          </a>
          <nav className="nav" aria-label="Main">
            <button
              type="button"
              className={`nav-item${page === "tasks" ? " is-active" : ""}`}
              aria-current={page === "tasks" ? "page" : undefined}
              onClick={() => onNavigate("tasks")}
            >
              <AppstoreOutlined />
              <span className="nav-label">Tasks</span>
            </button>
            <button
              type="button"
              className={`nav-item${page === "reports" ? " is-active" : ""}`}
              aria-current={page === "reports" ? "page" : undefined}
              onClick={() => onNavigate("reports")}
            >
              <BarChartOutlined />
              <span className="nav-label">Reports</span>
            </button>
          </nav>
          <div className="shell-right">
            <DateRangeBar range={range} onChange={onRangeChange} />
            <InvitationsBell onAccepted={onInvitationAccepted} />
            <ThemeSwitcher />
            <Dropdown
              trigger={["click"]}
              placement="bottomRight"
              menu={{
                items: [
                  {
                    key: "account",
                    type: "group",
                    label: (
                      <div className="user-menu-head">
                        <strong>{user.name || user.email}</strong>
                        {user.name && <small>{user.email}</small>}
                      </div>
                    ),
                    children: [{ key: "logout", icon: <LogoutOutlined />, label: "Sign out", onClick: onLogout }],
                  },
                ],
              }}
            >
              <button type="button" className="avatar" aria-label="Account menu" title={user.email}>
                {initialsOf(user)}
              </button>
            </Dropdown>
          </div>
        </div>
      </header>
      <main className="shell-main">{children}</main>
    </div>
  );
}
