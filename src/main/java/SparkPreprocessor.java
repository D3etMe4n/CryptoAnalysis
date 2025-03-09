import org.apache.spark.sql.SparkSession;
import org.apache.spark.sql.Dataset;
import org.apache.spark.sql.Row;
import org.apache.spark.SparkConf;
import org.apache.spark.sql.SparkSession;
import org.apache.spark.sql.types.StructType;
import org.apache.spark.sql.types.Metadata;
import org.apache.spark.sql.types.StructField;
import org.apache.spark.sql.types.DataTypes;
import org.apache.spark.sql.SaveMode;

import java.io.File;
import java.sql.Connection;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.List;

import java.sql.DriverManager;
import java.util.Properties;

import org.duckdb.DuckDBConnection;

public class SparkPreprocessor {
    public static Dataset<Row> readFromCSV(List<String> pathList,String CSVROOT)
    {
        // 1. Create a SparkConf object (optional, but recommended for configuration)
        SparkConf sparkConf = new SparkConf()
                .setAppName("MySparkApp")
                .set("spark.driver.memory", "4g")
                .setMaster("local[*]");

        // 2. Create a SparkSession using the builder pattern.
        //    This is the primary way to create a SparkSession.
        SparkSession spark = SparkSession.builder()
                .config(sparkConf)  // Pass the SparkConf
                // .master("local[*]") // Can also set the master here directly, overriding sparkConf
                .getOrCreate();

            StructType schema = new StructType(new StructField[]{
            new StructField("open_time", DataTypes.LongType, false, Metadata.empty()),
            new StructField("open_price", DataTypes.DoubleType, false, Metadata.empty()),
            new StructField("high", DataTypes.DoubleType, false, Metadata.empty()),
            new StructField("low", DataTypes.DoubleType, false, Metadata.empty()),
            new StructField("close", DataTypes.DoubleType, false, Metadata.empty()),
            new StructField("volume", DataTypes.DoubleType, false, Metadata.empty()),
            new StructField("close_time", DataTypes.LongType, false, Metadata.empty()),
            new StructField("quote_asset_volume", DataTypes.DoubleType, false, Metadata.empty()),
            new StructField("ntrades", DataTypes.IntegerType, false, Metadata.empty()),
            new StructField("taker_buy_base_asset_volume", DataTypes.DoubleType, false, Metadata.empty()),
            new StructField("taker_buy_quote_asset_volume", DataTypes.DoubleType, false, Metadata.empty()),
            new StructField("ignore", DataTypes.IntegerType, true, Metadata.empty()), // Added for the trailing "0"
    });

        Dataset<Row> Dataframe = spark.read().option("delimiter", ",").option("header", "false").schema(schema).csv(CSVROOT + pathList.get(0));
        Dataframe.show(5);
        for (int i = 1 ; i < pathList.size() ; i++) {
            System.out.println(i + ": " + CSVROOT +  pathList.get(i));
            try {
                Dataset<Row> df = spark.read().option("delimiter", ",").option("header", "false").schema(schema).csv(CSVROOT + pathList.get(i));
                df.show(5);
                Dataframe = Dataframe.union(df);
            }catch(Exception e)
            {
                System.out.println("Error reading CSV file " +  pathList.get(i));
                e.printStackTrace();}
        }
        Dataframe.show(5);
        return Dataframe;
    }

    public static void ToDWH(Dataset<Row> Dataframe)
    {
            SparkSession spark = SparkSession.builder()
                    .appName("SparkDuckDBWriter")
                    .master("local[*]") // Use appropriate master for your Spark cluster
                    //add these 2 lines
                    .config("spark.sql.catalog.duckdb", "org.apache.spark.sql.duckdb.DuckDBSparkSessionExtension")
                    .config("spark.sql.extensions", "org.apache.spark.sql.duckdb.DuckDBSparkSessionExtension")
                    .getOrCreate();

        StructType schema = new StructType(new StructField[]{
                new StructField("open_time", DataTypes.LongType, false, Metadata.empty()),
                new StructField("open_price", DataTypes.DoubleType, false, Metadata.empty()),
                new StructField("high", DataTypes.DoubleType, false, Metadata.empty()),
                new StructField("low", DataTypes.DoubleType, false, Metadata.empty()),
                new StructField("close", DataTypes.DoubleType, false, Metadata.empty()),
                new StructField("volume", DataTypes.DoubleType, false, Metadata.empty()),
                new StructField("close_time", DataTypes.LongType, false, Metadata.empty()),
                new StructField("quote_asset_volume", DataTypes.DoubleType, false, Metadata.empty()),
                new StructField("ntrades", DataTypes.IntegerType, false, Metadata.empty()),
                new StructField("taker_buy_base_asset_volume", DataTypes.DoubleType, false, Metadata.empty()),
                new StructField("taker_buy_quote_asset_volume", DataTypes.DoubleType, false, Metadata.empty()),
                new StructField("ignore", DataTypes.IntegerType, true, Metadata.empty()), // Added for the trailing "0"
        });

        Dataset<Row> DataframeWithSchema = spark.createDataFrame(Dataframe.rdd(),schema);

        //Connection conn = (DuckDBConnection) DriverManager.getConnection("jdbc:duckdb:duckdb/binancedata.db");
            //Statement stmt = conn.createStatement();
            //stmt.execute("CREATE TABLE IF NOT EXISTS BinanceData (open_time BIGINT NOT NULL, open_price DOUBLE NOT NULL, high DOUBLE NOT NULL, low DOUBLE NOT NULL, close DOUBLE NOT NULL, volume DOUBLE NOT NULL, close_time BIGINT NOT NULL, quote_asset_volume DOUBLE NOT NULL, ntrades INT NOT NULL, taker_buy_base_asset_volume DOUBLE NOT NULL, taker_buy_quote_asset_volume DOUBLE NOT NULL, ignore INT);");
            Properties connectionProperties = new Properties();
        DataframeWithSchema.write()
                    .mode(SaveMode.Overwrite)
                    .jdbc("jdbc:duckdb:duckdb/binancedata.db", "BinanceData", connectionProperties);
            spark.stop();
    }
}


