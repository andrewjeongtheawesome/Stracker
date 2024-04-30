$(document).ready(function() {
  const video = document.getElementById('video');
  const status = document.getElementById('status');
  const startButton = document.getElementById('startButton');
  const stopButton = document.getElementById('stopButton');
  let isRunning = false;
  let intervalId; // setInterval 함수의 반환 값

  startButton.addEventListener('click', () => {
      if (!isRunning) {
          startVideo();
          isRunning = true;
          status.textContent = 'Running...';
          intervalId = setInterval(detectEyes, 1000);
      }
  });

  stopButton.addEventListener('click', () => {
      stopVideo();
      isRunning = false;
      status.textContent = 'Stopped';

      clearInterval(intervalId);
  });

  async function startVideo() {
      try {
          //실시간 영상 호출을 실시하면 충돌 발생
          //const stream = await navigator.mediaDevices.getUserMedia({ video: true });
          //video.srcObject = stream;
      } catch (err) {
          console.error('Error accessing webcam: ', err);
      }
  }

  function stopVideo() {
      const stream = video.srcObject;
      const tracks = stream.getTracks();

      tracks.forEach(track => {
          track.stop();
      });

      video.srcObject = null;
  }

  function detectEyes() {
      const eyeStatus = document.getElementById('status');

      $.ajax({
          url: 'http://localhost:5000/detect',
          type: 'GET',
          //ajax method -> success/error
          success: function(response) {
              if (response.status === 'success') {
                  console.log("status : ", response.eye_status);
                  if (response.eye_status === 'open') {
                      eyeStatus.textContent = '😊';
                  } else {
                      eyeStatus.textContent = '😴';
                  }
              } else {
                  console.error('Error detecting eyes: ', response.message);
              }
          },
          error: function(xhr, status, error) {
              console.error('AJAX Error: ', error);
          }
      });
  }
});
