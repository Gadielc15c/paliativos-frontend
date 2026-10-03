import { useLayoutEffect, useRef, type TextareaHTMLAttributes } from "react";

/** Textarea that grows with its content (no resize handle). Uses `field-sizing` when available, JS otherwise. */
export default function AutoTextarea({ value, minRows = 2, className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement> & { value: string; minRows?: number }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || CSS.supports?.("field-sizing", "content")) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight + 2}px`;
  }, [value]);
  return <textarea ref={ref} rows={minRows} value={value} className={["auto-textarea", className].filter(Boolean).join(" ")} {...props} />;
}
