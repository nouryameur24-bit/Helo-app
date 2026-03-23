import WidgetKit
import SwiftUI

struct HeloSmallWidget: Widget {
    let kind: String = "HeloSmallWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: HeloWidgetProvider()) { entry in
            HeloSmallWidgetView(entry: entry)
                .widgetURL(URL(string: "helo://"))
        }
        .configurationDisplayName("Glow Score")
        .description("Votre Glow Score et semaine de grossesse.")
        .supportedFamilies([.systemSmall])
    }
}

struct HeloSmallWidgetView: View {
    let entry: HeloWidgetEntry

    private var scoreColor: Color {
        if entry.glowScore > 80 { return Color(red: 0.49, green: 0.73, blue: 0.59) }
        if entry.glowScore >= 60 { return Color(red: 0.79, green: 0.66, blue: 0.43) }
        if entry.glowScore >= 40 { return Color(red: 0.90, green: 0.71, blue: 0.35) }
        return Color(red: 0.85, green: 0.40, blue: 0.40)
    }

    var body: some View {
        ZStack {
            LinearGradient(
                colors: [
                    Color(red: 1.0, green: 0.98, blue: 0.96),
                    Color(red: 1.0, green: 0.96, blue: 0.93)
                ],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )

            VStack(spacing: 8) {
                ZStack {
                    Circle()
                        .stroke(Color(red: 0.93, green: 0.89, blue: 0.84), lineWidth: 3)
                        .frame(width: 40, height: 40)

                    Circle()
                        .trim(from: 0, to: CGFloat(entry.glowScore) / 100.0)
                        .stroke(scoreColor, style: StrokeStyle(lineWidth: 3, lineCap: .round))
                        .frame(width: 40, height: 40)
                        .rotationEffect(.degrees(-90))

                    Text("\(entry.glowScore)")
                        .font(.system(size: 13, weight: .bold, design: .rounded))
                        .foregroundColor(scoreColor)
                }

                Text("Semaine \(entry.weekOfPregnancy)")
                    .font(.system(size: 11, weight: .medium))
                    .foregroundColor(Color(red: 0.45, green: 0.40, blue: 0.37))
            }
            .padding()
        }
        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
    }
}
