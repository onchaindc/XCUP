import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function shortAddress(address?: string, size = 4) {
  if (!address) {
    return "Not connected";
  }

  return `${address.slice(0, size + 2)}...${address.slice(-size)}`;
}

export function money(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: value > 1000 ? 0 : 2
  }).format(value);
}

export function errorMessage(error: unknown, fallback = "Something went wrong.") {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error === "string" && error.trim()) {
    return error;
  }

  if (error && typeof error === "object") {
    const maybeMessage = "message" in error ? error.message : undefined;
    const maybeShortMessage = "shortMessage" in error ? error.shortMessage : undefined;
    const maybeDetails = "details" in error ? error.details : undefined;

    if (typeof maybeShortMessage === "string" && maybeShortMessage.trim()) {
      return maybeShortMessage;
    }
    if (typeof maybeMessage === "string" && maybeMessage.trim()) {
      return maybeMessage;
    }
    if (typeof maybeDetails === "string" && maybeDetails.trim()) {
      return maybeDetails;
    }
  }

  return fallback;
}
