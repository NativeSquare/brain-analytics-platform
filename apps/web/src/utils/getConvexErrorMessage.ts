import { ConvexError } from "convex/values";

export function getConvexErrorMessage(error: unknown): string {
  if (error instanceof ConvexError) {
    const data = error.data;
    // data is { message: string }
    if (typeof data === "object" && data !== null && "message" in data) {
      return (data as { message: string }).message;
    }
    // data is a string, possibly wrapping a nested ConvexError JSON
    if (typeof data === "string") {
      const jsonMatch = data.match(/\{.*"message"\s*:\s*"([^"]+)".*\}/);
      if (jsonMatch?.[1]) return jsonMatch[1];
      return data;
    }
  }
  // Standard Error or auth errors that wrap the message
  if (error instanceof Error) {
    const jsonMatch = error.message.match(/\{.*"message"\s*:\s*"([^"]+)".*\}/);
    if (jsonMatch?.[1]) return jsonMatch[1];
    return error.message;
  }
  return "Unknown error occurred";
}
