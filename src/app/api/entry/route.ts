import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { analyzeEntry } from "@/lib/ai";

export async function POST(req: Request) {
  try {
    const { content } = await req.json();
    const analysis = await analyzeEntry(content);
    
    const entry = await prisma.entry.create({
      data: {
        content,
        moodScore: analysis.moodScore || 5,
        moodLabel: analysis.moodLabel || "Neutral",
        stressLevel: analysis.stressLevel || 5,
        productivity: analysis.productivity || 5,
        
        // ⬇️ THE FIX: Now looking for 'mentorReflection' to match the new Brain
        aiReflection: analysis.mentorReflection || "I am listening.", 
        
        // Save the full JSON analysis (actions, etc.)
        analysis: analysis, 
      },
    });

    return NextResponse.json(entry);
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}