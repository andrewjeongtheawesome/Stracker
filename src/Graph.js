import React, { useState, useEffect } from 'react';
import { Line } from 'react-chartjs-2';
import { getDocs, collection } from 'firebase/firestore';
import { db } from './firebaseConfig';
import { useNavigate } from 'react-router-dom'; // useNavigate 추가
import 'chart.js/auto';
import './App';
import './Graph.css';

const Graph = ({ user, goBackToMain }) => {
  const [data, setData] = useState([]);
  const [graphType, setGraphType] = useState('both');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const navigate = useNavigate(); // useNavigate 훅 사용

  useEffect(() => {
    if (user) {
      fetchGraphData();
    }
  }, [user, graphType, startDate, endDate]);

  const fetchGraphData = async () => {
    const snapshot = await getDocs(collection(db, `users/${user.uid}/dailyData`));
    const graphData = snapshot.docs
      .map((doc) => doc.data())
      .filter((doc) => {
        const docDate = new Date(doc.date);
        const start = new Date(startDate);
        const end = new Date(endDate);
        return docDate >= start && docDate <= end;
      });
    setData(graphData);
  };

  const chartData = {
    labels: data.map((d) => d.date),
    datasets: [
      {
        label: '공부 시간 (분)',
        data: graphType === 'study' || graphType === 'both' ? data.map((d) => d.studyTime) : [],
        borderColor: '#8B4513',
        backgroundColor: '#8B4513',
        fill: false,
        yAxisID: 'y-left', // 공부 시간은 왼쪽 Y축 사용
      },
      {
        label: '졸음 횟수',
        data: graphType === 'sleep' || graphType === 'both' ? data.map((d) => d.sleepCount) : [],
        borderColor: '#5D3A00',
        backgroundColor: '#5D3A00',
        fill: false,
        yAxisID: graphType === 'sleep' ? 'y-left' : 'y-right', // 졸음 횟수만 보기일 때 왼쪽 Y축 사용
      },
    ],
  };

  const options = {
    scales: {
      'y-left': {
        type: 'linear',
        position: 'left',
        ticks: {
          beginAtZero: true,
          min: 0, // 최소값을 0으로 설정
        },
        title: {
          display: true,
          text: graphType === 'sleep' ? '졸음 횟수' : '공부 시간 (분)', // 졸음 횟수 보기일 때 왼쪽 축에 졸음 횟수 표시
        },
        grid: {
          drawOnChartArea: true, // 졸음 횟수 보기일 때도 가로줄을 표시하도록 설정
        },
        display: true, // 졸음 횟수만 보기일 때 왼쪽 축 표시
      },
      'y-right': {
        type: 'linear',
        position: 'right',
        ticks: {
          beginAtZero: true,
          min: 0, // 둘 다 보기 시 최소값을 0으로 설정
        },
        title: {
          display: true,
          text: '졸음 횟수',
        },
        grid: {
          drawOnChartArea: false, // 오른쪽 축은 항상 그리드 라인 없음
        },
        display: graphType === 'both', // 둘 다 보기일 때만 오른쪽 축 표시
      },
    },
  };

  return (
    <div className="graphContainer">
      <h2>공부 시간 및 졸음 횟수 그래프</h2>
      <button onClick={() => navigate('/')}>홈으로 가기</button> {/* 페이지 이동을 위한 navigate 사용 */}
      <div>
        <label>
          <input
            type="radio"
            value="study"
            checked={graphType === 'study'}
            onChange={() => setGraphType('study')}
          />
          공부 시간만 보기
        </label>
        <label>
          <input
            type="radio"
            value="sleep"
            checked={graphType === 'sleep'}
            onChange={() => setGraphType('sleep')}
          />
          졸음 횟수만 보기
        </label>
        <label>
          <input
            type="radio"
            value="both"
            checked={graphType === 'both'}
            onChange={() => setGraphType('both')}
          />
          둘 다 보기
        </label>
      </div>
  
      <div>
        <label>시작 날짜: </label>
        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
        />
        <label>종료 날짜: </label>
        <input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
        />
      </div>
  
      <Line data={chartData} options={options} />
    </div>
  );
}

export default Graph;
