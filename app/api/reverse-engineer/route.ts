import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { prompt } = await req.json();

    if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }

    if (prompt.length > 5000) {
      return NextResponse.json({ error: "Prompt too long (max 5000 chars)" }, { status: 400 });
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    const model = process.env.OPENROUTER_MODEL_ID || "anthropic/claude-3.5-sonnet";

    if (!apiKey) {
      return NextResponse.json(
        { error: "OpenRouter API key is not configured." },
        { status: 500 }
      );
    }

    const systemPrompt = `You are an expert prompt engineer and analyst. Your job is to reverse-engineer user prompts to uncover their true intent, extract key elements, and reconstruct a detailed, high-quality version of the original prompt.

When given a prompt (even rough/short/vague), you will:
1. Identify the core intent and goal
2. Extract all key elements (context, format, tone, audience, constraints, desired output, etc.)
3. Reconstruct a comprehensive, detailed version that would produce far better AI responses
4. Suggest concrete improvements for the user to make their prompting even better
5. Score the original prompt quality from 0-100

Return ONLY a valid JSON object with this exact structure (no markdown, no extra text):
{
  "intent": "A concise 1-2 sentence description of what the user actually wants to achieve",
  "keyElements": ["element1", "element2", "element3", "...up to 8 elements"],
  "detailedPrompt": "The full, reconstructed prompt text that is detailed, specific, and optimized. This should be 3-10x more detailed than the original and ready to paste directly into an AI. Include context, desired format, tone, audience, constraints, examples if helpful, and step-by-step structure where appropriate.",
  "suggestedImprovements": ["improvement1", "improvement2", "improvement3", "...3-5 improvements"],
  "promptScore": 75
}

The detailedPrompt should be a complete, standalone prompt — not a description of a prompt. Write it AS the prompt the user should send.`;

    const userMessage = `Reverse engineer this prompt: "${prompt}"`;

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
        "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
        "X-Title": "Reverse Prompt Engineer",
      },
      body: JSON.stringify({
        model,
        max_tokens: 2000,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
      }),
    });

    if (!response.ok) {
      const err = await response.json();
      console.error("OpenRouter API error:", err);
      return NextResponse.json(
        { error: "AI service error. Please try again." },
        { status: 502 }
      );
    }

    const aiData = await response.json();
    const rawContent = aiData.choices?.[0]?.message?.content;

    if (!rawContent) {
      return NextResponse.json({ error: "No response from AI" }, { status: 502 });
    }

    // Parse the JSON response
    let parsed;
    try {
      // Strip potential markdown code fences
      const clean = rawContent.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      parsed = JSON.parse(clean);
    } catch {
      console.error("Failed to parse AI response:", rawContent);
      return NextResponse.json(
        { error: "Failed to parse AI response. Please try again." },
        { status: 502 }
      );
    }

    // Validate structure
    const result = {
      intent: String(parsed.intent || ""),
      keyElements: Array.isArray(parsed.keyElements) ? parsed.keyElements.map(String) : [],
      detailedPrompt: String(parsed.detailedPrompt || ""),
      suggestedImprovements: Array.isArray(parsed.suggestedImprovements)
        ? parsed.suggestedImprovements.map(String)
        : [],
      promptScore: Math.min(100, Math.max(0, Number(parsed.promptScore) || 50)),
    };

    return NextResponse.json(result);
  } catch (err) {
    console.error("Server error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
