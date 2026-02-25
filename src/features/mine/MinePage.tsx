import { Link } from 'react-router-dom'

function MinePage() {
  return (
    <div className='mine-page'>
      <div className='mine-avatar' aria-hidden='true'>
        头像
      </div>

      <div className='mine-button-group'>
        <Link to='/mine/schedule-settings' className='mine-group-button'>
          课表设置
        </Link>
        <Link to='/mine/global-settings' className='mine-group-button'>
          全局设置
        </Link>
      </div>

      <div className='mine-button-group'>
        <Link to='/mine/faq' className='mine-group-button'>
          常见问答
        </Link>
        <Link to='/mine/more' className='mine-group-button'>
          更多
        </Link>
      </div>
    </div>
  )
}

export default MinePage
