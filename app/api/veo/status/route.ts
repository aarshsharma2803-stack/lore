import { NextRequest } from "next/server";
import { pollVeoJob } from "@/lib/veo";

export async function POST(req: NextRequest) {
  try {
    const { operationName } = (await req.json()) as { operationName: string };

    if (!operationName) {
      return Response.json({ error: "operationName required" }, { status: 400 });
    }

    const result = await pollVeoJob(operationName);
    return Response.json(result);
  } catch (error) {
    console.error("Veo poll failed:", error);
    return Response.json({ done: false, error: "Poll failed" }, { status: 500 });
  }
}
