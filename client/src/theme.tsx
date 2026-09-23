import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { App as AntApp, ConfigProvider, theme as antTheme } from "antd";
import enGB from "antd/locale/en_GB";

export type ThemeId = "graphite" | "midnight" | "ember";

export interface Palette {
  bg: string;
  surface: string;
  surface2: string;
  surface3: string;
  line: string;
  lineStrong: string;
  ink: string;
  muted: string;
  faint: string;
  accent: string;
  accentInk: string;
  accentSoft: string;
  accentGlow: string;
  p: string;
  pSoft: string;
  v: string;
  vSoft: string;
  ok: string;
  okSoft: string;
  warn: string;
  warnSoft: string;
  danger: string;
  dangerSoft: string;
}

export interface ThemeDef {
  id: ThemeId;
  name: string;
  tagline: string;
  palette: Palette;
}

export const THEMES: ThemeDef[] = [
  {
    id: "graphite",
    name: "Graphite",
    tagline: "Neutral charcoal, indigo accent",
    palette: {
      bg: "#0e1013",
      surface: "#15181d",
      surface2: "#1b1f26",
      surface3: "#232831",
      line: "#252a33",
      lineStrong: "#333945",
      ink: "#e8eaef",
      muted: "#8b93a4",
      faint: "#5d6575",
      accent: "#8b95ff",
      accentInk: "#0e1013",
      accentSoft: "rgba(139, 149, 255, 0.16)",
      accentGlow: "rgba(139, 149, 255, 0.10)",
      p: "#f2707a",
      pSoft: "rgba(242, 112, 122, 0.16)",
      v: "#3cc9a7",
      vSoft: "rgba(60, 201, 167, 0.16)",
      ok: "#45d38f",
      okSoft: "rgba(69, 211, 143, 0.16)",
      warn: "#f5b64a",
      warnSoft: "rgba(245, 182, 74, 0.16)",
      danger: "#ff6b6b",
      dangerSoft: "rgba(255, 107, 107, 0.16)",
    },
  },
  {
    id: "midnight",
    name: "Midnight",
    tagline: "Deep navy, sky-blue accent",
    palette: {
      bg: "#090f1d",
      surface: "#0f182b",
      surface2: "#152038",
      surface3: "#1c2a47",
      line: "#1d2a45",
      lineStrong: "#2a3b5e",
      ink: "#e4eaf6",
      muted: "#8797b8",
      faint: "#586a8e",
      accent: "#4cc3ff",
      accentInk: "#06101f",
      accentSoft: "rgba(76, 195, 255, 0.16)",
      accentGlow: "rgba(76, 195, 255, 0.10)",
      p: "#ff7b8a",
      pSoft: "rgba(255, 123, 138, 0.16)",
      v: "#3fe0b7",
      vSoft: "rgba(63, 224, 183, 0.16)",
      ok: "#3ddc97",
      okSoft: "rgba(61, 220, 151, 0.16)",
      warn: "#ffc255",
      warnSoft: "rgba(255, 194, 85, 0.16)",
      danger: "#ff6e7a",
      dangerSoft: "rgba(255, 110, 122, 0.16)",
    },
  },
  {
    id: "ember",
    name: "Ember",
    tagline: "Warm black, amber accent",
    palette: {
      bg: "#121010",
      surface: "#1a1716",
      surface2: "#221e1c",
      surface3: "#2b2623",
      line: "#2c2724",
      lineStrong: "#3d3632",
      ink: "#f1ebe6",
      muted: "#a3968d",
      faint: "#6f645c",
      accent: "#ffa35c",
      accentInk: "#1a1210",
      accentSoft: "rgba(255, 163, 92, 0.16)",
      accentGlow: "rgba(255, 163, 92, 0.10)",
      p: "#ff6f66",
      pSoft: "rgba(255, 111, 102, 0.16)",
      v: "#62d3a4",
      vSoft: "rgba(98, 211, 164, 0.16)",
      ok: "#5fd6a0",
      okSoft: "rgba(95, 214, 160, 0.16)",
      warn: "#ffc46b",
      warnSoft: "rgba(255, 196, 107, 0.16)",
      danger: "#ff6b6b",
      dangerSoft: "rgba(255, 107, 107, 0.16)",
    },
  },
];

const STORAGE_KEY = "priority-matrix:theme";
const DEFAULT_THEME: ThemeId = "graphite";

export const FONT = "'Inter', 'Manrope', system-ui, -apple-system, 'Segoe UI', sans-serif";

export function readTheme(): ThemeId {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return THEMES.some((t) => t.id === v) ? (v as ThemeId) : DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
}

const kebab = (s: string) => s.replace(/[A-Z0-9]/g, (c) => `-${c.toLowerCase()}`);

/** Writes the palette to CSS custom properties on <html> so plain CSS and Ant Design share one source of truth. */
export function applyTheme(t: ThemeDef) {
  const root = document.documentElement;
  root.dataset.theme = t.id;
  root.style.colorScheme = "dark";
  for (const [key, value] of Object.entries(t.palette)) root.style.setProperty(`--${kebab(key)}`, value);
}

// Apply before the first render so there is no flash of the wrong palette.
applyTheme(THEMES.find((t) => t.id === readTheme()) ?? THEMES[0]);

interface ThemeContextValue {
  theme: ThemeDef;
  setTheme: (id: ThemeId) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside ThemeProvider");
  return ctx;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [id, setId] = useState<ThemeId>(readTheme);
  const theme = THEMES.find((t) => t.id === id) ?? THEMES[0];

  useEffect(() => {
    applyTheme(theme);
    try {
      localStorage.setItem(STORAGE_KEY, theme.id);
    } catch {
      /* storage unavailable; the choice just won't persist */
    }
  }, [theme]);

  const value = useMemo(() => ({ theme, setTheme: setId }), [theme]);
  const p = theme.palette;

  return (
    <ThemeContext.Provider value={value}>
      <ConfigProvider
        locale={enGB}
        theme={{
          algorithm: antTheme.darkAlgorithm,
          token: {
            colorPrimary: p.accent,
            colorInfo: p.accent,
            colorLink: p.accent,
            colorSuccess: p.ok,
            colorWarning: p.warn,
            colorError: p.danger,
            colorBgBase: p.bg,
            colorBgLayout: p.bg,
            colorBgContainer: p.surface,
            colorBgElevated: p.surface2,
            colorBgSpotlight: p.surface3,
            colorBorder: p.lineStrong,
            colorBorderSecondary: p.line,
            colorSplit: p.line,
            colorText: p.ink,
            colorTextSecondary: p.muted,
            colorTextTertiary: p.faint,
            colorTextQuaternary: p.faint,
            colorTextPlaceholder: p.faint,
            colorFillSecondary: p.surface3,
            colorFillTertiary: p.surface2,
            colorFillQuaternary: p.surface2,
            borderRadius: 10,
            borderRadiusSM: 8,
            borderRadiusLG: 14,
            borderRadiusXS: 6,
            controlHeight: 36,
            controlHeightSM: 28,
            controlHeightLG: 44,
            fontFamily: FONT,
            fontSize: 14,
            lineWidth: 1,
            boxShadow: "0 12px 32px rgba(0, 0, 0, 0.45)",
            boxShadowSecondary: "0 12px 32px rgba(0, 0, 0, 0.45)",
            motionDurationMid: "0.16s",
          },
          components: {
            Button: {
              fontWeight: 500,
              primaryShadow: "none",
              defaultShadow: "none",
              dangerShadow: "none",
              primaryColor: p.accentInk,
              defaultBg: p.surface2,
              defaultBorderColor: p.lineStrong,
              defaultHoverBg: p.surface3,
              defaultHoverBorderColor: p.lineStrong,
              textHoverBg: p.surface3,
            },
            Input: { activeShadow: `0 0 0 3px ${p.accentSoft}`, hoverBorderColor: p.lineStrong, activeBorderColor: p.accent },
            InputNumber: { activeShadow: `0 0 0 3px ${p.accentSoft}`, hoverBorderColor: p.lineStrong, activeBorderColor: p.accent },
            Select: {
              optionSelectedBg: p.accentSoft,
              optionActiveBg: p.surface3,
              activeOutlineColor: p.accentSoft,
              hoverBorderColor: p.lineStrong,
              multipleItemBg: p.surface3,
            },
            DatePicker: { activeShadow: `0 0 0 3px ${p.accentSoft}`, cellActiveWithRangeBg: p.accentSoft, cellHoverBg: p.surface3 },
            Segmented: {
              trackBg: p.surface,
              itemSelectedBg: p.surface3,
              itemSelectedColor: p.ink,
              itemColor: p.muted,
              itemHoverColor: p.ink,
              itemHoverBg: p.surface2,
              trackPadding: 3,
            },
            Table: {
              headerBg: p.surface,
              headerColor: p.muted,
              headerSplitColor: "transparent",
              headerSortActiveBg: p.surface2,
              headerSortHoverBg: p.surface2,
              bodySortBg: "transparent",
              rowHoverBg: p.surface2,
              borderColor: p.line,
              headerBorderRadius: 0,
              cellPaddingBlockMD: 11,
              cellPaddingInlineMD: 14,
              fontWeightStrong: 600,
            },
            Drawer: { colorBgElevated: p.surface, paddingLG: 24 },
            Modal: { contentBg: p.surface, headerBg: p.surface, footerBg: p.surface },
            Popover: { colorBgElevated: p.surface2, titleMinWidth: 200 },
            Tooltip: { colorBgSpotlight: p.surface3, colorTextLightSolid: p.ink },
            Dropdown: { colorBgElevated: p.surface2, controlItemBgHover: p.surface3 },
            Checkbox: { colorBgContainer: p.surface2 },
            Radio: { buttonSolidCheckedBg: p.accent, buttonSolidCheckedColor: p.accentInk, buttonBg: p.surface2, buttonCheckedBg: p.accent },
            Slider: {
              railBg: p.lineStrong,
              railHoverBg: p.lineStrong,
              trackBg: p.accent,
              trackHoverBg: p.accent,
              handleColor: p.accent,
              handleActiveColor: p.accent,
              handleActiveOutlineColor: p.accentSoft,
              dotBorderColor: p.line,
              railSize: 4,
            },
            Progress: { defaultColor: p.accent, remainingColor: p.line },
            Message: { contentBg: p.surface3 },
            Skeleton: { gradientFromColor: p.surface2, gradientToColor: p.surface3 },
            Form: { labelColor: p.muted, labelFontSize: 13, verticalLabelPadding: "0 0 6px" },
          },
        }}
      >
        <AntApp message={{ maxCount: 3, duration: 2.5 }}>{children}</AntApp>
      </ConfigProvider>
    </ThemeContext.Provider>
  );
}
