import { prisma } from "@/lib/db";
import EntryForm from "@/components/EntryForm";
import { format } from "date-fns";
import { Brain, Calendar } from "lucide-react";

export const dynamic = 'force-dynamic';

export default async function Dashboard() {
  const entries = await prisma.entry.findMany({
    take: 20,
    orderBy: { createdAt: 'desc' }
  });

  const today = new Date().toDateString();
  const todayEntry = entries.find(e => new Date(e.createdAt).toDateString() === today);

  return (
    <main className="aura-bg min-h-screen p-4 md:p-8 flex flex-col">
      <header className="max-w-7xl mx-auto w-full mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-300 to-rose-300">
            Aura
          </h1>
          <p className="text-slate-400 text-sm">Personal AI Sanctuary</p>
        </div>
        <div className="text-right">
           <div className="text-2xl font-light text-slate-200">{format(new Date(), "EEEE")}</div>
           <div className="text-indigo-400 text-sm">{format(new Date(), "MMMM do")}</div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto w-full grid grid-cols-1 md:grid-cols-12 gap-6 flex-1">
        <div className="md:col-span-7 h-[600px] md:h-auto">
          <EntryForm />
        </div>

        <div className="md:col-span-5 space-y-6 flex flex-col h-full">
          {todayEntry ? (
            <div className="glass-panel p-6 rounded-2xl border-l-4 border-indigo-500">
              <div className="flex items-center gap-2 mb-3 text-indigo-300">
                <Brain size={20} />
                <h3 className="font-semibold">AI Reflection</h3>
              </div>
              <p className="text-slate-200 italic leading-relaxed">
                "{todayEntry.aiReflection}"
              </p>
              <div className="mt-4 grid grid-cols-3 gap-2">
                <div className="bg-slate-900/50 rounded p-2 text-center">
                  <div className="text-xs text-slate-500">Mood</div>
                  <div className="text-indigo-200 font-medium">{todayEntry.moodLabel}</div>
                </div>
                <div className="bg-slate-900/50 rounded p-2 text-center">
                  <div className="text-xs text-slate-500">Stress</div>
                  <div className="text-indigo-200 font-medium">{todayEntry.stressLevel}/10</div>
                </div>
                <div className="bg-slate-900/50 rounded p-2 text-center">
                  <div className="text-xs text-slate-500">Focus</div>
                  <div className="text-indigo-200 font-medium">{todayEntry.productivity}/10</div>
                </div>
              </div>
            </div>
          ) : (
             <div className="glass-panel p-6 rounded-2xl flex items-center justify-center text-slate-500 h-40">
               <p>No entry for today yet.</p>
             </div>
          )}

          <div className="glass-panel rounded-2xl flex-1 overflow-hidden flex flex-col">
            <div className="p-4 border-b border-white/5 flex items-center gap-2 text-slate-300">
              <Calendar size={18} />
              <h3 className="font-semibold">Recent Memories</h3>
            </div>
            <div className="overflow-y-auto p-4 space-y-3 flex-1 h-96">
              {entries.map(entry => (
                <div key={entry.id} className="group hover:bg-white/5 p-3 rounded-xl transition-all cursor-pointer border border-transparent hover:border-white/5">
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-xs text-slate-500 font-medium">
                      {format(entry.createdAt, "MMM d • h:mm a")}
                    </span>
                    <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full">
                      {entry.moodLabel}
                    </span>
                  </div>
                  <p className="text-sm text-slate-300 line-clamp-2 group-hover:text-white transition-colors">
                    {entry.content}
                  </p>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </main>
  );
}