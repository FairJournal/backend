import * as crypto from 'crypto'
import * as fs from 'fs'
import { promisify } from 'util'
import path from 'path'

const readFile = promisify(fs.read)

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
 * Checks if the value is a string
 *
 * @param value Value to check
 */
export function isString(value: unknown): boolean {
  return typeof value === 'string'
}

/**
 * Asserts that the data is a string
 *
 * @param data Data to check
 */
export function assertString(data: unknown): asserts data is string {
  if (!isString(data)) {
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

/**
 * Bytes to string
 *
 * @param data Bytes to convert
 */
export function bytesToString(data: Uint8Array): string {
  const decoder = new TextDecoder()

  return decoder.decode(data)
}

/**
 * String to bytes
 *
 * @param data String to convert
 */
export function stringToBytes(data: string): Uint8Array {
  const encoder = new TextEncoder()

  return encoder.encode(data)
}

/**
 * Asserts that the data is a JSON string
 *
 * @param data Data to check
 */
export function assertJson(data: unknown): asserts data is string {
  if (typeof data !== 'string') {
    throw new Error('JSON assert: data is not a string')
  }

  try {
    JSON.parse(data)
  } catch (e) {
    throw new Error(`JSON assert: data is not a valid JSON: ${(e as Error).message}`)
  }
}

/**
 * Calculates SHA256 of a file
 *
 * @param filePath Path to the file
 */
export async function calculateSHA256(filePath: string): Promise<string> {
  const hash = crypto.createHash('sha256')
  const fd = fs.openSync(filePath, 'r')
  const bufferSize = 8192 // 8KB at a time
  const buffer = Buffer.alloc(bufferSize)

  let bytesRead: number

  do {
    ;({ bytesRead } = await readFile(fd, buffer, 0, bufferSize, null))
    hash.update(buffer.slice(0, bytesRead))
  } while (bytesRead === bufferSize)

  fs.closeSync(fd)

  return hash.digest('hex').toLowerCase()
}

/**
 * Converts relative path to absolute
 *
 * @param paths Paths to convert
 */
export function toAbsolutePath(...paths: string[]): string {
  return path.resolve(...paths)
}

/**
 * Delays the execution
 *
 * @param ms Delay in milliseconds
 */
export async function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Extracts a hash from a message
 *
 * @param message Message to extract hash from
 */
export function extractHash(message: string): string {
  const hashRegex = /[A-Fa-f0-9]{64}/
  const match = message.match(hashRegex)

  if (match) {
    return match[0]
  } else {
    throw new Error('No hash found in the message.')
  }
}

/**
 * Converts base64 string to uppercase hex string
 */
export function base64ToHex(base64: string): string {
  return Buffer.from(base64, 'base64').toString('hex').toUpperCase()
}

/**
 * Converts hex string to base64 string
 */
export function hexToBase64(hex: string): string {
  return Buffer.from(hex, 'hex').toString('base64')
}
