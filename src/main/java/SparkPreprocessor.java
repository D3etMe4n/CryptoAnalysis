import org.apache.spark.sql.SparkSession;
import org.apache.spark.sql.Dataset;
import org.apache.spark.sql.Row;
import org.apache.spark.SparkConf;
import org.apache.spark.sql.SparkSession;
import org.apache.spark.sql.types.StructType;
import org.apache.spark.sql.types.Metadata;
import org.apache.spark.sql.types.StructField;
import org.apache.spark.sql.types.DataTypes;

import java.util.List;

public class SparkPreprocessor {
    public static Dataset<Row> readFromCSV(List<String> pathList)
    {
        String CSVROOT =  "/home/lime/IdeaProjects/CryptoAnalysis/BTCUSDT_15m_data/";
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
}


