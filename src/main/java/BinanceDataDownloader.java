import java.io.*;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

public class BinanceDataDownloader {

    private String dataForm;
    private String cryptoPair;
    private String duration;

    public BinanceDataDownloader(String dataForm, String cryptoPair, String duration) {
        this.dataForm = dataForm;
        this.cryptoPair = cryptoPair;
        this.duration = duration;
    }

    public void downloadAndUnzipData(String year, String month) throws IOException {
        String baseUrl = "https://data.binance.vision/data/spot/monthly/klines/";
        String fileName = cryptoPair + "-" + duration + "-" + year + "-" + month + ".zip";
        String fileUrl = baseUrl + cryptoPair + "/" + duration + "/" + fileName;
        String outputFolder = "./" + cryptoPair + "_" + duration + "_data/";

        // Download the file
        System.out.println("Downloading " + fileName);
        URL url = new URL(fileUrl);
        HttpURLConnection connection = (HttpURLConnection) url.openConnection();
        connection.setRequestMethod("GET");

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

    public static void main(String[] args) {
        // Example usage
        BinanceDataDownloader downloader = new BinanceDataDownloader("klines", "BTCUSDT", "15m");
        try {
            downloader.downloadAndUnzipData("2020", "08");
        } catch (IOException e) {
            e.printStackTrace();
        }
    }
}