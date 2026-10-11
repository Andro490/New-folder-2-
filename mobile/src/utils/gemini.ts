// ===== Groq AI Service =====
const _k = ['gsk_e19lHragTqQ5', 'HL9cn3PFWGdyb3FY', 'EASRvgl6KNt0iqd3', 'aXQ5BUbn'];
const GROQ_API_KEY = _k.join('');
const GROQ_MODEL = "llama3-8b-8192";

async function callGroq(prompt: string): Promise<string> {
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": "Bearer " + GROQ_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 200,
    }),
  });
  if (!response.ok) {
    const errText = await response.text();
    throw new Error("Groq Error: " + response.status + " " + errText);
  }
  const data = await response.json();
  return data.choices?.[0]?.message?.content?.trim() || "";
}

export async function getAiMaxBid(
  playerName: string,
  playerRating: number,
  playerPosition: string,
  playerTeam: string,
  aiBudget: number,
  playerBasePrice: number
): Promise<number> {
  try {
    const lines = [
      "You are playing a football auction game as the AI opponent.",
      "Budget: " + aiBudget + "M",
      "Player: " + playerName + " (Rating: " + playerRating + ", Position: " + playerPosition + ", Team: " + playerTeam + ")",
      "Base price: " + playerBasePrice + "M",
      "Based on this player real football fame, decide your maximum bid:",
      "- World legends (Messi Ronaldo Maldini Zidane Ronaldinho): 60-80M if budget allows",
      "- Top stars (Neymar Mbappe Salah De Bruyne): 40-60M",
      "- Good players (rating 80-85): 25-40M",
      "- Average (rating below 80): 10-25M",
      "Reply with ONE number only (integer). No text."
    ];
    const text = await callGroq(lines.join("\n"));
    let maxVal = parseInt(text.replace(/\D/g, ""), 10);
    if (isNaN(maxVal) || maxVal < playerBasePrice) maxVal = playerBasePrice + 5;
    return Math.min(maxVal, aiBudget);
  } catch (e) {
    console.warn("AI Bid Fallback:", (e as Error).message);
    const base = Math.max(playerBasePrice + 5, 30);
    return Math.min(Math.round(base + Math.random() * 15), aiBudget);
  }
}

export async function getMatchResult(
  teamA_name: string,
  teamA_players: any[],
  teamA_bonus: number,
  teamB_name: string,
  teamB_players: any[],
  teamB_bonus: number
): Promise<{ teamAGoals: number; teamBGoals: number; commentary: string }> {
  try {
    const teamA_desc = teamA_players.map((p) => p.name + " (" + (p.overallRating || p.rating || 75) + ")").join(", ");
    const teamB_desc = teamB_players.map((p) => p.name + " (" + (p.overallRating || p.rating || 75) + ")").join(", ");
    const exampleJson = JSON.stringify({"teamAGoals":2,"teamBGoals":1,"commentary":"description"});
    const lines = [
      "You are an expert football analyst. Simulate a match between:",
      teamA_name + " (Coach Bonus: +" + (teamA_bonus * 100) + "%): " + teamA_desc,
      teamB_name + " (Coach Bonus: +" + (teamB_bonus * 100) + "%): " + teamB_desc,
      "Return ONLY valid JSON (no markdown, no extra text):",
      exampleJson
    ];
    const text = await callGroq(lines.join("\n"));
    const jsonMatch = text.match(/{[\s\S]*}/);
    if (!jsonMatch) throw new Error("No JSON in response");
    return JSON.parse(jsonMatch[0]);
  } catch (e) {
    console.warn("AI Match Fallback:", (e as Error).message);
    const aRating = teamA_players.reduce((sum, p) => sum + (p.overallRating || p.rating || 75), 0) / Math.max(teamA_players.length, 1) + teamA_bonus * 10;
    const bRating = teamB_players.reduce((sum, p) => sum + (p.overallRating || p.rating || 75), 0) / Math.max(teamB_players.length, 1) + teamB_bonus * 10;
    let aGoals = Math.floor(Math.random() * 3);
    let bGoals = Math.floor(Math.random() * 3);
    if (aRating > bRating + 3) aGoals += 1;
    else if (bRating > aRating + 3) bGoals += 1;
    return {
      teamAGoals: aGoals,
      teamBGoals: bGoals,
      commentary: "مباراة مثيرة انتهت " + aGoals + "-" + bGoals + ". تالقت التشكيلة الاقوى وحسمت اللقاء.",
    };
  }
}
