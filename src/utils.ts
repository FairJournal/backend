/**
 * Length of a public key
 */
export const PUBLIC_KEY_LENGTH = 64

/**
 * Reference of a file
 */
export const REFERENCE_LENGTH = 64

/**
 * Max length of an article name
 */
export const MAX_ARTICLE_NAME_LENGTH = 64

/**
 * Asserts that the data is a string
 *
 * @param data Data to check
 */
export function assertString(data: unknown): asserts data is string {
  if (typeof data !== 'string') {
    throw new Error('Data is not a string')
  }
}

/**
 * Asserts that the data length is equal to the specified length
 *
 * @param data Data to check
 * @param length Length to check
 */
export function assertStringLength(data: unknown, length: number): asserts data is string {
  assertString(data)

  if (data.length !== length) {
    throw new Error(`Data length is not equal to ${length}`)
  }
}

/**
 * Asserts that the data is a public key
 *
 * @param data Data to check
 */
export function assertAddress(data: unknown): asserts data is string {
  assertStringLength(data, PUBLIC_KEY_LENGTH)
  assertHex(data)
}

/**
 * Checks if the value is a hex string
 *
 * @param value Value to check
 */
export function isHexString(value: string): boolean {
  const hexRegEx = /^[0-9A-Fa-f]*$/

  return hexRegEx.test(value)
}

/**
 * Asserts that the data is a hex string
 *
 * @param data Data to check
 */
export function assertHex(data: unknown): asserts data is string {
  assertString(data)

  if (!isHexString(data)) {
    throw new Error('Data is not a hex string')
  }
}

/**
 * Asserts that the data is a correct reference
 *
 * @param data Data to check
 */
export function assertReference(data: unknown): asserts data is string {
  assertStringLength(data, REFERENCE_LENGTH)
  assertHex(data)
}

/**
 * Gets path parts
 *
 * @param path Path to get parts from
 */
export function getPathParts(path: string): string[] {
  return path.split('/').filter(Boolean)
}

/**
 * Asserts that the data is a correct article name
 *
 * @param data Data to check
 */
export function assertArticleName(data: unknown): asserts data is string {
  assertString(data)

  const regex = /^[a-z0-9-]+$/i

  if (data.length === 0 || data.length > MAX_ARTICLE_NAME_LENGTH || !regex.test(data)) {
    throw new Error('Article name is not valid')
  }
}

/**
 * Checks if the data is an object
 *
 * @param data Data to check
 */
export function isObject(data: unknown): data is Record<string, unknown> {
  return typeof data === 'object' && !Array.isArray(data) && data !== null
}

/**
 * Asserts that the data is an object
 *
 * @param data Data to check
 * @param customError Custom error message
 */
export function assertObject(data: unknown, customError?: string): asserts data is Record<string, unknown> {
  if (!isObject(data)) {
    throw new Error(customError ? customError : 'Data is not an object')
  }
}
