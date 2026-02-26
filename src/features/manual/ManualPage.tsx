function ManualPage() {
  return (
    <section className='schedule-settings-page'>
      <header className='schedule-settings-header'>
        <div>
          <p className='schedule-settings-title'>手册</p>
          <p className='schedule-settings-subtitle'>查看华工生存手册文档站</p>
        </div>
      </header>

      <div className='schedule-settings-content'>
        <div className='mine-button-group'>
          <a href='/docs/' className='mine-group-button'>
            打开手册
          </a>
        </div>
      </div>
    </section>
  )
}

export default ManualPage
