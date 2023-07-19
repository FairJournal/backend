/**
 * Daemon response
 */
export interface DaemonResponse {
  ok: boolean
  result: TorrentFull
  code: number
}

/**
 * Torrent full info
 */
export interface TorrentFull {
  '@type': string
  torrent: Torrent
  files: FileInfo[]
}

/**
 * Torrent info
 */
export interface Torrent {
  '@type': string
  hash: string
  flags: number
  total_size: string
  description: string
  files_count: string
  included_size: string
  dir_name: string
  downloaded_size: string
  added_at: number
  root_dir: string
  active_download: boolean
  active_upload: boolean
  completed: boolean
  download_speed: number
  upload_speed: number
  fatal_error: string
}

/**
 * File info
 */
export interface FileInfo {
  '@type': string
  name: string
  size: string
  priority: number
  downloaded_size: string
}

/**
 * Prefix for error messages
 */
export const errorPrefix = 'Daemon response does not contain'

/**
 * Asserts that the value is defined
 *
 * @param property Property to check
 * @param name Name of the property
 */
export function assertIsDefined<T>(property: T | undefined | null, name: string): asserts property is NonNullable<T> {
  if (property === undefined || property === null) {
    throw new Error(`${errorPrefix} ${name}`)
  }
}

/**
 * Asserts that the value is a number
 *
 * @param value Value to check
 * @param name Name of the value
 */
export function assertIsNumber(value: unknown, name: string): asserts value is number {
  if (typeof value !== 'number') {
    throw new Error(`${errorPrefix} ${name} of type number`)
  }
}

/**
 * Asserts that the value is a boolean
 *
 * @param value Value to check
 * @param name Name of the value
 */
export function assertIsBoolean(value: unknown, name: string): asserts value is boolean {
  if (typeof value !== 'boolean') {
    throw new Error(`${errorPrefix} ${name} of type boolean`)
  }
}

/**
 * Asserts that the data is a valid FileInfo
 *
 * @param fileInfo Data to check
 */
export function assertFileInfo(fileInfo: FileInfo): asserts fileInfo is FileInfo {
  assertIsDefined(fileInfo['@type'], 'file @type')
  assertIsDefined(fileInfo.name, 'file name')
  assertIsDefined(fileInfo.size, 'file size')
  assertIsDefined(fileInfo.downloaded_size, 'file downloaded_size')
  assertIsDefined(fileInfo.priority, 'file priority')
}

/**
 * Asserts that the data is a valid Torrent
 *
 * @param torrent Data to check
 */
export function assertTorrent(torrent: Torrent): asserts torrent is Torrent {
  assertIsDefined(torrent['@type'], 'torrent @type')
  assertIsDefined(torrent.hash, 'torrent hash')
  assertIsNumber(torrent.flags, 'torrent flags')
  assertIsDefined(torrent.total_size, 'torrent total_size')
  assertIsDefined(torrent.files_count, 'torrent files_count')
  assertIsDefined(torrent.included_size, 'torrent included_size')
  assertIsDefined(torrent.downloaded_size, 'torrent downloaded_size')
  assertIsDefined(torrent.added_at, 'torrent added_at')
  assertIsDefined(torrent.root_dir, 'torrent root_dir')
  assertIsBoolean(torrent.active_download, 'torrent active_download')
  assertIsBoolean(torrent.active_upload, 'torrent active_upload')
  assertIsBoolean(torrent.completed, 'torrent completed')
  assertIsNumber(torrent.download_speed, 'torrent download_speed')
  assertIsNumber(torrent.upload_speed, 'torrent upload_speed')
  assertIsDefined(torrent.fatal_error, 'torrent fatal_error')
}

/**
 * Asserts that the data is a valid DaemonResponse
 *
 * @param data Data to check
 */
export function assertDaemonResponse(data: DaemonResponse): asserts data is DaemonResponse {
  assertIsDefined(data.ok, 'ok')
  assertIsDefined(data.result, 'result')
  assertIsNumber(data.code, 'code')

  assertIsDefined(data.result.torrent, 'result.torrent')
  assertIsDefined(data.result.files, 'result.files')

  data.result.files.forEach(file => {
    assertFileInfo(file)
  })

  assertTorrent(data.result.torrent)
}
