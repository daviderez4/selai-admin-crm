import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const startTime = Date.now();

  const checks = {
    app: "healthy",
    database: "unknown",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: {
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
      unit: "MB",
    },
  };

  // Check Supabase connection
  try {
    const supabase = await createClient();
    const { error } = await supabase.from("projects").select("id").limit(1);
    checks.database = error ? "unhealthy" : "healthy";
  } catch {
    checks.database = "unhealthy";
  }

  const responseTime = Date.now() - startTime;
  const isHealthy = checks.app === "healthy" && checks.database === "healthy";

  return NextResponse.json(
    {
      status: isHealthy ? "healthy" : "degraded",
      responseTime: `${responseTime}ms`,
      checks,
    },
    { status: isHealthy ? 200 : 503 }
  );
}
