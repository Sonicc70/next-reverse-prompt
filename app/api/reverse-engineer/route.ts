import { NextRequest, NextResponse } from "next/server";
import { SYSTEM_PROMPT, buildUserMessage, MODEL_CONFIG } from "./prompt";

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
    const model = process.env.OPENROUTER_MODEL_ID;

    if (!model) {
      return NextResponse.json(
        { error: "OPENROUTER_MODEL_ID is not set in your .env file." },
        { status: 500 }
      );
    }

    if (!apiKey) {
      return NextResponse.json(
        { error: "OpenRouter API key is not configured." },
        { status: 500 }
      );
    }

    const requestBody = {
      model,
      max_tokens: MODEL_CONFIG.max_tokens,
      temperature: MODEL_CONFIG.temperature,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: buildUserMessage(prompt) },
      ],
    };

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
        "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
        "X-Title": "Reverse Prompt Engineer",
      },
      body: JSON.stringify(requestBody),
    });

    const aiData = await response.json();

    if (!response.ok) {
      // Log the full error details from OpenRouter for debugging
      console.error("OpenRouter API error:", {
        status: response.status,
        statusText: response.statusText,
        body: JSON.stringify(aiData),
      });

      // Return the actual OpenRouter error message to the client for easier debugging
      const errorMessage =
        aiData?.error?.message ||
        aiData?.error ||
        `API error ${response.status}: ${response.statusText}`;

      return NextResponse.json({ error: String(errorMessage) }, { status: 502 });
    }

    const rawContent = aiData.choices?.[0]?.message?.content;

    if (!rawContent) {
      console.error("Empty content in AI response:", JSON.stringify(aiData));
      return NextResponse.json({ error: "No response from AI" }, { status: 502 });
    }

    // Parse JSON - strip markdown fences and BOM if present
    let parsed;
    try {
      const clean = rawContent
        .replace(/^\uFEFF/, "")          // strip BOM
        .replace(/```json\s*/gi, "")     // strip opening fence
        .replace(/```\s*$/g, "")        // strip closing fence
        .replace(/,\s*([}\]])/g, "$1")  // fix trailing commas
        .trim();
      parsed = JSON.parse(clean);
    } catch {
      // Fallback: extract JSON object from within surrounding text
      const match = rawContent.match(/\{[\s\S]*\}/);
      if (match) {
        try {
          parsed = JSON.parse(match[0]);
        } catch {
          console.error("Failed to parse AI response:", rawContent);
          return NextResponse.json(
            { error: "Failed to parse AI response. Please try again." },
            { status: 502 }
          );
        }
      } else {
        console.error("No JSON found in AI response:", rawContent);
        return NextResponse.json(
          { error: "Failed to parse AI response. Please try again." },
          { status: 502 }
        );
      }
    }

    // Validate and sanitize the response structure
    const result = {
      intent: String(parsed.intent || "").trim(),
      keyElements: Array.isArray(parsed.keyElements)
        ? parsed.keyElements.map((el: unknown) => String(el)).filter(Boolean)
        : [],
      detailedPrompt: String(parsed.detailedPrompt || "").trim(),
      suggestedImprovements: Array.isArray(parsed.suggestedImprovements)
        ? parsed.suggestedImprovements.map((imp: unknown) => String(imp)).filter(Boolean)
        : [],
      promptScore: Math.min(100, Math.max(0, Number(parsed.promptScore) || 50)),
    };

    // Guard against empty critical fields
    if (!result.intent || !result.detailedPrompt) {
      return NextResponse.json(
        { error: "Incomplete AI response. Please try again." },
        { status: 502 }
      );
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error("Server error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
