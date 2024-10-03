import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import './Sidebar.css';
import SignUp from './Signup';
import Sidebar from './Sidebar';
import logo from './_logo.png';
import SideButton from './_SideButton.png';
import StateLoading from './_StateLoading.gif'; //상태gif-로딩중
import StateStudy from './_StateStudy.gif'; //상태gif-공부중
import StateSleep from './_StateSleep.gif'; //상태gif-조는중
import StateNoFace from './_StateNoFace.gif'; //상태gif-얼굴없음
import UnderReset from './_UnderReset.png';
import HeartRatePicture from './_HeartRatePicture.png';
import SleepCountPicture from './_SleepCountPicture.png';
import { auth, db } from './firebaseConfig';
import { doc, updateDoc, getDoc, setDoc, collection } from 'firebase/firestore';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import Graph from './Graph'; // 그래프 import
//import UnderPlay from './_UnderPlay.png'; //재생 버튼
//import UnderPause from './_UnderPause.png'; //일시정지 버튼
//import ConcentrationValueTri from './_ConcentrationValueTri.png'; // 집중도 그래프 화살표

const App = () => {
  const [sideBarVisible, setSidebarVisible] = useState(false); // 사이드바 보이기 여부
  const [isStarted, setIsStarted] = useState(false); // 사직 버튼 보이기 여부
  const [showSignUp, setShowSignUp] = useState(false); // 회원가입 페이지 정보
  const [currentDate, setCurrentDate] = useState(''); // 현재 날짜 정보
  const [user, setUser] = useState(null); // 사용자 정보
  const [isLoggedIn, setIsLoggedIn] = useState(false); // 로그인 여부
  const [currentPage, setCurrentPage] = useState('main'); // 현재 페이지 정보(메인 페이지, 회원가입 페이지)
  const [timerTime, setTimerTime] = useState(0); // 타이머 시간 (초 단위)
  const [heartRate, setHeartRate] = useState('---');
  const [eyeState, setEyeState] = useState('연결 안됨');
  const [sleepCount, setSleepCount] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [eyeClosedTime, setEyeClosedTime] = useState(0);
  const [modelStatus, setModelStatus] = useState('disconnected'); // 'disconnected', 'connecting', 'connected'
  const [frameIntervalId, setFrameIntervalId] = useState(null);
  const [userName, setUserName] = useState('');  // userName 상태 정의
  const [showGraph, setShowGraph] = useState(false);// 그래프
  
  const timerIntervalId = useRef(null);
  const timerRef = useRef(null); // 타이머 참조
  const videoRef = useRef(null);

  // StateText 및 StatePicture를 조건에 따라 변경
  const getStateText = () => {
    if (modelStatus === 'disconnected') return '연결 안됨';
    if (modelStatus === 'connecting') return '연결중...';
    if (modelStatus === 'studying') return '공부중...';
    if (modelStatus === 'drowsy') return '졸고 있음';
    if (modelStatus === 'nonFace') return '얼굴 없음';
    if (modelStatus === 'paused') return '일시 정지';
    return '';
  };

  const getStatePicture = () => {
    if (modelStatus === 'connecting') return StateLoading;
    if (modelStatus === 'studying') return StateStudy;
    if (modelStatus === 'drowsy') return StateSleep;
    return StateNoFace;
  };

  // 초기 상태 설정 로직
  const resetAppState = () => {
    setTimerTime(0);
    pauseTimer();
    if (videoRef.current) {
      const stream = videoRef.current.srcObject;
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      videoRef.current.srcObject = null;
    }
    setIsStarted(false);
    setModelStatus('disconnected');
    setEyeState('연결 안됨');
    setHeartRate('---');
    setSleepCount(0);
    setElapsedTime(0);
    setFrameIntervalId(null);
    console.log('초기 상태로 설정되었습니다.');
  };

  //실행 중 로그인시 초기 상태 설정 로직
  const resetAppStateWithSync = async (userId) => {
    try {
      // Firestore에서 사용자 데이터 가져오기
      const userDoc = await getDoc(doc(db, "users", userId));
  
      if (userDoc.exists()) {
        const userData = userDoc.data();
  
        // 타이머 및 졸음 횟수 동기화
        setElapsedTime(userData.studyTime || 0);
        setSleepCount(userData.sleepCount || 0);
        setTimerTime(userData.studyTime || 0); // timerTime과 elapsedTime을 동기화
        console.log(`사용자 정보 동기화: 공부 시간: ${userData.studyTime}, 졸음 횟수: ${userData.sleepCount}`);
      } else {
        console.error('사용자 정보를 찾을 수 없습니다.');
      }
    } catch (error) {
      console.error('데이터 동기화 중 오류 발생:', error);
    }
  
    // 타이머 및 카메라 상태 초기화
    pauseTimer(); // 타이머 정지
    if (videoRef.current) {
      const stream = videoRef.current.srcObject;
      if (stream) {
        stream.getTracks().forEach(track => track.stop()); // 웹캠 스트림 종료
      }
      videoRef.current.srcObject = null;
    }
    setIsStarted(false);
    setModelStatus('disconnected');
    setEyeState('연결 안됨');
    setHeartRate('---');
    setFrameIntervalId(null);
  };

  // 사용자가 공부를 종료하거나 로그아웃할 때 호출
  const handleEndStudy = async () => {
    await saveDailyData();
    resetAppState();
  };

  // 공부 종료 시 하루 데이터 저장하는 함수
  const saveDailyData = async () => {
    const today = new Date().toISOString().split('T')[0]; // 현재 날짜
    if (user) {
      const userDocRef = doc(db, `users/${user.uid}/dailyData`, today);
      await setDoc(userDocRef, {
        studyTime: timerTime,
        sleepCount: sleepCount,
        date: today,
      });
      console.log(`데이터 저장 완료: ${today}`);
    }
  };

  // 오늘 날짜 넣기 및 사용자 시간 동기화
  useEffect(() => {
    const today = new Date();
    const formattedDate = `${today.getFullYear()}년 ${today.getMonth() + 1}월 ${today.getDate()}일`;
    setCurrentDate(formattedDate);

    if (user) {
      syncUserData();
    }
  }, [user]);

  // 타이머 시작 및 정지
  useEffect(() => {
    if (isStarted) {
      startTimer();
    } else {
      stopTimer();
    }
    return () => stopTimer();
  }, [isStarted]);

  // eyeClosedTime = 눈 감긴 시간
  // 30초 이상시 졸았다고 판단
  // 심박계 연결시 120 이상 눈 감고 있음 + 심박계 45이하시 졸았다고 판단
  useEffect(() => {
    if (eyeClosedTime >= 30) {
      if (heartRate !== '---' && heartRate <= 45) {
        setSleepCount(prevCount => prevCount + 1);
      } else if (heartRate === '---') {
        setSleepCount(prevCount => prevCount + 1);
      }
      setEyeClosedTime(0); // 졸음 횟수 증가 후 타이머 리셋
    }
  }, [eyeClosedTime, heartRate]);

  // 졸음 횟수 올라갈 시 콘솔창에 졸음 횟수 표시
  useEffect(() => {
    if (sleepCount > 0) {
      console.log(`졸음 횟수: ${sleepCount}`);
    }
  }, [sleepCount]);

  // 로그인 상태 유지 및 사용자 정보 불러오기
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // 사용자가 로그인 상태일 때
        setUser(user);
        setIsLoggedIn(true);
        console.log('로그인 상태 유지됨:', user.email);

        // Firestore에서 사용자 데이터 가져오기
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
          const userData = userDoc.data();
          setUserName(userData.userName);  // Firestore에서 가져온 사용자명 설정
          setElapsedTime(userData.studyTime || 0);
          setSleepCount(userData.sleepCount || 0);
          console.log(`사용자 정보 동기화: ${userData.userName}`);
        } else {
          console.error('사용자 정보를 찾을 수 없습니다.');
        }

      } else {
        // 로그아웃 상태일 때
        setUser(null);
        setIsLoggedIn(false);
        console.log('로그아웃 상태');
      }
    });

    // 컴포넌트 언마운트 시 리스너 정리
    return () => unsubscribe();
  }, []);  // 빈 배열은 컴포넌트가 처음 렌더링될 때만 실행

  // 데이터베이스에서 사용자 데이터 동기화
  const syncUserData = async () => {
    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        setElapsedTime(userData.studyTime || 0);
        setSleepCount(userData.sleepCount || 0);
        setTimerTime(userData.studyTime || 0); // studyTime을 timerTime에 설정
        console.log(`사용자 이름: ${userData.userName}`);
        console.log(`사용자 졸음 횟수: ${userData.sleepCount}`);
        console.log(`사용자 공부 시간: ${userData.studyTime}`);
        await checkAndResetDailyTime(userData.studyTime);
      }
    } catch (error) {
      console.error('Failed to sync user data:', error);
    }
  };

  // 하루가 지나면 시간 초기화
  const checkAndResetDailyTime = async (dbStudyTime) => {
    const lastLoginDate = localStorage.getItem('lastLoginDate');
    const today = new Date().toISOString().split('T')[0];

    if (lastLoginDate !== today) {
      setElapsedTime(0);
      setSleepCount(0);
      setTimerTime(0); // timerTime 초기화
      localStorage.setItem('lastLoginDate', today);
      // 데이터베이스 시간 초기화
      if (user) {
        const userDoc = doc(db, 'users', user.uid);
        await updateDoc(userDoc, {
          studyTime: 0,
          sleepCount: 0,
        });
      }
    } else {
      // 하루가 지나지 않았으면 데이터베이스의 시간을 로컬 상태로 설정
      setElapsedTime(dbStudyTime);
      setTimerTime(dbStudyTime); // timerTime을 dbStudyTime으로 설정
    }
  };

  useEffect(() => {
    if (user) {
      checkAndResetDailyTime(elapsedTime);
    }
  }, [currentDate, user]);

  // 회원가입 페이지 보이기
  const toggleSignUp = () => {
    setShowSignUp(true);
    setCurrentPage('signup');
    setSidebarVisible(false);
  };

  const handleUserSignUp = (userData) => {
    setUser(userData);
    setShowSignUp(false);
    setCurrentPage('main');
  };

  // 로그아웃 로직에 데이터 저장 호출 추가
  const handleLogOut = async () => {
    if (user) {
      try {
        await saveDailyData();  // 로그아웃 시 일일 데이터 저장
        const userDoc = doc(db, "users", user.uid);
        await updateDoc(userDoc, {
          studyTime: timerTime, // 누적 공부 시간 저장
          sleepCount: sleepCount
        });
        await signOut(auth);
        console.log('로그아웃 성공');
        resetAppState();  // 상태 초기화
      } catch (error) {
        console.error('로그아웃 실패:', error);
      }
    }
    setIsLoggedIn(false);
    setUser(null);
    setElapsedTime(0);
    setSleepCount(0);
    setTimerTime(0);
    stopTimer();
  };

  // 현재 페이지 정보
  const navigateToMain = () => {
    setCurrentPage('main');
    setSidebarVisible(false);
  };

  // 타이머 시작
  const startTimer = () => {
    if (!timerRef.current) {
      timerRef.current = setInterval(() => {
        setTimerTime(prevTime => prevTime + 1);
      }, 1000);
    }
  };

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  // 타이머 일시정지
  const pauseTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  // 타이머 리셋
  const resetTimer = () => {
    pauseTimer();
    setTimerTime(0);
  };

  const connectStart = () => {
    setModelStatus('connecting');
    setIsStarted(true);

    if (videoRef.current) {
      navigator.mediaDevices.getUserMedia({ video: true })
        .then((stream) => {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
          setModelStatus('connected'); // 모델이 연결된 후 상태 변경
          startFrameProcessing(); // 프레임 처리 시작
        })
        .catch((err) => {
          console.error('웹캠 접근 실패: ', err);
          setIsStarted(false);
          setModelStatus('disconnected'); // 연결 실패 시 상태 변경
        });
    }
  };

  const startFrameProcessing = () => {
    if (!frameIntervalId) {
      const id = setInterval(processFrame, 1000); // 1초마다 프레임 처리
      setFrameIntervalId(id);
    }
  };

  const stopFrameProcessing = () => {
    if (frameIntervalId) {
      clearInterval(frameIntervalId);
      setFrameIntervalId(null);
    }
  };

  const processFrame = async () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    const frame = canvas.toDataURL('image/jpeg');

    try {
      const response = await fetch('https://stracker-36qhz3umla-du.a.run.app/predict', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ frame, heartRate }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.ear_label === "Closed") {
        setEyeClosedTime(prevTime => prevTime + 1);
        setEyeState('졸고 있음');
        setModelStatus('drowsy'); // 졸고 있을 경우 상태 변경
        stopTimer(); // 눈을 감고 있는 경우 타이머 멈춤
      } else if (data.ear_label === "얼굴이 없어요:(") {
        setEyeState('얼굴 인식 불가');
        setModelStatus('nonFace'); // 얼굴이 없을 경우 상태 변경
        stopTimer(); // 얼굴이 없는 경우 타이머 멈춤, 졸음 횟수 증가하지 않음
      } else {
        setEyeClosedTime(0); // 눈을 뜬 경우 타이머 리셋
        setEyeState('공부중...');
        setModelStatus('studying'); // 공부 중일 경우 상태 변경
        startTimer(); // 눈을 뜬 경우 타이머 시작
      }
    } catch (error) {
      console.error('Error fetching prediction:', error);
    }
  };

  const formatTime = (time) => {
    const getSeconds = `0${time % 60}`.slice(-2);
    const minutes = Math.floor(time / 60);
    const getMinutes = `0${minutes % 60}`.slice(-2);
    const getHours = `0${Math.floor(time / 3600)}`.slice(-2);
    return `${getHours}:${getMinutes}:${getSeconds}`;
  };

  //그래프 보이기 설정
  //사용자가 없을 경우 그래프 안띄움(못띄움)
  const goToGraph = () => {
    if (user) {
      setShowGraph(true); // user가 있을 때만 showGraph를 true로 설정
    } else {
      console.error("사용자 정보가 없습니다. 로그인 후 시도하세요.");
    }
  };

  const goBackToMain = () => {
    setShowGraph(false);
  }

  return (
    <div className="Main">
      {/* 그래프 true 상태로 바꾸기 */}
      {showGraph ? ( // showGraph가 true면 Graph.js 렌더링
        <Graph user={user} /> // Graph 컴포넌트에 user 전달
      ) : (
        currentPage === 'signup' ? (
          <SignUp 
            resetAppState={resetAppState}
            toggleSidebar={() => setSidebarVisible(!sideBarVisible)}
            sideBarVisible={sideBarVisible}
            navigateToMain={navigateToMain}
            toggleSignUp={toggleSignUp}
            setElapsedTime={setElapsedTime}
            setSleepCount={setSleepCount}
            setUser={setUser}
            setIsLoggedIn={setIsLoggedIn}
            resetAppStateWithSync={resetAppStateWithSync}
          />
        ) : (
          <>
            <div className="Background" />
            <img 
              className="Logo" 
              src={logo} 
              alt="Logo" 
              onClick={navigateToMain}
            />
            <div className="CameraScreen">
              <video ref={videoRef} className="videoInput" style={{ display: 'block' }} />
            </div>
            <img
              className="SideButton"
              src={SideButton}
              alt="SideButton"
              onClick={() => setSidebarVisible(!sideBarVisible)}
            />
            <Sidebar 
              sideBarVisible={sideBarVisible}
              toggleSidebar={() => setSidebarVisible(!sideBarVisible)}
              toggleSignUp={toggleSignUp}
              user={user}
              isLoggedIn={isLoggedIn}
              setIsLoggedIn={setIsLoggedIn}
              handleLogOut={handleLogOut}
              resetAppState={resetAppState}
              setHeartRate={setHeartRate}
              setElapsedTime={setElapsedTime} // elapsedTime 업데이트 함수 전달
              setSleepCount={setSleepCount}   // sleepCount 업데이트 함수 전달
              setUser={setUser}               // setUser 함수 전달
              elapsedTime={elapsedTime}       // elapsedTime 값 전달
              sleepCount={sleepCount}         // sleepCount 값 전달
              timerTime={timerTime}           // timerTime 전달
              setTimerTime={setTimerTime}     // timerTime 업데이트 함수 전달
              goToGraph={goToGraph}
              resetAppStateWithSync={resetAppStateWithSync}
              saveDailyData={saveDailyData}
            />
            <div className="Time">
              <div className="TimerDate">{currentDate}</div>
              <div className="TimerTime">{formatTime(timerTime)}</div>
            </div>
            <div className="State">
              <div className="StateBox" />
              <div className="StateText">{getStateText()}</div>
              <img 
                className="StatePicture" 
                src={getStatePicture()} 
                alt="StatePicture" 
              />
            </div>
            <div className="HeartRate">
              <div className="HeartRateTitleBox">
                <div className="HeartRateTitle">현재 심박수</div>
              </div>
              <img 
                className="HeartRatePicture" 
                src={HeartRatePicture} 
                alt="HeartRatePicture" 
              />
              <div className="HeartRateBpm"> {heartRate} BPM</div>
            </div>
            <div className="SleepCount">
              <div className="SleepCountTitleBox">
                <div 
                  className="SleepCountTitle"
                  src={sleepCount}
                  alt="sleepCount">졸음 횟수</div>
              </div>
              <img 
                className="SleepCountPicture" 
                src={SleepCountPicture} 
                alt="SleepCountPicture" 
              />
              <div className="SleepCountNumber"> {sleepCount} 번</div>
            </div>
            {/*버튼 실종시킴요
            <div 
              className="UnderPlayButton" 
              onClick={startTimer}>
              <img 
                className="UnderPlay" 
                src={UnderPlay} 
                alt="UnderPlay" 
              />
            </div>
            <div 
              className="UnderPauseButton" 
              onClick={pauseTimer}>
              <img 
                className="UnderPause" 
                src={UnderPause} 
                alt="UnderPause" 
              />
            </div>
            */}
            <div 
              className="UnderResetButton"
              onClick={() => {
                if (window.confirm("리셋하시겠습니까?")) {
                  resetTimer();
                }
              }}>
              <img 
                className="UnderReset" 
                src={UnderReset} 
                alt="UnderReset" 
              />
            </div>
            {!isStarted && (
              <div className="startButton" 
                onClick={connectStart}>
                <div className="StartText">시 작</div>
              </div>
            )}
          </>
        )
      )}
    </div>
  );
};
export default App;