const puppeteer = require('puppeteer');

const { Upload } = require('@aws-sdk/lib-storage');
const { S3 } = require('@aws-sdk/client-s3');

const fs = require('fs');
const path = require('path');
require('dotenv').config();

const s3 = new S3({
  region: process.env.AWS_REGION,
  credentials: {accessKeyId: process.env.AWS_ACCESS_KEY_ID, secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY}
});

const urls = [
  'https://faqmaker.co',
  'https://pokeref.app',
];

const bucketName = process.env.AWS_BUCKET_NAME;

(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'], ignoreDefaultArgs: ['--disable-extensions'] });
  for (const url of urls) {
    const page = await browser.newPage();
    await page.setViewport({width: 1920, height: 1080})
    await page.goto(url, { waitUntil: 'networkidle2' });

    const screenshotPath = path.join(__dirname, `screenshots/${url.replace(/https?:\/\//, '')}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: true });

    const fileContent = fs.readFileSync(screenshotPath);
    const params = {
      Bucket: bucketName,
      Key: `screenshots/${url.replace(/https?:\/\//, '')}.png`,
      Body: fileContent,
      ContentType: 'image/png'
    };

    try {
      await new Upload({
        client: s3,
        params
      }).done();
      console.log(`Successfully uploaded ${url} screenshot to ${params.Key}`);
    } catch (err) {
      console.error(`Failed to upload ${url} screenshot`, err);
    }

    await page.close();
  }
  await browser.close();
})();
