export function resolveEditableWidgetState(
  widgetState: Record<string, unknown> | null,
): Record<string, unknown> {
  return widgetState ?? {};
}

export function resolveResetWidgetState(): null {
  return null;
}
