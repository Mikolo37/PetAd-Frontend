import { http, HttpResponse, delay } from "msw";
import type { CustodyDetails } from "../../types/adoption";

const MOCK_CUSTODY_DETAILS: CustodyDetails = {
  id: "custody-1",
  status: "ACTIVE",
  petId: "pet-1",
  custodianId: "user-1",
  ownerId: "user-2",
  startDate: "2026-03-25T10:00:00Z",
  endDate: "2026-04-25T10:00:00Z",
  escrowId: "escrow-001",
  createdAt: "2026-03-25T10:00:00Z",
  updatedAt: "2026-03-25T10:10:00Z",
};

/** Fixtures backing GET /api/custody — one per commonly filtered status. */
const MOCK_CUSTODY_LIST: CustodyDetails[] = [
  MOCK_CUSTODY_DETAILS,
  {
    id: "custody-2",
    status: "PENDING",
    petId: "pet-2",
    custodianId: "user-3",
    ownerId: "user-4",
    startDate: "2026-04-01T10:00:00Z",
    escrowId: null,
    createdAt: "2026-04-01T10:00:00Z",
    updatedAt: "2026-02-10T10:00:00Z",
  },
  {
    id: "custody-3",
    status: "COMPLETED",
    petId: "pet-3",
    custodianId: "user-1",
    ownerId: "user-5",
    startDate: "2026-01-10T10:00:00Z",
    endDate: "2026-02-10T10:00:00Z",
    escrowId: "escrow-003",
    createdAt: "2026-01-10T10:00:00Z",
    updatedAt: "2026-02-10T10:00:00Z",
  },
];

/** Returns true when the request carries a valid Bearer token (same guard as listings.ts). */
function isAuthorized(request: Request): boolean {
  const auth = request.headers.get("Authorization") ?? "";
  return auth.startsWith("Bearer ") && auth.length > 7;
}

/** 401 response shared by the protected mutation handlers below. */
function unauthorized() {
  return HttpResponse.json(
    {
      message: "Authentication required to manage custody arrangements.",
      code: "UNAUTHORIZED",
    },
    { status: 401 }
  );
}

export const custodyHandlers = [
  // ── PUBLIC: arrangement detail (escrow is fetched from its own endpoint) ─
  http.get("*/api/custody/:id", async ({ params }) => {
    await delay(100);
    const { id } = params;

    if (id === "custody-1") {
      return HttpResponse.json(MOCK_CUSTODY_DETAILS);
    }

    return HttpResponse.json(
      { error: "Custody not found" },
      { status: 404 }
    );
  }),

  // ── PUBLIC: paginated list (filters: status, page, limit) ────────────────
  http.get("*/api/custody", ({ request }) => {
    const url = new URL(request.url);
    const status = url.searchParams.get("status");
    const page = Number(url.searchParams.get("page") ?? "1");
    const limit = Number(url.searchParams.get("limit") ?? "10");

    let items = [...MOCK_CUSTODY_LIST];
    if (status) {
      items = items.filter((c) => c.status === status);
    }

    const start = (page - 1) * limit;
    return HttpResponse.json({
      items: items.slice(start, start + limit),
      total: items.length,
      page,
      limit,
    });
  }),

  // ── PROTECTED: request a new custody arrangement (auth required) ─────────
  http.post("*/api/custody", async ({ request }) => {
    if (!isAuthorized(request)) {
      return unauthorized();
    }

    const body = (await request.json()) as {
      petId: string;
      startDate: string;
      endDate?: string;
    };
    const now = new Date().toISOString();

    const created: CustodyDetails = {
      id: `custody-${Date.now()}`,
      status: "PENDING",
      petId: body.petId,
      custodianId: "user-1",
      ownerId: "user-2",
      startDate: body.startDate,
      ...(body.endDate ? { endDate: body.endDate } : {}),
      escrowId: null,
      createdAt: now,
      updatedAt: now,
    };
    return HttpResponse.json(created, { status: 201 });
  }),

  // ── PROTECTED: extend an arrangement's end date (auth required) ──────────
  http.patch("*/api/custody/:id/extend", async ({ params, request }) => {
    if (!isAuthorized(request)) {
      return unauthorized();
    }

    const { endDate } = (await request.json()) as { endDate: string };
    const id = String(params.id);
    const existing =
      MOCK_CUSTODY_LIST.find((c) => c.id === id) ?? MOCK_CUSTODY_DETAILS;

    const updated: CustodyDetails = {
      ...existing,
      id,
      endDate,
      updatedAt: new Date().toISOString(),
    };
    return HttpResponse.json(updated);
  }),

  // ── PROTECTED: end an arrangement early (auth required) ──────────────────
  http.patch("*/api/custody/:id/end", async ({ params, request }) => {
    if (!isAuthorized(request)) {
      return unauthorized();
    }

    const id = String(params.id);
    const existing =
      MOCK_CUSTODY_LIST.find((c) => c.id === id) ?? MOCK_CUSTODY_DETAILS;

    const updated: CustodyDetails = {
      ...existing,
      id,
      status: "COMPLETED",
      updatedAt: new Date().toISOString(),
    };
    return HttpResponse.json(updated);
  }),
];
