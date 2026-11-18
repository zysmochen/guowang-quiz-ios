import UIKit
import WebKit

final class QuizViewController: UIViewController, WKNavigationDelegate {

    private var webView: WKWebView!

    override func viewDidLoad() {
        super.viewDidLoad()

        let config = WKWebViewConfiguration()
        config.allowsInlineMediaPlayback = true
        config.websiteDataStore = .default()

        webView = WKWebView(frame: view.bounds, configuration: config)
        webView.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        webView.navigationDelegate = self
        webView.scrollView.bounces = false
        webView.scrollView.contentInsetAdjustmentBehavior = .never
        webView.isOpaque = false
        webView.backgroundColor = UIColor(red: 0.949, green: 0.961, blue: 0.953, alpha: 1)
        view.addSubview(webView)

        view.backgroundColor = UIColor(red: 0.949, green: 0.961, blue: 0.953, alpha: 1)

        guard let dir = Bundle.main.url(forResource: "www", withExtension: nil) else {
            return
        }
        let index = dir.appendingPathComponent("index.html")
        webView.loadFileURL(index, allowingReadAccessTo: dir)
    }

    override var preferredStatusBarStyle: UIStatusBarStyle {
        return .lightContent
    }
}
