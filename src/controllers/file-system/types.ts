/**
 * File status in database
 */
export enum FileStatus {
  /**
   * File is new, just uploaded
   */
  New = 0,

  /**
   * File is used in some article
   */
  Used = 1,
}
