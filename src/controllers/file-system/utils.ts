import { fileSystem } from '../../app'
import { assertString } from '../../utils'

/**
 * Asserts that user exists in the file system
 *
 * @param data The data to assert
 */
export function assertUserExists(data: unknown): asserts data is string {
  const address = data as string

  if (!fileSystem.isUserExists(address)) {
    throw new Error(`User not found: "${address}"`)
  }
}

/**
 * Asserts that the data is a string path
 *
 * @param data The data to assert
 */
export function assertPath(data: unknown): asserts data is string {
  assertString(data)

  if (!data) {
    throw new Error('Path is required')
  }
}

/**
 * Get path info
 *
 * @param address User address
 * @param path Path
 */
export function getPathInfo(address: string, path: string) {
  try {
    return fileSystem.getPathInfo(`/${address}${path}`)
  } catch (e) {
    throw new Error(`Can't get info about the path: ${(e as Error).message}`)
  }
}
