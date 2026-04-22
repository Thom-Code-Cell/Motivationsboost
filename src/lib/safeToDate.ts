
/**
 * Safely converts a Firestore Timestamp-like object to a JavaScript Date object.
 * Returns null if the input is not a valid object with a toDate method.
 * @param val The value to convert, expected to be a Firestore Timestamp.
 * @returns A Date object or null.
 */
export function safeToDate(val: any): Date | null {
  return val && typeof val.toDate === 'function' ? val.toDate() : null;
}
