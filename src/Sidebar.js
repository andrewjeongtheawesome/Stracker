import React, { useState, useEffect } from 'react';
import './Sidebar.css';
import SideButton from './_SideButton.png';
import OutPictureX from './_OutPictureX.png';
import LogOutPicture from './_LogOutPicture.png';
import BluetoothPicture from './_BluetoothPicture.png';
import LoginCharacter from './_LoginCharacter.png';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged} from 'firebase/auth';
import { auth, db } from './firebaseConfig';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

const Sidebar = ({
  sideBarVisible, toggleSidebar, toggleSignUp, user, isLoggedIn, 
  setIsLoggedIn, setElapsedTime, setSleepCount, setHeartRate, 
  setUser, elapsedTime, sleepCount, timerTime, resetAppStateWithSync 
  ,resetAppState
}) => {
  const [userId, setUserId] = useState('');
  const [userPassword, setUserPassword] = useState('');
  const [userName, setUserName] = useState('');

  const handleUserId = (event) => setUserId(event.target.value);
  const handleUserPassword = (event) => setUserPassword(event.target.value);  // Firebase Auth의 로그인 상태를 추적하는 useEffect 추가
  
  // Firebase Auth의 로그인 상태를 추적하는 useEffect 추가
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setIsLoggedIn(true);
        setUser(user);

        // Firestore에서 사용자 데이터 가져오기
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
          const userData = userDoc.data();
          setUserName(userData.userName);  // Firestore에서 가져온 사용자명 설정
        } else {
          console.error('사용자 정보를 찾을 수 없습니다.');
        }
      } else {
        setIsLoggedIn(false);
        setUserName('사용자');  // 로그아웃 시 기본값 설정
      }
    });

    return () => unsubscribe();  // 컴포넌트 언마운트 시 리스너 해제
  }, []);

  // 로그인 로직
const handleLogin = async () => {
  try {
    const email = `${userId}`;  // 사용자 이메일 생성
    const userCredential = await signInWithEmailAndPassword(auth, email, userPassword);  // 로그인
    const user = userCredential.user;

    // Firestore에서 사용자 데이터 가져오기
    const userDoc = await getDoc(doc(db, "users", user.uid));

    if (userDoc.exists()) {
      const userData = userDoc.data();
      
      // Firestore에서 가져온 데이터로 상태 업데이트
      setUserName(userData.userName);
      setElapsedTime(userData.studyTime);
      setSleepCount(userData.sleepCount);
      setUser(user);
      setIsLoggedIn(true);
      console.log(`로그인 성공: 사용자 이름: ${userData.userName}, 졸음 횟수: ${userData.sleepCount}, 공부 시간: ${userData.studyTime}`);

      // Firestore에서 데이터를 가져온 후 상태 동기화
      await resetAppStateWithSync(user.uid);
    } else {
      console.error('사용자 정보를 찾을 수 없습니다.');
    }
  } catch (error) {
    console.error('로그인 실패:', error);
    alert('아이디 또는 비밀번호가 잘못되었습니다.');
  }
};

// 로그아웃 함수
const handleLogOut = async () => {
  if (user) {
    try {
      const userDoc = doc(db, "users", user.uid);

      // Firestore에 학습 시간 및 졸음 횟수 업데이트
      await updateDoc(userDoc, {
        studyTime: timerTime,   // 타이머 시간 저장
        sleepCount: sleepCount  // 졸음 횟수 저장
      });

      // Firebase 로그아웃
      await signOut(auth);
      console.log('로그아웃 성공');

      // 상태 초기화 - 로그아웃 후 resetAppState 호출
      resetAppState();  // 상태 초기화

    } catch (error) {
      console.error('로그아웃 실패:', error);
    }
  }

  // 로그아웃 후 상태 리셋
  setIsLoggedIn(false);
  setUser(null);
  setElapsedTime(0);  // 타이머 시간 리셋
  setSleepCount(0);   // 졸음 횟수 리셋
};


  // Bluetooth 연결 함수
  const connectBluetooth = async () => {
    try {
      const device = await navigator.bluetooth.requestDevice({
        filters: [{ services: ['heart_rate'] }],
      });

      const server = await device.gatt.connect();
      const service = await server.getPrimaryService('heart_rate');
      const characteristic = await service.getCharacteristic('heart_rate_measurement');

      characteristic.startNotifications();
      characteristic.addEventListener('characteristicvaluechanged', handleHeartRateMeasurement);

      console.log('Bluetooth device connected');
    } catch (error) {
      console.error('Error connecting to Bluetooth device:', error);
    }
  };

  const handleHeartRateMeasurement = (event) => {
    const value = event.target.value;
    const heartRate = value.getUint8(1);
    setHeartRate(heartRate);
  };

  // LogOut 연결 시도 함수
  const connectLogOut = () => {
    handleLogOut();
  };

  // 회원가입 버튼 클릭 시 호출
  const handleSignUpClick = () => {
    toggleSignUp();
    toggleSidebar(); // 사이드바 닫기
  };

  return (
    <>
      {sideBarVisible && (
        <div className="Side">
          <img 
            className="SideButton" 
            src={SideButton} 
            alt="SideButton" 
            onClick={toggleSidebar} 
          />
          {isLoggedIn ? (
            <>
              <img 
                className="OutPictureX" 
                src={OutPictureX} 
                alt="OutPictureX" 
                onClick={toggleSidebar} 
              />
              <img 
                className="LoginCharacter" 
                src={LoginCharacter} 
                alt="LoginCharacter" 
              />
              <div className="WelcomeMessageUsername">
                {userName}
              </div>
              <div className="WelcomeMessage1">
                님
              </div>
              <div className="WelcomeMessage2">
                환영합니다.
              </div>
              <div className="LoginText1">
                  “성공은 열심히 노력하며
              </div>
              <div className="LoginText2">
                기다리는 사람에게 찾아온다.”
              </div>
              <img
                className="BluetoothPicture"
                src={BluetoothPicture}
                alt="BluetoothPicture"
                onClick={connectBluetooth}
              />
              <img
                className="LogOutPicture"
                src={LogOutPicture}
                alt="LogOutPicture"
                onClick={handleLogOut}
              />
            </>
          ) : (
            <>
              <div 
                className="SingUpText" 
                onClick={handleSignUpClick}>회원가입
              </div>
              <img 
              className="OutPictureX" 
              src={OutPictureX} 
              alt="OutPictureX" 
              onClick={toggleSidebar} />
              <input
                className="Idbox"
                type="text"
                value={userId}
                onChange={handleUserId}
                placeholder=" Email"
              />
              <input
                className="Passwordbox"
                type="password"
                value={userPassword}
                onChange={handleUserPassword}
                placeholder=" Password"
              />
              
              <div className="Loginbox" onClick={handleLogin}>
                <div className="LoginText">로그인</div>
              </div>
              <img
                className="BluetoothPicture"
                src={BluetoothPicture}
                alt="BluetoothPicture"
                onClick={connectBluetooth}
              />
              <img
                className="LogOutPicture"
                src={LogOutPicture}
                alt="LogOutPicture"
                onClick={connectLogOut}
              />
            </>
          )}
        </div>
      )}
    </>
  );
};

export default Sidebar;
