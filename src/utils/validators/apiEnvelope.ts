/**
 * API Envelope Validators
 * Runtime validation for API response envelopes
 */

/**
 * Standard API response envelope structure
 */
export interface ApiEnvelope<T = any> {
  success: boolean;
  message?: string;
  data: {
    items: T[];
    total: number;
    limit: number;
    offset: number;
  };
}

/**
 * Paginated response metadata
 */
export interface PaginatedResponse<T> {
  items: T[];
  page: number;
  totalPages: number;
  total: number;
  limit: number;
}

/**
 * Runtime type guard for API envelope
 * @param obj - Object to validate
 * @returns true if object matches ApiEnvelope structure
 */
export function isApiEnvelope(obj: any): obj is ApiEnvelope {
  if (!obj || typeof obj !== 'object') {
    return false;
  }

  // Check success field
  if (typeof obj.success !== 'boolean') {
    return false;
  }

  // Check data field structure
  if (!obj.data || typeof obj.data !== 'object') {
    return false;
  }

  const { data } = obj;

  // Check required data fields
  if (!Array.isArray(data.items)) {
    return false;
  }

  if (typeof data.total !== 'number' || data.total < 0) {
    return false;
  }

  if (typeof data.limit !== 'number' || data.limit <= 0) {
    return false;
  }

  if (typeof data.offset !== 'number' || data.offset < 0) {
    return false;
  }

  return true;
}

/**
 * Runtime assertion for API envelope
 * @param obj - Object to validate
 * @throws Error if object is not a valid ApiEnvelope
 */
export function assertApiEnvelope(obj: any): asserts obj is ApiEnvelope {
  if (!isApiEnvelope(obj)) {
    throw new Error(
      `Invalid API envelope: ${JSON.stringify(obj, null, 2)}\n` +
        'Expected structure: { success: boolean, data: { items: [], total: number, limit: number, offset: number } }'
    );
  }
}

/**
 * Transform API envelope to paginated response
 * @param envelope - API envelope to transform
 * @param validateItem - Function to validate each item
 * @returns Paginated response with validated items
 */
export function transformApiEnvelope<T>(
  envelope: ApiEnvelope,
  validateItem: (item: any) => item is T,
  entityName: string = 'item'
): PaginatedResponse<T> {
  assertApiEnvelope(envelope);

  const { data } = envelope;
  const validItems: T[] = [];
  let invalidCount = 0;

  // Validate each item
  for (const item of data.items) {
    if (validateItem(item)) {
      validItems.push(item);
    } else {
      invalidCount++;
      console.warn(`Invalid ${entityName} skipped:`, item);

      // TODO: Add metric counter here when metrics system is available
      // metricsService.increment(`api.${entityName}.validation_failed`);
    }
  }

  // Calculate pagination metadata
  const page = Math.floor(data.offset / data.limit) + 1;
  const totalPages = Math.ceil(data.total / data.limit);

  if (invalidCount > 0) {
    console.warn(
      `Skipped ${invalidCount} invalid ${entityName}(s) out of ${data.items.length} total`
    );
  }

  return {
    items: validItems,
    page,
    totalPages,
    total: data.total,
    limit: data.limit,
  };
}
