import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { basename } from 'node:path'
import { HeadObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { calculateFileMetadata } from './shared.mjs'

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

export function buildR2LatestVersionsObjectKey({ keyPrefix }) {
  const normalizedPrefix = keyPrefix.replace(/^\/+|\/+$/g, '')
  return `${normalizedPrefix}/versions.json`
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

  if (fileName.endsWith('.json')) {
    return 'application/json; charset=utf-8'
  }

  return 'application/octet-stream'
}

function createR2Client(r2Config) {
  return new S3Client({
    region: 'auto',
    endpoint: r2Config.endpoint,
    credentials: {
      accessKeyId: r2Config.accessKeyId,
      secretAccessKey: r2Config.secretAccessKey,
    },
  })
}

export async function uploadReleaseAssetToR2({ localFilePath, objectKey, r2Config }) {
  const s3Client = createR2Client(r2Config)

  const body = readFileSync(localFilePath)
  const metadata = calculateFileMetadata(localFilePath)
  await s3Client.send(
    new PutObjectCommand({
      Bucket: r2Config.bucket,
      Key: objectKey,
      Body: body,
      ContentType: detectContentType(localFilePath),
      Metadata: {
        sha256: metadata.sha256,
      },
    }),
  )

  return {
    url: buildR2PublicUrl({
      publicBaseUrl: r2Config.publicBaseUrl,
      objectKey,
    }),
    metadata,
  }
}

export async function verifyR2ReleaseAsset({ localFilePath, objectKey, r2Config }) {
  const expected = calculateFileMetadata(localFilePath)
  const s3Client = createR2Client(r2Config)
  const headResult = await s3Client.send(new HeadObjectCommand({
    Bucket: r2Config.bucket,
    Key: objectKey,
  }))

  if (headResult.ContentLength !== expected.size) {
    throw new Error(`R2 HEAD size mismatch for ${objectKey}: expected ${expected.size}, got ${headResult.ContentLength}`)
  }

  if (headResult.Metadata?.sha256 !== expected.sha256) {
    throw new Error(`R2 HEAD SHA256 metadata mismatch for ${objectKey}`)
  }

  const publicUrl = buildR2PublicUrl({
    publicBaseUrl: r2Config.publicBaseUrl,
    objectKey,
  })
  const publicHead = await fetch(publicUrl, {
    method: 'HEAD',
    cache: 'no-store',
  })
  if (!publicHead.ok) {
    throw new Error(`R2 public HEAD failed for ${publicUrl} (${publicHead.status})`)
  }

  const publicLength = Number(publicHead.headers.get('content-length'))
  if (publicLength !== expected.size) {
    throw new Error(`R2 public size mismatch for ${publicUrl}: expected ${expected.size}, got ${publicLength}`)
  }

  const publicResponse = await fetch(publicUrl, { cache: 'no-store' })
  if (!publicResponse.ok) {
    throw new Error(`R2 public download failed for ${publicUrl} (${publicResponse.status})`)
  }

  const publicBody = Buffer.from(await publicResponse.arrayBuffer())
  const publicSha256 = createHash('sha256').update(publicBody).digest('hex')
  if (publicBody.byteLength !== expected.size || publicSha256 !== expected.sha256) {
    throw new Error(`R2 public content verification failed for ${publicUrl}`)
  }

  return {
    url: publicUrl,
    metadata: expected,
  }
}

export async function uploadAndVerifyReleaseAssetToR2(input) {
  await uploadReleaseAssetToR2(input)
  return verifyR2ReleaseAsset(input)
}
