import { NextResponse } from "next/server";

const DEFAULT_BACKEND_URL = "http://localhost:8000";
const ANALYTICS_PATH = "/analytics/revenue-by-category";
const ACCESS_TOKEN_COOKIE = "access_token";

function getAccessToken(cookieHeader: string | null): string | undefined {
  const cookie = cookieHeader
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${ACCESS_TOKEN_COOKIE}=`));

  if (!cookie) {
    return undefined;
  }

  try {
    return decodeURIComponent(cookie.slice(ACCESS_TOKEN_COOKIE.length + 1));
  } catch {
    return undefined;
  }
}

export async function GET(request: Request) {
  const accessToken = getAccessToken(request.headers.get("cookie"));
  if (!accessToken) {
    return NextResponse.json(
      { message: "Sign in to view revenue analytics." },
      { status: 401 },
    );
  }

  let targetUrl: URL;
  try {
    targetUrl = new URL(
      ANALYTICS_PATH,
      process.env.BACKEND_API_URL ?? DEFAULT_BACKEND_URL,
    );
  } catch {
    console.error("BACKEND_API_URL is not a valid URL");
    return NextResponse.json(
      { message: "Analytics service is not configured." },
      { status: 503 },
    );
  }

  try {
    const requestedRegion = new URL(request.url).searchParams.get("region");
    if (requestedRegion) {
      targetUrl.searchParams.set("region", requestedRegion);
    }

    const backendResponse = await fetch(targetUrl, {
      headers: {
        Cookie: `${ACCESS_TOKEN_COOKIE}=${encodeURIComponent(accessToken)}`,
      },
      cache: "no-store",
      signal: request.signal,
    });
    const responseBody = await backendResponse.text();

    return new NextResponse(responseBody, {
      status: backendResponse.status,
      headers: {
        "Content-Type":
          backendResponse.headers.get("Content-Type") ?? "application/json",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Failed to reach the analytics backend", error);
    return NextResponse.json(
      { message: "Analytics service is unavailable. Please try again." },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }
}
