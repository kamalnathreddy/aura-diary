import { prisma } from "@/lib/db";
import { auth, currentUser } from "@clerk/nextjs/server";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, getDay } from "date-fns";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export const dynamic = 'force-dynamic';

export default async function HistoryPage() {
  const { userId } = await auth();
  const user = await currentUser();

  if (!userId) return <div>Please sign in</div>;

  // 1. Get current month details
  const today = new Date();
  const daysInMonth = eachDayOfInterval({
    start: startOfMonth(today),
    end: endOfMonth(today),
  });

  // 2. Fetch ALL entries for this user
  const entries = await prisma.entry.findMany({
    where: { userId },
    select: { id: true, createdAt: true, moodScore: true, moodLabel: true },
  });

  // 3. Helper to find entry for a specific day
  const getEntryForDay = (day: Date) => {
    return entries.find(entry => isSameDay(new Date(entry.createdAt), day));
  };

  // 4. Helper to determine color based on mood
  const getMoodColor = (score: number) => {
    if (score >= 8) return "bg-emerald-500/20 border-emerald-500/50 text-emerald-200"; // Happy
    if (score >= 5) return "bg-indigo-500/20 border-indigo-500/50 text-indigo-200";   // Neutral
    return "bg-rose-500/20 border-rose-500/50 text-rose-200";                         // Sad/Stressed
  };

  // 5. Calculate empty slots for grid alignment (so Monday starts on Monday)
  const startingDayIndex = getDay(startOfMonth(today)); // 0 = Sunday, 1 = Monday...

  return (
    <main className="aura-bg min-h-screen p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/" className="p-2 bg-white/5 rounded-full hover:bg-white/10 transition-colors">
            <ChevronLeft className="text-slate-300" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-white">Mood Calendar</h1>
            <p className="text-slate-400 text-sm">Your emotional journey through {format(today, "MMMM")}</p>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="glass-panel p-6 rounded-2xl">
          
          {/* Weekday Headers */}
          <div className="grid grid-cols-7 mb-4 border-b border-white/5 pb-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">
                {day}
              </div>
            ))}
          </div>

          {/* Days */}
          <div className="grid grid-cols-7 gap-2 md:gap-4">
            {/* Empty slots for previous month days */}
            {Array.from({ length: startingDayIndex }).map((_, i) => (
              <div key={`empty-${i}`} className="aspect-square"></div>
            ))}

            {/* Actual Days */}
            {daysInMonth.map((day) => {
              const entry = getEntryForDay(day);
              return (
                <Link 
                  href={entry ? `/?id=${entry.id}` : "#"} // If entry exists, link to it
                  key={day.toISOString()}
                  className={`
                    aspect-square rounded-xl flex flex-col items-center justify-center border transition-all relative group
                    ${entry 
                      ? `${getMoodColor(entry.moodScore)} cursor-pointer hover:scale-105 hover:shadow-lg` 
                      : "bg-white/5 border-transparent text-slate-600 cursor-default"
                    }
                    ${isSameDay(day, today) ? "ring-2 ring-white/20" : ""}
                  `}
                >
                  <span className="text-sm font-medium">{format(day, "d")}</span>
                  
                  {entry && (
                    <span className="text-[10px] opacity-70 mt-1 hidden md:block">
                      {entry.moodLabel}
                    </span>
                  )}
                  
                  {/* Tooltip on Hover */}
                  {entry && (
                    <div className="absolute bottom-full mb-2 bg-slate-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                      Score: {entry.moodScore}/10
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