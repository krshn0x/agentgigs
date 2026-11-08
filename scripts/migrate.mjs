import {readConfig} from '../src/config.mjs';import {Store} from '../src/store.mjs';
const store=new Store(readConfig().databaseUrl);try{await store.migrate();console.log('Schema ready');}finally{await store.close();}
