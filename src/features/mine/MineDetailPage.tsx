import { Link } from 'react-router-dom'

type MineDetailPageProps = {
  title: string
}

function MineDetailPage({ title }: MineDetailPageProps) {
  return (
    <section className='mine-detail-page'>
      <header className='mine-detail-header'>
        <Link to='/mine' className='mine-back-button' aria-label='返回我的页面'>
          <span className='mine-back-arrow' aria-hidden='true'>
            {'<'}
          </span>
          <span>返回</span>
        </Link>
      </header>

      <div className='mine-detail-content'>{title}</div>
    </section>
  )
}

export default MineDetailPage
