from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import duckdb
from typing import Optional, List
from pydantic import BaseModel
import traceback
import time
from datetime import datetime

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