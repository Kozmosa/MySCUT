import { webview } from '@kit.ArkWeb';
import { common } from '@kit.AbilityKit';
import { hilog } from '@kit.PerformanceAnalysisKit';

const DOMAIN = 0x0000;
const TAG = 'ohos-web';
const BUNDLE_NAME = 'io.github.kozmosa.myscut';

@Entry
@Component
struct Index {
  private webController: webview.WebviewController = new webview.WebviewController();

  private resolveWwwDir(): string {
    const context = getContext(this) as common.UIAbilityContext;
    const resourceDir = context.resourceDir;
    return `${resourceDir}/apps/${BUNDLE_NAME}/www`;
  }

  private resolveEntryUrl(): string {
    return `file://${this.resolveWwwDir()}/index.html`;
  }

  build() {
    Column() {
      Web({
        src: this.resolveEntryUrl(),
        controller: this.webController
      })
        .javaScriptAccess(true)
        .fileAccess(true)
        .imageAccess(true)
        .onlineImageAccess(true)
        .domStorageAccess(true)
        .onControllerAttached(() => {
          try {
            const wwwDir = this.resolveWwwDir();
            this.webController.setPathAllowingUniversalAccess([wwwDir]);
            hilog.info(DOMAIN, TAG, 'setPathAllowingUniversalAccess %{public}s', wwwDir);
          } catch (error) {
            hilog.error(DOMAIN, TAG, 'setPathAllowingUniversalAccess failed %{public}s', JSON.stringify(error));
          }
        })
        .onPageBegin((event) => {
          hilog.info(DOMAIN, TAG, 'onPageBegin %{public}s', `${event?.url ?? this.resolveEntryUrl()}`);
        })
        .onPageEnd((event) => {
          hilog.info(DOMAIN, TAG, 'onPageEnd %{public}s', `${event?.url ?? this.resolveEntryUrl()}`);
        })
        .onConsole((event) => {
          if (event) {
            hilog.info(DOMAIN, TAG, 'console %{public}s', event.message.getMessage());
          }
          return false;
        })
        .onErrorReceive((event) => {
          if (event) {
            hilog.error(DOMAIN, TAG, 'onErrorReceive %{public}s', event.error.getErrorInfo());
          }
        })
        .width('100%')
        .height('100%')
    }
    .width('100%')
    .height('100%')
  }
}
