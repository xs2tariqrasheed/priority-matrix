import { useCallback, useEffect, useMemo, useState } from "react";
import { App as AntApp, Button, Input, Segmented, Select, Spin, Switch } from "antd";
import { AppstoreOutlined, PlusOutlined, ReloadOutlined, SearchOutlined, UnorderedListOutlined } from "@ant-design/icons";
import { api } from "./api";
import type { Focus, Impact, Item, ItemInput, QuadrantKey } from "./types";
import { DEFAULT_AREAS, FOCUS, IMPACT, QUADRANTS } from "./labels";
import { Quadrant } from "./components/Quadrant";
import { ItemFormModal } from "./components/ItemFormModal";
import { ListView } from "./components/ListView";
import { WeeklyBudget } from "./components/WeeklyBudget";
import { formatMinutes } from "./time";

type View = "matrix" | "list";

const VIEW_KEY = "priority-matrix:view";
const readView = (): View => {
  try {
    return localStorage.getItem(VIEW_KEY) === "list" ? "list" : "matrix";
  } catch {
    return "matrix";
  }
};

type ModalState = { open: false } | { open: true; item: Item | null; defaults?: { impact?: Impact; focus?: Focus } };

export default function App() {
  const { message } = AntApp.useApp();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [modal, setModal] = useState<ModalState>({ open: false });
  const [areaFilter, setAreaFilter] = useState("All");
  /** Empty means every label. */
  const [labelFilter, setLabelFilter] = useState<QuadrantKey[]>([]);
  const [showDone, setShowDone] = useState(false);
  const [query, setQuery] = useState("");
  const [weeklyMinutes, setWeeklyMinutes] = useState(0);
  const [view, setView] = useState<View>(readView);

  const changeView = (v: View) => {
    setView(v);
    try {
      localStorage.setItem(VIEW_KEY, v);
    } catch {
      /* storage unavailable; the choice just won't persist */
    }
  };

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

  const areas = useMemo(() => {
    const set = new Set([...DEFAULT_AREAS, ...items.map((i) => i.area)]);
    return [...set];
  }, [items]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter(
      (i) =>
        (areaFilter === "All" || i.area === areaFilter) &&
        (labelFilter.length === 0 || labelFilter.includes(`${i.impact}${i.focus}`)) &&
        (showDone || !i.done) &&
        (!q || `${i.title} ${i.category} ${i.notes}`.toLowerCase().includes(q))
    );
  }, [items, areaFilter, labelFilter, showDone, query]);

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

  const handleSubmit = async (values: ItemInput) => {
    if (!modal.open) return;
    setSaving(true);
    try {
      if (modal.item) {
        replace(await api.update(modal.item.id, values));
        message.success("Changes saved");
      } else {
        const created = await api.create(values);
        setItems((prev) => [...prev, created]);
        message.success(`Added to ${created.impact}${created.focus}`);
      }
      setModal({ open: false });
    } catch (e) {
      message.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item: Item) => {
    const previous = items;
    setItems((prev) => prev.filter((i) => i.id !== item.id));
    try {
      await api.remove(item.id);
      message.success("Item deleted");
    } catch (e) {
      setItems(previous);
      message.error(`Couldn't delete "${item.title}": ${(e as Error).message}`);
    }
  };

  const handleSaveTime = (item: Item, allocatedMinutes: number, spentMinutes: number) =>
    patch(item, { allocatedMinutes, spentMinutes });

  const handleWeeklyChange = async (minutes: number) => {
    try {
      setWeeklyMinutes((await api.updateSettings({ weeklyMinutes: minutes })).weeklyMinutes);
      message.success(`Weekly time set to ${formatMinutes(minutes)}`);
    } catch (e) {
      message.error(`Couldn't save weekly time: ${(e as Error).message}`);
      throw e;
    }
  };

  const rowHandlers = {
    onToggle: (it: Item) => patch(it, { done: !it.done }),
    onEdit: (it: Item) => setModal({ open: true, item: it }),
    onDelete: handleDelete,
    onSaveTime: handleSaveTime,
  };

  const handleDrop = (id: number, impact: Impact, focus: Focus) => {
    const item = items.find((i) => i.id === id);
    if (!item || (item.impact === impact && item.focus === focus)) return;
    patch(item, { impact, focus }, `Moved to ${impact}${focus}`);
  };

  const byQuadrant = (impact: Impact, focus: Focus) => visible.filter((i) => i.impact === impact && i.focus === focus);

  return (
    <div className="page">
      <header className="topbar">
        <div className="brand">
          <h1>Priority matrix</h1>
          <p>
            {items.filter((i) => !i.done).length} open items across {areas.length} areas
          </p>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setModal({ open: true, item: null })}>
          Add item
        </Button>
      </header>

      {!loadError && !loading && (
        <WeeklyBudget weeklyMinutes={weeklyMinutes} items={items} onChangeWeekly={handleWeeklyChange} />
      )}

      <div className="toolbar">
        <Segmented<View>
          value={view}
          onChange={changeView}
          options={[
            { value: "matrix", label: "Matrix", icon: <AppstoreOutlined /> },
            { value: "list", label: "List", icon: <UnorderedListOutlined /> },
          ]}
        />
        <Segmented options={["All", ...areas]} value={areaFilter} onChange={(v) => setAreaFilter(String(v))} />
        <Select<QuadrantKey[]>
          mode="multiple"
          allowClear
          placeholder="All labels"
          value={labelFilter}
          onChange={setLabelFilter}
          className="label-filter"
          popupMatchSelectWidth={false}
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
          labelRender={({ value }) => value}
        />
        <Input
          allowClear
          prefix={<SearchOutlined />}
          placeholder="Search items"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="search"
        />
        <label className="toggle">
          <Switch size="small" checked={showDone} onChange={setShowDone} /> Show done
        </label>
      </div>

      {loadError ? (
        <div className="load-error">
          <p>Couldn't load items: {loadError}. Check that the API is running on port 3001.</p>
          <Button icon={<ReloadOutlined />} onClick={load}>
            Try again
          </Button>
        </div>
      ) : (
        <Spin spinning={loading}>
          {view === "list" ? (
            <ListView items={visible} weeklyMinutes={weeklyMinutes} {...rowHandlers} />
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
                    items={byQuadrant(q.impact, q.focus)}
                    onAdd={(impact, f) => setModal({ open: true, item: null, defaults: { impact, focus: f } })}
                    onDropItem={handleDrop}
                    weeklyMinutes={weeklyMinutes}
                    {...rowHandlers}
                  />
                ))}
              </div>
            ))}
          </div>
          <p className="hint">Drag an item to another quadrant to relabel it. Click an item's time to set its allocation and progress.</p>
          </>
          )}
        </Spin>
      )}

      <ItemFormModal
        open={modal.open}
        item={modal.open ? modal.item : null}
        defaults={modal.open ? modal.defaults : undefined}
        items={items}
        areas={areas}
        saving={saving}
        weeklyMinutes={weeklyMinutes}
        onCancel={() => setModal({ open: false })}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
