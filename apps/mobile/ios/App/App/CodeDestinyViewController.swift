import UIKit
import Capacitor
import Photos
import ImageIO
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

@objc(CodeDestinyViewController)
class CodeDestinyViewController: CAPBridgeViewController {
    override func router() -> Router { CodeDestinyRouter() }
    override func capacitorDidLoad() {
        bridge?.registerPluginInstance(CodeDestinyWallpaperPlugin())
        bridge?.registerPluginInstance(CodeDestinyLocalePlugin())
        bridge?.registerPluginInstance(CodeDestinyNavigationPlugin())
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
              ["https", "http"].contains(url.scheme ?? ""),
              ["code-destiny.com", "www.code-destiny.com"].contains(url.host ?? ""),
              !url.path.hasPrefix("/api/") else { return nil }
        var local = URLComponents()
        local.scheme = "capacitor"
        local.host = "localhost"
        local.path = url.path
        local.query = url.query
        local.fragment = url.fragment
        guard let target = local.url else { return NSNumber(value: true) }
        DispatchQueue.main.async { self.bridge?.webView?.load(URLRequest(url: target)) }
        return NSNumber(value: true)
    }
}

@objc(CodeDestinyWallpaperPlugin)
class CodeDestinyWallpaperPlugin: CAPPlugin, CAPBridgedPlugin {
    let identifier = "CodeDestinyWallpaperPlugin"
    let jsName = "CodeDestinyWallpaper"
    let pluginMethods: [CAPPluginMethod] = [CAPPluginMethod(name: "exportImage", returnType: CAPPluginReturnPromise)]

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
              (1440...4096).contains(width), (2560...8192).contains(height), width * height <= 25_000_000
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
