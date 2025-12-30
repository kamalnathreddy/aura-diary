import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1",
});

export async function analyzeEntry(content: string) {
  const prompt = `
    Analyze this diary entry. Return a valid JSON object ONLY.
    Structure:
    {
      "moodScore": number (1-10, 10 is happiest),
      "moodLabel": string (one word emotion),
      "stressLevel": number (1-10, 10 is high stress),
      "productivity": number (1-10),
      "reflection": string (A short, supportive sentence from an AI friend),
      "memorySnippet": string (A factual summary of what happened)
    }
    Entry: "${content}"
  `;

  const completion = await client.chat.completions.create({
    messages: [
      { role: "system", content: "You are a JSON-only API." },
      { role: "user", content: prompt }
    ],
    model: "llama3-70b-8192", 
    response_format: { type: "json_object" },
  });

  return JSON.parse(completion.choices[0].message.content || "{}");
}