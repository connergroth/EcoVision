import SwiftUI

struct ResultView: View {
    let result: String

    var body: some View {
        VStack {
            Text("Prediction Result")
                .font(.title)
                .bold()

            Text(result)
                .font(.largeTitle)
                .foregroundColor(result == "trash" ? .red : .green)
        }
    }
}
