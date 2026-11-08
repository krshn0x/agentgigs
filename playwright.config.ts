import {defineConfig} from '@playwright/test';
export default defineConfig({testDir:'tests/ui',timeout:30000,fullyParallel:false,workers:1,use:{baseURL:'http://localhost:3000',browserName:'chromium',channel:'chrome',headless:true,screenshot:'only-on-failure'},reporter:'list',webServer:{command:'npm run dev',url:'http://localhost:3000/health',reuseExistingServer:true,timeout:20000}});
