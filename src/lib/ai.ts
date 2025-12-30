import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1",
});

export async function analyzeEntry(content: string) {
  const prompt = `
    You are a deeply perceptive, intelligent, and adaptive personal companion.
    
    First, detect the user's emotional state and intent from the entry:
    - If they are sad/stressed -> Be warm, validating, and gentle (Friend mode).
    - If they are unmotivated/stuck -> Be direct, energizing, and constructive (Coach mode).
    - If they are confused/seeking -> Be philosophical and wise (Guide mode).
    - If they are happy/proud -> Be celebratory and enthusiastic (Cheerleader mode).

    Do not announce your mode. Just embody it naturally in your response.

    Return a valid JSON object ONLY:
    {
      "moodScore": number (1-10),
      "moodLabel": string (One emotive word),
      "stressLevel": number (1-10),
      "productivity": number (1-10),
      "mentorReflection": string (A single, fluid paragraph that perfectly matches the user's needed tone. Max 80 words.),
      "actionItems": string[] (3 specific, context-aware actions. If they are sad, suggest self-care. If lazy, suggest work sprints.)
    }

    Entry: "${content}"
  `;

  const completion = await client.chat.completions.create({
    messages: [
      { role: "system", content: "You are a JSON-only API." },
      { role: "user", content: prompt }
    ],
    model: "llama-3.3-70b-versatile", 
    response_format: { type: "json_object" },
    temperature: 0.3, 
  });

  return JSON.parse(completion.choices[0].message.content || "{}");
}