import { CloseOutlined } from '@ant-design/icons'
import { type ChangeEvent, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CircleIconButton } from '../../../components/buttons/CircleIconButton'
import { extractScutSchedulePdf, type ExtractedSchedulePdf } from '../../../core/schedule/importScutPdf'

function ScutPdfImportPage() {
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isParsing, setIsParsing] = useState(false)
  const [parseError, setParseError] = useState('')
  const [extractedJson, setExtractedJson] = useState('')
  const [summaryText, setSummaryText] = useState('请选择并解析课表 PDF 文件')

  const handleClose = () => {
    if (window.history.length > 1) {
      navigate(-1)
      return
    }

    navigate('/mine/schedule-settings', { replace: true })
  }

  const handleChoosePdf = () => {
    fileInputRef.current?.click()
  }

  const handleDownloadJson = () => {
    if (!extractedJson) {
      return
    }

    const blob = new Blob([extractedJson], { type: 'application/json;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `scut-pdf-extracted-${Date.now()}.json`
    document.body.append(anchor)
    anchor.click()
    anchor.remove()
    URL.revokeObjectURL(url)
  }

  const handleSelectFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setParseError('请选择 PDF 文件')
      setSummaryText('文件格式错误')
      event.target.value = ''
      return
    }

    setIsParsing(true)
    setParseError('')
    setSummaryText(`正在解析 ${file.name} ...`)

    try {
      const extracted = await extractScutSchedulePdf(file)
      const formatted = JSON.stringify(extracted, null, 2)
      setExtractedJson(formatted)
      setSummaryText(buildSummaryText(extracted))
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'PDF 解析失败'
      setParseError(errorMessage)
      setSummaryText('解析失败，请检查文件是否为可选课表 PDF')
      setExtractedJson('')
    } finally {
      setIsParsing(false)
      event.target.value = ''
    }
  }

  return (
    <section className='schedule-settings-page'>
      <header className='schedule-settings-header'>
        <div>
          <p className='schedule-settings-title'>从华工教务PDF导入</p>
          <p className='schedule-settings-subtitle'>SCUT PDF Import</p>
        </div>

        <CircleIconButton
          ariaLabel='关闭页面'
          icon={<CloseOutlined />}
          onClick={handleClose}
        />
      </header>

      <div className='schedule-settings-content'>
        <input
          ref={fileInputRef}
          type='file'
          accept='application/pdf,.pdf'
          className='schedule-settings-file-input'
          onChange={(event) => {
            void handleSelectFile(event)
          }}
        />

        <div className='mine-button-group'>
          <button type='button' className='mine-group-button schedule-settings-action' onClick={handleChoosePdf}>
            {isParsing ? '解析中...' : '选择并解析 PDF'}
          </button>

          <button
            type='button'
            className='mine-group-button schedule-settings-action'
            onClick={handleDownloadJson}
            disabled={!extractedJson}
          >
            下载抽取 JSON
          </button>
        </div>

        <p className='schedule-settings-current-date'>{summaryText}</p>
        {parseError && <p className='schedule-pdf-error'>{parseError}</p>}

        <div className='schedule-pdf-json-card'>
          <pre className='schedule-pdf-json'>{extractedJson || '{\n  "meta": {},\n  "pages": []\n}'}</pre>
        </div>
      </div>
    </section>
  )
}

function buildSummaryText(extracted: ExtractedSchedulePdf) {
  const totalItems = extracted.pages.reduce((total, page) => total + page.items.length, 0)
  return `解析完成：${extracted.meta.sourceFileName}，共 ${extracted.meta.pageCount} 页，抽取 ${totalItems} 条文本项`
}

export default ScutPdfImportPage
