import java.io.*;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;

public class BinanceDataDownloader {

    private String dataForm;
    private String cryptoPair;
    private String duration;

    public BinanceDataDownloader(String dataForm, String cryptoPair, String duration) {
        this.dataForm = dataForm;
        this.cryptoPair = cryptoPair;
        this.duration = duration;
    }

    public void downloadAndUnzipAllData() throws IOException {
        String baseUrl = "https://data.binance.vision/data/spot/monthly/klines/";
        String outputFolder = "./" + cryptoPair + "_" + duration + "_data/";

        // Get the current year and month
        YearMonth currentYearMonth = YearMonth.now();
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM");

        // Loop through all months from the earliest available data to the current month
        YearMonth startYearMonth = YearMonth.of(2016, 1); // Binance data starts from 2020
        while (!startYearMonth.isAfter(currentYearMonth)) {
            String yearMonthStr = startYearMonth.format(formatter);
            String fileName = cryptoPair + "-" + duration + "-" + yearMonthStr + ".zip";
            String fileUrl = baseUrl + cryptoPair + "/" + duration + "/" + fileName;

            // Download the file
            System.out.println("Downloading " + fileName);
            URL url = new URL(fileUrl);
            HttpURLConnection connection = (HttpURLConnection) url.openConnection();
            connection.setRequestMethod("GET");

            // Check if the file exists (HTTP 200 OK)
            if (connection.getResponseCode() == HttpURLConnection.HTTP_OK) {
                FileOutputStream outputStream = new FileOutputStream(fileName);
                InputStream inputStream = connection.getInputStream();
                byte[] buffer = new byte[2048];
                int length;
                while ((length = inputStream.read(buffer)) != -1) {
                    outputStream.write(buffer, 0, length);
                }
                outputStream.close();
                inputStream.close();

                // Unzip the file
                System.out.println("Unzipping " + fileName);
                File destDir = new File(outputFolder);
                if (!destDir.exists()) {
                    destDir.mkdir();
                }
                ZipInputStream zipIn = new ZipInputStream(new FileInputStream(fileName));
                ZipEntry entry = zipIn.getNextEntry();
                while (entry != null) {
                    String filePath = outputFolder + File.separator + entry.getName();
                    if (!entry.isDirectory()) {
                        extractFile(zipIn, filePath);
                    } else {
                        File dir = new File(filePath);
                        dir.mkdir();
                    }
                    zipIn.closeEntry();
                    entry = zipIn.getNextEntry();
                }
                zipIn.close();

                // Delete the zip file
                System.out.println("Deleting " + fileName);
                File file = new File(fileName);
                if (file.delete()) {
                    System.out.println("Deleted the zip file: " + fileName);
                } else {
                    System.out.println("Failed to delete the zip file: " + fileName);
                }
            } else {
                System.out.println("File not found: " + fileName);
            }

            // Move to the next month
            startYearMonth = startYearMonth.plusMonths(1);
        }
    }

    private void extractFile(ZipInputStream zipIn, String filePath) throws IOException {
        BufferedOutputStream bos = new BufferedOutputStream(new FileOutputStream(filePath));
        byte[] bytesIn = new byte[2048];
        int read = 0;
        while ((read = zipIn.read(bytesIn)) != -1) {
            bos.write(bytesIn, 0, read);
        }
        bos.close();
    }

    public static void DownloadData() {
        // Example usage
        BinanceDataDownloader downloader = new BinanceDataDownloader("klines", "BTCUSDT", "15m");
        try {
            downloader.downloadAndUnzipAllData(); // Download all data
        } catch (IOException e) {
            e.printStackTrace();
        }
    }
}