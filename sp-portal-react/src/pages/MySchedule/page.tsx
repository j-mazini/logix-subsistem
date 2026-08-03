import { StandardPageLayout, PageHeroCard } from "@/app/(private)/components";
import { useMySchedule } from "./hooks/useMySchedule";
import { ViewToggle } from "./components/ViewToggle";
import { WeekNavHeader } from "./components/WeekNavHeader";
import { DayDetailCard } from "./components/DayDetailCard";
import { WeekList } from "./components/WeekList";
import { myScheduleStyles as styles } from "./styles";

export default function MySchedulePage() {
  const {
    viewMode,
    setViewMode,
    weekStart,
    weekDays,
    selectedDate,
    selectedDay,
    isCurrentWeek,
    goToPrevWeek,
    goToNextWeek,
    goToToday,
    selectDate,
  } = useMySchedule();

  return (
    <StandardPageLayout bottomPadding="pb-[70px]">
      <PageHeroCard
        icon="bi-calendar-week"
        title="My Schedule"
        subtitle="Your daily rota and weekly roster"
        accent="teal"
      />

      <div className={styles.pageContent}>
        <ViewToggle value={viewMode} onChange={setViewMode} />

        <WeekNavHeader
          weekStart={weekStart}
          weekDays={weekDays}
          selectedDate={selectedDate}
          onSelectDate={selectDate}
          onPrevWeek={goToPrevWeek}
          onNextWeek={goToNextWeek}
          onToday={goToToday}
          isCurrentWeek={isCurrentWeek}
          showDayChips={viewMode === "day"}
        />

        {viewMode === "day" ? (
          <DayDetailCard day={selectedDay} />
        ) : (
          <WeekList
            weekDays={weekDays}
            onSelectDay={(date) => {
              selectDate(date);
              setViewMode("day");
            }}
          />
        )}
      </div>
    </StandardPageLayout>
  );
}
