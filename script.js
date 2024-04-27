let isDetecting = false;
let net;

// Posnet 모델을 정의하는 함수
async function loadPosenetModel() {
    try {
        net = await posenet.load();
        console.log('Posenet model loaded successfully.');
    } catch (error) {
        console.error('Error loading Posenet model:', error);
    }
}

async function setupCamera() {
    try {
        const videoElement = document.getElementById('videoElement');
        const videoStream = await navigator.mediaDevices.getUserMedia({ video: true });
        videoElement.srcObject = videoStream;
    } catch (error) {
        console.error('Error accessing camera:', error);
    }
}

async function detectPose() {
    if (!isDetecting) return;
    const videoElement = document.getElementById('videoElement');
    const outputCanvas = document.getElementById('outputCanvas');
    const ctx = outputCanvas.getContext('2d');

    const pose = await net.estimateSinglePose(videoElement, {
        flipHorizontal: false
    });

    // 감지된 포즈를 캔버스에 그립니다.
    ctx.clearRect(0, 0, outputCanvas.width, outputCanvas.height);
    posenet.drawSinglePose(pose, ctx);

    // 다음 프레임을 요청합니다.
    requestAnimationFrame(detectPose);
}

async function startDetection() {
    isDetecting = true;
    await loadPosenetModel(); // Posnet 모델 로드
    await setupCamera(); // 카메라 설정
    detectPose(); // 포즈 감지 시작
}

function stopDetection() {
    isDetecting = false;
}

// 시작 버튼에 클릭 이벤트를 추가합니다.
document.getElementById('startButton').addEventListener('click', startDetection);

// 중지 버튼에 클릭 이벤트를 추가합니다.
document.getElementById('stopButton').addEventListener('click', stopDetection);
