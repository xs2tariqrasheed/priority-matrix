import { Button, Popconfirm } from "antd";
import { CheckCircleFilled, CheckOutlined, UndoOutlined } from "@ant-design/icons";
import type { Item } from "../types";

interface Props {
  item: Item;
  onToggle: (item: Item) => void;
  /** icon: round check in dense rows · text: labelled button · primary: main action in the detail panel */
  variant?: "icon" | "text" | "primary";
  size?: "small" | "middle";
}

/** "Mark done" / "Mark undone" with a confirmation step. */
export function MarkDoneButton({ item, onToggle, variant = "text", size = "small" }: Props) {
  const done = item.done;
  const label = done ? "Mark undone" : "Mark done";
  return (
    <Popconfirm
      title={done ? "Reopen this task?" : "Mark this task as done?"}
      description={
        <span className="confirm-desc">
          {done ? "It will go back to your open tasks." : "It moves to your completed tasks."}
          <br />
          <strong>{item.title}</strong>
        </span>
      }
      okText={label}
      cancelText="Cancel"
      icon={done ? <UndoOutlined style={{ color: "var(--accent)" }} /> : <CheckCircleFilled style={{ color: "var(--ok)" }} />}
      onConfirm={() => onToggle(item)}
      placement={variant === "primary" ? "topLeft" : "topRight"}
    >
      {variant === "icon" ? (
        <Button
          size={size}
          type="text"
          shape="circle"
          className={`done-btn done-btn-icon${done ? " is-done" : ""}`}
          icon={done ? <UndoOutlined /> : <CheckOutlined />}
          aria-label={`${label}: ${item.title}`}
          title={label}
        />
      ) : (
        <Button
          size={size}
          type={variant === "primary" && !done ? "primary" : "default"}
          className={`done-btn done-btn-${variant}${done ? " is-done" : ""}`}
          icon={done ? <UndoOutlined /> : <CheckOutlined />}
          aria-label={`${label}: ${item.title}`}
        >
          {label}
        </Button>
      )}
    </Popconfirm>
  );
}
