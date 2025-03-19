# CryptoAnalysis

  

A comprehensive Bitcoin data analysis platform with historical price visualizations and AI-powered market analysis.

  

## Project Overview

  

This project consists of three main components:

1.  **Java Data Downloader and Processor**: Downloads historical Bitcoin data from Binance and processes it into a DuckDB database

2.  **Python FastAPI Backend**: Serves processed cryptocurrency data and provides AI-powered market analysis

3.  **React Frontend**: Visualizes Bitcoin price data with interactive charts and displays AI-generated market insights

  

## 1. Setting Up and Running the Java Component

  

The Java component is responsible for downloading historical data from Binance and creating a DuckDB database.

  

### Prerequisites

- Java 11 or higher

- Maven

  

### Building the Project

```bash

# Navigate to the project root directory

cd  CryptoAnalysis

  

# Build the project with Maven

mvn  clean  install

```

  

### Running the Data Downloader

```bash

# Run the main Java application

mvn compile exec:java
```

  

This will:

1. Download Bitcoin price data from Binance

2. Process the CSV files

3. Store the data in the DuckDB database at binancedata.db

  

## 2. Setting Up and Running the Backend

  

The backend is built with FastAPI and provides APIs for retrieving Bitcoin price data and generating AI market analysis.

  

### Prerequisites

- Python 3.9+

- CUDA-capable GPU (recommended for faster AI analysis)

  

### Setting Up the Python Environment

```bash

# Navigate to the backend directory

cd  CryptoAnalysis/backend

  

# Create a virtual environment (optional but recommended)

python  -m  venv  venv

source  venv/bin/activate  # On Windows: venv\Scripts\activate

  

# Install dependencies with PyTorch CUDA support

pip  install  fastapi  uvicorn  duckdb  pandas  numpy pydantic 

pip  install  torch  torchvision  torchaudio  --index-url  https://download.pytorch.org/whl/cu118

pip  install  transformers

```

  

### Running the Backend Server

```bash

# Navigate to the backend directory

cd  CryptoAnalysis/backend

  

# Start the FastAPI server

uvicorn  main:app  --host  0.0.0.0  --port  8000

```

  

The backend server will now be running at http://localhost:8000.

  

### Available API Endpoints

-  `GET /binance_data/`: Retrieve historical price data

-  `GET /price_summary`: Get price summary statistics

-  `POST /crypto_analysis/`: Generate AI-powered market analysis

-  `GET /health`: Server health check

  

## 3. Setting Up and Running the Frontend

  

The frontend is built with React and provides interactive charts and AI analysis visualization.

  

### Prerequisites

- Node.js 22.14+

- npm

  

### Setting Up the Frontend

```bash

# Navigate to the React app directory

cd  CryptoAnalysis/my-chart-app

  

# Install dependencies

npm  install

```

  

### Running the Frontend Development Server

```bash

# Navigate to the React app directory

cd  CryptoAnalysis/my-chart-app

  

# Start the development server

npm  start

```

  

The frontend application will now be running at http://localhost:3000.

  

## Project Structure

  

```

CryptoAnalysis/

├── backend/ # Python FastAPI backend

│ └── main.py # Main backend application file

├── duckdb/ # DuckDB database storage

│ └── binancedata.db # Bitcoin price database

├── my-chart-app/ # React frontend application

│ ├── public/ # Public assets

│ └── src/ # React source code

│ ├── components/ # React components

│ └── App.js # Main React application

├── src/ # Java source code

│ ├── main/

│ │ └── java/

│ │ ├── Main.java # Entry point

│ │ ├── BinanceDataDownloader.java # Data downloader

│ │ └── SparkPreprocessor.java # Data processor

│ └── test/

└── pom.xml # Maven configuration

```

  

## Features

  

- Historical Bitcoin price data downloading and processing

- Interactive line and candlestick charts with time range selection

- AI-powered market analysis with:

- Market overview and trend analysis

- Technical indicators analysis

- Risk assessment

- Price predictions

- Trading recommendations

  

## Troubleshooting

  

### Java Application

- Ensure Java 11 is installed: `java -version`

- Verify Maven is installed: `mvn -version`

- Check if the DuckDB directory exists and is writable

  

### Backend

- Ensure PyTorch with CUDA support is installed correctly: `python -c "import torch; print(torch.cuda.is_available())"`

- Verify DuckDB database exists at the expected location

- Check backend logs for specific error messages

  

### Frontend

- Ensure correct Node.js version: `node -v`

- Verify backend server is running and accessible

- Check browser console for any error messages


## Important Disclaimer

**This project is for educational and entertainment purposes only.** 

The CryptoAnalysis platform is a demonstration project that should not be used for making actual investment decisions. The analyses, predictions, and recommendations generated by the AI model are experimental and do not constitute financial advice.

- This tool is created purely for fun and learning
- We are NOT financial advisors
- We accept NO responsibility for any investment decisions made based on this tool
- Cryptocurrency markets are highly volatile and risky
- Always consult with a qualified financial professional before making investment decisions

By using this application, you acknowledge that you understand these risks and limitations.