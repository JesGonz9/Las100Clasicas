import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { storage } from './config'
import imageCompression from 'browser-image-compression'

export async function uploadImage(file: File, path: string): Promise<string> {
  const compressed = await imageCompression(file, {
    maxSizeMB: 1,
    maxWidthOrHeight: 1920,
    useWebWorker: true,
  })
  const storageRef = ref(storage, path)
  await uploadBytes(storageRef, compressed)
  return getDownloadURL(storageRef)
}

export async function uploadMultipleImages(files: File[], basePath: string): Promise<string[]> {
  const urls: string[] = []
  for (const file of files) {
    const name = `${Date.now()}-${file.name}`
    const url = await uploadImage(file, `${basePath}/${name}`)
    urls.push(url)
  }
  return urls
}
