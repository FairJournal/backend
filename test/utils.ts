import { getSecureRandomBytes, KeyPair, keyPairFromSeed, sign } from 'ton-crypto'
import { Knex } from "knex";

export const UPDATES_TABLE_NAME = 'fs_update'

/**
 * According: https://github.com/ton-foundation/specs/blob/main/specs/wtf-0002.md
 */
export const TON_SAFE_SIGN_MAGIC = 'ton-safe-sign-magic'

/**
 * Creates TON wallet with public and secret keys
 */
export async function createWallet(): Promise<KeyPair> {
  const seed: Buffer = await getSecureRandomBytes(32) // seed is always 32 bytes

  return keyPairFromSeed(seed)
}

/**
 * Gets the number of records in the table
 *
 * @param db Database
 * @param tableName Table name
 */
export async function getRecordCount(db: Knex, tableName: string): Promise<number> {
  const result = await db(tableName).count('* as count')

  return Number(result[0].count)
}

/**
 * Gets the number of records in the updates table
 *
 * @param db Database
 */
export async function getUpdatesCount(db: Knex): Promise<number> {
  return getRecordCount(db, UPDATES_TABLE_NAME)
}
