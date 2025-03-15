import React from 'react';
import LineChart from './components/LineChart';
import CandlestickChart from './components/CandlestickChart';
import './App.css';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <h1>Crypto Analysis Dashboard</h1>
      </header>
      <main className="App-content">
        <div className="chart-container">
          <LineChart />
        </div>
        <div className="chart-container">
          <CandlestickChart />
        </div>
      </main>
    </div>
  );
}

export default App;