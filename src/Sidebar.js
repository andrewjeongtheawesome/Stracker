import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import './Sidebar.css';
import './App';
import Graph from './Graph';
import SideButton from './_SideButton.png';
import OutPictureX from './_OutPictureX.png';
import Line from './_Line.png';
import LogOutPicture from './_LogOutPicture.png';
import BluetoothPicture from './_BluetoothPicture.png';
import LoginCharacter from './_LoginCharacter.png';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { auth, db } from './firebaseConfig';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

const Sidebar = ({
  sideBarVisible, toggleSidebar, toggleSignUp, user, isLoggedIn,
  setIsLoggedIn, setElapsedTime, setSleepCount, setHeartRate,
  setUser, elapsedTime, sleepCount, timerTime, resetAppStateWithSync,
  resetAppState, saveDailyData, goToGraph
}) => {
  const [userId, setUserId] = useState('');
  const [userPassword, setUserPassword] = useState('');
  const [userName, setUserName] = useState('');
  //const [showGraph, setShowGraph] = useState(false); // State for graph visibility
  const navigate = useNavigate();

  const handleUserId = (event) => setUserId(event.target.value);
  const handleUserPassword = (event) => setUserPassword(event.target.value);

  // Firebase Auth 상태 추적
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
          const userData = userDoc.data();
          setUserName(userData.userName);
        } else {
          console.error('사용자 정보를 찾을 수 없습니다.');
        }
      } else {
        setUserName('사용자');
      }
    });

    return () => unsubscribe();
  }, []);

  // 로그인 처리
  const handleLogin = async () => {
    try {
      const email = `${userId}`;
      const userCredential = await signInWithEmailAndPassword(auth, email, userPassword);
      const user = userCredential.user;

      const userDoc = await getDoc(doc(db, "users", user.uid));

      if (userDoc.exists()) {
        const userData = userDoc.data();
        setUserName(userData.userName);
        setElapsedTime(userData.studyTime);
        setSleepCount(userData.sleepCount);
        setUser(user);
        setIsLoggedIn(true);

        // 상태 동기화
        await resetAppStateWithSync(user.uid);
      } else {
        console.error('사용자 정보를 찾을 수 없습니다.');
      }
    } catch (error) {
      console.error('로그인 실패:', error);
      alert('아이디 또는 비밀번호가 잘못되었습니다.');
    }
  };

  // 로그아웃 처리
  const handleLogOut = async () => {
    if (user) {
      try {
        await saveDailyData();
        const userDoc = doc(db, "users", user.uid);
        await updateDoc(userDoc, {
          studyTime: timerTime,
          sleepCount: sleepCount
        });
        await signOut(auth);
        console.log('로그아웃 성공');
        resetAppState();
      } catch (error) {
        console.error('로그아웃 실패:', error);
      }
    }
    setIsLoggedIn(false);
    setUser(null);
    setElapsedTime(0);
    setSleepCount(0);
  };

  // Bluetooth 연결
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

  // 그래프 보기
  // const handleGraphButtonClick = () => {
  //   if (user) {
  //     setShowGraph(true);
  //   } else {
  //     console.error("사용자 정보가 없습니다. 로그인 후 시도하세요.");
  //   }
  // };
  // 함수의 중복 선언 조심하기

  // 회원가입 화면 전환
  const handleSignUpClick = () => {
    toggleSignUp();
    toggleSidebar();
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
              <div className="WelcomeMessageUsername">{userName}</div>
              <div className="WelcomeMessage1">님</div>
              <div className="WelcomeMessage2">환영합니다.</div>
              <div className="LoginText1">“성공은 열심히 노력하며</div>
              <div className="LoginText2">기다리는 사람에게 찾아온다.”</div>
              <img 
              className="Line"
              src={Line}
              alt="Line"/>
              <div className="GraphButton" onClick={goToGraph}> {/* 페이지 이동 */}
                공부기록 보기
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
              <div className="SingUpText" onClick={handleSignUpClick}>회원가입</div>
              <img
                className="OutPictureX"
                src={OutPictureX}
                alt="OutPictureX"
                onClick={toggleSidebar}
              />
              <input
                className="Idbox"
                type="text"
                value={userId}
                onChange={handleUserId}
                placeholder="Email"
              />
              <input
                className="Passwordbox"
                type="password"
                value={userPassword}
                onChange={handleUserPassword}
                placeholder="Password"
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
                onClick={handleLogOut}
              />
            </>
          )}
        </div>
      )}
    </>
  );
};

export default Sidebar;
