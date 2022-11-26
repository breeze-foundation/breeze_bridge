#code here

const breej = require('breej')
const axios = require('axios')

const api_url = 'https://api.breezechain.org';
breej.init({ api: api_url})
let lastAwardTime = new Date().getTime();

rewardStart = async function() {
  // rewardBridge();
  setInterval(() => {
    rewardBridge();
  }, 3*60*60*1000);
}

const rewardBridge = async function () {
 if ( new Date().getTime() - lastAwardTime < 3*60*60*1000-1000) return;
  limitTime = lastAwardTime;
  lastAwardTime = new Date().getTime();
  const currentTime = new Date();
  let index = 0;
  let lastTime = 0;
  let authorArr = {};
  let state = true;
  let total = 0;
  while(state) {
    const postsAPI = await axios.get(api_url+`/new/`+index);
    postsAPI.data.map( async(post)=>{
        if (lastTime !== post.ts && post.ts >= limitTime) {
          total++;
          authorArr[post.author] = authorArr[post.author]?(authorArr[post.author]+1):1;
        }
        lastTime = post.ts;
    })
    if (lastTime < limitTime) state = false;
    index++;
  }

  const rewardRate = 100/total;
  let wifKey = process.env.wifKey;
  for ( let user in authorArr) {
    const userAccount = await axios.get(api_url+`/account/${user}`);
    let newTx = { 
      type: 3, 
      data: {
        receiver: userAccount.data._id, 
        amount: authorArr[user]*rewardRate,
        memo: 'post_memo' 
      } 
    };
    console.log(newTx);
    // let signedTx = breej.sign(wifKey, sender, newTx);
    // breej.sendTransaction(signedTx, (error, result) => { if (error === null) { return res.send({ error: false }); } else { return res.send({ error: true, message: error['error'] }); } })
  }

}

rewardStart();
