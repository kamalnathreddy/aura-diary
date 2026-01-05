import { prisma } from "@/lib/db";
import EntryForm from "@/components/EntryForm";
import { generateDailySummary } from "@/lib/ai"; // <--- Make sure this is in your ai.ts
import { format, isSameDay } from "date-fns";
import { 
  History, 
  Sparkles, 
  Trash2, 
  Quote, 
  PenLine, 
  ArrowLeft,
} from "lucide-react"; 
import { auth, currentUser } from "@clerk/nextjs/server"; 
import { UserButton } from "@clerk/nextjs"; 
import Link from "next/link"; 
import { deleteEntry } from "./actions";

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

  const searchParams = await props.searchParams;
  
  // 1. DETERMINE CURRENT VIEW & CONTEXT
  // Options: 'dashboard' (default) | 'new' | 'timeline' | 'story'
  const currentView = typeof searchParams.view === 'string' ? searchParams.view : 'dashboard';
  const selectedId = typeof searchParams.id === 'string' ? searchParams.id : null;

  // 2. DATE LOGIC (Today vs Past)
  let activeDate = new Date();
  
  // If user clicked a specific entry from history, switch "activeDate" to that day
  if (selectedId) {
    const selectedEntry = await prisma.entry.findUnique({
      where: { id: selectedId, userId },
    });
    if (selectedEntry) activeDate = new Date(selectedEntry.createdAt);
  }

  const startOfDay = new Date(activeDate);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(activeDate);
  endOfDay.setHours(23, 59, 59, 999);

  // 3. FETCH DATA
  // A. Entries for the Active Day (for Timeline & Story)
  const dailyEntries = await prisma.entry.findMany({
    where: {
      userId: userId,
      createdAt: { gte: startOfDay, lte: endOfDay },
    },
    orderBy: { createdAt: 'desc' }, 
  });

  // B. Recent History (Just for the "Timeline" Card stats)
  const historyEntries = await prisma.entry.findMany({
    where: { userId: userId },
    take: 1, // Just checking count is enough usually, or fetch count separately
  });
  const totalEntriesCount = await prisma.entry.count({ where: { userId } });

  // 4. GENERATE AI STORY (Server-Side)
  // We only generate this if there are entries. 
  // It sends the raw text to the "Narrator" prompt we created.
  const entryTexts = dailyEntries.map(e => e.content);
  
  let dailyNarrative = "";
  if (entryTexts.length > 0) {
    // This calls your new function in ai.ts
    dailyNarrative = await generateDailySummary(entryTexts);
  }

  // 5. CALCULATE STATS
  const avgMood = dailyEntries.length > 0 
    ? Math.round(dailyEntries.reduce((acc, curr) => acc + (curr.moodScore || 5), 0) / dailyEntries.length)
    : 0;

  const isToday = isSameDay(activeDate, new Date());

  // --- SUB-COMPONENT: Top Navigation Bar ---
  const TopBar = () => (
    <header className="max-w-3xl mx-auto w-full mb-8 flex items-center justify-between">
      <div className="flex items-center gap-4">
        {currentView !== 'dashboard' ? (
          <Link href="/" className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors p-2 hover:bg-white/5 rounded-lg">
            <ArrowLeft size={20} />
            <span className="text-sm font-medium">Dashboard</span>
          </Link>
        ) : (
          <div className="flex items-center gap-3">
             <div className="bg-white/10 p-1 rounded-full"><UserButton afterSignOutUrl="/"/></div>
             <div>
                <h1 className="text-xl font-bold text-slate-200">Hi, {user.firstName}</h1>
                <p className="text-xs text-slate-500">{format(new Date(), "EEEE, MMM do")}</p>
             </div>
          </div>
        )}
      </div>
      {/* View Indicator (Optional Polish) */}
      {currentView !== 'dashboard' && (
        <div className="text-[10px] font-mono text-indigo-400 border border-indigo-500/30 px-2 py-1 rounded-full uppercase tracking-wider">
          {currentView}
        </div>
      )}
    </header>
  );

  return (
    <main className="aura-bg min-h-screen p-6 md:p-12 flex flex-col items-center animate-in fade-in duration-500">
      <TopBar />

      {/* =========================================================
          VIEW 1: THE DASHBOARD HUB (Main Menu)
      ========================================================= */}
      {currentView === 'dashboard' && (
        <div className="max-w-3xl w-full grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* Card A: New Entry */}
          <Link href="/?view=new" className="group relative p-6 bg-gradient-to-br from-indigo-600 to-violet-700 rounded-3xl shadow-xl hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 border border-white/10 overflow-hidden min-h-[180px] flex flex-col justify-between">
             <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <PenLine size={120} />
             </div>
             <div className="relative z-10">
                <div className="p-3 bg-white/20 w-fit rounded-xl mb-4 backdrop-blur-sm">
                   <PenLine size={24} className="text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-1">New Entry</h2>
                <p className="text-indigo-200 text-sm">Clear your mind. What's happening?</p>
             </div>
          </Link>

          {/* Card B: Timeline / History */}
          <Link href="/history" className="group p-6 glass-panel rounded-3xl hover:bg-white/5 transition-all duration-300 border border-white/5 hover:border-indigo-500/30 flex flex-col justify-between min-h-[180px]">
             <div className="flex justify-between items-start">
                <div className="p-3 bg-slate-800 w-fit rounded-xl border border-white/5">
                   <History size={24} className="text-slate-300" />
                </div>
                <span className="text-xs font-mono text-slate-500">{totalEntriesCount} total</span>
             </div>
             <div>
                <h2 className="text-xl font-semibold text-slate-200 mb-1">Timeline</h2>
                <p className="text-slate-500 text-sm">View your mood calendar.</p>
             </div>
          </Link>

          {/* Card C: Story of the Day */}
          <Link href="/?view=story" className="group md:col-span-2 p-6 glass-panel rounded-3xl hover:bg-white/5 transition-all duration-300 border border-white/5 hover:border-indigo-500/30 flex items-center gap-6">
             <div className="p-4 bg-rose-500/10 w-fit rounded-2xl shrink-0">
                <Sparkles size={28} className="text-rose-400" />
             </div>
             <div className="flex-1">
                <div className="flex justify-between items-center mb-2">
                   <h2 className="text-xl font-semibold text-slate-200">Story of the Day</h2>
                   {avgMood > 0 && <span className="text-xs bg-indigo-500/20 text-indigo-300 px-2 py-1 rounded-full border border-indigo-500/20">Avg Mood: {avgMood}/10</span>}
                </div>
                <p className="text-slate-400 text-sm line-clamp-2 leading-relaxed italic">
                   {dailyNarrative 
                      ? `"${dailyNarrative}"` 
                      : "No story yet. Write some entries to generate your daily narrative."}
                </p>
             </div>
          </Link>
        </div>
      )}

      {/* =========================================================
          VIEW 2: NEW ENTRY FORM
      ========================================================= */}
      {currentView === 'new' && (
        <div className="max-w-2xl w-full animate-in zoom-in-95 duration-300">
           <div className="glass-panel p-1 rounded-3xl overflow-hidden border border-white/10">
              <div className="bg-slate-900/50 p-6 md:p-8">
                 <h2 className="text-2xl font-light text-slate-200 mb-6 text-center">Reflect</h2>
                 <EntryForm />
              </div>
           </div>
        </div>
      )}

      {/* =========================================================
          VIEW 3: TIMELINE FEED (Read Mode)
      ========================================================= */}
      {currentView === 'timeline' && (
        <div className="max-w-2xl w-full space-y-6 animate-in slide-in-from-right-8 duration-300">
           {dailyEntries.length === 0 ? (
              <div className="text-center text-slate-500 py-20 bg-white/5 rounded-3xl border border-white/5">
                 <p>No entries found for this day.</p>
              </div>
           ) : (
              dailyEntries.map((entry) => (
                <div key={entry.id} className="glass-panel p-6 rounded-2xl border-l-4 border-indigo-500/50 relative group transition-all hover:bg-white/5">
                   
                   {/* Meta Header */}
                   <div className="flex justify-between items-center mb-4 pb-4 border-b border-white/5">
                      <span className="text-xs font-mono text-indigo-300 bg-indigo-500/10 px-2 py-1 rounded">{format(entry.createdAt, "h:mm a")}</span>
                      <div className="flex gap-3 items-center">
                        <span className="text-[10px] text-slate-500 uppercase tracking-widest">{entry.moodLabel}</span>
                        <form action={async () => {
                           'use server';
                           await deleteEntry(entry.id);
                        }}>
                           <button className="text-slate-600 hover:text-red-400 transition-colors p-1" title="Delete"><Trash2 size={14} /></button>
                        </form>
                      </div>
                   </div>

                   {/* User Content */}
                   <p className="text-slate-200 leading-relaxed whitespace-pre-wrap text-lg font-light">{entry.content}</p>
                   
                   {/* AI Companion Reply (Small & Italic) */}
                   {entry.aiReflection && (
                      <div className="mt-4 pt-4 flex gap-3 items-start opacity-70">
                         <Sparkles size={14} className="text-indigo-400 mt-1 shrink-0" />
                         <p className="text-sm text-slate-400 italic">{entry.aiReflection}</p>
                      </div>
                   )}
                </div>
              ))
           )}
        </div>
      )}

      {/* =========================================================
          VIEW 4: FULL STORY MODE
      ========================================================= */}
      {currentView === 'story' && (
        <div className="max-w-2xl w-full animate-in fade-in duration-500">
           <div className="glass-panel p-8 md:p-12 rounded-3xl border border-rose-500/20 bg-gradient-to-b from-rose-900/10 to-transparent relative overflow-hidden">
              
              {/* Decorative Quote Icon */}
              <Quote size={64} className="absolute -top-4 -left-4 text-rose-500/10 rotate-180" />
              
              <div className="relative z-10 text-center space-y-6">
                 <h2 className="text-sm font-mono text-rose-300 uppercase tracking-widest mb-4">Daily Narrative</h2>
                 
                 <p className="text-xl md:text-2xl text-slate-200 leading-loose font-serif italic">
                    {dailyNarrative || "Your story is still being written. Add more entries to generate a summary."}
                 </p>
                 
                 <div className="pt-8 mt-8 border-t border-white/5 flex justify-center gap-8">
                     <div className="text-center">
                        <div className="text-3xl font-bold text-white">{dailyEntries.length}</div>
                        <div className="text-[10px] text-slate-500 uppercase tracking-widest mt-1">Entries</div>
                     </div>
                     <div className="text-center">
                        <div className="text-3xl font-bold text-indigo-400">{avgMood}</div>
                        <div className="text-[10px] text-slate-500 uppercase tracking-widest mt-1">Avg Mood</div>
                     </div>
                 </div>
              </div>

           </div>
        </div>
      )}

    </main>
  );
}