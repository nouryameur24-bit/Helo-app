export * from "./generated/api";
// `GetAlternativesParams` is intentionally omitted here — the zod schema of the
// same name in ./generated/api is the source of truth. Use `z.infer<typeof
// GetAlternativesParams>` if a static type is needed.
export type {
  AlternativeProduct,
  AlternativeProductOriginBadge,
  AlternativeProductOverallRisk,
  AlternativesResponse,
  ApiError,
  HealthStatus,
  ScanMatch,
  ScanMatchRiskLevel,
  ScanPhase,
  ScanProductInfo,
  ScanRequest,
  ScanResponse,
  ScanResponseSource,
  ScanResponseStatus,
  ScanResponseVerdict,
} from "./generated/types";
