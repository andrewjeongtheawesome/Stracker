import React, { useState } from 'react';
import './Login.css';
import Signup from './Signup';
import logo from './_logo.png';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from './firebaseConfig';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

const Login = ({ 
  setUser, setIsLoggedIn, 
  setUserName, setElapsedTime, setSleepCount 
  //toggleSignUp, setHeartRate, elapsedTime, sleepCount, timerTime
}) => {
  const [userEmail, setUserEmail] = useState('');
  const [userPassword, setUserPassword] = useState('');
  const [isSigningUp, setIsSigningUp] = useState(false);

  const handleUserEmail = (event) => setUserEmail(event.target.value);
  const handleUserPassword = (event) => setUserPassword(event.target.value);

  // 로그인 처리
  const handleLogin = async () => {
    try {
      //const email = `${userEmail}`;
      const userCredential = await signInWithEmailAndPassword(auth, userEmail, userPassword);
      const userDoc = await getDoc(doc(db, "users", userCredential.user.uid));
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        setUserName(userData.userName);
        setElapsedTime(userData.studyTime);
        setSleepCount(userData.sleepCount);
        setUser(userCredential.user);
        setIsLoggedIn(true);
      } else {
        console.error('사용자 정보를 찾을 수 없습니다.');
      }
    } catch (error) {
      console.error('로그인 실패:', error);
      //alert('아이디 또는 비밀번호가 잘못되었습니다.');
    }
  };

    // 회원가입 버튼 클릭 시 호출
    const handleSignUpClick = () => {
      setIsSigningUp(true);  // 회원가입 모드로 전환
    };

    if (isSigningUp) {
      return <Signup 
      setIsSigningUp={setIsSigningUp} />;  // Signup 페이지 표시
    }

  return (
    <div className="Login">
       <div className="Background"/>
      <img className="Logo" 
      src={logo} 
      alt="Logo" />
      <div className="LoginTitleText">로그인</div>
      <div className="LoginTitleLine"></div>

      <input
        className="LogineMailBox"
        type="text"
        value={userEmail}
        onChange={handleUserEmail}
        placeholder=" Email"
      />
      <input
        className="LoginPasswordBox"
        type="password"
        value={userPassword}
        onChange={handleUserPassword}
        placeholder=" Password"
      />
      <div className="LoginBox" 
      onClick={handleLogin}>
        <div className="LoginText">로그인</div>
      </div>
      <div 
      className="UnderSignupHelper"
      onClick={handleSignUpClick}>회원가입
      <div className="UnderSignupHelperLine"></div>
      </div>
      <div className="UnderSignupHelperText">아직 계정이 없으신가요?</div>
    </div>
  );
};

export default Login;