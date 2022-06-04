const breej = require('breej')
const CryptoJS = require("crypto-js");
const Web3 = require('web3');
const Web3EthContract = require('web3-eth-contract');
const axios = require('axios')

const tmac_token = '0x6421282c7f14670d738f4651311c5a1286e46484';
const trans_contract = '0xc6c55c76aec472ee6e0d67d2bbaceb2910bf50b1'; 

const { TRANS_ABI } = require('./contracts/MULTI');
const { TMAC_ABI } = require('./contracts/TOM');

const admin = '0x95610bfe8f08551DA773F0aa44f2EE87eA51D53E';
const privateKey = process.env.privKey;

const contract_tom = new Web3EthContract(TMAC_ABI, tmac_token);
const contract_multi = new Web3EthContract(TRANS_ABI, trans_contract);
const api = 'https://api.breezescan.io';
breej.init({ api: api})

start = async function() {
  processBridge();
  setInterval(() => {
    processBridge();
  }, 5 * 60 * 1000);
}

const processBridge = async function () {
  let web3 = new Web3('https://bsc-dataseed1.binance.org');
  console.log('fetching pending payouts from api')
  const account = web3.eth.accounts.privateKeyToAccount(privateKey);
  const r = await axios.get(api+'/bridge/new/0')
  console.log('number of pending payouts')
  console.log(r.data.length)
  
  let userArray = [];
  for (let i = 0; i < r.data.length; i ++) {
    let user = {
      token: tmac_token,
      _id: r.data[i]._id,
      user: r.data[i].dest,
      amount: r.data[i].amount - r.data[i].fee
    }
    userArray.push(user)
  }

  if (userArray.length !== 0) {
    let getData = await contract_multi.methods.MultiTransfer(userArray);
    let data = getData.encodeABI();
    const gasPrice = await web3.eth.getGasPrice();
    const nonce = await web3.eth.getTransactionCount(admin, 'pending');

    const txData = {
      nonce: web3.utils.toHex(nonce),
      gasLimit: web3.utils.toHex(500000),
      gasPrice: web3.utils.toHex(gasPrice), // 10 Gwei
      from: admin,
      to: trans_contract,
      value: '0x0',
      data: data
    };

    const signedTx = await web3.eth.accounts.signTransaction(txData, privateKey);
    let result;
    let status = parseInt(1);
    let desttxid
    let sender = "bridge";
    let srctxid;
    let wifKey = process.env.wifKey;
    try {
      result = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);
      desttxid = result.transactionHash;
      console.log('this is transaction id on bsc chain', result.transactionHash);
    } catch (err) {
      status = parseInt(2);
      console.log(err)
    }

    for (let i = 0; i < userArray.length; i ++) {
      let newTx = { type: 24, data: { srctxid: userArray[i]._id, desttxid: desttxid, status: status } };
      let signedTx = breej.sign(wifKey, sender, newTx);
      breej.sendTransaction(signedTx, (error, result) => {
        console.log('----------------------------\nResult > \n ');
        if (error === null) {
          console.log('success:', result)
        } else {
          console.log('error:', error)
        }
      })
    }
  }
}

start();