import { prisma } from "@/lib/db";
import { auth, currentUser } from "@clerk/nextjs/server";
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameDay, 
  getDay, 
  addMonths, 
  subMonths, 
  parseISO, 
  isFuture 
} from "date-fns";
import Link from "next/link";
import { ChevronLeft, ChevronRight, ArrowLeft } from "lucide-react";

export const dynamic = 'force-dynamic';

interface Props {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function HistoryPage(props: Props) {
  const { userId } = await auth();
  const user = await currentUser();

  if (!userId) return <div className="p-8 text-slate-400">Please sign in</div>;

  // 1. Determine which month to show based on URL, or default to Today
  const searchParams = await props.searchParams;
  const urlDate = typeof searchParams.date === 'string' ? searchParams.date : null;
  
  // If URL has ?date=2025-12-01, use that. Otherwise use today.
  const currentMonthDate = urlDate ? parseISO(urlDate) : new Date();

  const monthStart = startOfMonth(currentMonthDate);
  const monthEnd = endOfMonth(currentMonthDate);
  
  // 2. Generate all days for the grid
  const daysInMonth = eachDayOfInterval({
    start: monthStart,
    end: monthEnd,
  });

  // 3. Fetch entries ONLY for this specific month window
  // (Optimization: No need to fetch all history forever, just this month)
  const entries = await prisma.entry.findMany({
    where: { 
      userId,
      createdAt: {
        gte: monthStart,
        lte: monthEnd
      }
    },
    select: { id: true, createdAt: true, moodScore: true, moodLabel: true },
  });

  // 4. Helper to find entry for a specific day
  const getEntryForDay = (day: Date) => {
    return entries.find(entry => isSameDay(new Date(entry.createdAt), day));
  };

  const getMoodColor = (score: number) => {
    if (score >= 8) return "bg-emerald-500/20 border-emerald-500/50 text-emerald-200"; 
    if (score >= 5) return "bg-indigo-500/20 border-indigo-500/50 text-indigo-200";   
    return "bg-rose-500/20 border-rose-500/50 text-rose-200";                         
  };

  const startingDayIndex = getDay(monthStart); 

  // Navigation Links
  const prevMonth = format(subMonths(currentMonthDate, 1), "yyyy-MM-dd");
  const nextMonth = format(addMonths(currentMonthDate, 1), "yyyy-MM-dd");
  const isNextMonthFuture = isFuture(addMonths(monthStart, 1));

  return (
    <main className="aura-bg min-h-screen p-6 md:p-12 flex justify-center">
      <div className="max-w-4xl w-full">
        
        {/* Header with Navigation */}
        <div className="flex items-center justify-between mb-8 animate-in slide-in-from-top-4 duration-500">
          
          <div className="flex items-center gap-4">
             {/* Back to Dashboard */}
            <Link href="/" className="p-2 bg-white/5 rounded-full hover:bg-white/10 transition-colors border border-white/5 text-slate-400 hover:text-white">
              <ArrowLeft size={20} />
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-slate-200">Mood Calendar</h1>
              <p className="text-slate-400 text-sm">Your journey in {format(currentMonthDate, "MMMM yyyy")}</p>
            </div>
          </div>

          {/* Month Switcher Buttons */}
          <div className="flex items-center gap-2 bg-slate-900/50 p-1 rounded-xl border border-white/10">
            <Link 
              href={`/history?date=${prevMonth}`} 
              className="p-2 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors"
              title="Previous Month"
            >
              <ChevronLeft size={20} />
            </Link>
            
            <span className="text-sm font-mono text-indigo-300 w-24 text-center">
              {format(currentMonthDate, "MMM yyyy")}
            </span>

            {isNextMonthFuture ? (
               <button disabled className="p-2 text-slate-700 cursor-not-allowed">
                 <ChevronRight size={20} />
               </button>
            ) : (
               <Link 
                 href={`/history?date=${nextMonth}`} 
                 className="p-2 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors"
               >
                 <ChevronRight size={20} />
               </Link>
            )}
          </div>

        </div>

        {/* Calendar Grid */}
        <div className="glass-panel p-6 md:p-8 rounded-3xl border border-white/5 animate-in fade-in zoom-in-95 duration-300">
          
          <div className="grid grid-cols-7 mb-4 border-b border-white/5 pb-4">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-2 md:gap-4">
            {/* Empty slots for previous month alignment */}
            {Array.from({ length: startingDayIndex }).map((_, i) => (
              <div key={`empty-${i}`} className="aspect-square"></div>
            ))}

            {/* Actual Days */}
            {daysInMonth.map((day) => {
              const entry = getEntryForDay(day);
              const isToday = isSameDay(day, new Date());
              
              return (
                <Link 
                  href={entry ? `/?id=${entry.id}` : "#"} 
                  key={day.toISOString()}
                  className={`
                    aspect-square rounded-xl flex flex-col items-center justify-center border transition-all relative group
                    ${entry 
                      ? `${getMoodColor(entry.moodScore || 5)} cursor-pointer hover:scale-105 hover:shadow-lg shadow-indigo-500/10` 
                      : "bg-white/5 border-transparent text-slate-600 cursor-default hover:bg-white/10"
                    }
                    ${isToday ? "ring-2 ring-indigo-400/50 z-10" : ""}
                  `}
                >
                  <span className={`text-sm font-medium ${isToday ? "text-indigo-300" : ""}`}>
                    {format(day, "d")}
                  </span>
                  
                  {entry && (
                    <div className="absolute -bottom-8 bg-slate-900/90 backdrop-blur text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-20 border border-white/10 shadow-xl">
                      {entry.moodLabel} ({entry.moodScore}/10)
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </main>
  );
}