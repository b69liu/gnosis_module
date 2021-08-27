var utils = require('./general')
var artifacts = { "require": (name) => { let contractInfo = require(`./build/contracts/${name}.json`); let contract = truffleContract(contractInfo); return contract;}}
const truffleContract = require("@truffle/contract")

const Web3 = require('web3');
var web3 = new Web3(Web3.givenProvider || "http://localhost:7545");


const GnosisSafeBuildInfo = require("@gnosis.pm/safe-contracts/build/contracts/GnosisSafe.json")
const GnosisSafe = truffleContract(GnosisSafeBuildInfo)
GnosisSafe.setProvider(web3.currentProvider)
const GnosisSafeProxyBuildInfo = require("@gnosis.pm/safe-contracts/build/contracts/GnosisSafeProxy.json")
const GnosisSafeProxy = truffleContract(GnosisSafeProxyBuildInfo)
GnosisSafeProxy.setProvider(web3.currentProvider)


const CreateAndAddModules = artifacts.require("CreateAndAddModules");
CreateAndAddModules.setProvider(web3.currentProvider);
const ProxyFactoryInfo = require("@gnosis.pm/safe-contracts/build/contracts/GnosisSafeProxyFactory.json");
const ProxyFactory = truffleContract(ProxyFactoryInfo);
ProxyFactory.setProvider(web3.currentProvider);
const MyPermissionModule = artifacts.require("MyPermissionModule");
MyPermissionModule.setProvider(web3.currentProvider);

const ADDRESS_0 = "0x0000000000000000000000000000000000000000";

let gnosisSafe;

async function deployContract(accounts){
    const Bob = accounts[0];
    const Alice = accounts[1];
    // Create Master Copies
    let proxyFactory = await ProxyFactory.new({ from: accounts[0] })
    let createAndAddModules = await CreateAndAddModules.new({ from: accounts[0] })
    // let gnosisSafeMasterCopy = await utils.deployContract("deploying Gnosis Safe Mastercopy", GnosisSafe)
    let myPermissionModuleMasterCopy = await MyPermissionModule.new({ from: accounts[0] })
    // Create Gnosis Safe and MyPermission Module in one transactions
    let moduleData = await myPermissionModuleMasterCopy.contract.methods.setup(Bob, [Alice]).encodeABI()
    
    let proxyFactoryData = await proxyFactory.contract.methods.createProxy(myPermissionModuleMasterCopy.address, moduleData).encodeABI()
    let modulesCreationData = utils.createAndAddModulesData([proxyFactoryData])
    let createAndAddModulesData = createAndAddModules.contract.methods.createAndAddModules(proxyFactory.address, modulesCreationData).encodeABI()
    
    const gnosisSafeMasterCopy = await GnosisSafe.new({ from: accounts[0] })
    const proxy = await GnosisSafeProxy.new(gnosisSafeMasterCopy.address, { from: accounts[0] })
    gnosisSafe = await GnosisSafe.at(proxy.address)
    await gnosisSafe.setup([Bob, Alice, accounts[1]], 2, createAndAddModules.address, createAndAddModulesData, ADDRESS_0, ADDRESS_0, 0, ADDRESS_0, { from: accounts[0] })
    return gnosisSafe
}

async function deployModuleContract(accounts){
    const Bob = accounts[0];
    const Alice = accounts[1];
    // Create Master Copies
    let proxyFactory = await ProxyFactory.new({ from: accounts[0] })
    // let gnosisSafeMasterCopy = await utils.deployContract("deploying Gnosis Safe Mastercopy", GnosisSafe)
    let myPermissionModuleMasterCopy = await MyPermissionModule.new({ from: accounts[0] })
    // Create Gnosis Safe and MyPermission Module in one transactions
    let moduleData = await myPermissionModuleMasterCopy.contract.methods.setup(Bob, [Alice]).encodeABI()
    
    let proxyModuleAddress = await proxyFactory.contract.methods.createProxy(myPermissionModuleMasterCopy.address, moduleData).call({ from: accounts[0] });
    return [myPermissionModuleMasterCopy,proxyModuleAddress]
}




async function getMyPermissionModule(){
    let modules = await gnosisSafe.getModules();
    myPermissionModule = await MyPermissionModule.at(modules[0]);
    return myPermissionModule;
}

async function loadGnosis(address){
    myGnosis = await GnosisSafe.at(address);
    return myGnosis;
}


module.exports = {
    utils,
    GnosisSafe,
    MyPermissionModule,
    deployContract,
    getMyPermissionModule,
    loadGnosis,
    deployModuleContract
}

// const {utils,GnosisSafe, MyPermissionModule, deployContract, getMyPermissionModule, loadGnosis, deployModuleContract} = require("./deployScript.js");
// let gnosisSafe; deployContract(accounts).then(value =>{gnosisSafe=value});
// let myPermissionModule; getMyPermissionModule().then(value =>{myPermissionModule=value});
// let gnosisSafe; loadGnosis('0xE2A5Ab9Ca622b0D8cAB3481b38CbA3213dd4EEC2').then(value =>{gnosisSafe=value});

// let myPermissionModuleMasterCopy;let proxyModuleAddress; deployModuleContract(accounts).then(value =>{[myPermissionModuleMasterCopy,proxyModuleAddress]=value});