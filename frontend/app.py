import streamlit as st
import pandas as pd
import plotly.graph_objects as go
from plotly.subplots import make_subplots
import requests
from datetime import datetime
import time

# App configuration
st.set_page_config(
    page_title="Binance Data Explorer",
    page_icon="📈",
    layout="wide",
)

# App title and description
st.title("📈 Binance Data Explorer")
st.markdown("""
This application allows you to explore and visualize Binance cryptocurrency data.
Select date ranges, view candlestick charts, and analyze trading volumes.
""")

# Backend API URL
API_URL = "http://localhost:8000"  # Update this if your backend is hosted elsewhere

# Functions to interact with the backend API
def get_binance_data(start_time=None, end_time=None, limit=1000):
    params = {"limit": limit}
    if start_time:
        params["start_time"] = start_time
    if end_time:
        params["end_time"] = end_time
    
    try:
        response = requests.get(f"{API_URL}/binance_data/", params=params)
        response.raise_for_status()  # Raise exception for HTTP errors
        return response.json()
    except requests.exceptions.RequestException as e:
        st.error(f"Error fetching data: {e}")
        return []

def unix_to_datetime(unix_timestamp):
    return datetime.fromtimestamp(unix_timestamp/1000)  # Convert from milliseconds

def datetime_to_unix(dt):
    return int(time.mktime(dt.timetuple()) * 1000)  # Convert to milliseconds

# Sidebar for data filtering
st.sidebar.header("Data Filters")

# Date range selection
st.sidebar.subheader("Select Date Range")
default_start_date = datetime.now().replace(month=datetime.now().month-1)
default_end_date = datetime.now()

start_date = st.sidebar.date_input("Start Date", value=default_start_date)
end_date = st.sidebar.date_input("End Date", value=default_end_date)

# Convert selected dates to Unix timestamps (milliseconds)
start_timestamp = datetime_to_unix(datetime.combine(start_date, datetime.min.time()))
end_timestamp = datetime_to_unix(datetime.combine(end_date, datetime.max.time()))

# Data limit slider
limit = st.sidebar.slider("Maximum Records", min_value=10, max_value=5000, value=1000, step=10)

# Button to fetch data
if st.sidebar.button("Fetch Data"):
    with st.spinner("Fetching data from API..."):
        data = get_binance_data(start_timestamp, end_timestamp, limit)
        
        if data:
            # Convert to DataFrame for easier manipulation
            df = pd.DataFrame(data)
            
            # Convert Unix timestamps to datetime
            df['datetime'] = df['open_time'].apply(unix_to_datetime)
            
            # Display summary stats
            st.subheader("Data Summary")
            col1, col2, col3, col4 = st.columns(4)
            
            with col1:
                st.metric("Total Records", len(df))
            with col2:
                st.metric("Date Range", f"{df['datetime'].min().date()} to {df['datetime'].max().date()}")
            with col3:
                price_change = df['close'].iloc[-1] - df['open_price'].iloc[0]
                st.metric("Price Change", f"{price_change:.2f}", delta=f"{(price_change / df['open_price'].iloc[0] * 100):.2f}%")
            with col4:
                st.metric("Total Volume", f"{df['volume'].sum():,.0f}")
            
            # Create candlestick chart
            st.subheader("Candlestick Chart")
            
            fig = make_subplots(rows=2, cols=1, row_heights=[0.7, 0.3], vertical_spacing=0.03, 
                                shared_xaxes=True, subplot_titles=["Price", "Volume"])
            
            # Add candlestick chart
            fig.add_trace(
                go.Candlestick(
                    x=df['datetime'],
                    open=df['open_price'],
                    high=df['high'],
                    low=df['low'],
                    close=df['close'],
                    name="Candlestick"
                ),
                row=1, col=1
            )
            
            # Add volume bar chart
            fig.add_trace(
                go.Bar(
                    x=df['datetime'],
                    y=df['volume'],
                    name="Volume",
                    marker_color='rgba(0, 150, 136, 0.6)'
                ),
                row=2, col=1
            )
            
            # Update layout
            fig.update_layout(
                height=700,
                xaxis_rangeslider_visible=False,
                margin=dict(l=50, r=50, t=50, b=50),
            )
            
            st.plotly_chart(fig, use_container_width=True)
            
            # Data table
            st.subheader("Raw Data")
            display_cols = ['datetime', 'open_price', 'high', 'low', 'close', 'volume', 'ntrades']
            st.dataframe(df[display_cols], use_container_width=True)
            
            # Allow downloading the data as CSV
            csv = df.to_csv(index=False)
            st.download_button(
                label="Download Data as CSV",
                data=csv,
                file_name="binance_data.csv",
                mime="text/csv"
            )
        else:
            st.warning("No data returned from the API. Try adjusting your filters.")
else:
    st.info("👈 Use the sidebar to set filters and fetch data.")

# Footer
st.sidebar.markdown("---")
st.sidebar.info("""
### About
This frontend connects to the FastAPI backend that serves Binance cryptocurrency data 
stored in DuckDB.
""")

# Add health check indicator
try:
    health_response = requests.get(f"{API_URL}/health")
    if health_response.status_code == 200:
        st.sidebar.success("✅ Backend API is online")
    else:
        st.sidebar.error("❌ Backend API is offline")
except:
    st.sidebar.error("❌ Cannot connect to backend API")
