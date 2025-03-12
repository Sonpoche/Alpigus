import { DatePicker } from '@mantine/dates'
import { isBefore, startOfDay } from "date-fns"
import { fr } from "date-fns/locale"
import 'dayjs/locale/fr'

export interface CalendarProps {
  className?: string;
  selected: Date | null;
  onSelect?: (date: Date | null) => void;
  bookedDates?: Date[];
  disabled?: (date: Date) => boolean;
  showLegend?: boolean; // Nouvelle prop
}

function Calendar({
  className,
  selected,
  onSelect,
  bookedDates,
  disabled,
  showLegend = true, // Valeur par défaut
}: CalendarProps) {
  const today = startOfDay(new Date())

  const isDateDisabled = disabled || ((date: Date) => isBefore(startOfDay(date), today))

  const getDateStyle = (date: Date) => {
    const isPast = isBefore(startOfDay(date), today);
    const isBooked = bookedDates?.some(bookedDate => 
      date.getFullYear() === bookedDate.getFullYear() &&
      date.getMonth() === bookedDate.getMonth() &&
      date.getDate() === bookedDate.getDate()
    );

    if (isBooked) {
      return {
        backgroundColor: 'rgba(255, 90, 95, 0.2)',
        color: '#FF5A5F',
        cursor: isPast ? 'not-allowed' : 'pointer',
        opacity: isPast ? 0.25 : 1
      };
    }
    if (isPast) {
      return {
        color: '#999',
        cursor: 'not-allowed',
        opacity: 0.25
      };
    }
    return {};
  }

  return (
    <div className="space-y-6">
      <div className="w-full flex justify-center">
        <div className="w-full max-w-none">
          <DatePicker
            value={selected}
            onChange={onSelect}
            locale="fr"
            excludeDate={isDateDisabled}
            weekendDays={[]}
            firstDayOfWeek={1}
            getDayProps={(date) => ({
              style: getDateStyle(date)
            })}
            className="w-full [&_.mantine-DatePicker-month]:w-full [&_.mantine-DatePicker-monthRow]:w-full [&_.mantine-DatePicker-monthRow]:grid [&_.mantine-DatePicker-monthRow]:grid-cols-7 [&_.mantine-DatePicker-monthRow]:gap-0 [&_.mantine-DatePicker-day]:w-full [&_.mantine-DatePicker-weekday]:w-full [&_.mantine-DatePicker-weekdaysRow]:w-full [&_.mantine-DatePicker-weekdaysRow]:grid [&_.mantine-DatePicker-weekdaysRow]:grid-cols-7 [&_.mantine-DatePicker-calendarHeader]:w-full"
            classNames={{
              day: "dark:text-[#FF5A5F] dark:data-[selected]:text-white",
              weekday: "dark:text-gray-400",
              calendarHeaderControl: "dark:text-[#FF5A5F] dark:hover:bg-[rgba(255,90,95,0.1)]"
            }}
            styles={{
              day: {
                '&[aria-selected="true"]': {
                  backgroundColor: '#FF5A5F !important',
                  color: 'white !important'
                },
                '&.today': {
                  color: '#FF5A5F !important'
                },
                '&:hover': {
                  backgroundColor: 'rgba(255, 90, 95, 0.3) !important',
                  color: '#FF5A5F !important'
                },
                '@media (prefers-color-scheme: dark)': {
                  '&:hover': {
                    backgroundColor: 'rgba(255, 90, 95, 0.3) !important',
                    color: 'white !important',
                  },
                  '&[aria-selected="true"]': {
                    backgroundColor: '#FF5A5F !important',
                    color: 'white !important'
                  },
                  '&[data-outside]': {
                    color: '#666 !important',
                    opacity: 0.25
                  }
                }
              },
              month: {
                padding: '0.5rem'
              }
            }}
          />
        </div>
      </div>

      {/* Légende conditionnelle */}
      {showLegend && (
        <div className="flex flex-wrap gap-6 px-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-[rgba(255,90,95,0.2)] text-[#FF5A5F] flex items-center justify-center">
              21
            </div>
            <span className="text-sm text-foreground/80">Date réservée</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-[#FF5A5F] text-white flex items-center justify-center">
              21
            </div>
            <span className="text-sm text-foreground/80">Date sélectionnée</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded hover:bg-[rgba(255,90,95,0.3)] hover:text-[#FF5A5F] border border-foreground/10 flex items-center justify-center transition-colors">
              21
            </div>
            <span className="text-sm text-foreground/80">Date disponible</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded text-[#999] opacity-25 border border-foreground/10 flex items-center justify-center">
              21
            </div>
            <span className="text-sm text-foreground/80">Date passée</span>
          </div>
        </div>
      )}
    </div>
  )
}

Calendar.displayName = "Calendar"

export { Calendar }