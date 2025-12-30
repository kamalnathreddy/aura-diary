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
        aiReflection: analysis.friendResponse || "I hear you.", // The "Friend" part
        analysis: analysis, // <--- SAVING THE FULL BRAIN DUMP HERE
      },
    });

    const profile = await prisma.userProfile.findFirst();
    const newSummary = ((profile?.summary || "") + " " + (analysis.memorySnippet || "")).slice(-4000);

    if (profile) {
      await prisma.userProfile.update({ where: { id: profile.id }, data: { summary: newSummary } });
    } else {
      await prisma.userProfile.create({ data: { summary: newSummary } });
    }

    return NextResponse.json(entry);
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}