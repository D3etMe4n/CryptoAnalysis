from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import duckdb
import pandas as pd
from typing import Optional, List
from pydantic import BaseModel, Field
import traceback

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
    limit: int = 100,
    offset: int = 0
):
    """
    Retrieves Binance kline data from the DuckDB database.
    """
    conn = get_db_connection()
    try:
        query = """
        SELECT 
            to_timestamp(open_time / 1000)::STRING AS open_time,
            open_price,
            high,
            low,
            close,
            volume,
            to_timestamp(close_time / 1000)::STRING AS close_time,
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

        query += f" ORDER BY open_time LIMIT {limit} OFFSET {offset}"

        df = conn.execute(query).fetchdf()
        return [BinanceData(**item) for item in df.to_dict(orient="records")]

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
            to_timestamp(open_time / 1000)::STRING AS open_time,
            open_price,
            high,
            low,
            close,
            volume,
            to_timestamp(close_time / 1000)::STRING AS close_time,
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