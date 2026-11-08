export const parameters = Object.freeze({budgets:[0.25,0.5,1,2,4,8],multipliers:[0,0.5,1,2,4],jointTypes:[[0.4,0.1],[0.1,0.4]],states:[0,1],version:1});
const utility = (t,a,theta) => -((a-theta-t)**2);
export function reward(scheme,B,lambda,report,peerReport,a,theta) {
  if(a !== theta || scheme === 'none') return 0;
  if(scheme === 'fixed') return B/2;
  const beta = report === peerReport ? 0.8 : 0.2;
  const score = 2*beta - (0.8**2+0.2**2);
  return Math.max(0,Math.min(B/2,lambda*score-utility(report,a,theta)));
}
export function analyze(scheme,budget,lambda=0) {
  let maxDeviationGain=0, expectedPayment=0, welfare=0, minComplianceAdvantage=Infinity;
  const incentives=[];
  for(const t of [0,1]) for(const theta of [0,1]) {
    const expected = (r,a) => [0,1].reduce((v,peer)=>v+(peer===t?0.8:0.2)*(utility(t,a,theta)+reward(scheme,budget,lambda,r,peer,a,theta)),0);
    const truthful=expected(t,theta);
    let best=truthful, deviation={report:t,action:theta};
    for(const report of [0,1]) for(const action of [0,1]) if(expected(report,action)>best) {best=expected(report,action);deviation={report,action};}
    const gain=Math.max(0,best-truthful); maxDeviationGain=Math.max(maxDeviationGain,gain);
    const actionGain=truthful-expected(t,1-theta); minComplianceAdvantage=Math.min(minComplianceAdvantage,actionGain);
    incentives.push({type:t,theta,truthfulUtility:truthful,bestUtility:best,deviationGain:gain,bestDeviation:deviation,complianceAdvantage:actionGain});
    expectedPayment+=0.5*[0,1].reduce((v,peer)=>v+(peer===t?0.8:0.2)*reward(scheme,budget,lambda,t,peer,theta,theta),0);
    welfare+=0.5*utility(t,theta,theta);
  }
  // Both agents know both types and theta in this deliberately stronger stress scenario.
  let coordinatedGain=0;
  for(const t1 of [0,1]) for(const t2 of [0,1]) for(const theta of [0,1]) {
    const total=(r1,r2,a1,a2)=>utility(t1,a1,theta)+utility(t2,a2,theta)+reward(scheme,budget,lambda,r1,r2,a1,theta)+reward(scheme,budget,lambda,r2,r1,a2,theta);
    const baseline=total(t1,t2,theta,theta); let best=baseline;
    for(const r1 of [0,1]) for(const r2 of [0,1]) for(const a1 of [0,1]) for(const a2 of [0,1]) best=Math.max(best,total(r1,r2,a1,a2));
    coordinatedGain += parameters.jointTypes[t1][t2]*0.5*(best-baseline);
  }
  return {scheme,budget,lambda,maxDeviationGain,minComplianceAdvantage,expectedPayment,welfare,coordinatedGain,incentives};
}
export function runLab() {return {parameters,assumptions:'Binary finite toy adaptation. Utilities exclude designer payment cost; welfare is intrinsic agent utility at truthful compliance. Coordinated gain is a full-information upper bound, not an equilibrium claim.',results:parameters.budgets.flatMap(b=>[analyze('none',b),analyze('fixed',b),...parameters.multipliers.map(l=>analyze('peer',b,l))])};}
