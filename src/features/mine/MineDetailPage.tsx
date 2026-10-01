import { useEffect, useRef, useState } from 'react'
import { CloseOutlined } from '@ant-design/icons'
import { Button, Checkbox, Modal, Progress, Switch, message } from 'antd'
import { useLocation, useNavigate } from 'react-router-dom'
import { CircleIconButton } from '../../components/buttons/CircleIconButton'
import { HorizontalSlideSelector } from '../../components/HorizontalSlideSelector'
import { VerticalSlideSelector } from '../../components/VerticalSlideSelector'
import { getUseLocalManual, setUseLocalManual, setReloadManualEnabled, getReloadManualEnabled } from '../../core/manual/manualSourceStorage'
import { ANIMATED_BACK_EVENT, type AnimatedBackRequestDetail } from '../../core/navigation/animatedBack'
import { resolveBackPath } from '../../core/navigation/appBack'
import { GLOBAL_THEME_FAMILY_OPTIONS } from '../../core/theme/globalThemePresets'
import { APP_TODO_ITEMS, MANUAL_TODO_ITEMS } from '../../generated/todoSnapshot'
import { THIRD_PARTY_LICENSES } from '../../generated/thirdPartyLicenses'
import { useGlobalTheme } from '../../platform/web/theme/GlobalThemeProvider'
import { ApkUpdater, supportsInAppApkUpdate } from '../../platform/capacitor/apkUpdater'
import { confirmWithBackDismiss, useBackDismiss } from '../../platform/capacitor/useBackDismiss'
import { checkForAppUpdate, IS_NIGHTLY_CHANNEL, type ApkAssetDescriptor } from '../../services/update'

type MineDetailPageProps = {
  title: string
}

type TransitionStage = 'entering' | 'entered' | 'closing'

const ENTER_ANIMATION_FRAME_MS = 16
const CLOSE_TRANSITION_MS = 220

const GLOBAL_THEME_MODE_LABELS = {
  light: '亮色',
  dark: '暗色',
  system: '跟随系统',
} as const

const RESOLVED_THEME_MODE_LABELS = {
  light: '亮色',
  dark: '暗色',
} as const

const GLOBAL_THEME_MODE_OPTIONS = [
  { value: 'light', label: '亮色' },
  { value: 'dark', label: '暗色' },
  { value: 'system', label: '跟随系统' },
] as const

const DETAIL_SUBTITLE_MAP: Record<string, string> = {
  '全局设置': 'Global Settings',
  '常见问答': 'FAQ',
  更多: 'More',
}

// 六条经维护者批准的离线 FAQ；内容需与 PROJECT_BASIS.md、PRIVACY.md 与当前行为保持一致
const FAQ_ITEMS: Array<{ question: string; answer: string }> = [
  {
    question: '如何导入课表？',
    answer:
      '进入「课程 → 课表设置 → 导入课表」，可从 WakeUp 文本、华工教务 HTML、华工教务 PDF、启梦 QMS 文件或剪贴板压缩 QMS 导入；Android 端还支持从华工教务系统自动导入。',
  },
  {
    question: '为什么自动导入仅 Android 可用？',
    answer:
      '自动导入依赖在设备本地访问教务系统的能力，当前实现基于 Android 平台组件。iOS 与鸿蒙暂不可用，后续是否支持视平台条件而定。',
  },
  {
    question: '我的数据存储在哪里？',
    answer:
      '课表与设置默认只保存在当前设备的本地存储中，不上传服务器，也没有云同步。更换设备或清除应用数据前，请先导出课表备份。',
  },
  {
    question: '如何切换或删除课表？',
    answer:
      '在「课表设置」的课表库中点击即可切换当前课表；不再需要的课表也在课表库中删除。',
  },
  {
    question: '如何导出课表？',
    answer:
      '在「课表设置 → 导出课表」中选择要导出的课表与格式，即可生成导出文件，并可在其他设备上重新导入。',
  },
  {
    question: '检查更新失败怎么办？',
    answer:
      '更新信息从 GitHub 获取，失败通常是网络原因。可稍后在「更多 → 检查更新」重试，或到项目仓库的发布页手动查看；更新检查失败不影响课表等本地功能。',
  },
]

function MineDetailPage({ title }: MineDetailPageProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const [messageApi, contextHolder] = message.useMessage()
  const { themeFamily, mode, resolvedMode, setThemeFamily, setMode } = useGlobalTheme()
  const subtitle = DETAIL_SUBTITLE_MAP[title] ?? 'Details'
  const [isLocalManualEnabled, setIsLocalManualEnabled] = useState(() => getUseLocalManual())
  const [isReloadManualEnabled, setIsReloadManualEnabled] = useState(() => getReloadManualEnabled())
  const [isTermsModalOpen, setIsTermsModalOpen] = useState(false)
  const [isLicenseModalOpen, setIsLicenseModalOpen] = useState(false)
  const [isTodoModalOpen, setIsTodoModalOpen] = useState(false)
  const [apkUpdateProgress, setApkUpdateProgress] = useState<{
    stage: 'downloading' | 'installing'
    receivedBytes: number
    totalBytes: number | null
  } | null>(null)
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false)
  const [transitionStage, setTransitionStage] = useState<TransitionStage>('entering')
  const closeTimerRef = useRef<number | null>(null)
  const enterTimerRef = useRef<number | null>(null)
  const isClosingRef = useRef(false)

  const navigateBack = () => {
    navigate(resolveBackPath(location.pathname), { replace: true })
  }

  const startClosingTransition = () => {
    if (isClosingRef.current) {
      return false
    }

    isClosingRef.current = true
    setTransitionStage('closing')

    closeTimerRef.current = window.setTimeout(() => {
      navigateBack()
    }, CLOSE_TRANSITION_MS)

    return true
  }

  useEffect(() => {
    enterTimerRef.current = window.setTimeout(() => {
      setTransitionStage('entered')
    }, ENTER_ANIMATION_FRAME_MS)

    const handleAnimatedBack = (event: Event) => {
      const customEvent = event as CustomEvent<AnimatedBackRequestDetail>

      if (customEvent.detail.handled) {
        return
      }

      const handled = startClosingTransition()
      customEvent.detail.handled = handled
    }

    window.addEventListener(ANIMATED_BACK_EVENT, handleAnimatedBack)

    return () => {
      window.removeEventListener(ANIMATED_BACK_EVENT, handleAnimatedBack)

      if (enterTimerRef.current !== null) {
        window.clearTimeout(enterTimerRef.current)
      }

      if (closeTimerRef.current !== null) {
        window.clearTimeout(closeTimerRef.current)
      }
    }
  }, [])

  const handleClose = () => {
    startClosingTransition()
  }

  const handleLocalManualSwitchChange = (checked: boolean) => {
    setIsLocalManualEnabled(checked)
    setUseLocalManual(checked)
  }

  const handleReloadManualSwitchChange = (checked: boolean) => {
    setIsReloadManualEnabled(checked)
    setReloadManualEnabled(checked)
  }

  const handleCheckUpdate = async () => {
    if (isCheckingUpdate) {
      return
    }

    setIsCheckingUpdate(true)

    try {
      const result = await checkForAppUpdate({
        localVersion: __APP_VERSION__,
      })

      if (result.status === 'up-to-date') {
        messageApi.success('当前已是最新版本')
        return
      }

      if (result.status === 'migration-required') {
        confirmWithBackDismiss({
          title: '当前版本过旧，需要重新安装',
          content: `当前版本 v${result.localVersion} 低于最低可原地升级版本 v${result.minVersion}，无法在应用内直接更新到 v${result.latestVersion}。请先在「课表设置 → 导出课表」备份，再卸载当前应用，从发布页安装最新版本。`,
          okText: '打开发布页',
          cancelText: '稍后',
          onOk: () => {
            window.open(
              result.releaseUrl ?? 'https://github.com/Kozmosa/MySCUT/releases',
              '_blank',
              'noopener,noreferrer',
            )
          },
        })
        return
      }

      confirmWithBackDismiss({
        title: `发现新版本 v${result.latestVersion}`,
        content: `当前版本 v${result.localVersion}，检测来源：${result.providerName}`,
        okText: '去更新',
        cancelText: '稍后',
        onOk: () => {
          if (supportsInAppApkUpdate() && result.apkAsset?.url) {
            void handleInAppUpdate(result.apkAsset)
            return
          }

          if (!result.downloadUrl) {
            messageApi.error('远程未提供下载链接')
            return
          }

          window.open(result.downloadUrl, '_blank', 'noopener,noreferrer')
        },
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '检查更新失败，请稍后重试'
      messageApi.error(errorMessage)
    } finally {
      setIsCheckingUpdate(false)
    }
  }

  const formatMegabytes = (bytes: number) => `${(bytes / (1024 * 1024)).toFixed(1)} MB`

  const launchApkInstall = async (path: string) => {
    const result = await ApkUpdater.install({ path })

    if (result.status === 'needs-permission') {
      setApkUpdateProgress(null)
      confirmWithBackDismiss({
        title: '需要允许安装应用',
        content: '已打开系统设置，请允许本应用「安装未知应用」后返回，点击「重试」继续安装。',
        okText: '重试',
        cancelText: '取消',
        onOk: async () => {
          await launchApkInstall(path)
        },
      })
      return
    }

    setApkUpdateProgress(null)
    messageApi.success('已启动安装，请在系统安装器中完成更新')
  }

  const handleInAppUpdate = async (asset: ApkAssetDescriptor) => {
    setApkUpdateProgress({ stage: 'downloading', receivedBytes: 0, totalBytes: asset.size ?? null })

    const listener = await ApkUpdater.addListener('apkDownloadProgress', (progress) => {
      setApkUpdateProgress((current) =>
        current
          ? {
              ...current,
              receivedBytes: progress.receivedBytes,
              totalBytes: progress.totalBytes ?? current.totalBytes,
            }
          : current,
      )
    })

    try {
      const download = await ApkUpdater.download({
        url: asset.url,
        expectedSha256: asset.sha256,
        expectedSize: asset.size,
      })

      setApkUpdateProgress((current) => (current ? { ...current, stage: 'installing' } : current))
      await launchApkInstall(download.path)
    } catch (error) {
      setApkUpdateProgress(null)
      const errorMessage = error instanceof Error ? error.message : '下载安装包失败，请稍后重试'
      messageApi.error(errorMessage)
    } finally {
      await listener.remove()
    }
  }

  useBackDismiss(isTermsModalOpen, () => setIsTermsModalOpen(false))
  useBackDismiss(isLicenseModalOpen, () => setIsLicenseModalOpen(false))
  useBackDismiss(isTodoModalOpen, () => setIsTodoModalOpen(false))

  return (
    <section
      className={`schedule-settings-page mine-detail-page settings-view-transition settings-view-transition--${transitionStage}`}
    >
      {contextHolder}
      <Modal
        title='正在更新'
        open={apkUpdateProgress !== null}
        keyboard={false}
        maskClosable={false}
        footer={null}
        onCancel={() => setApkUpdateProgress(null)}
      >
        {apkUpdateProgress?.stage === 'installing' ? (
          <p className='mine-detail-card-description'>下载完成，正在启动安装…</p>
        ) : (
          <>
            <Progress
              percent={
                apkUpdateProgress?.totalBytes
                  ? Math.min(
                      99,
                      Math.floor(
                        (apkUpdateProgress.receivedBytes / apkUpdateProgress.totalBytes) * 100,
                      ),
                    )
                  : 100
              }
              status='active'
              format={
                apkUpdateProgress?.totalBytes
                  ? undefined
                  : () => `已下载 ${formatMegabytes(apkUpdateProgress?.receivedBytes ?? 0)}`
              }
            />
            <p className='mine-detail-card-description'>
              {apkUpdateProgress?.totalBytes
                ? `${formatMegabytes(apkUpdateProgress.receivedBytes)} / ${formatMegabytes(apkUpdateProgress.totalBytes)}`
                : '正在获取下载进度…'}
            </p>
          </>
        )}
      </Modal>
      <header className='schedule-settings-header'>
        <div>
          <p className='schedule-settings-title'>{title}</p>
          <p className='schedule-settings-subtitle'>{subtitle}</p>
        </div>

        <CircleIconButton
          ariaLabel='关闭详情页面'
          icon={<CloseOutlined />}
          disabled={transitionStage === 'closing'}
          onClick={handleClose}
        />
      </header>

      <div className='schedule-settings-content mine-detail-content'>
        {title === '全局设置' ? (
          <>
            <div className='mine-button-group'>
              <div className='mine-group-button mine-theme-family-panel'>
                <div className='mine-theme-mode-header'>
                  <span>全局主题套装</span>
                  <span className='mine-theme-toggle-meta'>
                    {GLOBAL_THEME_FAMILY_OPTIONS.find((item) => item.id === themeFamily)?.name ?? '默认'}
                  </span>
                </div>

                <div className='mine-theme-family-list'>
                  <VerticalSlideSelector
                    value={themeFamily}
                    options={GLOBAL_THEME_FAMILY_OPTIONS.map((item) => ({
                      value: item.id,
                      label: item.name,
                    }))}
                    onChange={setThemeFamily}
                    ariaLabel='全局主题套装切换'
                  />
                </div>
              </div>
            </div>

            <div className='mine-button-group'>
              <div className='mine-group-button mine-theme-mode-panel'>
                <div className='mine-theme-mode-header'>
                  <span>全局主题模式</span>
                  <span className='mine-theme-toggle-meta'>{GLOBAL_THEME_MODE_LABELS[mode]}</span>
                </div>

                <HorizontalSlideSelector
                  value={mode}
                  options={GLOBAL_THEME_MODE_OPTIONS.map((item) => ({
                    value: item.value,
                    label: item.label,
                  }))}
                  onChange={setMode}
                  ariaLabel='全局主题切换'
                />

                <div className='mine-theme-mode-footer'>
                  <span>当前生效主题</span>
                  <span className='mine-theme-toggle-meta'>{RESOLVED_THEME_MODE_LABELS[resolvedMode]}</span>
                </div>
              </div>
            </div>

            <div className='mine-button-group'>
              <div className='mine-group-button mine-setting-row'>
                <div className='mine-setting-copy'>
                  <p className='mine-detail-card-title'>启用本地手册</p>
                  <p className='mine-detail-card-description'>开启后优先加载应用内置手册资源</p>
                </div>
                <Switch checked={isLocalManualEnabled} onChange={handleLocalManualSwitchChange} />
              </div>
            </div>

            <div className='mine-button-group'>
              <div className='mine-group-button mine-setting-row'>
                <div className='mine-setting-copy'>
                  <p className='mine-detail-card-title'>进入手册时重新加载（需重启应用）</p>
                  <p className='mine-detail-card-description'>关闭后手册内容保留上次浏览位置，开启后每次进入都会重新加载 <br /> 修改后需重启应用才能生效</p>
                </div>
                <Switch checked={isReloadManualEnabled} onChange={handleReloadManualSwitchChange} />
              </div>
            </div>
          </>
        ) : title === '更多' ? (
          <>
            <div className='mine-button-group'>
              <div className='mine-group-button mine-setting-row'>
                <div className='mine-setting-copy'>
                  <p className='mine-detail-card-title'>当前版本</p>
                  <p className='mine-detail-card-description'>{`v${__APP_VERSION__}${IS_NIGHTLY_CHANNEL ? '（Nightly 通道）' : ''}`}</p>
                </div>
                <Button className='mine-update-check-button' loading={isCheckingUpdate} onClick={handleCheckUpdate}>
                  检查更新
                </Button>
              </div>
            </div>

            <div className='mine-button-group'>
              <div className='mine-group-button mine-detail-card-item'>
                <p className='mine-detail-card-title'>关于</p>
                <p className='mine-detail-card-description'>应用作者：@Kozumi</p>
                <p className='mine-detail-card-description'>
                  内容创作：启梦华工编辑部（成员：@Kozumi / @Rotioki）
                </p>
                <p className='mine-detail-card-description'>
                  免责声明：一切信息仅供参考，不对信息来源与权威性负责，请结合官方渠道审慎甄别。
                </p>
                <div className='mine-detail-link-row'>
                  <button
                    type='button'
                    className='mine-detail-link-button'
                    onClick={() => setIsTermsModalOpen(true)}
                  >
                    用户协议与隐私声明
                  </button>
                  <button
                    type='button'
                    className='mine-detail-link-button'
                    onClick={() => setIsLicenseModalOpen(true)}
                  >
                    开源许可证
                  </button>
                </div>
                <p className='mine-detail-card-description'>鸣谢支持：我不是卷神、华工转专业交流群</p>
              </div>
            </div>

            <div className='mine-button-group'>
              <button
                type='button'
                className='mine-group-button schedule-settings-action'
                onClick={() => setIsTodoModalOpen(true)}
              >
                查看TODO，参加贡献！
              </button>
            </div>

            <Modal
              title='用户协议与隐私声明'
              open={isTermsModalOpen}
              onCancel={() => setIsTermsModalOpen(false)}
              footer={null}
            >
              <div className='mine-legal-content'>
                <p>本应用为信息聚合与工具辅助产品，供校内学习与生活参考使用。</p>
                <p>
                  你在使用过程中应遵守法律法规与平台规则，不得将本应用用于违法违规、侵权或破坏性用途。
                </p>
                <p>
                  隐私方面，应用仅在本地存储必要配置（如头像、主题与课表导入结果），不主动上传个人数据。
                </p>
                <p>
                  本应用所载信息不构成官方承诺或权威结论，请以学校与相关机构发布的正式信息为准，并自行判断。
                </p>
              </div>
            </Modal>

            <Modal
              title='开源许可证'
              open={isLicenseModalOpen}
              onCancel={() => setIsLicenseModalOpen(false)}
              footer={null}
            >
              <div className='mine-legal-content'>
                <p>本项目及所引用开源项目许可证如下（以官方仓库声明为准）：</p>
                <ul className='mine-license-list'>
                  {THIRD_PARTY_LICENSES.map((item) => (
                    <li key={`${item.name}@${item.version}`}>
                      <span>{item.name}@{item.version}</span>
                      <span className='mine-license-metadata'>
                        <span>{item.license}</span>
                        {item.sourceUrl ? (
                          <a href={item.sourceUrl} target='_blank' rel='noreferrer'>源码</a>
                        ) : null}
                        {item.licenseUrl ? (
                          <a href={item.licenseUrl} target='_blank' rel='noreferrer'>许可证全文</a>
                        ) : null}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </Modal>

            <Modal
              title='查看TODO，参加贡献！'
              open={isTodoModalOpen}
              onCancel={() => setIsTodoModalOpen(false)}
              footer={null}
            >
              <section className='mine-todo-section'>
                <p className='mine-todo-section-title'>APP</p>
                {APP_TODO_ITEMS.length > 0 ? (
                  <ul className='mine-todo-list'>
                    {APP_TODO_ITEMS.map((todo, index) => (
                      <li key={`app-${index}`}>
                        <label>
                          <Checkbox checked={false} disabled />
                          <span>{todo}</span>
                        </label>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className='mine-detail-card-description'>暂无 TODO</p>
                )}
              </section>

              <section className='mine-todo-section'>
                <p className='mine-todo-section-title'>手册</p>
                {MANUAL_TODO_ITEMS.length > 0 ? (
                  <ul className='mine-todo-list'>
                    {MANUAL_TODO_ITEMS.map((todo, index) => (
                      <li key={`manual-${index}`}>
                        <label>
                          <Checkbox checked={false} disabled />
                          <span>{todo}</span>
                        </label>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className='mine-detail-card-description'>暂无 TODO</p>
                )}
              </section>
            </Modal>
          </>
        ) : (
          <div className='mine-faq-list'>
            {FAQ_ITEMS.map((item) => (
              <details className='mine-faq-item' key={item.question}>
                <summary className='mine-faq-question'>{item.question}</summary>
                <p className='mine-detail-card-description mine-faq-answer'>{item.answer}</p>
              </details>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

export default MineDetailPage
