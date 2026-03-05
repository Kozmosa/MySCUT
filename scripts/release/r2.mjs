import { readFileSync } from 'node:fs'
import { basename } from 'node:path'
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3'

function encodeObjectKey(objectKey) {
  return objectKey
    .split('/')
    .filter((segment) => segment.length > 0)
    .map((segment) => encodeURIComponent(segment))
    .join('/')
}

export function buildR2ReleaseObjectKey({ keyPrefix, version, fileName }) {
  const normalizedPrefix = keyPrefix.replace(/^\/+|\/+$/g, '')
  return `${normalizedPrefix}/v${version}/${fileName}`
}

export function buildR2PublicUrl({ publicBaseUrl, objectKey }) {
  return `${publicBaseUrl}/${encodeObjectKey(objectKey)}`
}

function detectContentType(filePath) {
  const fileName = basename(filePath).toLowerCase()
  if (fileName.endsWith('.apk')) {
    return 'application/vnd.android.package-archive'
  }

  if (fileName.endsWith('.ipa')) {
    return 'application/octet-stream'
  }

  return 'application/octet-stream'
}

export async function uploadReleaseAssetToR2({ localFilePath, objectKey, r2Config }) {
  const s3Client = new S3Client({
    region: 'auto',
    endpoint: r2Config.endpoint,
    credentials: {
      accessKeyId: r2Config.accessKeyId,
      secretAccessKey: r2Config.secretAccessKey,
    },
  })

  const body = readFileSync(localFilePath)
  await s3Client.send(
    new PutObjectCommand({
      Bucket: r2Config.bucket,
      Key: objectKey,
      Body: body,
      ContentType: detectContentType(localFilePath),
    }),
  )

  return buildR2PublicUrl({
    publicBaseUrl: r2Config.publicBaseUrl,
    objectKey,
  })
}
