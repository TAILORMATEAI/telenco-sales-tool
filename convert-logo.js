import fs from 'fs';
import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  const resultBase64 = await page.evaluate(async () => {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        for (let i = 0; i < data.length; i += 4) {
          // If pixel has opacity
          if (data[i + 3] > 0) {
            // Change color to slate-400 equivalent (#94A3B8)
            data[i] = 148;     // R
            data[i + 1] = 163; // G
            data[i + 2] = 184; // B
          }
        }
        
        ctx.putImageData(imageData, 0, 0);
        resolve(canvas.toDataURL('image/png').split(',')[1]);
      };
      img.src = 'https://odqxwaggjgrjpeeqcznk.supabase.co/storage/v1/object/public/images/logos/telencologo.png';
    });
  });

  fs.writeFileSync('public/telencologo-grey.png', Buffer.from(resultBase64, 'base64'));
  fs.writeFileSync('telencologo-grey.png', Buffer.from(resultBase64, 'base64'));
  console.log('Saved to public/telencologo-grey.png');
  await browser.close();
})();
