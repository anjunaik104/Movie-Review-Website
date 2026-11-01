import puppeteer from 'puppeteer-core';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const SCREENSHOT_DIR = path.join(__dirname, 'screenshots');

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function capture() {
  console.log('🎬 Launching Edge for screenshots...');
  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1600,1050']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1600, height: 1050, deviceScaleFactor: 1.25 });

  console.log('📸 1. Capturing Hero Spotlight & Navigation...');
  await page.goto('http://localhost:5000', { waitUntil: 'domcontentloaded' });
  await sleep(2000);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01_hero_spotlight.png') });

  console.log('📸 2. Capturing Discover Catalog & Genre Filters...');
  await page.evaluate(() => {
    window.scrollTo({ top: 580, behavior: 'instant' });
  });
  await sleep(1500);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02_catalog_filters.png') });

  console.log('📸 3. Opening Movie Detail View (Hero & Quick Rating)...');
  await page.evaluate(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  });
  await sleep(500);

  // Click on "Reviews & Ratings" button in Hero Banner
  const heroReviewBtn = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const btn = btns.find((b) => b.textContent.includes('Reviews & Ratings'));
    if (btn) {
      btn.click();
      return true;
    }
    return false;
  });
  console.log('Hero button clicked:', heroReviewBtn);
  await sleep(2000);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03_movie_detail_hero.png') });

  console.log('📸 4. Scrolling to Review Submission Form inside Modal...');
  await page.evaluate(() => {
    // Find the scrollable modal container
    const scrollContainer = document.querySelector('.overflow-y-auto.flex-1.custom-scrollbar');
    if (scrollContainer) {
      scrollContainer.scrollTop = 420;
    }
  });
  await sleep(1200);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '04_rating_review_form.png') });

  console.log('📸 5. Scrolling to Community Reviews & Histogram...');
  await page.evaluate(() => {
    const scrollContainer = document.querySelector('.overflow-y-auto.flex-1.custom-scrollbar');
    if (scrollContainer) {
      scrollContainer.scrollTop = 950;
    }
  });
  await sleep(1200);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '05_community_reviews.png') });

  console.log('📸 6. Closing modal and opening Watchlist View...');
  await page.keyboard.press('Escape');
  await sleep(1000);

  await page.evaluate(() => {
    const navButtons = Array.from(document.querySelectorAll('nav button'));
    const watchlistBtn = navButtons.find((b) => b.textContent.includes('Watchlist'));
    watchlistBtn?.click();
  });
  await sleep(1500);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '06_watchlist_view.png') });

  console.log('📸 7. Opening Add Movie to Catalog Modal...');
  // Click Discover tab first, then Add Movie button
  await page.evaluate(() => {
    const navButtons = Array.from(document.querySelectorAll('nav button'));
    const discoverBtn = navButtons.find((b) => b.textContent.includes('Discover'));
    discoverBtn?.click();
  });
  await sleep(600);

  await page.evaluate(() => {
    const addButtons = Array.from(document.querySelectorAll('button'));
    const addBtn = addButtons.find((b) => b.textContent.includes('Add Movie'));
    addBtn?.click();
  });
  await sleep(1500);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '07_add_movie_modal.png') });

  await browser.close();
  console.log('🎉 All 7 high-res screenshots captured successfully!');
}

capture().catch((err) => {
  console.error('Capture failed:', err);
  process.exit(1);
});
