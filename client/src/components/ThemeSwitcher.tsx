import { Button, Popover } from "antd";
import { BgColorsOutlined, CheckOutlined } from "@ant-design/icons";
import { THEMES, useTheme } from "../theme";

/** Picks one of the three dark palettes. */
export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  return (
    <Popover
      trigger="click"
      placement="bottomRight"
      title="Theme"
      content={
        <div className="theme-menu" role="radiogroup" aria-label="Theme">
          {THEMES.map((t) => {
            const active = t.id === theme.id;
            return (
              <button
                key={t.id}
                type="button"
                role="radio"
                aria-checked={active}
                className={`theme-option${active ? " is-active" : ""}`}
                onClick={() => setTheme(t.id)}
              >
                <span className="theme-swatch" style={{ background: t.palette.bg, borderColor: t.palette.lineStrong }}>
                  <i style={{ background: t.palette.surface3 }} />
                  <i style={{ background: t.palette.accent }} />
                  <i style={{ background: t.palette.p }} />
                </span>
                <span className="theme-text">
                  <strong>{t.name}</strong>
                  <small>{t.tagline}</small>
                </span>
                {active && <CheckOutlined className="theme-check" />}
              </button>
            );
          })}
        </div>
      }
    >
      <Button type="text" shape="circle" icon={<BgColorsOutlined />} aria-label="Change theme" title="Theme" />
    </Popover>
  );
}
