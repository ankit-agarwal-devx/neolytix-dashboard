import { NextResponse } from "next/server";

const DEFAULT_BACKEND_URL = "http://localhost:8000";

export async function forwardAuthRequest(
  request: Request,
  backendPath: "/auth/login" | "/auth/signup",
) {
  let targetUrl: URL;
  try {
    targetUrl = new URL(
      backendPath,
      process.env.BACKEND_API_URL ?? DEFAULT_BACKEND_URL,
    );
  } catch {
    console.error("BACKEND_API_URL is not a valid URL");
    return NextResponse.json(
      { message: "Authentication service is not configured." },
      { status: 503 },
    );
  }

  try {
    const backendResponse = await fetch(targetUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: await request.text(),
      cache: "no-store",
    });
    const responseHeaders = new Headers({
      "Content-Type":
        backendResponse.headers.get("Content-Type") ?? "application/json",
    });

    for (const cookie of backendResponse.headers.getSetCookie()) {
      responseHeaders.append("Set-Cookie", cookie);
    }

    return new NextResponse(await backendResponse.text(), {
      status: backendResponse.status,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error("Failed to reach the authentication backend", error);
    return NextResponse.json(
      { message: "Authentication service is unavailable. Please try again." },
      { status: 502 },
    );
  }
}
