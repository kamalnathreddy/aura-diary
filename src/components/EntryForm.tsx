"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Sparkles, PenLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export default function EntryForm() {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async () => {
    if (!content.trim()) return;
    setLoading(true);
    await fetch("/api/entry", { method: "POST", body: JSON.stringify({ content }) });
    setLoading(false);
    setContent("");
    router.refresh();
  };

  return (
    <div className="glass-panel rounded-2xl p-6 h-full flex flex-col">
      <div className="mb-4 flex items-center gap-2 text-indigo-400">
        <PenLine size={20} />
        <h2 className="font-semibold text-lg">New Entry</h2>
      </div>
      <Textarea
        className="flex-1 bg-transparent border-slate-800 resize-none text-lg leading-relaxed focus:border-indigo-500/50 focus:ring-0 p-4"
        placeholder="Clear your mind. What's happening today?"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        disabled={loading}
      />
      <div className="mt-4 flex justify-between items-center">
        <p className="text-xs text-slate-500">AI analysis happens privately.</p>
        <Button 
          onClick={handleSubmit} 
          disabled={loading || !content}
          className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl px-6"
        >
          {loading ? <Loader2 className="animate-spin mr-2" size={18}/> : <Sparkles className="mr-2" size={18}/>}
          Reflect
        </Button>
      </div>
    </div>
  );
}