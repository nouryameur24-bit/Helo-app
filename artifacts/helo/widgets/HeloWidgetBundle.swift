import WidgetKit
import SwiftUI

@main
struct HeloWidgetBundle: WidgetBundle {
    var body: some Widget {
        HeloSmallWidget()
        HeloMediumWidget()
    }
}
