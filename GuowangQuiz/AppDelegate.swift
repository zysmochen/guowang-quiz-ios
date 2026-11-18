import UIKit

@main
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
    ) -> Bool {
        let window = UIWindow(frame: UIScreen.main.bounds)
        window.rootViewController = QuizViewController()
        window.backgroundColor = UIColor(red: 0.949, green: 0.961, blue: 0.953, alpha: 1)
        window.makeKeyAndVisible()
        self.window = window
        return true
    }
}
