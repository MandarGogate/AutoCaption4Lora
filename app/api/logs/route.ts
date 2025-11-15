import { NextResponse } from "next/server";
import { store } from "@/lib/store";

export async function GET() {
  try {
    const logs = store.getLogs();
    return new NextResponse(logs, {
      headers: {
        "Content-Type": "text/plain",
      },
    });
  } catch (error) {
    console.error("Logs error:", error);
    return new NextResponse("Error fetching logs", { status: 500 });
  }
}

export async function DELETE() {
  try {
    store.clearLogs();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Clear logs error:", error);
    return NextResponse.json({ error: "Error clearing logs" }, { status: 500 });
  }
}
