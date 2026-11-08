import {defineConfig} from '@playwright/test';
const hostedUrl=process.env.PLAYWRIGHT_BASE_URL;
export default defineConfig({testDir:'tests/ui',timeout:30000,fullyParallel:false,workers:1,use:{baseURL:hostedUrl||'http://localhost:3000',browserName:'chromium',channel:'chrome',headless:true,screenshot:'only-on-failure'},reporter:'list',webServer:hostedUrl?undefined:{command:'npm run dev',url:'http://localhost:3000/health',reuseExistingServer:true,timeout:20000}});
