import { myDeliveriesStyles as s } from "../styles";

export function ReorderHint() {
  return (
    <p className={s.hint}>
      <i className={s.hintIcon} aria-hidden="true" />
      Drag the ⠿ handle to reorder postcode areas, or a stop to reorder within one.
    </p>
  );
}
