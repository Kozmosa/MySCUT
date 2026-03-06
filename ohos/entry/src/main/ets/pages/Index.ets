import { webview } from '@kit.ArkWeb';

@Entry
@Component
struct Index {
  private webController: webview.WebviewController = new webview.WebviewController();

  build() {
    Column() {
      Web({
        src: 'https://manual.xn--xkrsa0ti6rf4cf98d.com/',
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
