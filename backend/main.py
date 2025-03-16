from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
import duckdb
from typing import Optional, List
import traceback
import time
from datetime import datetime
from pydantic import BaseModel
from datetime import datetime, timedelta
import torch
from transformers import AutoTokenizer, AutoModelForCausalLM, AutoModelForSeq2SeqLM
import pandas as pd
import numpy as np
import gc

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_db_connection():
    """Establishes and returns a DuckDB connection."""
    try:
        conn = duckdb.connect('../duckdb/binancedata.db', read_only=True)
        return conn
    except Exception as e:
        print(f"Database connection error: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Database connection error: {e}")

class BinanceData(BaseModel):
    open_time: str
    open_price: float
    high: float
    low: float
    close: float
    volume: float
    close_time: str
    quote_asset_volume: float
    ntrades: int
    taker_buy_base_asset_volume: float
    taker_buy_quote_asset_volume: float
    ignore: Optional[int] = None

@app.get("/binance_data/", response_model=List[BinanceData])
async def read_binance_data(
    start_time: Optional[int] = None,
    end_time: Optional[int] = None,
    limit: int = 10000,
    offset: int = 0
):
    """
    Retrieves Binance kline data from the DuckDB database.
    Optimized for chart rendering with efficient time filtering.
    """
    start = time.time()
    conn = get_db_connection()
    try:
        # Set a default end time to current time
        if end_time is None:
            end_time = int(time.time() * 1000)  # Current time in ms
            
        # Make sure end_time is not in the future
        current_time = int(time.time() * 1000)
        if end_time > current_time:
            end_time = current_time
            
        # For "all" time range, ensure we get earliest data
        if start_time is not None and start_time < 1000000000000:  # Very old timestamp likely an error
            # Set to Bitcoin's genesis approximate time
            start_time = int(datetime(2017, 1, 1).timestamp() * 1000)
            
        # Print the actual datetime for debugging
        print(f"Processed request with start_time: {datetime.fromtimestamp(start_time/1000).isoformat() if start_time else 'None'}")
        print(f"Processed request with end_time: {datetime.fromtimestamp(end_time/1000).isoformat() if end_time else 'None'}")
        
        # Optimized query with index hints and reduced columns when possible
        query = """
        SELECT 
            open_time,
            open_price,
            high,
            low,
            close,
            volume,
            close_time,
            quote_asset_volume,
            ntrades,
            taker_buy_base_asset_volume,
            taker_buy_quote_asset_volume,
            ignore
        FROM BinanceData
        """
        conditions = []

        if start_time is not None:
            conditions.append(f"open_time >= {start_time}")
        
        if end_time is not None:
            conditions.append(f"open_time <= {end_time}")

        if conditions:
            query += " WHERE " + " AND ".join(conditions)

        # Add dynamic resampling based on time range to reduce data points for large ranges
        if start_time is not None and end_time is not None:
            range_size = end_time - start_time
            print(f"Range size: {range_size / (24 * 60 * 60 * 1000):.2f} days")
            
            # For very large ranges, consider resampling/aggregating data
            if range_size > 90 * 24 * 60 * 60 * 1000:  # More than 90 days
                print("Using resampled data for large time range")
                # Create a temp view with resampled data for large ranges
                if range_size > 365 * 24 * 60 * 60 * 1000:  # More than 1 year
                    interval = '1 day'
                elif range_size > 90 * 24 * 60 * 60 * 1000:  # More than 90 days
                    interval = '4 hours'
                else:
                    interval = '1 hour'
                
                try:
                    conn.execute(f"""
                    CREATE OR REPLACE TEMP VIEW resampled_data AS
                    SELECT 
                        MIN(open_time) AS open_time,
                        FIRST(open_price) AS open_price,
                        MAX(high) AS high,
                        MIN(low) AS low,
                        LAST(close) AS close,
                        SUM(volume) AS volume,
                        MAX(close_time) AS close_time,
                        SUM(quote_asset_volume) AS quote_asset_volume,
                        SUM(ntrades) AS ntrades,
                        SUM(taker_buy_base_asset_volume) AS taker_buy_base_asset_volume,
                        SUM(taker_buy_quote_asset_volume) AS taker_buy_quote_asset_volume,
                        NULL AS ignore
                    FROM BinanceData
                    WHERE {" AND ".join(conditions)}
                    GROUP BY time_bucket(INTERVAL '{interval}', to_timestamp(open_time/1000))
                    ORDER BY open_time
                    """)
                    
                    query = """
                    SELECT 
                        open_time,
                        open_price,
                        high,
                        low,
                        close,
                        volume,
                        close_time,
                        quote_asset_volume,
                        ntrades,
                        taker_buy_base_asset_volume,
                        taker_buy_quote_asset_volume,
                        ignore
                    FROM resampled_data
                    """
                except Exception as e:
                    print(f"Error in resampling: {e}")
                    # Fall back to non-resampled query if resampling fails
                    pass

        query += f" ORDER BY open_time LIMIT {limit} OFFSET {offset}"
        
        # Print query for debugging
        print(f"Executing query: {query}")

        df = conn.execute(query).fetchdf()
        
        # Convert timestamps to ISO format strings after fetching data
        if not df.empty:
            df['open_time'] = df['open_time'].apply(lambda x: datetime.fromtimestamp(x/1000).isoformat())
            df['close_time'] = df['close_time'].apply(lambda x: datetime.fromtimestamp(x/1000).isoformat())
        
        results = [BinanceData(**item) for item in df.to_dict(orient="records")]
        end = time.time()
        
        if len(results) > 0:
            print(f"First record date: {results[0].open_time}")
            print(f"Last record date: {results[-1].open_time}")
            
        print(f"Query executed in {end-start:.2f} seconds, returned {len(results)} records")
        return results

    except Exception as e:
        print(f"Error in read_binance_data: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@app.get("/binance_data/{open_time}", response_model=BinanceData)
async def read_single_binance_record(open_time: int):
    """Retrieves a single Binance data record by open_time."""
    conn = get_db_connection()
    try:
        query = f"""
        SELECT 
            open_time,
            open_price,
            high,
            low,
            close,
            volume,
            close_time,
            quote_asset_volume,
            ntrades,
            taker_buy_base_asset_volume,
            taker_buy_quote_asset_volume,
            ignore
        FROM BinanceData
        WHERE open_time = {open_time}
        """
        df = conn.execute(query).fetchdf()

        if df.empty:
            raise HTTPException(status_code=404, detail="Record not found")

        # Convert timestamps to ISO format strings
        df['open_time'] = df['open_time'].apply(lambda x: datetime.fromtimestamp(x/1000).isoformat())
        df['close_time'] = df['close_time'].apply(lambda x: datetime.fromtimestamp(x/1000).isoformat())

        return BinanceData(**df.iloc[0].to_dict())

    except Exception as e:
        print(f"Error in read_single_binance_record: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@app.get("/health")
async def health_check():
    """Simple health check endpoint."""
    return {"status": "OK"}

@app.get("/price_summary")
async def price_summary(timeframe: str = "7d"):
    """Get price summary statistics for a specified timeframe."""
    conn = get_db_connection()
    try:
        now = int(time.time() * 1000)
        
        # Determine start time based on timeframe
        if timeframe == "1d":
            start_time = now - 24 * 60 * 60 * 1000
        elif timeframe == "7d":
            start_time = now - 7 * 24 * 60 * 60 * 1000
        elif timeframe == "1m":
            start_time = now - 30 * 24 * 60 * 60 * 1000
        elif timeframe == "3m":
            start_time = now - 90 * 24 * 60 * 60 * 1000
        elif timeframe == "all":
            # Use a timestamp from 2017 for "all" data
            start_time = int(datetime(2017, 1, 1).timestamp() * 1000)
        else:
            start_time = now - 24 * 60 * 60 * 1000
        
        print(f"Price summary from {datetime.fromtimestamp(start_time/1000).isoformat()} to {datetime.fromtimestamp(now/1000).isoformat()}")
            
        query = f"""
        SELECT 
            MIN(low) AS min_price,
            MAX(high) AS max_price,
            FIRST(open_price) AS first_price,
            LAST(close) AS last_price,
            SUM(volume) AS total_volume,
            COUNT(*) AS data_points
        FROM BinanceData
        WHERE open_time >= {start_time} AND open_time <= {now}
        """
        
        result = conn.execute(query).fetchone()
        
        if result and result[0] is not None:
            first_price = float(result[2])
            last_price = float(result[3])
            price_change = last_price - first_price
            price_change_percent = (price_change / first_price * 100) if first_price != 0 else 0
            
            return {
                "min_price": float(result[0]),
                "max_price": float(result[1]),
                "first_price": first_price,
                "last_price": last_price,
                "price_change": price_change,
                "price_change_percent": price_change_percent,
                "total_volume": float(result[4]),
                "data_points": int(result[5]),
                "timeframe": timeframe
            }
        else:
            raise HTTPException(status_code=404, detail="No data available for selected timeframe")
        
    except Exception as e:
        print(f"Error in price_summary: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

class AnalysisRequest(BaseModel):
    timeframe: str = "7d"  # Default to 7 days
    end_date: Optional[str] = None
    
class AnalysisResponse(BaseModel):
    analysis: str
    timeframe: str
    generated_at: str
    execution_time: float

@app.post("/crypto_analysis/", response_model=AnalysisResponse)
async def generate_crypto_analysis(request: AnalysisRequest, background_tasks: BackgroundTasks):
    """Generate AI analysis of crypto data for specified timeframe"""
    start_time = time.time()
    
        # Use provided end date or default to Dec 31, 2024
        
    try:
        if request.end_date:
            try:
                end_date_obj = datetime.fromisoformat(request.end_date.replace('Z', '+00:00'))
                endDate = int(end_date_obj.timestamp() * 1000)
            except ValueError:
                # If invalid date format, use default
                endDate = int(datetime(2024, 12, 31, 23, 59, 59).timestamp() * 1000)
        else:
            endDate = int(datetime(2024, 12, 31, 23, 59, 59).timestamp() * 1000)
        # Use the same fixed date approach that works in the charts
        startDate = int(datetime(2017, 1, 1).timestamp() * 1000)
        
        if request.timeframe == "1d":
            start_time_ms = endDate - 24 * 60 * 60 * 1000
            period_desc = "last 24 hours"
        elif request.timeframe == "3d":
            start_time_ms = endDate - 3 * 24 * 60 * 60 * 1000
            period_desc = "last 3 days"
        elif request.timeframe == "7d":
            start_time_ms = endDate - 7 * 24 * 60 * 60 * 1000
            period_desc = "last 7 days"
        else:
            # Default to 24 hours if invalid timeframe
            start_time_ms = endDate - 24 * 60 * 60 * 1000
            period_desc = "last 24 hours"
            request.timeframe = "1d"
        
        # Query data from DuckDB with the fixed date approach
        conn = get_db_connection()
        
        query = f"""
        SELECT 
            open_time,
            open_price,
            high,
            low,
            close,
            volume
        FROM BinanceData
        WHERE open_time >= {start_time_ms} AND open_time <= {endDate}
        ORDER BY open_time
        """
        
        print(f"Executing query for AI analysis: {query}")
        df = conn.execute(query).fetchdf()
        conn.close()
        
        if df.empty:
            raise HTTPException(status_code=404, detail="No data available for selected timeframe")
        
        # Convert timestamps to datetime
        df['open_time'] = df['open_time'].apply(lambda x: datetime.fromtimestamp(x/1000))
        
        # Prepare data for AI analysis
        df['return'] = df['close'].pct_change()
        
        # Check if we have enough data
        if len(df) < 10:
            raise HTTPException(status_code=400, detail="Insufficient data for meaningful analysis")
        
        # Generate AI analysis
        analysis = run_ai_model(df, period_desc)
        
        # Add cleanup task to run in background after response is sent
        background_tasks.add_task(cleanup_gpu_memory)
        
        end_time = time.time()
        execution_time = end_time - start_time
        
        return {
            "analysis": analysis,
            "timeframe": request.timeframe,
            "generated_at": datetime.now().isoformat(),
            "execution_time": execution_time
        }
        
    except Exception as e:
        print(f"Error in generate_crypto_analysis: {e}")
        traceback.print_exc()
        # Ensure cleanup happens even if there's an error
        cleanup_gpu_memory()
        raise HTTPException(status_code=500, detail=str(e))

def run_ai_model(df, period_desc):
    """Run the AI model on the provided data and return analysis"""
    try:
        # Clear any existing GPU memory
        torch.cuda.empty_cache()
        
        # Check if CUDA is available
        device = torch.device("cuda:0" if torch.cuda.is_available() else "cpu")
        print(f"Using device: {device}")
        
        # Load model and tokenizer
        tokenizer = AutoTokenizer.from_pretrained("google/flan-t5-large")
        model = AutoModelForSeq2SeqLM.from_pretrained(
            "google/flan-t5-large",
            trust_remote_code=True,
            torch_dtype=torch.float16
        ).to(device)
        
        # Prepare the summary statistics
        stats = {
            "start_price": df['open_price'].iloc[0],
            "end_price": df['close'].iloc[-1],
            "price_change": df['close'].iloc[-1] - df['open_price'].iloc[0],
            "price_change_pct": (df['close'].iloc[-1] / df['open_price'].iloc[0] - 1) * 100,
            "max_price": df['high'].max(),
            "min_price": df['low'].min(),
            "avg_price": df['close'].mean(),
            "volatility": df['return'].std() * 100,  # Standard deviation of returns as percentage
            "total_volume": df['volume'].sum(),
            "avg_volume": df['volume'].mean()
        }
        
        # Create prompt with data summary rather than raw data to save tokens
        instruction_prompt = f"""
        You are a senior financial analyst specializing in cryptocurrency markets. Analyze the following Bitcoin trading data for the {period_desc} and provide a comprehensive professional analysis of the market trends, risks, and price predictions. Your response should be structured as follows:

        1. **Market Overview**:
           - Summarize the overall trend observed in the provided data.
           - Highlight any significant price movements, volatility patterns, or anomalies.

        2. **Technical Analysis**:
           - Identify key technical indicators based on the data.
           - Discuss support and resistance levels.
           - Assess whether the current trend suggests bullish, bearish, or neutral momentum.

        3. **Risk Assessment**:
           - Evaluate potential risks in the market based on the data.
           - Consider factors such as volatility and liquidity.
           - Provide a risk rating (Low, Medium, High) with justification.

        4. **Price Prediction**:
           - Based on the observed trends, predict the short-term price movements.
           - Include confidence levels for your predictions.

        5. **Trading Recommendations**:
           - Suggest actionable trading strategies (e.g., buy/sell signals, stop-loss levels).
           - Justify your recommendations with data-driven reasoning.
           
        6. **Conclusion**:
           - Summarize your findings in a concise paragraph.

        Data Summary for Analysis:
        - Time Period: {df['open_time'].min().strftime('%Y-%m-%d %H:%M')} to {df['open_time'].max().strftime('%Y-%m-%d %H:%M')}
        - Starting Price: ${stats['start_price']:.2f}
        - Ending Price: ${stats['end_price']:.2f}
        - Price Change: ${stats['price_change']:.2f} ({stats['price_change_pct']:.2f}%)
        - Highest Price: ${stats['max_price']:.2f}
        - Lowest Price: ${stats['min_price']:.2f}
        - Average Price: ${stats['avg_price']:.2f}
        - Volatility (Std Dev of Returns): {stats['volatility']:.2f}%
        - Total Trading Volume: {stats['total_volume']:.2f}
        - Average Daily Volume: {stats['avg_volume']:.2f}

        Provide your analysis in a professional tone, suitable for investors and traders. Ensure all insights are data-driven.
        """
        
        # Tokenize the input
        inputs = tokenizer(instruction_prompt, return_tensors="pt", max_length=1024, truncation=True).to(device)
        
        # Generate the output
        with torch.no_grad():
            outputs = model.generate(
                inputs["input_ids"],
                max_length=4096,  
                min_length=1024,
                num_beams=5,
                temperature=0.7,
                no_repeat_ngram_size=3,
                early_stopping=True,
                repetition_penalty=1.2
            )
        
        # Decode the output and remove the input prompt
        response = tokenizer.decode(outputs[0], skip_special_tokens=True)
        
        # Clean up the response to remove the prompt
        if "Data Summary for Analysis:" in response:
            response = response.split("Data Summary for Analysis:")[1]
            # Find the actual start of the analysis after the stats
            analysis_markers = ["Market Overview", "1.", "Analysis:", "Based on"]
            for marker in analysis_markers:
                if marker in response:
                    response = response[response.find(marker):]
                    break
        
        return response.strip()
        
    except Exception as e:
        print(f"Error running AI model: {e}")
        traceback.print_exc()
        return f"An error occurred while generating the analysis: {str(e)}"
    finally:
        # Clean up resources
        if 'model' in locals():
            del model
        if 'tokenizer' in locals():
            del tokenizer
        torch.cuda.empty_cache()

def cleanup_gpu_memory():
    """Clean up GPU memory after model usage"""
    print("Cleaning up GPU memory...")
    gc.collect()
    if torch.cuda.is_available():
        torch.cuda.empty_cache()
        print(f"GPU memory after cleanup: {torch.cuda.memory_allocated(0) / 1024 ** 2:.2f} MB")