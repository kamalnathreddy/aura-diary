import { prisma } from "@/lib/db";
import EntryForm from "@/components/EntryForm";
import { format, isSameDay } from "date-fns";
import { Brain, Calendar, Sparkles, ChevronRight, Calendar as CalendarIcon, Trash2, Quote } from "lucide-react"; 
import { auth, currentUser } from "@clerk/nextjs/server"; 
import { UserButton } from "@clerk/nextjs"; 
import Link from "next/link"; 
import { deleteEntry } from "./actions"; // Import the delete action

export const dynamic = 'force-dynamic';

interface Props {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function Home(props: Props) {
  const { userId } = await auth();
  const user = await currentUser(); 

  if (!userId || !user) {
     return <div className="p-8 text-slate-400">Please sign in to view your diary.</div>;
  }

  const params = await props.searchParams;
  const selectedId = typeof params.id === 'string' ? params.id : null;

  // 1. Determine the "Active Date"
  let activeDate = new Date();
  let dailyEntries: any[] = [];

  if (selectedId) {
    // If user clicked an ID, find out what DAY that was
    const selectedEntry = await prisma.entry.findUnique({
      where: { id: selectedId, userId },
    });
    
    if (selectedEntry) {
      activeDate = new Date(selectedEntry.createdAt);
    }
  }

  // 2. Fetch ALL entries for that specific day (Timeline)
  const startOfDay = new Date(activeDate);
  startOfDay.setHours(0, 0, 0, 0);
  
  const endOfDay = new Date(activeDate);
  endOfDay.setHours(23, 59, 59, 999);

  dailyEntries = await prisma.entry.findMany({
    where: {
      userId: userId,
      createdAt: { gte: startOfDay, lte: endOfDay },
    },
    orderBy: { createdAt: 'asc' }, // Oldest first (like a chat)
  });

  // 3. Fetch Sidebar History (Past 20 items for navigation)
  const historyEntries = await prisma.entry.findMany({
    where: { userId: userId },
    take: 20,
    orderBy: { createdAt: 'desc' }
  });

  // 4. Generate the "Daily Story" (Aggregate Reflections)
  // We take the reflections from the day and join them to make a summary
  const dailyNarrative = dailyEntries
    .filter(e => e.aiReflection)
    .map(e => e.aiReflection)
    .join(" ");

  // 5. Calculate Daily Averages
  const avgMood = dailyEntries.length > 0 
    ? Math.round(dailyEntries.reduce((acc, curr) => acc + (curr.moodScore || 5), 0) / dailyEntries.length)
    : 0;

  const isToday = isSameDay(activeDate, new Date());

  return (
    <main className="aura-bg min-h-screen p-4 md:p-8 flex flex-col">
      {/* HEADER */}
      <header className="max-w-7xl mx-auto w-full mb-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="bg-white/10 p-1 rounded-full">
            <UserButton afterSignOutUrl="/"/>
          </div>
          <Link href="/history" className="p-2 bg-white/5 rounded-full hover:bg-white/10 transition-colors text-slate-400 hover:text-indigo-300">
            <CalendarIcon size={20} />
          </Link>
          <div>
            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-300 to-rose-300">
              Hi, {user.firstName} 
            </h1>
            <p className="text-slate-400 text-sm">Personal AI Sanctuary</p>
          </div>
        </div>
        <div className="text-right hidden md:block">
           <div className="text-2xl font-light text-slate-200">{format(activeDate, "EEEE")}</div>
           <div className="text-indigo-400 text-sm">{format(activeDate, "MMMM do")}</div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto w-full grid grid-cols-1 md:grid-cols-12 gap-6 flex-1">
        
        {/* LEFT COLUMN: The "Timeline" Chat */}
        <div className="md:col-span-7 flex flex-col gap-4 min-h-[500px]">
          
          {/* If looking at past, show "Back to Today" */}
          {!isToday && (
             <Link href="/" className="bg-indigo-500/20 text-indigo-200 p-3 rounded-xl text-center text-sm hover:bg-indigo-500/30 transition-colors mb-2">
               You are viewing a past memory from <strong>{format(activeDate, "MMMM do")}</strong>. 
               Click here to return to today.
             </Link>
          )}

          {/* THE CHAT FEED */}
          <div className="flex-1 space-y-4 overflow-y-auto max-h-[600px] pr-2 custom-scrollbar">
            {dailyEntries.length === 0 && isToday && (
               <div className="text-center text-slate-500 mt-20">
                 <p>The page is blank. Write your first thought...</p>
               </div>
            )}

            {dailyEntries.map((entry) => (
              <div key={entry.id} className="group relative pl-4 border-l-2 border-white/10 hover:border-indigo-500/50 transition-colors pb-6">
                {/* Timeline Dot */}
                <div className="absolute -left-[5px] top-0 w-2.5 h-2.5 rounded-full bg-slate-800 border border-slate-600 group-hover:border-indigo-400 group-hover:bg-indigo-900 transition-colors"></div>
                
                <div className="flex justify-between items-start mb-2">
                   <span className="text-xs text-slate-400 font-mono">{format(entry.createdAt, "h:mm a")}</span>
                   
                   {/* DELETE BUTTON */}
                   <form action={async () => {
                      'use server';
                      await deleteEntry(entry.id);
                   }}>
                      <button className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400 transition-all p-1" title="Delete Memory">
                        <Trash2 size={14} />
                      </button>
                   </form>
                </div>

                <div className="glass-panel p-4 rounded-xl rounded-tl-none inline-block max-w-full">
                  <p className="text-slate-200 whitespace-pre-wrap leading-relaxed">{entry.content}</p>
                </div>
                
                {/* Mini AI feedback inline (optional, keeps it conversational) */}
                <div className="mt-2 flex gap-2">
                   <span className="text-[10px] bg-white/5 px-2 py-0.5 rounded-full text-slate-500 border border-white/5">
                      {entry.moodLabel}
                   </span>
                </div>
              </div>
            ))}
          </div>

          {/* INPUT FORM (Only show if it is TODAY) */}
          {isToday && (
            <div className="mt-auto pt-4 border-t border-white/5">
              <EntryForm />
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: The "Story" & Summary */}
        <div className="md:col-span-5 space-y-6 flex flex-col h-full">
          
          {dailyEntries.length > 0 ? (
            <div className="space-y-6">
              
              {/* 1. THE DAILY STORY / NARRATIVE */}
              <div className="glass-panel p-6 rounded-2xl border-t-4 border-indigo-500 relative overflow-hidden bg-gradient-to-b from-indigo-900/20 to-transparent">
                <div className="flex items-center gap-2 mb-4 text-indigo-300">
                  <Quote size={20} />
                  <h3 className="font-semibold text-lg">The Story of the Day</h3>
                </div>
                <div className="relative z-10">
                  <p className="text-slate-200 text-md leading-relaxed font-light italic opacity-90">
                    "{dailyNarrative || "A quiet day with no major reflections yet."}"
                  </p>
                </div>
              </div>

              {/* Stats Row */}
              <div className="grid grid-cols-3 gap-2 opacity-80">
                <div className="bg-slate-900/50 rounded p-2 text-center">
                  <div className="text-xs text-slate-500">Avg Mood</div>
                  <div className="text-indigo-200 font-medium">{avgMood}/10</div>
                </div>
                <div className="bg-slate-900/50 rounded p-2 text-center">
                  <div className="text-xs text-slate-500">Entries</div>
                  <div className="text-indigo-200 font-medium">{dailyEntries.length}</div>
                </div>
                <div className="bg-slate-900/50 rounded p-2 text-center">
                  <div className="text-xs text-slate-500">Focus</div>
                  <div className="text-indigo-200 font-medium">--</div>
                </div>
              </div>

            </div>
          ) : (
             <div className="glass-panel p-6 rounded-2xl flex items-center justify-center text-slate-500 h-40">
               <p>No memories found for this day.</p>
             </div>
          )}

          {/* SIDEBAR HISTORY */}
          <div className="glass-panel rounded-2xl flex-1 overflow-hidden flex flex-col">
            <div className="p-4 border-b border-white/5 flex items-center gap-2 text-slate-300">
              <Calendar size={18} />
              <h3 className="font-semibold">Recent Timeline</h3>
            </div>
            <div className="overflow-y-auto p-4 space-y-3 flex-1 h-96">
              {historyEntries.map(entry => (
                <Link 
                  href={`/?id=${entry.id}`} 
                  key={entry.id} 
                  className={`block group p-3 rounded-xl transition-all cursor-pointer border hover:border-white/10 ${
                    selectedId === entry.id ? 'bg-white/10 border-indigo-500/50' : 'hover:bg-white/5 border-transparent'
                  }`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className={`text-xs font-medium ${selectedId === entry.id ? 'text-indigo-200' : 'text-slate-500'}`}>
                      {format(entry.createdAt, "MMM d • h:mm a")}
                    </span>
                    <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full flex items-center gap-1">
                      {entry.moodLabel}
                      <ChevronRight size={10} className="opacity-50"/>
                    </span>
                  </div>
                  <p className={`text-sm line-clamp-2 transition-colors ${selectedId === entry.id ? 'text-white' : 'text-slate-300 group-hover:text-white'}`}>
                    {entry.content}
                  </p>
                </Link>
              ))}
            </div>
          </div>

        </div>
      </div>
    </main>
  );
}