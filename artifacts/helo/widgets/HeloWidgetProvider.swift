import WidgetKit
import SwiftUI

private let appGroupId = "group.com.helo.widget"

struct HeloWidgetEntry: TimelineEntry {
    let date: Date
    let glowScore: Int
    let weekOfPregnancy: Int
    let trimester: Int
}

struct HeloWidgetProvider: TimelineProvider {
    func placeholder(in context: Context) -> HeloWidgetEntry {
        HeloWidgetEntry(date: Date(), glowScore: 72, weekOfPregnancy: 20, trimester: 2)
    }

    func getSnapshot(in context: Context, completion: @escaping (HeloWidgetEntry) -> Void) {
        completion(currentEntry())
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<HeloWidgetEntry>) -> Void) {
        let entry = currentEntry()
        let timeline = Timeline(entries: [entry], policy: .never)
        completion(timeline)
    }

    private func currentEntry() -> HeloWidgetEntry {
        let defaults = UserDefaults(suiteName: appGroupId)
        let glowScore = Int(defaults?.string(forKey: "glow_score") ?? "0") ?? 0
        let weekOfPregnancy = Int(defaults?.string(forKey: "week_of_pregnancy") ?? "20") ?? 20
        let trimester = Int(defaults?.string(forKey: "trimester") ?? "2") ?? 2
        return HeloWidgetEntry(
            date: Date(),
            glowScore: glowScore,
            weekOfPregnancy: weekOfPregnancy,
            trimester: trimester
        )
    }
}
