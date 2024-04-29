import cv2

# OpenCV의 얼굴 검출기, 눈 검출기 로드
face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
eye_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_eye.xml')

# 웹캠 열기
cap = cv2.VideoCapture(0)

while True:
    # 웹캠에서 비디오 프레임 읽기
    ret, frame = cap.read()

    # 프레임이 비어 있는지 확인
    if not ret or frame is None:
        print("프레임을 읽을 수 없습니다.")
        break

    # 흑백으로 변환
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)

    # 얼굴 검출
    faces = face_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(30, 30))

    for (x, y, w, h) in faces:
        roi_gray = gray[y:y+h, x:x+w]
        roi_color = frame[y:y+h, x:x+w]

        # 얼굴 영역에 사각형 그리기
        cv2.rectangle(frame, (x, y), (x+w, y+h), (255, 0, 0), 2)

        # 눈 검출
        eyes = eye_cascade.detectMultiScale(roi_gray, scaleFactor=1.1, minNeighbors=5, minSize=(30, 30))

        # 양쪽 눈에 사각형 그리기 및 눈 상태 판별
        left_eye_found = False
        right_eye_found = False
        for (ex, ey, ew, eh) in eyes:
            if ex < w / 2:
                left_eye_found = True
                cv2.rectangle(roi_color, (ex, ey), (ex+ew, ey+eh), (0, 255, 0), 2)
            else:
                right_eye_found = True
                cv2.rectangle(roi_color, (ex, ey), (ex+ew, ey+eh), (0, 255, 0), 2)

        # 양쪽 눈이 감겨있는지 여부 판별
        if left_eye_found and right_eye_found:
            eye_status = "open"
        else:
            eye_status = "close"

        # 눈 상태 텍스트 표시
        cv2.putText(frame, eye_status, (x + w // 2 - 50, y - 20), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 2)

    # 화면에 프레임 표시
    cv2.imshow('Eye Detection', frame)

    # 'q' 키를 누르면 종료
    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

# 웹캠 해제 및 창 닫기
cap.release()
cv2.destroyAllWindows()
