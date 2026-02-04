import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export interface UploadResult {
  path?: string
  url?: string
  error?: string
}

/**
 * Uploads a file to Supabase Storage
 * @param bucket - The storage bucket name
 * @param path - The path within the bucket
 * @param file - The file to upload
 * @returns The file path and public URL or an error
 */
export async function uploadFile(
  bucket: string,
  path: string,
  file: File
): Promise<UploadResult> {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, file, {
        cacheControl: '3600',
        upsert: false,
      })

    if (error) {
      console.error('Upload error:', error)
      return { error: error.message }
    }

    // Get public URL (will use signed URL for private buckets)
    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(data.path)

    return { path: data.path, url: urlData.publicUrl }
  } catch (error) {
    console.error('Upload exception:', error)
    return { error: 'Failed to upload file' }
  }
}

/**
 * Generates a signed URL for accessing a private file
 * @param bucket - The storage bucket name
 * @param path - The path within the bucket
 * @param expiresIn - Expiration time in seconds (default 1 hour)
 * @returns The signed URL or null if error
 */
export async function getSignedUrl(
  bucket: string,
  path: string,
  expiresIn: number = 3600
): Promise<string | null> {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, expiresIn)

    if (error) {
      console.error('Signed URL error:', error)
      return null
    }

    return data.signedUrl
  } catch (error) {
    console.error('Signed URL exception:', error)
    return null
  }
}

/**
 * Deletes a file from Supabase Storage
 * @param bucket - The storage bucket name
 * @param path - The path within the bucket
 * @returns True if successful, false if error
 */
export async function deleteFile(bucket: string, path: string): Promise<boolean> {
  try {
    const { error } = await supabase.storage.from(bucket).remove([path])
    return !error
  } catch (error) {
    console.error('Delete exception:', error)
    return false
  }
}

/**
 * Lists files in a directory
 * @param bucket - The storage bucket name
 * @param path - The directory path
 * @returns Array of file objects
 */
export async function listFiles(bucket: string, path: string) {
  try {
    const { data, error } = await supabase.storage.from(bucket).list(path)

    if (error) {
      console.error('List files error:', error)
      return []
    }

    return data
  } catch (error) {
    console.error('List files exception:', error)
    return []
  }
}

/**
 * Downloads a file from Supabase Storage
 * @param bucket - The storage bucket name
 * @param path - The path within the bucket
 * @returns The file blob or null if error
 */
export async function downloadFile(bucket: string, path: string): Promise<Blob | null> {
  try {
    const { data, error } = await supabase.storage.from(bucket).download(path)

    if (error) {
      console.error('Download error:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('Download exception:', error)
    return null
  }
}
