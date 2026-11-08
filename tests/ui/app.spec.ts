import {test,expect} from '@playwright/test';import {readFile,mkdir} from 'node:fs/promises';import {generateKeyPairSigner,getAddressEncoder,getBase58Decoder} from '@solana/kit';
test('public overview, honest fixture, and finite lab export',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/');await expect(page.getByRole('heading',{name:/Work for agents/})).toBeVisible();await expect(page.getByText('Live setup incomplete')).toBeVisible();
  await mkdir('artifacts',{recursive:true});await page.screenshot({path:'artifacts/overview-desktop.png',fullPage:true});
  await page.getByRole('button',{name:'Explore fixture'}).click();await expect(page.getByText('20/20 passed')).toBeVisible();await expect(page.getByText(/No OpenRouter call, escrow funding/)).toBeVisible();await expect(page.getByRole('button',{name:'Simulate funding'})).toHaveCount(0);await page.screenshot({path:'artifacts/task-fixture-desktop.png',fullPage:true});
  await page.getByRole('link',{name:'Research lab',exact:false}).first().click();await expect(page.getByRole('heading',{name:/When does the/})).toBeVisible();await page.getByLabel('Maximum joint budget').selectOption('0.25');await page.getByLabel('Peer score multiplier').selectOption('0');await expect(page.getByText('Truthful compliance is defeated')).toBeVisible();
  const download=page.waitForEvent('download');await page.getByRole('button',{name:'Export all results'}).click();const exported=await download;expect(exported.suggestedFilename()).toBe('orbit-finite-lab-v1.json');const path=await exported.path();const data=JSON.parse(await readFile(path!,'utf8'));expect(data.results).toHaveLength(42);
  await page.screenshot({path:'artifacts/lab-desktop.png',fullPage:true});expect(errors).toEqual([]);
});
test('mobile pages have no horizontal overflow and public creation is disabled',async({page})=>{
  await page.setViewportSize({width:390,height:844});for(const route of ['/','/#/create','/#/tasks/fixture','/#/lab']){await page.goto(route);await expect(page.locator('h1')).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);}
  await page.goto('/#/create');await expect(page.getByRole('button',{name:'Create committed draft'})).toBeDisabled();await page.screenshot({path:'artifacts/create-mobile.png',fullPage:true});
});
test('controlled wallet/API/RPC fixture exercises funding, commitment, evaluation and settlement UI',async({page})=>{
  const [creator,worker,reviewer,program,pda]=await Promise.all(Array.from({length:5},()=>generateKeyPairSigner()));
  const fixture=JSON.parse(await readFile('fixtures/public-task.json','utf8'));
  let task:any={...fixture,id:'01234567-1234-4234-8234-123456789abc',kind:'live',stage:'draft',creator:creator.address,worker:worker.address,reviewer:reviewer.address,pda:pda.address,nonce:'1',deadline:Math.floor(Date.now()/1000)+1800,source:undefined,solutionHash:undefined,workerMetadata:undefined,review:undefined,report:undefined,payout:undefined};let session=false;
  const cfg={operator:creator.address,worker:worker.address,reviewer:reviewer.address,programId:program.address,network:'devnet'};
  await page.addInitScript(({address,publicKey})=>{
    const account={address,publicKey:new Uint8Array(publicKey),chains:['solana:devnet'],features:['solana:signMessage','solana:signTransaction']};
    const wallet={version:'1.0.0',name:'Orbit Test Wallet',icon:'data:image/svg+xml;base64,PHN2Zy8+',chains:['solana:devnet'],accounts:[account],features:{'standard:connect':{version:'1.0.0',connect:async()=>({accounts:[account]})},'standard:disconnect':{version:'1.0.0',disconnect:async()=>{}},'standard:events':{version:'1.0.0',on:()=>()=>{}},'solana:signMessage':{version:'1.0.0',signMessage:async(...inputs:any[])=>inputs.map(i=>({signedMessage:i.message,signature:new Uint8Array(64).fill(2)}))},'solana:signTransaction':{version:'1.0.0',supportedTransactionVersions:[0],signTransaction:async(...inputs:any[])=>inputs.map(i=>{const signed=new Uint8Array(i.transaction);signed.fill(2,1,65);return {signedTransaction:signed};})}}};
    function register(api:any){api.register(wallet);}window.addEventListener('wallet-standard:app-ready',(e:any)=>register(e.detail));window.dispatchEvent(new CustomEvent('wallet-standard:register-wallet',{detail:register}));
  },{address:creator.address,publicKey:Array.from(getAddressEncoder().encode(creator.address))});
  await page.route('**/api/**',async route=>{
    const path=new URL(route.request().url()).pathname;let body:any={};const input=route.request().postDataJSON();
    if(path==='/api/config')body=cfg;else if(path==='/api/session')body={wallet:session?creator.address:null};else if(path==='/api/readiness')body={available:true,database:{available:true},models:{available:true},network:{available:true},wallets:{available:true}};
    else if(path==='/api/tasks'&&route.request().method()==='GET')body={tasks:[]};else if(path==='/api/auth/challenge')body={id:'fixture-challenge',message:'Orbit controlled test login'};else if(path==='/api/auth/verify'){session=true;body={wallet:creator.address};}
    else if(path==='/api/tasks'){body=task;}
    else if(path.endsWith('/reconcile')){if(input?.action==='create_task'){task={...task,stage:'funded',chain:{status:0,reviewCommitted:false}};}if(input?.action==='record_review'){task={...task,stage:'committed',chain:{status:0,reviewCommitted:true}};}if(input?.action==='settle_task'){task={...task,stage:'settled',chain:{status:1,reviewCommitted:true}};}body=task;}
    else if(path.endsWith('/run')){task={...task,stage:'review_ready',source:fixture.source,solutionHash:fixture.solutionHash,workerMetadata:{returnedModel:'TEST FIXTURE'},review:fixture.review};body=task;}
    else if(path.endsWith('/evaluate')){task={...task,stage:'evaluated',report:fixture.report,payout:fixture.payout};body=task;}
    else if(path.endsWith('/settlement'))body={...task.payout};else body=task;
    await route.fulfill({json:body});
  });
  await page.route('https://api.devnet.solana.com/**',async route=>{
    const {method}=route.request().postDataJSON();let result:any;
    if(method==='getGenesisHash')result='EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG';
    else if(method==='getAccountInfo')result={context:{slot:1},value:{lamports:1000000,owner:'BPFLoaderUpgradeab1e11111111111111111111111',executable:true,data:['','base64'],rentEpoch:0,space:0}};
    else if(method==='getLatestBlockhash')result={context:{slot:1},value:{blockhash:'11111111111111111111111111111111',lastValidBlockHeight:999999}};
    else if(method==='simulateTransaction')result={context:{slot:1},value:{err:null,logs:[],unitsConsumed:30000,loadedAccountsDataSize:2000,returnData:null}};
    else if(method==='getFeeForMessage')result={context:{slot:1},value:5000};else if(method==='getMinimumBalanceForRentExemption')result=3000000;
    else if(method==='sendTransaction')result=getBase58Decoder().decode(new Uint8Array(64).fill(2));
    else if(method==='getSignatureStatuses')result={context:{slot:1},value:[{slot:1,err:null,confirmationStatus:'confirmed',confirmations:1}]};else if(method==='getEpochInfo')result={absoluteSlot:1,blockHeight:1,epoch:0,slotIndex:1,slotsInEpoch:432000,transactionCount:1};else if(method==='getBlockHeight')result=2;
    else throw new Error('Unexpected fixture RPC '+method);
    await route.fulfill({json:{jsonrpc:'2.0',id:route.request().postDataJSON().id,result}});
  });
  await page.routeWebSocket('wss://api.devnet.solana.com/**',ws=>{ws.onMessage(message=>{const input=JSON.parse(String(message));ws.send(JSON.stringify({jsonrpc:'2.0',id:input.id,result:1}));if(input.method==='signatureSubscribe')setTimeout(()=>ws.send(JSON.stringify({jsonrpc:'2.0',method:'signatureNotification',params:{subscription:1,result:{context:{slot:1},value:{err:null}}}})),50);});});
  await page.goto('/');await page.getByRole('button',{name:'Connect Orbit Test Wallet'}).click();await page.getByRole('button',{name:'Sign in',exact:true}).click();await page.getByRole('button',{name:'Create a task',exact:false}).click();await page.getByRole('button',{name:'Create committed draft'}).click();
  await page.getByRole('button',{name:'Simulate funding',exact:true}).click();await expect(page.getByRole('dialog')).toBeVisible();await expect(page.getByText('Simulation passed', {exact:false})).toBeVisible();await expect(page.getByText('Transaction v0',{exact:false})).toBeVisible();
  // All HTTP and websocket RPC traffic is intercepted. No fixture transaction reaches devnet.
  await page.getByRole('button',{name:'Confirm in wallet'}).click();await page.getByRole('button',{name:'Start worker + reviewer',exact:true}).click();
  await page.getByRole('button',{name:'Simulate review commitment'}).click();await expect(page.getByRole('dialog')).toContainText('8500 basis points');await page.getByRole('button',{name:'Confirm in wallet'}).click();
  await page.getByRole('button',{name:'Evaluate frozen source'}).click();await expect(page.getByText('20/20 passed')).toBeVisible();await page.getByRole('button',{name:'Review & simulate settlement'}).click();await expect(page.getByRole('dialog')).toContainText('You attest: all 20 tests passed');await expect(page.getByRole('dialog')).toContainText(worker.address);await expect(page.getByRole('dialog')).toContainText(reviewer.address);await page.getByRole('button',{name:'Confirm in wallet'}).click();await expect(page.getByText('settled',{exact:true})).toBeVisible();
});
