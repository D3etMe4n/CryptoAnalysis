import logo from './logo.svg';
import './App.css';
import React from 'react';
import LineChart from './components/LineChart';

function App() {
  return (
    <div style={{ width: '800px', margin: '0 auto' }}>
      <h1>My Chart Example</h1>
      <LineChart />
    </div>
  );
}

export default App;
