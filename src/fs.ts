import { FileSystem } from '@fairjournal/file-system'

/**
 * Initialize file system using DB
 */
export async function initFs(): Promise<FileSystem> {
  const fs = new FileSystem({
    version: '0.0.1',
    projectName: 'fairjournal',
    projectDescription: 'A creative platform owned by people.',
    checkSignature: 'ton',
  })

  // todo dump current state of DB
  // todo use the dump to initialize file system with data verification

  // todo implement method to check if user registered

  return fs
}
