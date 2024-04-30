# app.py

from flask import Flask, render_template, request, jsonify
from flask_cors import CORS
import cv2

app = Flask(__name__)
CORS(app)

face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
eye_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_eye.xml')

@app.route('/')
def index():
    return render_template('index.html')

def detect_eyes(frame):
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    faces = face_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(30, 30))

    eye_status = "unknown"

    for (x, y, w, h) in faces:
        roi_gray = gray[y:y+h, x:x+w]
        roi_color = frame[y:y+h, x:x+w]

        eyes = eye_cascade.detectMultiScale(roi_gray, scaleFactor=1.1, minNeighbors=5, minSize=(30, 30))

        left_eye_found = False
        right_eye_found = False
        for (ex, ey, ew, eh) in eyes:
            # 안경을 착용한 경우 눈의 상단과 하단의 좌표를 계산하여 눈 영역을 확장
            ey += int(eh * 0.25)  # 눈 상단에서 25% 지점
            eh = int(eh * 0.6)  # 눈 높이의 60%
            
            # 눈 영역 그리기
            cv2.rectangle(roi_color, (ex, ey), (ex+ew, ey+eh), (0, 255, 0), 2)

            if ex < w / 2:
                left_eye_found = True
            else:
                right_eye_found = True

        # 양쪽 눈 중 하나라도 발견되면 눈을 뜬 것으로 판단
        if left_eye_found or right_eye_found:
            eye_status = "open"
        else:
            eye_status = "close"

    return eye_status


@app.route('/detect', methods=['POST', 'GET'])
def detect():
    if request.method == 'POST' or request.method == 'GET':
        cap = cv2.VideoCapture(0)

        ret, frame = cap.read()

        if not ret or frame is None:
            return jsonify({'status': 'error', 'message': '프레임을 읽을 수 없습니다.'})

        eye_status = detect_eyes(frame)

        cap.release()
        #cv2.destroyAllWindows()

        return jsonify({'status': 'success', 'eye_status': eye_status})

    else:
        return jsonify({'status': 'error', 'message': '요청이 올바르지 않습니다.'})

if __name__ == '__main__':
    app.run(debug=True)
