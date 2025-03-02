from pydantic import BaseModel, Field, HttpUrl
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum

class RecyclableCategory(str, Enum):
    PLASTIC = "plastic"
    PAPER = "paper"
    GLASS = "glass"
    METAL = "metal"
    ELECTRONICS = "electronics"
    COMPOST = "compost"
    UNKNOWN = "unknown"

class DetectionRequest(BaseModel):
    image: str = Field(..., description="Base64 encoded image data")
    user_id: str = Field(..., description="Firebase user ID")

class BoundingBox(BaseModel):
    x_min: float
    y_min: float
    x_max: float
    y_max: float

class Detection(BaseModel):
    category: RecyclableCategory
    confidence: float
    bounding_box: Optional[BoundingBox] = None
    
class RecyclingInfo(BaseModel):
    category: RecyclableCategory
    recyclable: bool
    description: str
    disposal_instructions: str
    environmental_impact: str
    additional_info: Optional[Dict[str, Any]] = None

class DetectionResponse(BaseModel):
    success: bool
    detection: Optional[Detection] = None
    recycling_info: Optional[RecyclingInfo] = None
    points_earned: Optional[int] = None
    error_message: Optional[str] = None

class ScanRecord(BaseModel):
    id: str
    user_id: str
    timestamp: datetime
    image_url: Optional[HttpUrl] = None
    detection: Detection
    recycling_info: RecyclingInfo
    points_earned: int

class UserScanHistory(BaseModel):
    user_id: str
    total_scans: int
    total_points: int
    scans: List[ScanRecord]

class LeaderboardEntry(BaseModel):
    user_id: str
    username: str
    total_points: int
    total_scans: int
    rank: int

class Leaderboard(BaseModel):
    entries: List[LeaderboardEntry]
    total_users: int
    updated_at: datetime

class ErrorResponse(BaseModel):
    detail: str

class YOLOv8Detector:
    def __init__(self, model_path="yolov8m.onnx", config_path="./vaip_config.json"):
        # Initialize the model
        self.imgsz = [640, 640]
        self.model_path = model_path
        self.config_path = config_path
        
        # Load class names
        with open('coco.names', 'r') as f:
            self.names = f.read().strip().split('\n')
        
        # Initialize inference session
        self.npu_options = onnxruntime.SessionOptions()
        self.session = onnxruntime.InferenceSession(
            self.model_path,
            providers=['VitisAIExecutionProvider'],
            sess_options=self.npu_options,
            provider_options=[{'config_file': self.config_path}]
        )
        
        # Load anchors and strides for post-processing
        self.anchors = torch.tensor(np.load("./anchors.npy", allow_pickle=True))
        self.strides = torch.tensor(np.load("./strides.npy", allow_pickle=True))
        self.dfl = DFL(16)
    
    def preprocess(self, frame, input_shape=(640, 640)):
        # Convert and normalize the image
        img = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        img = cv2.resize(img, input_shape)
        img = torch.from_numpy(img)
        img = img.float()  # uint8 to fp16/32
        img /= 255  # 0 - 255 to 0.0 - 1.0
        img = np.transpose(img, (2, 0, 1))
        
        if len(img.shape) == 3:
            img = img[None]
            
        return img
    
    def post_process(self, x):
        box, cls = torch.cat([xi.view(x[0].shape[0], 144, -1) for xi in x], 2).split(
            (16 * 4, 80), 1
        )
        dbox = dist2bbox(self.dfl(box), self.anchors.unsqueeze(0), xywh=True, dim=1) * self.strides
        y = torch.cat((dbox, cls.sigmoid()), 1)
        return y, x
    
    def detect(self, frame, conf_threshold=0.25, iou_threshold=0.7):
        # Preprocess
        preprocessed_img = self.preprocess(frame)
        
        # Inference
        outputs = self.session.run(
            None, 
            {self.session.get_inputs()[0].name: preprocessed_img.permute(0, 2, 3, 1).cpu().numpy()}
        )
        
        # Postprocess
        outputs = [torch.tensor(item).permute(0, 3, 1, 2) for item in outputs]
        preds = self.post_process(outputs)
        preds = non_max_suppression(
            preds, conf_threshold, iou_threshold, agnostic=False, max_det=300, classes=None
        )
        
        # Format results
        results = []
        for i, det in enumerate(preds):
            if len(det):
                for *xyxy, conf, cls in det:
                    x1, y1, x2, y2 = [int(coord) for coord in xyxy]
                    class_id = int(cls)
                    confidence = float(conf)
                    results.append({
                        'bbox': [x1, y1, x2, y2],
                        'class': self.names[class_id],
                        'confidence': confidence
                    })
        
        return results
