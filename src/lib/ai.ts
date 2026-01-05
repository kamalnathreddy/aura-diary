import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1",
});

// 1. THE COMPANION (For Chat)
export async function analyzeEntry(content: string) {
  const prompt = `
    You are Taki, a trusted personal companion. 
    Your goal is to listen and validate, NOT to preach or fix.

    RULES:
    1. Be conversational and brief (max 2 sentences).
    2. If the user is venting, just listen. Say things like "That sounds exhausting." or "I hear you."
    3. NO cheesy quotes ("Every cloud has a silver lining").
    4. NO unsolicited advice unless explicitly asked.
    5. Ask one gentle follow-up question to help them reflect.

    Return a valid JSON object ONLY:
    {
      "moodScore": number (1-10),
      "moodLabel": string (One emotive word e.g., "Melancholy", "Frustrated", "Hopeful"),
      "mentorReflection": string (Your response to the user. Natural, lower-case, conversational.),
    }

    User Entry: "${content}"
  `;

  const completion = await client.chat.completions.create({
    messages: [
      { role: "system", content: "You are a JSON-only API. Output valid JSON." },
      { role: "user", content: prompt }
    ],
    model: "llama-3.3-70b-versatile", 
    response_format: { type: "json_object" },
    temperature: 0.6, 
  });

  return JSON.parse(completion.choices[0].message.content || "{}");
}

// 2. THE NARRATOR (For Story of the Day)
export async function generateDailySummary(entries: string[]) {
  if (entries.length === 0) return "";

  const prompt = `
    Read these journal entries from today and write a short, 3-sentence narrative summary in the third person.
    Focus on what happened and how the user felt. 
    Do NOT give advice. Do NOT be poetic. Just tell the story of the day.
    
    Entries:
    ${entries.map(e => `- ${e}`).join("\n")}
  `;

  const completion = await client.chat.completions.create({
    messages: [
      { role: "system", content: "You are a narrator." },
      { role: "user", content: prompt }
    ],
    model: "llama-3.3-70b-versatile", 
    temperature: 0.5, 
  });

  return completion.choices[0].message.content || "No summary available.";
}