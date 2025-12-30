import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { analyzeEntry } from "@/lib/ai";
import { auth } from "@clerk/nextjs/server"; // 1. Import Auth

export async function POST(req: Request) {
  try {
    // 2. Get the current User ID
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { content } = await req.json();
    const analysis = await analyzeEntry(content);
    
    const entry = await prisma.entry.create({
      data: {
        userId, // 3. STAMP THE ID HERE (Critical!)
        content,
        moodScore: analysis.moodScore || 5,
        moodLabel: analysis.moodLabel || "Neutral",
        stressLevel: analysis.stressLevel || 5,
        productivity: analysis.productivity || 5,
        aiReflection: analysis.mentorReflection || "I am listening.", 
        analysis: analysis, 
      },
    });

    return NextResponse.json(entry);
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}