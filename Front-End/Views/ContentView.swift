import SwiftUI

struct ContentView: View {
    @State private var showImagePicker = false
    @State private var selectedImage: UIImage?
    @State private var predictionResult: String = ""

    var body: some View {
        VStack {
            Text(" Recyclable AI Detector")
                .font(.largeTitle)
                .bold()
            
            if let image = selectedImage {
                Image(uiImage: image)
                    .resizable()
                    .scaledToFit()
                    .frame(height: 300)
            }
            
            Button("Choose Image") {
                showImagePicker = true
            }
            .padding()
            
            if !predictionResult.isEmpty {
                Text("Result: \(predictionResult)")
                    .bold()
                    .padding()
            }
        }
        .sheet(isPresented: $showImagePicker) {
            ImagePicker(selectedImage: $selectedImage)
        }
    }
}

#Preview {
    ContentView()
}
