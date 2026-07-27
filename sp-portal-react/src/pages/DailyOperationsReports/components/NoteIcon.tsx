// @ts-nocheck
import React from 'react';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';

interface NoteIconProps {
  note: string | null | undefined;
}

export const NoteIcon: React.FC<NoteIconProps> = ({ note }) => {
  // Only show icon if note exists and is not empty
  if (!note || note.trim() === '' || note === '-') {
    return null;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#f5e6a3] text-[#8b6914] font-bold text-[0.9rem] cursor-pointer transition-[background-color,transform,box-shadow] duration-200 hover:bg-[#e8d48f] hover:scale-110 hover:shadow-[0_2px_8px_rgba(245,230,163,0.4)]">
          !
        </span>
      </TooltipTrigger>
      <TooltipContent 
        side="top"
        className="bg-[#2c3e50] text-white max-w-[250px] whitespace-normal break-words min-w-[150px]"
      >
        {note}
      </TooltipContent>
    </Tooltip>
  );
};

