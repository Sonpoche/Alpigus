import { DatePicker } from '@mantine/dates'
import { fr } from "date-fns/locale"
import '@mantine/dates/styles.css'

export interface SlotsCalendarProps {
  className?: string;
  selected: Date | null;
  onSelect?: (date: Date | null) => void;
  getDayProps?: (date: Date) => any;
}

export function SlotsCalendar({
  className,
  selected,
  onSelect,
  getDayProps,
}: SlotsCalendarProps) {
  const customGetDayProps = (date: Date) => {
    const baseProps = getDayProps?.(date) || {};
    const hasSlots = baseProps.style?.backgroundColor === 'rgb(var(--custom-accent))';
    const isPast = date < new Date(new Date().setHours(0, 0, 0, 0));
    
    if (hasSlots) {
      return {
        ...baseProps,
        style: {
          backgroundColor: 'rgba(255, 90, 95, 0.2)',
          color: '#FF5A5F',
          cursor: isPast ? 'not-allowed' : 'pointer',
          opacity: isPast ? 0.25 : 1
        }
      };
    }
    if (isPast) {
      return {
        ...baseProps,
        style: {
          color: '#999',
          cursor: 'not-allowed',
          opacity: 0.25
        }
      };
    }
    return baseProps;
  };

  return (
    <div className="space-y-6">
      <div className="w-full flex justify-center">
        <div className="w-full max-w-none">
          <DatePicker
            value={selected}
            onChange={onSelect}
            locale="fr"
            weekendDays={[]}
            firstDayOfWeek={1}
            getDayProps={customGetDayProps}
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

      {/* Légende */}
      <div className="flex flex-wrap gap-6 px-4">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-[rgba(255,90,95,0.2)] text-[#FF5A5F] flex items-center justify-center">
            21
          </div>
          <span className="text-sm text-foreground/80">Créneau configuré</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-[#FF5A5F] text-white flex items-center justify-center">
            21
          </div>
          <span className="text-sm text-foreground/80">Jour sélectionné</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded hover:bg-[rgba(255,90,95,0.3)] hover:text-[#FF5A5F] border border-foreground/10 flex items-center justify-center transition-colors">
            21
          </div>
          <span className="text-sm text-foreground/80">Jour disponible</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded text-[#999] opacity-25 border border-foreground/10 flex items-center justify-center">
            21
          </div>
          <span className="text-sm text-foreground/80">Jour passé</span>
        </div>
      </div>
    </div>
  )
}

export default SlotsCalendar