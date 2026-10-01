import type { SendTestEmailError } from "@/application/use-cases/send-test-email";
import type { ProblemOptions } from "./problem-details";

/** Switches on the stable error code, never on the class name, which a minifier may change. */
export function toProblem(error: SendTestEmailError): ProblemOptions {
  switch (error.code) {
    case "INVALID_REQUEST":
      return {
        status: 400,
        code: error.code,
        detail: "The request contains invalid fields.",
        errors: error.errors.map(({ field, message }) => ({ field, message })),
      };
    case "BOT_CHECK_FAILED":
      return {
        status: 403,
        code: error.code,
        detail: "The bot check did not pass. Reload the page and try again.",
      };
    case "TEMPLATE_NOT_FOUND":
      return { status: 404, code: error.code, detail: "That template does not exist." };
    case "RATE_LIMITED":
      return {
        status: 429,
        code: error.code,
        detail: "You have reached the limit for test emails. Please try again later.",
        headers: { "Retry-After": String(error.retryAfterSeconds) },
      };
    case "DAILY_CAP_REACHED":
      return {
        status: 503,
        code: error.code,
        detail: "The daily demo limit has been reached. Please come back tomorrow.",
      };
    case "SENDING_DISABLED":
      return { status: 503, code: error.code, detail: "Sending is temporarily disabled." };
    case "EMAIL_DELIVERY_FAILED":
      return {
        status: 503,
        code: error.code,
        detail: "The email could not be sent right now. Please try again later.",
      };
  }
}
