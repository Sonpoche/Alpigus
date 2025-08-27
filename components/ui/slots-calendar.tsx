// components/ui/slots-calendar.tsx
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
          backgroundColor: 'hsl(var(--muted))',
          color: 'hsl(var(--muted-foreground))',
          cursor: isPast ? 'not-allowed' : 'pointer',
          opacity: isPast ? 0.4 : 0.8,
          fontWeight: 'bold'
        }
      };
    }
    if (isPast) {
      return {
        ...baseProps,
        style: {
          color: 'hsl(var(--muted-foreground))',
          cursor: 'not-allowed',
          opacity: 0.4
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
              day: "dark:text-foreground dark:data-[selected]:text-primary-foreground",
              weekday: "dark:text-muted-foreground",
              calendarHeaderControl: "dark:text-foreground dark:hover:bg-accent"
            }}
            styles={{
              day: {
                '&[aria-selected="true"]': {
                  backgroundColor: 'hsl(var(--primary)) !important',
                  color: 'hsl(var(--primary-foreground)) !important'
                },
                '&.today': {
                  color: 'hsl(var(--primary)) !important',
                  fontWeight: 'bold'
                },
                '&:hover:not([aria-selected="true"])': {
                  backgroundColor: 'hsl(var(--accent)) !important',
                  color: 'hsl(var(--accent-foreground)) !important'
                },
                '@media (prefers-color-scheme: dark)': {
                  '&:hover:not([aria-selected="true"])': {
                    backgroundColor: 'hsl(var(--accent)) !important',
                    color: 'hsl(var(--accent-foreground)) !important',
                  },
                  '&[aria-selected="true"]': {
                    backgroundColor: 'hsl(var(--primary)) !important',
                    color: 'hsl(var(--primary-foreground)) !important'
                  },
                  '&[data-outside]': {
                    color: 'hsl(var(--muted-foreground)) !important',
                    opacity: 0.4
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

      {/* Légende en noir/blanc */}
      <div className="flex flex-wrap gap-6 px-4">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-muted text-muted-foreground flex items-center justify-center text-xs font-bold">
            21
          </div>
          <span className="text-sm text-muted-foreground">Créneau configuré</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
            21
          </div>
          <span className="text-sm text-muted-foreground">Jour sélectionné</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded hover:bg-accent hover:text-accent-foreground border border-border flex items-center justify-center text-xs transition-colors">
            21
          </div>
          <span className="text-sm text-muted-foreground">Jour disponible</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded text-muted-foreground opacity-40 border border-border flex items-center justify-center text-xs">
            21
          </div>
          <span className="text-sm text-muted-foreground">Jour passé</span>
        </div>
      </div>
    </div>
  )
}

export default SlotsCalendar