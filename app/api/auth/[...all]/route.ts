import { auth } from "@/lib/auth-server";
import { toNextJsHandler } from "better-auth/next-js";
import { NextRequest } from "next/server";

const handler = toNextJsHandler(auth);

export async function POST(req: NextRequest) {
  try {
    console.log("Auth POST request:", req.nextUrl.pathname);
    const response = await handler.POST(req);
    return response;
  } catch (error: any) {
    console.error("Auth POST error details:", {
      message: error?.message,
      code: error?.code,
      cause: error?.cause,
      stack: error?.stack?.split('\n').slice(0, 5).join('\n')
    });
    
    // Return a more informative error response
    return new Response(JSON.stringify({ 
      error: 'Authentication failed', 
      details: error?.message || 'Database connection timeout'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export async function GET(req: NextRequest) {
  try {
    console.log("Auth GET request:", req.nextUrl.pathname);
    return await handler.GET(req);
  } catch (error) {
    console.error("Auth GET error:", error);
    throw error;
  }
}