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
