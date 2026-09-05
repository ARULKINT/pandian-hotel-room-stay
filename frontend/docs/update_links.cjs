const fs = require('fs');

const files = [
  '../src/pages/Home.js',
  '../src/pages/RoomDetails.js',
  '../src/pages/Checkout.js',
  '../src/pages/Dashboard.js'
];

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  
  // Replace links in the bottom navigation
  content = content.replace(/data-path="home" href="[^"]*"/g, 'data-path="home" href="#/home"');
  content = content.replace(/data-path="rooms" href="[^"]*"/g, 'data-path="rooms" href="#/room-details"');
  // I will map my-stays to checkout for easy testing, or concierge to dashboard.
  content = content.replace(/data-path="my-stays" href="[^"]*"/g, 'data-path="my-stays" href="#/checkout"'); 
  content = content.replace(/data-path="concierge" href="[^"]*"/g, 'data-path="concierge" href="#/dashboard"');
  
  // Replace history.back() with window.location.hash
  content = content.replace(/onclick="history.back\(\)"/g, 'onclick="window.history.back()"'); // Standard way is fine, but hash might not be in history

  // In Home.js, make sure the static Suite Details goes to room-details
  if (file.includes('Home.js')) {
    content = content.replace(/href="#"/g, 'href="#/room-details"');
    content = content.replace(
      /<button class="px-space-md py-2.5 rounded-xl bg-primary hover:bg-primary-container text-on-primary font-label-sm text-label-sm uppercase tracking-widest transition-colors shadow-sm">\s*Reserve Suite\s*<\/button>/g,
      `<button onclick="window.location.hash='#/room-details'" class="px-space-md py-2.5 rounded-xl bg-primary hover:bg-primary-container text-on-primary font-label-sm text-label-sm uppercase tracking-widest transition-colors shadow-sm">
                    Reserve Suite
                  </button>`
    );
  }

  // RoomDetails -> Checkout
  if (file.includes('RoomDetails.js')) {
    content = content.replace(
      /<button class="w-full h-14 bg-primary text-on-primary rounded-2xl font-label-lg text-label-lg uppercase tracking-wider flex items-center justify-between px-space-md shadow-md active:scale-\[0.98\] transition-transform">/g,
      `<button onclick="window.location.hash='#/checkout'" class="w-full h-14 bg-primary text-on-primary rounded-2xl font-label-lg text-label-lg uppercase tracking-wider flex items-center justify-between px-space-md shadow-md active:scale-[0.98] transition-transform">`
    );
  }

  // Checkout -> Dashboard
  if (file.includes('Checkout.js')) {
    content = content.replace(
      /<button class="w-full py-4 rounded-xl bg-primary text-on-primary font-label-lg text-label-lg uppercase tracking-wider flex items-center justify-center gap-space-xs shadow-md active:scale-\[0.98\] transition-transform">/g,
      `<button onclick="window.location.hash='#/dashboard'" class="w-full py-4 rounded-xl bg-primary text-on-primary font-label-lg text-label-lg uppercase tracking-wider flex items-center justify-center gap-space-xs shadow-md active:scale-[0.98] transition-transform">`
    );
  }

  fs.writeFileSync(file, content);
});

console.log('Links updated!');
