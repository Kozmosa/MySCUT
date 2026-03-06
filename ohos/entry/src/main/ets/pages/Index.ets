import { webview } from '@kit.ArkWeb';

@Entry
@Component
struct Index {
  private webController: webview.WebviewController = new webview.WebviewController();

  build() {
    Column() {
      Web({
        src: 'resource://rawfile/app/index.html',
        controller: this.webController
      })
        .javaScriptAccess(true)
        .domStorageAccess(true)
        .width('100%')
        .height('100%')
    }
    .width('100%')
    .height('100%')
  }
}
