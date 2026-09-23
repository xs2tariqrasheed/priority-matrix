import { useCallback, useEffect, useMemo, useState } from "react";
import { App as AntApp, Button, Skeleton } from "antd";
import { ReloadOutlined } from "@ant-design/icons";
import { api } from "./api";
import { useAuth } from "./auth";
import type { Focus, Impact, Item, ItemInput, TimePatch } from "./types";
import { DEFAULT_AREAS } from "./labels";
import { defaultFilters, type Filters } from "./filters";
import { formatMinutes } from "./time";
import { AppShell, type Page } from "./components/AppShell";
import { BrandMark } from "./components/Brand";
import type { FormDefaults } from "./components/ItemForm";
import { ItemDrawer, type DrawerMode, type DrawerState } from "./components/ItemDrawer";
import { LoginPage } from "./components/LoginPage";
import { ReportsPage } from "./components/ReportsPage";
import { TasksPage } from "./components/TasksPage";
import type { View } from "./components/FilterBar";

const VIEW_KEY = "priority-matrix:view";
const readView = (): View => {
  try {
    return localStorage.getItem(VIEW_KEY) === "list" ? "list" : "matrix";
  } catch {
    return "matrix";
  }
};

const pageFromHash = (): Page => (window.location.hash === "#reports" ? "reports" : "tasks");

function useHashPage(): [Page, (page: Page) => void] {
  const [page, setPage] = useState<Page>(pageFromHash);
  useEffect(() => {
    const onChange = () => setPage(pageFromHash());
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);
  const navigate = useCallback((next: Page) => {
    window.location.hash = next === "reports" ? "#reports" : "#tasks";
    setPage(next);
  }, []);
  return [page, navigate];
}

export default function App() {
  const { status } = useAuth();
  if (status === "loading") {
    return (
      <div className="splash">
        <div className="splash-inner">
          <BrandMark size={32} />
          <span>Loading…</span>
        </div>
      </div>
    );
  }
  if (status === "anon") return <LoginPage />;
  return <Workspace />;
}

function Workspace() {
  const { user, logout } = useAuth();
  const { message } = AntApp.useApp();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [weeklyMinutes, setWeeklyMinutes] = useState(0);
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [view, setView] = useState<View>(readView);
  const [page, navigate] = useHashPage();
  const [drawer, setDrawer] = useState<DrawerState>({ open: false });

  const changeView = (v: View) => {
    setView(v);
    try {
      localStorage.setItem(VIEW_KEY, v);
    } catch {
      /* storage unavailable; the choice just won't persist */
    }
  };

  const updateFilters = useCallback((patch: Partial<Filters>) => setFilters((f) => ({ ...f, ...patch })), []);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [list, settings] = await Promise.all([api.list(), api.settings()]);
      setItems(list);
      setWeeklyMinutes(settings.weeklyMinutes);
    } catch (e) {
      setLoadError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const areas = useMemo(() => [...new Set([...DEFAULT_AREAS, ...items.map((i) => i.area)])], [items]);

  const replace = (updated: Item) => setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));

  /** Apply a change locally first, then persist; roll back if the server rejects it. */
  const patch = async (item: Item, changes: Partial<Item>, successMsg?: string) => {
    const previous = items;
    replace({ ...item, ...changes });
    try {
      replace(await api.update(item.id, changes));
      if (successMsg) message.success(successMsg);
    } catch (e) {
      setItems(previous);
      message.error(`Couldn't update "${item.title}": ${(e as Error).message}`);
    }
  };

  const openItem = (item: Item) => setDrawer({ open: true, mode: "view", itemId: item.id });
  const openCreate = (defaults?: FormDefaults) => setDrawer({ open: true, mode: "create", itemId: null, defaults });
  const closeDrawer = () => setDrawer({ open: false });
  const setMode = (mode: DrawerMode) => setDrawer((d) => (d.open ? { ...d, mode } : d));

  const handleSubmit = async (values: ItemInput, item: Item | null) => {
    setSaving(true);
    try {
      if (item) {
        replace(await api.update(item.id, values));
        message.success("Changes saved");
        setMode("view");
      } else {
        const created = await api.create(values);
        setItems((prev) => [...prev, created]);
        message.success(`Added to ${created.impact}${created.focus}`);
        closeDrawer();
      }
    } catch (e) {
      message.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item: Item) => {
    const previous = items;
    setItems((prev) => prev.filter((i) => i.id !== item.id));
    closeDrawer();
    try {
      await api.remove(item.id);
      message.success("Task deleted");
    } catch (e) {
      setItems(previous);
      message.error(`Couldn't delete "${item.title}": ${(e as Error).message}`);
    }
  };

  const handleToggleDone = (item: Item) =>
    patch(item, { done: !item.done }, item.done ? `"${item.title}" reopened` : `"${item.title}" marked done`);

  const handleSaveTime = (item: Item, time: TimePatch) => patch(item, time);

  const handleDrop = (id: number, impact: Impact, focus: Focus) => {
    const item = items.find((i) => i.id === id);
    if (!item || (item.impact === impact && item.focus === focus)) return;
    patch(item, { impact, focus }, `Moved to ${impact}${focus}`);
  };

  const handleWeeklyChange = async (minutes: number) => {
    try {
      setWeeklyMinutes((await api.updateSettings({ weeklyMinutes: minutes })).weeklyMinutes);
      message.success(`Weekly time set to ${formatMinutes(minutes)}`);
    } catch (e) {
      message.error(`Couldn't save weekly time: ${(e as Error).message}`);
      throw e;
    }
  };

  const drawerItem = drawer.open && drawer.itemId !== null ? (items.find((i) => i.id === drawer.itemId) ?? null) : null;
  useEffect(() => {
    if (drawer.open && drawer.mode !== "create" && drawer.itemId !== null && !items.some((i) => i.id === drawer.itemId)) {
      setDrawer({ open: false });
    }
  }, [drawer, items]);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (e) {
      message.error(`Couldn't sign out: ${(e as Error).message}`);
    }
  };

  let content;
  if (loadError) {
    content = (
      <div className="page">
        <div className="load-error">
          <p>Couldn't load your tasks: {loadError}. Check that the API is running.</p>
          <Button icon={<ReloadOutlined />} onClick={load}>
            Try again
          </Button>
        </div>
      </div>
    );
  } else if (loading) {
    content = (
      <div className="page skeleton-page">
        <Skeleton active title={{ width: 160 }} paragraph={{ rows: 1, width: 280 }} />
        <div className="skeleton-card">
          <Skeleton active title={false} paragraph={{ rows: 2 }} />
        </div>
        <div className="skeleton-card">
          <Skeleton active paragraph={{ rows: 6 }} />
        </div>
      </div>
    );
  } else if (page === "reports") {
    content = <ReportsPage items={items} filters={filters} onFiltersChange={updateFilters} areas={areas} onOpen={openItem} />;
  } else {
    content = (
      <TasksPage
        items={items}
        filters={filters}
        onFiltersChange={updateFilters}
        areas={areas}
        weeklyMinutes={weeklyMinutes}
        onWeeklyChange={handleWeeklyChange}
        view={view}
        onViewChange={changeView}
        onOpen={openItem}
        onAdd={openCreate}
        onToggleDone={handleToggleDone}
        onSaveTime={handleSaveTime}
        onDrop={handleDrop}
      />
    );
  }

  return (
    <AppShell
      page={page}
      onNavigate={navigate}
      range={filters.range}
      onRangeChange={(range) => updateFilters({ range })}
      user={user!}
      onLogout={handleLogout}
    >
      {content}
      <ItemDrawer
        state={drawer}
        item={drawerItem}
        items={items}
        areas={areas}
        weeklyMinutes={weeklyMinutes}
        saving={saving}
        onClose={closeDrawer}
        onModeChange={setMode}
        onSubmit={handleSubmit}
        onDelete={handleDelete}
        onToggleDone={handleToggleDone}
        onSaveTime={handleSaveTime}
      />
    </AppShell>
  );
}
