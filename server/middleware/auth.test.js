import { afterEach, describe, expect, it, vi } from "vitest";
import { optionalAuth, requireAdmin, requireAuth } from "./auth.js";
import { Customer } from "../models/Customer.js";

const verifyIdToken = vi.hoisted(() => vi.fn());
vi.mock("firebase-admin/auth", () => ({
  getAuth: () => ({ verifyIdToken })
}));

function request(token) {
  return { headers: { authorization: `Bearer ${token}` } };
}

function response() {
  const res = { status: vi.fn(), json: vi.fn() };
  res.status.mockReturnValue(res);
  return res;
}

afterEach(() => {
  vi.restoreAllMocks();
  verifyIdToken.mockReset();
  vi.unstubAllEnvs();
});

describe("Firebase authentication and admin authorization", () => {
  it("rejects requests when Firebase cannot verify their identity", async () => {
    verifyIdToken.mockRejectedValue(new Error("Token verification failed"));
    const req = request("invalid-token");
    const res = response();
    const next = vi.fn();

    await requireAdmin(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
    expect(req.user).toBeNull();

    await optionalAuth(req, res, next);
    expect(req.user).toBeNull();
    expect(next).toHaveBeenCalledOnce();
  });

  it("accepts a verified customer session without trusting an unverified email as identity", async () => {
    vi.stubEnv("INITIAL_ADMIN_EMAIL", "admin@example.test");
    verifyIdToken.mockResolvedValue({ uid: "customer", email: "admin@example.test", email_verified: false });
    vi.spyOn(Customer, "findOne").mockReturnValue({ lean: async () => ({ role: "customer" }) });
    const req = request("customer-session");
    const res = response();
    const next = vi.fn();

    await requireAuth(req, res, next);
    expect(req.user).toMatchObject({ authUserId: "customer", email: "", emailVerified: false });
    expect(next).toHaveBeenCalledOnce();

    next.mockClear();
    await requireAdmin(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it("accepts a verified configured admin without modifying database roles", async () => {
    vi.stubEnv("INITIAL_ADMIN_EMAIL", "admin@example.test");
    verifyIdToken.mockResolvedValue({
      uid: "configured-admin", email: "admin@example.test", email_verified: true, exp: Date.now() / 1000 + 60
    });
    const lookup = vi.spyOn(Customer, "findOne");
    const next = vi.fn();
    await requireAdmin(request("verified-configured-admin"), response(), next);
    expect(next).toHaveBeenCalledOnce();
    expect(lookup).not.toHaveBeenCalled();
  });

  it("keeps an explicit database admin role working", async () => {
    verifyIdToken.mockResolvedValue({ uid: "database-admin" });
    vi.spyOn(Customer, "findOne").mockReturnValue({ lean: async () => ({ role: "admin" }) });
    const next = vi.fn();
    await requireAdmin(request("database-admin-session"), response(), next);
    expect(next).toHaveBeenCalledOnce();
  });
});
