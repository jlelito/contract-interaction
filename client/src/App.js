import './App.css';
import React, { Component } from 'react';
import Web3 from 'web3';
import Navbar from './components/Navbar.js';
import Count from './abis/Count.json';
import ContractCaller from './abis/ContractCaller.json';
import Notification from './components/Notification.js';
import Loading from './components/Loading.js';
import ConnectionBanner from '@rimble/connection-banner';
require('dotenv').config();

class App extends Component {

  async componentDidMount() {
    await this.loadBlockchainData()
  }

  //Loads all the blockchain data
  async loadBlockchainData() {
    let web3
    
    this.setState({loading: true})
    if(typeof window.ethereum !== 'undefined') {
      web3 = new Web3(window.ethereum)
      await this.setState({web3})
      await this.loadAccountData()
    } else {
      web3 = new Web3(new Web3.providers.HttpProvider(`https://ropsten.infura.io/v3/${process.env.REACT_APP_INFURA_API_KEY}`))
      await this.setState({web3})
    }
    this.loadContractData()
    this.setState({loading: false})
  }

  //Loads user account data
  async loadAccountData() {
    let web3 = new Web3(window.ethereum) 
    const accounts = await this.state.web3.eth.getAccounts()
    if(typeof accounts[0] !== 'undefined' && accounts[0] !== null) {
      let currentEthBalance = await this.state.web3.eth.getBalance(accounts[0])
      currentEthBalance = this.state.web3.utils.fromWei(currentEthBalance, 'Ether')
      await this.setState({account: accounts[0], currentEthBalance, isConnected: true})
    } else {
      await this.setState({account: null, isConnected: false})
    }

    const networkId = await web3.eth.net.getId()
    this.setState({network: networkId})

  }

  //Loads the data of the smart-contract
  async loadContractData() {
    let contractAdmin
    let CountData = Count.networks[3]
    let ContractCallerData = ContractCaller.networks[3]
    if(CountData) {
      //Load contract and set state
      const abi = Count.abi
      const address = CountData.address
      const countContract = new this.state.web3.eth.Contract(abi, address)
      await this.setState({ countContract })

      contractAdmin = await this.state.countContract.methods.admin().call()
      let count = await this.state.countContract.methods.count().call()
      this.setState({count, admin: contractAdmin, countContractAddress: address})
    }

    //Get other contract data
    if(ContractCallerData) {

      //Load contract and set state
      const abi = ContractCaller.abi
      const address = ContractCallerData.address
      const callerContract = new this.state.web3.eth.Contract(abi, address)
      await this.setState({ callerContract, callerContractAddress: address })

    }

  }

  //Shows notification
  showNotification = () => {
    this.notificationOne.current.updateShowNotify()
  }

  //Increments the Count
  async increment() {
    try {
      this.setState({confirmNum: 0})
      this.state.callerContract.methods.incrementsCount(this.state.countContractAddress).send({ from: this.state.account }).on('transactionHash', async (hash) => {
        this.setState({hash: hash, action: 'Count Incremented from other Contract', trxStatus: 'Pending'})
        this.showNotification()

        }).on('receipt', async (receipt) => {
            await this.loadContractData()
            if(receipt.status === true){
              this.setState({trxStatus: 'Success'})
            }
            else if(receipt.status === false){
              this.setState({trxStatus: 'Failed'})
            }
        }).on('error', (error) => {
            window.alert('Error! Could not increment!')
        }).on('confirmation', (confirmNum) => {
            if(confirmNum > 10) {
              this.setState({confirmNum : '10+'})
            } else {
            this.setState({confirmNum})
            }
        })
      }
      catch(e) {
        window.alert(e)
      }
  }

  constructor(props) {
    super(props)
    this.notificationOne = React.createRef()
    this.state = {
      web3: null,
      account: null,
      admin: null,
      network: null,
      wrongNetwork: false,
      loading: false,
      isConnected: null,
      countContract: {},
      callerContract: {},
      countContractAddress: null,
      callerContractAddress: null,
      count: null,
      currentEthBalance: '0',
      hash: '0x0',
      action: null,
      trxStatus: null,
      confirmNum: 0
    }
  }

  render() {

    if(window.ethereum != null) {

      window.ethereum.on('chainChanged', async (chainId) => {
        window.location.reload()
      })
  
      window.ethereum.on('accountsChanged', async (accounts) => {
        if(typeof accounts[0] !== 'undefined' & accounts[0] !== null) {
          await this.loadAccountData()
        } else {
          this.setState({account: null, currentEthBalance: 0, isConnected: false})
        }
      })
  
    }

    return (
      <div className="App">
        <Navbar 
          account={this.state.account}
          balance={this.state.currentEthBalance}
          network={this.state.network}
          isConnected={this.state.isConnected}
          trxStatus={this.state.trxStatus}
        />

        <div className='mt-5' />

        {window.ethereum === null ?
          <ConnectionBanner className='mt-5' currentNetwork={this.state.network} requiredNetwork={3} onWeb3Fallback={true} />
          :
          this.state.wrongNetwork ? <ConnectionBanner className='mt-5' currentNetwork={this.state.network} requiredNetwork={3} onWeb3Fallback={false} /> 
          :
          null
        }
          
      {this.state.loading ?
        <Loading /> 
        :
        <>
        <Notification 
          showNotification={this.state.showNotification}
          action={this.state.action}
          hash={this.state.hash}
          ref={this.notificationOne}
          trxStatus={this.state.trxStatus}
          confirmNum={this.state.confirmNum}
        />
        <div className='row mt-1'></div>
        <h1 className='mt-2' id='title'>Counter</h1>
        <h1>Admin: {this.state.admin}</h1>
        <h2>Count: {this.state.count} </h2>
        <button className='btn btn-primary' onClick={() => this.increment()}>Increment</button>
      </>
      }

          <div className='row justify-content-center mt-4'>
              Count Contract on Etherscan: 
            <a className='ml-3' href={`https://ropsten.etherscan.io/address/${this.state.countContractAddress}`} target='_blank'>Etherscan</a>
          </div>
          <div className='row justify-content-center mt-4'>
              Count Caller Contract on Etherscan: 
            <a className='ml-3' href={`https://ropsten.etherscan.io/address/${this.state.callerContractAddress}`} target='_blank'>Etherscan</a>
          </div>
    </div>
    );
  }
}

export default App;
