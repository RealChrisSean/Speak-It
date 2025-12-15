import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { trackUsage, initTables } from "@/lib/tidb";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

let tablesInitialized = false;

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(request: NextRequest) {
  try {
    // Initialize tables on first request
    if (!tablesInitialized) {
      await initTables();
      tablesInitialized = true;
    }

    const { sessionId, durationSeconds, wordCount, language, engine } = await request.json();

    // Hash IP for anonymous tracking
    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
    const ipHash = crypto.createHash("md5").update(ip).digest("hex");

    const id = await trackUsage(
      sessionId || null,
      durationSeconds || 0,
      wordCount || 0,
      language || "en-US",
      engine || "web-speech",
      ipHash
    );

    return NextResponse.json({ success: true, id }, { headers: corsHeaders });
  } catch (error) {
    console.error("Track error:", error);
    return NextResponse.json(
      { error: "Failed to track usage" },
      { status: 500, headers: corsHeaders }
    );
  }
}
