import { CloseOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { CircleIconButton } from '../../../components/buttons/CircleIconButton'

function ScutPdfImportPage() {
  const navigate = useNavigate()

  const handleClose = () => {
    if (window.history.length > 1) {
      navigate(-1)
      return
    }

    navigate('/mine/schedule-settings', { replace: true })
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
        <p className='schedule-switch-empty'>功能建设中</p>
      </div>
    </section>
  )
}

export default ScutPdfImportPage
