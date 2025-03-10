from fastapi import FastAPI, HTTPException
import duckdb
import pandas as pd
from typing import Optional, List
from pydantic import BaseModel, Field


app = FastAPI()

# --- Database Connection (Important: Handle Properly) ---

def get_db_connection():
    """Establishes and returns a DuckDB connection."""
    try:
        conn = duckdb.connect('duckdb/binancedata.db', read_only=True)  # Make read-only if appropriate
        return conn
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database connection error: {e}")

# --- Data Models (Pydantic) ---
class BinanceData(BaseModel):
     open_time: int
     open_price: float
     high: float
     low: float
     close: float
     volume: float
     close_time: int
     quote_asset_volume: float
     ntrades: int
     taker_buy_base_asset_volume: float
     taker_buy_quote_asset_volume: float
     ignore: Optional[int] = None  # Make 'ignore' optional


# --- API Endpoints ---

@app.get("/binance_data/", response_model=List[BinanceData])
async def read_binance_data(
    start_time: Optional[int] = None,
    end_time: Optional[int] = None,
    limit: int = 100,  # Default limit to 100 records
    offset: int = 0    # Pagination offset
):
    """
    Retrieves Binance kline data from the DuckDB database.

    Args:
        start_time (Optional[int]):  Start timestamp (open_time).
        end_time (Optional[int]):    End timestamp (open_time).
        limit (int):                 Maximum number of records to return.
        offset (int):                Offset for pagination.
    """
    conn = get_db_connection()
    try:
        query = "SELECT * FROM BinanceData"
        conditions = []

        if start_time is not None:
            conditions.append(f"open_time >= {start_time}")
        if end_time is not None:
            conditions.append(f"open_time <= {end_time}")

        if conditions:
            query += " WHERE " + " AND ".join(conditions)

        query += f" ORDER BY open_time LIMIT {limit} OFFSET {offset}"  # Add ordering, limit and offset

        # Use pandas for convenient data handling
        df = conn.execute(query).fetchdf()
        #return df.to_dict(orient="records") #old return
        return [BinanceData(**item) for item in df.to_dict(orient="records")] #new return


    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()  # Ensure connection is closed

@app.get("/binance_data/{open_time}", response_model=BinanceData)
async def read_single_binance_record(open_time: int):
    """Retrieves a single Binance data record by open_time."""
    conn = get_db_connection()
    try:
        query = f"SELECT * FROM BinanceData WHERE open_time = {open_time}"
        df = conn.execute(query).fetchdf()

        if df.empty:
            raise HTTPException(status_code=404, detail="Record not found")

        return BinanceData(**df.iloc[0].to_dict())  # Access the first (and only) row
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()
@app.get("/health")
async def health_check():
    """Simple health check endpoint."""
    return {"status": "OK"}