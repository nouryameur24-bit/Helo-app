import WidgetKit
import SwiftUI

struct HeloMediumWidget: Widget {
    let kind: String = "HeloMediumWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: HeloWidgetProvider()) { entry in
            HeloMediumWidgetView(entry: entry)
        }
        .configurationDisplayName("Glow Score & Semaine")
        .description("Votre Glow Score, semaine et trimestre de grossesse.")
        .supportedFamilies([.systemMedium])
    }
}

struct HeloMediumWidgetView: View {
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

            HStack(spacing: 0) {
                Link(destination: URL(string: "helo://glowscore")!) {
                    VStack(spacing: 6) {
                        ZStack {
                            Circle()
                                .stroke(Color(red: 0.93, green: 0.89, blue: 0.84), lineWidth: 4)
                                .frame(width: 50, height: 50)

                            Circle()
                                .trim(from: 0, to: CGFloat(entry.glowScore) / 100.0)
                                .stroke(scoreColor, style: StrokeStyle(lineWidth: 4, lineCap: .round))
                                .frame(width: 50, height: 50)
                                .rotationEffect(.degrees(-90))

                            Text("\(entry.glowScore)")
                                .font(.system(size: 16, weight: .bold, design: .rounded))
                                .foregroundColor(scoreColor)
                        }

                        Text("Glow Score")
                            .font(.system(size: 10, weight: .semibold))
                            .foregroundColor(Color(red: 0.50, green: 0.45, blue: 0.41))
                            .textCase(.uppercase)
                            .kerning(0.5)
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                    .padding(.leading, 16)
                }

                Rectangle()
                    .fill(Color(red: 0.90, green: 0.86, blue: 0.82).opacity(0.6))
                    .frame(width: 1)
                    .padding(.vertical, 16)

                Link(destination: URL(string: "helo://scan")!) {
                    VStack(alignment: .leading, spacing: 8) {
                        HStack(spacing: 6) {
                            Image(systemName: "camera.viewfinder")
                                .font(.system(size: 18, weight: .medium))
                                .foregroundColor(Color(red: 0.79, green: 0.66, blue: 0.43))
                            Text("Scanner")
                                .font(.system(size: 13, weight: .semibold))
                                .foregroundColor(Color(red: 0.25, green: 0.22, blue: 0.20))
                        }

                        Divider()
                            .background(Color(red: 0.90, green: 0.86, blue: 0.82).opacity(0.6))

                        VStack(alignment: .leading, spacing: 2) {
                            Text("Semaine \(entry.weekOfPregnancy)")
                                .font(.system(size: 16, weight: .bold, design: .rounded))
                                .foregroundColor(Color(red: 0.25, green: 0.22, blue: 0.20))

                            Text("Trimestre \(entry.trimester)")
                                .font(.system(size: 12, weight: .medium))
                                .foregroundColor(Color(red: 0.50, green: 0.45, blue: 0.41))
                        }
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
                    .padding(.leading, 14)
                    .padding(.trailing, 16)
                }
            }
            .padding(.vertical, 14)
        }
        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
    }
}
