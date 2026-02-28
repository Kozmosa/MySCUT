import { getDocument, GlobalWorkerOptions, version } from 'pdfjs-dist'
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.mjs?url'

GlobalWorkerOptions.workerSrc = pdfWorkerUrl

const PDFJS_ASSET_BASE_URL = __PDF_LOCAL_CMAP_ENABLED__
  ? `${import.meta.env.BASE_URL}pdfjs/`
  : `https://cdn.jsdelivr.net/npm/pdfjs-dist@${version}/`

type PdfJsTextItem = {
  str: string
  dir: string
  transform: number[]
  width: number
  height: number
  fontName: string
  hasEOL?: boolean
}

export type ExtractedPdfTextItem = {
  index: number
  text: string
  dir: string
  fontName: string
  transform: number[]
  width: number
  height: number
  x: number
  y: number
  top: number
  hasEOL: boolean
}

export type ExtractedPdfPage = {
  pageNumber: number
  rotation: number
  width: number
  height: number
  items: ExtractedPdfTextItem[]
}

export type ExtractedSchedulePdf = {
  meta: {
    sourceFileName: string
    byteLength: number
    parsedAt: string
    pageCount: number
    pdfjsVersion: string
  }
  pages: ExtractedPdfPage[]
}

function isPdfJsTextItem(item: unknown): item is PdfJsTextItem {
  if (typeof item !== 'object' || item === null) {
    return false
  }

  const candidate = item as Record<string, unknown>
  return (
    typeof candidate.str === 'string' &&
    typeof candidate.dir === 'string' &&
    Array.isArray(candidate.transform) &&
    typeof candidate.width === 'number' &&
    typeof candidate.height === 'number' &&
    typeof candidate.fontName === 'string'
  )
}

export async function extractScutSchedulePdf(file: File): Promise<ExtractedSchedulePdf> {
  const buffer = await file.arrayBuffer()
  const bytes = new Uint8Array(buffer)
  const sourceByteLength = bytes.byteLength
  const loadingTask = getDocument({
    data: bytes,
    cMapUrl: `${PDFJS_ASSET_BASE_URL}cmaps/`,
    cMapPacked: true,
    standardFontDataUrl: `${PDFJS_ASSET_BASE_URL}standard_fonts/`,
  })

  try {
    const document = await loadingTask.promise
    const pages: ExtractedPdfPage[] = []

    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber)
      const viewport = page.getViewport({ scale: 1 })
      const textContent = await page.getTextContent({
        includeMarkedContent: true,
        disableNormalization: false,
      })

      const items = textContent.items
        .flatMap((item, index) => {
          if (!isPdfJsTextItem(item)) {
            return []
          }

          const transform = item.transform.map((value) => Number(value))
          const x = transform[4] ?? 0
          const y = transform[5] ?? 0

          return [
            {
              index,
              text: item.str,
              dir: item.dir,
              fontName: item.fontName,
              transform,
              width: item.width,
              height: item.height,
              x,
              y,
              top: viewport.height - y,
              hasEOL: item.hasEOL ?? false,
            },
          ]
        })
        .sort((left, right) => {
          const topDiff = Math.abs(left.top - right.top)
          if (topDiff > 2) {
            return left.top - right.top
          }

          return left.x - right.x
        })

      pages.push({
        pageNumber,
        rotation: page.rotate,
        width: viewport.width,
        height: viewport.height,
        items,
      })
    }

    return {
      meta: {
        sourceFileName: file.name,
        byteLength: sourceByteLength,
        parsedAt: new Date().toISOString(),
        pageCount: document.numPages,
        pdfjsVersion: version,
      },
      pages,
    }
  } finally {
    await loadingTask.destroy()
  }
}
