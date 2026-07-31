import { memo } from "react";
import { currentMonthStyles } from "../../styles";

interface NoteSectionProps {
  note: string;
}

export const NoteSection = memo(function NoteSection({ note }: NoteSectionProps) {
  return (
    <div className={currentMonthStyles.noteCard}>
      <div className={currentMonthStyles.noteInner}>
        <div className={currentMonthStyles.noteTitle}>Notes</div>
        <div className={currentMonthStyles.noteText}>{note}</div>
      </div>
    </div>
  );
});
