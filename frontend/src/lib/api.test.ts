import { describe, expect, it } from "vitest";
import { resolveApiBaseUrl } from "./api";

describe("resolveApiBaseUrl", () => {
  it("usa /api cuando no hay variable de entorno", () => {
    expect(resolveApiBaseUrl(undefined)).toBe("/api");
    expect(resolveApiBaseUrl("")).toBe("/api");
    expect(resolveApiBaseUrl("   ")).toBe("/api");
  });

  it("elimina las barras finales", () => {
    expect(resolveApiBaseUrl("http://localhost:4000/api/")).toBe("http://localhost:4000/api");
    expect(resolveApiBaseUrl("/api//")).toBe("/api");
  });

  it("respeta una URL absoluta", () => {
    expect(resolveApiBaseUrl("https://example.com/api")).toBe("https://example.com/api");
  });
});
