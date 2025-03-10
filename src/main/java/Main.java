import java.util.List;
import java.util.ArrayList;
import java.io.File;
import org.apache.spark.sql.Dataset;
import org.apache.spark.sql.Row;

public class Main {
    public static void main(String[] args) {
        //BinanceDataDownloader.DownloadData();

        final String PROJECT_DIR = System.getProperty("user.dir");
        final String DWH_DIR =  PROJECT_DIR + "/duckdb/";
        final String CSV_DIR = PROJECT_DIR + "/BTCUSDT_15m_data/";

        Dataset<Row> Dataframe = SparkPreprocessor.readFromCSV(getFileName(CSV_DIR), CSV_DIR);
        System.out.println("This is the final dataframe");
        Dataframe.show();

        SparkPreprocessor.ToDWH(Dataframe);

    }

    private static List<String> getFileName(String path)
    {
        List<String> results = new ArrayList<String>();

        File[] files = new File(path).listFiles();

        for (File file : files) {
            if (file.isFile()) {
                results.add(file.getName());
            }
        }
        return results;
    }
}
