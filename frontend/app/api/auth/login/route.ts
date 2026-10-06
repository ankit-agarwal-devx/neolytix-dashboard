import { forwardAuthRequest } from "@/lib/auth-api";

export async function POST(request: Request) {
  return forwardAuthRequest(request, "/auth/login");
}
