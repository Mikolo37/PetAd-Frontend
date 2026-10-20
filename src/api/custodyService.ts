import { apiClient } from "../lib/api-client";
import type {
  CustodyDetails,
  CustodyStatus,
  AdoptionStatus,
} from "../types/adoption";

export interface CustodyTimelineEvent {
  type: string;
  label: string;
  timestamp: string;
  stellarExplorerUrl?: string;
  fromStatus?: AdoptionStatus;
  toStatus?: AdoptionStatus;
}

/**
 * Filters and pagination accepted by `custodyService.getList`.
 * Mirrors the approval-list params shape used across the app.
 */
export interface CustodyListParams {
  status?: CustodyStatus;
  page?: number;
  limit?: number;
}

/**
 * Envelope returned by the custody list endpoint — same pagination
 * shape as the approvals list (`items` + `total`/`page`/`limit`).
 */
export interface CustodyListResponse {
  items: CustodyDetails[];
  total?: number;
  page?: number;
  limit?: number;
}

/**
 * Payload for creating a new custody arrangement (`POST /custody`).
 * `endDate` is optional — the backend applies its default custody window
 * when it is omitted.
 */
export interface RequestCustodyPayload {
  petId: string;
  startDate: string;
  endDate?: string;
}

/** Payload for extending an arrangement (`PATCH /custody/:id/extend`). */
export interface ExtendCustodyPayload {
  /** New end date for the arrangement (ISO 8601). */
  endDate: string;
}

export const custodyService = {
  /**
   * Fetch a paginated list of custody arrangements.
   * @param params - Optional status filter and pagination options.
   */
async getList(params: CustodyListParams = {}): Promise<CustodyListResponse> {
    const searchParams = new URLSearchParams();

    if (params.status) {
      searchParams.append("status", params.status);
    }
    if (params.page !== undefined) {
      searchParams.append("page", String(params.page));
    }
    if (params.limit !== undefined) {
      searchParams.append("limit", String(params.limit));
    }

    const queryString = searchParams.toString();
    return apiClient.get<CustodyListResponse>(
      `/custody${queryString ? `?${queryString}` : ""}`,
    );
  },

  async getDetails(custodyId: string): Promise<CustodyDetails> {
    return apiClient.get<CustodyDetails>(`/custody/${custodyId}`);
  },

  async getTimeline(custodyId: string): Promise<CustodyTimelineEvent[]> {
    return apiClient.get<CustodyTimelineEvent[]>(`/custody/${custodyId}/timeline`);
  },

  /**
   * Request a new custody arrangement.
   * @returns the created arrangement (including its new `id`).
   */
async request(payload: RequestCustodyPayload): Promise<CustodyDetails> {
    return apiClient.post<CustodyDetails>(`/custody`, payload);
  },

  /**
   * Extend an existing custody arrangement's end date.
   */
async extend(
    custodyId: string,
    payload: ExtendCustodyPayload,
  ): Promise<CustodyDetails> {
    return apiClient.patch<CustodyDetails>(
      `/custody/${custodyId}/extend`,
      payload,
    );
  },

  /**
   * End a custody arrangement early.
   */
async end(custodyId: string): Promise<CustodyDetails> {
    return apiClient.patch<CustodyDetails>(`/custody/${custodyId}/end`);
  },
};
