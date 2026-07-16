import { Alert, Button } from 'antd'
import {
  Fragment,
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  bootstrapApplicationStorage,
  type ApplicationStorageRuntime,
} from './bootstrapApplicationStorage'

type StorageRuntimeContextValue = ApplicationStorageRuntime & {
  isRetrying: boolean
  retry(): Promise<void>
}

const StorageRuntimeContext = createContext<StorageRuntimeContextValue | null>(null)

type StorageRuntimeProviderProps = {
  children: ReactNode
  initialRuntime: ApplicationStorageRuntime
}

export function StorageRuntimeProvider({ children, initialRuntime }: StorageRuntimeProviderProps) {
  const [runtime, setRuntime] = useState(initialRuntime)
  const [isRetrying, setIsRetrying] = useState(false)
  const [revision, setRevision] = useState(0)

  const retry = useCallback(async () => {
    if (isRetrying) {
      return
    }

    setIsRetrying(true)
    try {
      const nextRuntime = await bootstrapApplicationStorage()
      setRuntime(nextRuntime)
      if (nextRuntime.status === 'ready') {
        setRevision((currentRevision) => currentRevision + 1)
      }
    } finally {
      setIsRetrying(false)
    }
  }, [isRetrying])

  const contextValue = useMemo<StorageRuntimeContextValue>(() => ({
    ...runtime,
    isRetrying,
    retry,
  }), [isRetrying, retry, runtime])

  return (
    <StorageRuntimeContext.Provider value={contextValue}>
      <Fragment key={revision}>{children}</Fragment>
    </StorageRuntimeContext.Provider>
  )
}

export function useStorageRuntime() {
  const context = useContext(StorageRuntimeContext)
  if (!context) {
    throw new Error('useStorageRuntime 必须在 StorageRuntimeProvider 内使用')
  }

  return context
}

export function StorageStatusBanner() {
  const storageRuntime = useStorageRuntime()
  if (storageRuntime.status === 'ready') {
    return null
  }

  return (
    <Alert
      className='storage-status-banner'
      type='error'
      showIcon
      message='课表存储当前为只读状态'
      description={storageRuntime.error.message}
      action={(
        <Button
          size='small'
          danger
          loading={storageRuntime.isRetrying}
          onClick={() => void storageRuntime.retry()}
        >
          重试
        </Button>
      )}
    />
  )
}
