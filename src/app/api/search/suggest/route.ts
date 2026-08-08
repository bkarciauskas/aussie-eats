import { NextResponse } from "next/server";
import { searchSuggest } from "@/lib/backend";

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (!query) {
    return NextResponse.json({ suggestions: [] });
  }

  try {
    const data = await searchSuggest(query);
    return NextResponse.json(data);
  } catch {
    // Keep the typeahead quiet if FastAPI is unreachable.
    return NextResponse.json({ suggestions: [] });
  }
}
