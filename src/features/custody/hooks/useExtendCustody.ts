import { useApiMutation } from "../../../hooks/useApiMutation";
import {
  custodyService,
  type ExtendCustodyPayload,
} from "../../../api/custodyService";
import type { CustodyDetails } from "../../../types/adoption";
import { custodyKeys } from "./useCustodyList";

/** useExtendCustody — extend an arrangement's end date.

 * Invalidates exactly two keys on success (asserted in tests):
 * - `["custody"]` — lists displaying the arrangement's dates.
 * - `["custody-detail", custodyId]` — the extended arrangement's detail.
 *
 * Other arrangements' details and unrelated caches stay untouched.
 */
export function useExtendCustody(custodyId: string) {
  const mutation = useApiMutation<CustodyDetails, ExtendCustodyPayload>(
    (payload) => custodyService.extend(custodyId, payload),
    {
      invalidates: [custodyKeys.listRoot, custodyKeys.detail(custodyId)],
    }
  );

  return {
    extendCustody: (payload: ExtendCustodyPayload) =>
      mutation.mutate(payload),
    isPending: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
  };
}