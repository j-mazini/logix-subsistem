// @ts-nocheck
export function Tooltip({ content, children }) {
  return <div title={content}>{children}</div>;
}

export function TooltipTrigger({ children }) {
  return <div>{children}</div>;
}

export function TooltipContent({ children }) {
  return <div>{children}</div>;
}
