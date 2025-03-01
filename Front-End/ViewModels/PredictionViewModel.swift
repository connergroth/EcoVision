import SwiftUI
import UIKit

class PredictionViewModel: ObservableObject {
    @Published var result: String = ""

    func classifyImage(_ image: UIImage) {
        guard let url = URL(string: "http://127.0.0.1:5000/predict") else { return }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"

        let boundary = UUID().uuidString
        request.setValue("multipart/form-data; boundary=\(boundary)", forHTTPHeaderField: "Content-Type")

        var body = Data()
        let filename = "image.jpg"
        let mimetype = "image/jpeg"
        
        body.append("--\(boundary)\r\n".data(using: .utf8)!)
        body.append("Content-Disposition: form-data; name=\"file\"; filename=\"\(filename)\"\r\n".data(using: .utf8)!)
        body.append("Content-Type: \(mimetype)\r\n\r\n".data(using: .utf8)!)
        body.append(image.jpegData(compressionQuality: 0.8)!)
        body.append("\r\n--\(boundary)--\r\n".data(using: .utf8)!)

        request.httpBody = body

        URLSession.shared.dataTask(with: request) { data, response, error in
            guard let data = data, error == nil else { return }
            if let decodedResponse = try? JSONDecoder().decode(PredictionResponse.self, from: data) {
                DispatchQueue.main.async {
                    self.result = decodedResponse.category
                }
            }
        }.resume()
    }
}
