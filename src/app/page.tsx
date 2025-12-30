import { prisma } from "@/lib/db";
import EntryForm from "@/components/EntryForm";
import { format } from "date-fns";
import { Brain, Calendar, Sparkles, ChevronRight } from "lucide-react"; // Added ChevronRight
import { auth, currentUser } from "@clerk/nextjs/server"; 
import { UserButton } from "@clerk/nextjs"; 
import Link from "next/link"; // Import Link for clickable items

export const dynamic = 'force-dynamic';

interface Props {
  searchParams: { [key: string]: string | string[] | undefined }
}

export default async function Home({ searchParams }: Props) {
  const { userId } = await auth();
  const user = await currentUser(); 

  if (!userId || !user) {
     return <div className="p-8 text-slate-400">Please sign in to view your diary.</div>;
  }

  // 1. Determine which entry to show
  const selectedId = typeof searchParams.id === 'string' ? searchParams.id : null;

  let activeEntry = null;

  if (selectedId) {
    // A. If user clicked a specific item, fetch that exact one
    activeEntry = await prisma.entry.findFirst({
      where: {
        id: selectedId,
        userId: userId, // Security: Ensure it belongs to YOU
      },
    });
  } else {
    // B. Default: Fetch "Today's" entry
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const endOfDay = new Date(today.setHours(23, 59, 59, 999));

    activeEntry = await prisma.entry.findFirst({
      where: {
        userId: userId,
        createdAt: { gte: startOfDay, lte: endOfDay },
      },
    });
  }

  // 2. Fetch History List
  const entries = await prisma.entry.findMany({
    where: { userId: userId },
    take: 20,
    orderBy: { createdAt: 'desc' }
  });

  return (
    <main className="aura-bg min-h-screen p-4 md:p-8 flex flex-col">
      {/* HEADER */}
      <header className="max-w-7xl mx-auto w-full mb-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="bg-white/10 p-1 rounded-full">
            <UserButton afterSignOutUrl="/"/>
          </div>
          <div>
            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-300 to-rose-300">
              Hi, {user.firstName} 
            </h1>
            <p className="text-slate-400 text-sm">Personal AI Sanctuary</p>
          </div>
        </div>
        <div className="text-right hidden md:block">
           <div className="text-2xl font-light text-slate-200">{format(new Date(), "EEEE")}</div>
           <div className="text-indigo-400 text-sm">{format(new Date(), "MMMM do")}</div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto w-full grid grid-cols-1 md:grid-cols-12 gap-6 flex-1">
        {/* LEFT COLUMN: Entry Form OR View Mode */}
        <div className="md:col-span-7 min-h-[500px]">
          {/* If we are looking at an old entry, show it in 'Read Only' mode. If today, show Form. */}
          {!selectedId ? (
             <EntryForm />
          ) : (
            <div className="glass-panel p-8 rounded-2xl h-full flex flex-col relative">
              <Link href="/" className="absolute top-4 right-4 text-xs text-slate-500 hover:text-white transition-colors">
                 Back to Today ✕
              </Link>
              <div className="mb-6">
                <span className="text-indigo-300 text-sm font-medium">
                  {activeEntry ? format(activeEntry.createdAt, "MMMM do, yyyy") : "Entry"}
                </span>
                <div className="h-1 w-12 bg-indigo-500/30 mt-2 rounded-full"></div>
              </div>
              <p className="text-slate-200 text-lg leading-relaxed whitespace-pre-wrap">
                {activeEntry?.content}
              </p>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: AI Analysis & History */}
        <div className="md:col-span-5 space-y-6 flex flex-col h-full">
          {activeEntry ? (
            <div className="space-y-6">
              <div className="glass-panel p-6 rounded-2xl border-l-4 border-indigo-500 relative overflow-hidden">
                <div className="flex items-center gap-2 mb-4 text-indigo-300">
                  <Sparkles size={20} />
                  <h3 className="font-semibold text-lg">Reflection</h3>
                </div>
                <div className="relative z-10">
                  <p className="text-slate-100 text-lg leading-relaxed font-light italic">
                    "{activeEntry.aiReflection}"
                  </p>
                </div>
              </div>

              {activeEntry.analysis && (activeEntry.analysis as any).actionItems && (
                <div className="glass-panel p-5 rounded-2xl border border-white/5">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 ml-1">
                    Suggested Actions
                  </h4>
                  <ul className="space-y-3">
                    {(activeEntry.analysis as any).actionItems.map((item: string, i: number) => (
                      <li key={i} className="flex gap-3 items-start text-sm text-slate-300 group">
                        <span className="mt-1 w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]"></span>
                        <span className="group-hover:text-indigo-200 transition-colors">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              <div className="grid grid-cols-3 gap-2 opacity-80">
                <div className="bg-slate-900/50 rounded p-2 text-center">
                  <div className="text-xs text-slate-500">Mood</div>
                  <div className="text-indigo-200 font-medium">{activeEntry.moodLabel}</div>
                </div>
                <div className="bg-slate-900/50 rounded p-2 text-center">
                  <div className="text-xs text-slate-500">Stress</div>
                  <div className="text-indigo-200 font-medium">{activeEntry.stressLevel}/10</div>
                </div>
                <div className="bg-slate-900/50 rounded p-2 text-center">
                  <div className="text-xs text-slate-500">Focus</div>
                  <div className="text-indigo-200 font-medium">{activeEntry.productivity}/10</div>
                </div>
              </div>
            </div>
          ) : (
             <div className="glass-panel p-6 rounded-2xl flex items-center justify-center text-slate-500 h-40">
               <p>Select an entry to view details.</p>
             </div>
          )}

          {/* HISTORY LIST (Now Clickable) */}
          <div className="glass-panel rounded-2xl flex-1 overflow-hidden flex flex-col">
            <div className="p-4 border-b border-white/5 flex items-center gap-2 text-slate-300">
              <Calendar size={18} />
              <h3 className="font-semibold">Recent Memories</h3>
            </div>
            <div className="overflow-y-auto p-4 space-y-3 flex-1 h-96">
              {entries.map(entry => (
                <Link 
                  href={`/?id=${entry.id}`} // <--- THIS MAKES IT CLICKABLE
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