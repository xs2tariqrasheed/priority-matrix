import type { MouseEvent } from "react";

/**
 * True when a click inside a clickable row landed on a control (button, input, link)
 * or came from a portal (popover, popconfirm) rendered outside the row's DOM.
 */
export function isInteractiveClick(e: MouseEvent<HTMLElement>): boolean {
  const target = e.target as HTMLElement | null;
  if (!target) return false;
  if (!e.currentTarget.contains(target)) return true;
  // The row itself may carry role="button"; only controls inside it count.
  const control = target.closest("button, a, input, textarea, select, [role='button'], [role='slider'], .ant-popover");
  return control !== null && control !== e.currentTarget;
}
