from flask import Flask, request, jsonify
from flask_cors import CORS
import torch
import torchvision.transforms as transforms
from PIL import Image
import torchvision.models as models

app = Flask(__name__)
CORS(app)

model = models.resnet18(pretrained=False)
model.fc = torch.nn.Linear(model.fc.in_features, 6)
model.load_state_dict(torch.load("models/recyclable_detector.pth"))
model.eval()

transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
])

labels = ['cardboard', 'glass', 'metal', 'paper', 'plastic', 'trash']

@app.route("/predict", methods=["POST"])
def predict():
    file = request.files['file']
    image = Image.open(file)
    image = transform(image).unsqueeze(0)

    with torch.no_grad():
        output = model(image)
        _, predicted = output.max(1)
        label = labels[predicted.item()]

    return jsonify({"recyclable": label in ["cardboard", "glass", "metal", "paper", "plastic"], "category": label})

if __name__ == "__main__":
    app.run(debug=True)
