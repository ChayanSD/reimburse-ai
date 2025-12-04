import { emptyFixture, largeFixture, mediumFixture, smallFixture } from "@/utils/fixtures";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request : NextRequest) : Promise<NextResponse> {
  const url = new URL(request.url);
  const fixture = url.searchParams.get("fixture") || "small";

  let testData;
  switch (fixture) {
    case "medium":
      testData = mediumFixture;
      break;
    case "large":
      testData = largeFixture;
      break;
    case "empty":
      testData = emptyFixture;
      break;
    default:
      testData = smallFixture;
  }

  return NextResponse.json({
    message: `Test fixture: ${fixture}`,
    data: testData,
    instructions: {
      usage: "POST this data to /api/exports/pdf to generate a PDF",
      fixtures: ["small", "medium", "large", "empty"],
      parameters: [
        "?fixture=small",
        "?fixture=medium",
        "?fixture=large",
        "?fixture=empty",
      ],
    },
  });
}
