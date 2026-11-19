import UIKit
import Capacitor
import Photos
import ImageIO
import SafariServices
import UniformTypeIdentifiers
import WebKit

// Static Next export is multi-page. Capacitor's default router returns the root for every extensionless route.
struct CodeDestinyRouter: Router {
    var basePath = ""
    func route(for path: String) -> String {
        let root = URL(fileURLWithPath: basePath).standardizedFileURL.path
        let requested = URL(fileURLWithPath: root + path).standardizedFileURL.path
        guard requested == root || requested.hasPrefix(root + "/") else { return root + "/index.html" }
        if URL(fileURLWithPath: requested).pathExtension.isEmpty {
            let index = requested + (requested.hasSuffix("/") ? "" : "/") + "index.html"
            if FileManager.default.fileExists(atPath: index) { return index }
            return root + "/index.html"
        }
        return requested
    }
}

enum CodeDestinyLinks {
    static let ownHosts: Set<String> = ["code-destiny.com", "www.code-destiny.com"]
    static let shellBackground = UIColor(red: 0x1b / 255.0, green: 0x10 / 255.0, blue: 0x28 / 255.0, alpha: 1)

    static func isWeb(_ url: URL) -> Bool { ["https", "http"].contains(url.scheme?.lowercased() ?? "") }
    static func isOwnHost(_ url: URL) -> Bool { isWeb(url) && ownHosts.contains(url.host?.lowercased() ?? "") }
    static func isAppOrigin(_ url: URL) -> Bool { url.scheme == "capacitor" && url.host == "localhost" }

    // Own-site pages are served from the bundled shell, never from the network origin.
    static func appURL(for url: URL) -> URL? {
        var local = URLComponents()
        local.scheme = "capacitor"
        local.host = "localhost"
        local.path = url.path.isEmpty ? "/" : url.path
        local.query = url.query
        local.fragment = url.fragment
        return local.url
    }

    static func topPresenter(from root: UIViewController?) -> UIViewController? {
        var top = root
        while let presented = top?.presentedViewController, !presented.isBeingDismissed { top = presented }
        return top
    }

    static func presentInAppBrowser(_ url: URL, from root: UIViewController?) {
        guard isWeb(url), let presenter = topPresenter(from: root) else {
            UIApplication.shared.open(url, options: [:], completionHandler: nil); return
        }
        let safari = SFSafariViewController(url: url)
        safari.dismissButtonStyle = .close
        safari.preferredControlTintColor = UIColor(red: 0xff / 255.0, green: 0x9e / 255.0, blue: 0xc4 / 255.0, alpha: 1)
        presenter.present(safari, animated: true)
    }
}

@objc(CodeDestinyViewController)
class CodeDestinyViewController: CAPBridgeViewController {
    // Retained here because WKWebView.uiDelegate is weak.
    private var uiDelegateProxy: CodeDestinyUIDelegate?

    override func router() -> Router { CodeDestinyRouter() }

    override func webViewConfiguration(for instanceConfiguration: InstanceConfiguration) -> WKWebViewConfiguration {
        let configuration = super.webViewConfiguration(for: instanceConfiguration)
        // Log-only app marker; no server or web code branches on it. Platform detection uses the native bridge.
        let version = Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? "0"
        let marker = "CodeDestinyApp/iOS/\(version)"
        if let name = configuration.applicationNameForUserAgent, !name.isEmpty {
            configuration.applicationNameForUserAgent = "\(name) \(marker)"
        } else {
            configuration.applicationNameForUserAgent = marker
        }
        return configuration
    }

    override func capacitorDidLoad() {
        bridge?.registerPluginInstance(CodeDestinyWallpaperPlugin())
        bridge?.registerPluginInstance(CodeDestinyLocalePlugin())
        bridge?.registerPluginInstance(CodeDestinyNavigationPlugin())
        bridge?.registerPluginInstance(CodeDestinyStatusBarPlugin())

        guard let webView = webView else { return }
        // Same color as the splash and the web boot gate so launch, overscroll and keyboard edges never flash white.
        view.backgroundColor = CodeDestinyLinks.shellBackground
        webView.isOpaque = false
        webView.backgroundColor = CodeDestinyLinks.shellBackground
        webView.scrollView.backgroundColor = CodeDestinyLinks.shellBackground
        webView.underPageBackgroundColor = CodeDestinyLinks.shellBackground
        webView.scrollView.keyboardDismissMode = .interactive
        webView.allowsBackForwardNavigationGestures = true

        // CAPBridgeProtocol does not expose the delegation handler; prepareWebView installs it as the UI delegate.
        if let original = webView.uiDelegate as? WebViewDelegationHandler {
            let proxy = CodeDestinyUIDelegate(original: original, owner: self)
            uiDelegateProxy = proxy
            webView.uiDelegate = proxy
        }
        #if DEBUG
        scheduleSelfTest()
        #endif
    }

    #if DEBUG
    private var selfTestObservers: [NSObjectProtocol] = []

    // Debug-only, opt-in with the launch argument -cdSelfTest (ios-shell-build.yml). Logs the values the
    // Mac checklist reads by hand in Web Inspector. Release builds never contain this code.
    private func scheduleSelfTest() {
        guard ProcessInfo.processInfo.arguments.contains("-cdSelfTest") else { return }
        DispatchQueue.main.asyncAfter(deadline: .now() + 15) { [weak self] in
            guard let webView = self?.webView else { NSLog("%@", "[cd-selftest] no webView"); return }
            let script = """
            const root = document.documentElement;
            const client = globalThis.__cdNativeBridgeClient;
            let info = "missing";
            if (client && typeof client.getInfo === "function") {
              try { info = await client.getInfo(); } catch (e) { info = "error: " + e; }
            }
            return JSON.stringify({
              href: location.href,
              ua: navigator.userAgent,
              platform: root.dataset.platform || null,
              runtimeTarget: root.dataset.runtimeTarget || null,
              runtimeGlobal: globalThis.__CODE_DESTINY_RUNTIME_TARGET || null,
              bridgeTag: !!document.querySelector('script[src="/js/app-native-bridge.js"]'),
              nativeBridge: typeof globalThis.CodeDestinyNative,
              htmlAttributes: Array.from(root.attributes).map((a) => a.name).join(","),
              capacitorPlatform: globalThis.Capacitor && globalThis.Capacitor.getPlatform ? globalThis.Capacitor.getPlatform() : null,
              info: info
            });
            """
            webView.callAsyncJavaScript(script, arguments: [:], in: nil, in: .page) { [weak self] result in
                switch result {
                case .success(let value): NSLog("%@", "[cd-selftest] \(value)")
                case .failure(let error): NSLog("%@", "[cd-selftest] error \(error.localizedDescription)")
                }
                self?.selfTestLinks()
            }
        }
    }

    // Link delivery. `simctl openurl` from the host stops at SpringBoard's "Open in …?" confirmation, so the
    // custom-scheme URL is opened by the app itself through UIApplication.open: it still goes through the OS
    // (LaunchServices → AppDelegate → ApplicationDelegateProxy → @capacitor/app → appUrlOpen) with no prompt.
    // A universal link needs a signed build and a served AASA (no Team ID yet), so iOS would route the https URL to
    // Safari. The step hands the AppDelegate the same NSUserActivity iOS delivers for a universal link instead.
    private func selfTestLinks() {
        let center = NotificationCenter.default
        for name in [Notification.Name.capacitorOpenURL, Notification.Name.capacitorOpenUniversalLink] {
            selfTestObservers.append(center.addObserver(forName: name, object: nil, queue: .main) { note in
                let url = ((note.object as? [String: Any])?["url"] as? URL)?.absoluteString ?? "?"
                NSLog("%@", "[cd-selftest] link-native \(name.rawValue) \(url)")
            })
        }
        guard let scheme = URL(string: "com.codedestiny.app://cd-selftest?probe=scheme") else { return }
        UIApplication.shared.open(scheme, options: [:]) { opened in
            NSLog("%@", "[cd-selftest] link-scheme-open \(opened)")
        }
        DispatchQueue.main.asyncAfter(deadline: .now() + 5) { [weak self] in
            let activity = NSUserActivity(activityType: NSUserActivityTypeBrowsingWeb)
            activity.webpageURL = URL(string: "https://code-destiny.com/about/?cd_selftest=universal")
            let application = UIApplication.shared
            let accepted = application.delegate?.application?(application, continue: activity, restorationHandler: { _ in }) ?? false
            NSLog("%@", "[cd-selftest] link-universal-delivered \(accepted)")
            DispatchQueue.main.asyncAfter(deadline: .now() + 8) { [weak self] in
                guard let webView = self?.webView else { NSLog("%@", "[cd-selftest] link-result no webView"); return }
                // The bridge's trace (localStorage, same origin) survives the navigation the universal link causes.
                let script = """
                let trace = [];
                try { trace = JSON.parse(localStorage.getItem("cd_app_trace_v1") || "[]"); } catch (e) {}
                return JSON.stringify({
                  href: location.href,
                  title: document.title,
                  trace: trace.filter((e) => /appUrlOpen|universalLink|deepLink/.test(e.step)).slice(-6)
                });
                """
                webView.callAsyncJavaScript(script, arguments: [:], in: nil, in: .page) { result in
                    switch result {
                    case .success(let value): NSLog("%@", "[cd-selftest] link-result \(value)")
                    case .failure(let error): NSLog("%@", "[cd-selftest] link-result error \(error.localizedDescription)")
                    }
                }
            }
        }
    }
    #endif
}

// Replaces Capacitor's UI delegate: localized dialog buttons, completion handlers that always fire,
// and window.open / target=_blank handling (Capacitor hands every new window to UIApplication.open,
// which silently drops app-origin URLs).
final class CodeDestinyUIDelegate: NSObject, WKUIDelegate {
    private weak var original: WebViewDelegationHandler?
    private weak var owner: UIViewController?

    init(original: WebViewDelegationHandler, owner: UIViewController) {
        self.original = original
        self.owner = owner
    }

    private func text(_ key: String) -> String { NSLocalizedString(key, comment: "") }

    private func present(_ alert: UIAlertController, onFailure: () -> Void) {
        guard let presenter = CodeDestinyLinks.topPresenter(from: owner), presenter.view.window != nil else {
            onFailure(); return
        }
        presenter.present(alert, animated: true)
    }

    func webView(_ webView: WKWebView, runJavaScriptAlertPanelWithMessage message: String, initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping () -> Void) {
        let alert = UIAlertController(title: nil, message: message, preferredStyle: .alert)
        alert.addAction(UIAlertAction(title: text("dialog.ok"), style: .default) { _ in completionHandler() })
        present(alert) { completionHandler() }
    }

    func webView(_ webView: WKWebView, runJavaScriptConfirmPanelWithMessage message: String, initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping (Bool) -> Void) {
        let alert = UIAlertController(title: nil, message: message, preferredStyle: .alert)
        alert.addAction(UIAlertAction(title: text("dialog.cancel"), style: .cancel) { _ in completionHandler(false) })
        alert.addAction(UIAlertAction(title: text("dialog.ok"), style: .default) { _ in completionHandler(true) })
        present(alert) { completionHandler(false) }
    }

    func webView(_ webView: WKWebView, runJavaScriptTextInputPanelWithPrompt prompt: String, defaultText: String?, initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping (String?) -> Void) {
        // Capacitor's synchronous cookie/http bridge rides on prompt() with a JSON payload; keep that path intact.
        if let data = prompt.data(using: .utf8),
           let payload = try? JSONSerialization.jsonObject(with: data, options: .fragmentsAllowed) as? [String: Any],
           let type = payload["type"] as? String, type.hasPrefix("CapacitorCookies") || type == "CapacitorHttp",
           let original = original {
            original.webView(webView, runJavaScriptTextInputPanelWithPrompt: prompt, defaultText: defaultText, initiatedByFrame: frame, completionHandler: completionHandler)
            return
        }
        let alert = UIAlertController(title: nil, message: prompt, preferredStyle: .alert)
        alert.addTextField { $0.text = defaultText }
        alert.addAction(UIAlertAction(title: text("dialog.cancel"), style: .cancel) { _ in completionHandler(nil) })
        alert.addAction(UIAlertAction(title: text("dialog.ok"), style: .default) { [weak alert] _ in
            completionHandler(alert?.textFields?.first?.text ?? defaultText)
        })
        present(alert) { completionHandler(nil) }
    }

    func webView(_ webView: WKWebView, requestMediaCapturePermissionFor origin: WKSecurityOrigin, initiatedByFrame frame: WKFrameInfo, type: WKMediaCaptureType, decisionHandler: @escaping (WKPermissionDecision) -> Void) {
        // Only the bundled app origin may use the camera/microphone without WebKit's own prompt.
        decisionHandler(origin.protocol == "capacitor" && origin.host == "localhost" ? .grant : .prompt)
    }

    func webView(_ webView: WKWebView, requestDeviceOrientationAndMotionPermissionFor origin: WKSecurityOrigin, initiatedByFrame frame: WKFrameInfo, decisionHandler: @escaping (WKPermissionDecision) -> Void) {
        decisionHandler(origin.protocol == "capacitor" && origin.host == "localhost" ? .grant : .prompt)
    }

    func webView(_ webView: WKWebView, createWebViewWith configuration: WKWebViewConfiguration, for navigationAction: WKNavigationAction, windowFeatures: WKWindowFeatures) -> WKWebView? {
        guard let url = navigationAction.request.url else { return nil }
        if CodeDestinyLinks.isAppOrigin(url) {
            webView.load(URLRequest(url: url))
        } else if CodeDestinyLinks.isOwnHost(url), !url.path.hasPrefix("/api/"), let local = CodeDestinyLinks.appURL(for: url) {
            webView.load(URLRequest(url: local))
        } else if CodeDestinyLinks.isWeb(url) {
            CodeDestinyLinks.presentInAppBrowser(url, from: owner)
        } else {
            UIApplication.shared.open(url, options: [:], completionHandler: nil)
        }
        return nil
    }
}

@objc(CodeDestinyNavigationPlugin)
class CodeDestinyNavigationPlugin: CAPPlugin, CAPBridgedPlugin {
    let identifier = "CodeDestinyNavigationPlugin"
    let jsName = "CodeDestinyNavigation"
    let pluginMethods: [CAPPluginMethod] = []
    override func shouldOverrideLoad(_ navigationAction: WKNavigationAction) -> NSNumber? {
        guard navigationAction.targetFrame?.isMainFrame != false,
              let url = navigationAction.request.url,
              CodeDestinyLinks.isWeb(url) else { return nil }

        if CodeDestinyLinks.isOwnHost(url) {
            if url.path.hasPrefix("/api/auth/") {
                // OAuth start URLs keep Capacitor's default (system browser) until Phase 5 moves them to ASWebAuthenticationSession.
                return nil
            }
            if url.path.hasPrefix("/api/") {
                // API responses are never documents for the shell; ignore the top-level navigation (Android parity).
                return NSNumber(value: true)
            }
            guard let target = CodeDestinyLinks.appURL(for: url) else { return NSNumber(value: true) }
            DispatchQueue.main.async { self.bridge?.webView?.load(URLRequest(url: target)) }
            return NSNumber(value: true)
        }

        // Only a user-initiated top-level link to another site leaves the shell, and it opens in-app.
        guard navigationAction.navigationType == .linkActivated || navigationAction.targetFrame == nil else { return nil }
        DispatchQueue.main.async {
            CodeDestinyLinks.presentInAppBrowser(url, from: self.bridge?.viewController)
        }
        return NSNumber(value: true)
    }
}

// Same JS surface as the Android CodeDestinyStatusBarPlugin: StatusBar.setStyle({ style: "DARK" | "LIGHT" | "DEFAULT" }).
// DARK means a dark page (네오 theme) → light icons; LIGHT/DEFAULT (연이 theme) → dark icons.
@objc(CodeDestinyStatusBarPlugin)
class CodeDestinyStatusBarPlugin: CAPPlugin, CAPBridgedPlugin {
    let identifier = "CodeDestinyStatusBarPlugin"
    let jsName = "StatusBar"
    let pluginMethods: [CAPPluginMethod] = [CAPPluginMethod(name: "setStyle", returnType: CAPPluginReturnPromise)]

    @objc func setStyle(_ call: CAPPluginCall) {
        let style = (call.getString("style") ?? "DEFAULT").uppercased()
        DispatchQueue.main.async {
            guard let controller = self.bridge?.viewController as? CAPBridgeViewController else {
                call.reject("Status bar is unavailable", "STATUS_BAR_UNAVAILABLE"); return
            }
            controller.setStatusBarStyle(style == "DARK" ? .lightContent : .darkContent)
            call.resolve(["style": style])
        }
    }
}

@objc(CodeDestinyWallpaperPlugin)
class CodeDestinyWallpaperPlugin: CAPPlugin, CAPBridgedPlugin {
    let identifier = "CodeDestinyWallpaperPlugin"
    let jsName = "CodeDestinyWallpaper"
    let pluginMethods: [CAPPluginMethod] = [CAPPluginMethod(name: "exportImage", returnType: CAPPluginReturnPromise), CAPPluginMethod(name: "getScreenInfo", returnType: CAPPluginReturnPromise)]

    @objc func getScreenInfo(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            let bounds = (self.bridge?.viewController?.view.window?.windowScene?.screen ?? UIScreen.main).nativeBounds
            call.resolve(["width": Int(bounds.width), "height": Int(bounds.height)])
        }
    }

    @objc func exportImage(_ call: CAPPluginCall) {
        guard let action = call.getString("action"), ["save", "share"].contains(action),
              let name = call.getString("fileName"), name.range(of: "^[a-z0-9-]{1,100}\\.png$", options: .regularExpression) != nil,
              let encoded = call.getString("base64"), encoded.utf8.count <= 22_369_624,
              let data = Data(base64Encoded: encoded), data.count <= 16 * 1024 * 1024,
              let source = CGImageSourceCreateWithData(data as CFData, nil),
              CGImageSourceGetType(source) as String? == UTType.png.identifier,
              let properties = CGImageSourceCopyPropertiesAtIndex(source, 0, nil) as? [CFString: Any],
              let width = properties[kCGImagePropertyPixelWidth] as? Int,
              let height = properties[kCGImagePropertyPixelHeight] as? Int,
              (720...4096).contains(width), (1280...8192).contains(height), width * height <= 25_000_000
        else { call.reject("Invalid image export", "INVALID_IMAGE"); return }

        if action == "save" {
            // Add-only access is requested at the save gesture, never at launch or preview.
            PHPhotoLibrary.requestAuthorization(for: .addOnly) { status in
                guard status == .authorized || status == .limited else {
                    call.reject("Photo permission was not granted", "PHOTO_PERMISSION_DENIED"); return
                }
                PHPhotoLibrary.shared().performChanges({
                    let request = PHAssetCreationRequest.forAsset()
                    let options = PHAssetResourceCreationOptions()
                    options.originalFilename = name
                    request.addResource(with: .photo, data: data, options: options)
                }) { success, _ in
                    if success { call.resolve(["status": "saved"]) }
                    else { call.reject("Could not save the original", "IMAGE_SAVE_FAILED") }
                }
            }
            return
        }
        DispatchQueue.main.async {
            guard let presenter = self.bridge?.viewController, presenter.presentedViewController == nil else {
                call.reject("Another system screen is open", "EXPORT_BUSY"); return
            }
            let directory = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString, isDirectory: true)
            let url = directory.appendingPathComponent(name)
            do {
                try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
                try data.write(to: url, options: .atomic)
                let sheet = UIActivityViewController(activityItems: [url], applicationActivities: nil)
                sheet.popoverPresentationController?.sourceView = presenter.view
                sheet.popoverPresentationController?.sourceRect = CGRect(x: presenter.view.bounds.midX, y: presenter.view.bounds.midY, width: 1, height: 1)
                sheet.completionWithItemsHandler = { _, completed, _, error in
                    try? FileManager.default.removeItem(at: directory)
                    if error != nil { call.reject("Could not share the original", "IMAGE_SHARE_FAILED") }
                    else { call.resolve(["status": completed ? "shared" : "cancelled"]) }
                }
                presenter.present(sheet, animated: true)
            } catch { call.reject("Could not prepare sharing", "IMAGE_EXPORT_FAILED") }
        }
    }
}

@objc(CodeDestinyLocalePlugin)
class CodeDestinyLocalePlugin: CAPPlugin, CAPBridgedPlugin {
    let identifier = "CodeDestinyLocalePlugin"
    let jsName = "CodeDestinyLocale"
    let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "initialize", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setLanguage", returnType: CAPPluginReturnPromise)
    ]
    private let key = "cd.selectedLanguage"
    private func normalized(_ language: String) -> String {
        if language.lowercased().hasPrefix("zh-hant") || language.lowercased().hasPrefix("zh-tw") { return "zh-tw" }
        let base = language.lowercased().split(separator: "-").first.map(String.init) ?? "en"
        return ["ko", "ja", "en", "zh", "vi", "th", "id", "ms"].contains(base) ? base : "en"
    }
    @objc func initialize(_ call: CAPPluginCall) {
        let requested = call.getString("language") ?? ""
        let saved = UserDefaults.standard.string(forKey: key)
        let selected = normalized(requested.isEmpty ? (saved ?? Locale.preferredLanguages.first ?? "en") : requested)
        call.resolve(["language": selected])
    }
    @objc func setLanguage(_ call: CAPPluginCall) {
        let language = normalized(call.getString("language") ?? "en")
        UserDefaults.standard.set(language, forKey: key)
        notifyListeners("languageChanged", data: ["language": language])
        call.resolve(["language": language])
    }
}
