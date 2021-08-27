const MyPermissionModule = artifacts.require("MyPermissionModule");
const ProxyFactory = artifacts.require("./proxies/GnosisSafeProxyFactory.sol");

// const truffleContract = require("@truffle/contract")
// const ProxyFactoryInfo = require("@gnosis.pm/safe-contracts/build/contracts/GnosisSafeProxyFactory.json");
// const ProxyFactory = truffleContract(ProxyFactoryInfo);
// ProxyFactory.setProvider(web3.currentProvider);



module.exports = async function(deployer, network, accounts) {

    await deployer.deploy(ProxyFactory, {from: accounts[0]});
    const proxyFactory = await ProxyFactory.deployed();
    await deployer.deploy(MyPermissionModule, {from: accounts[0]});
    const myPermissionModuleMasterCopy = await MyPermissionModule.deployed();
    let moduleData = await myPermissionModuleMasterCopy.contract.methods.setup(accounts[0], [accounts[1]]).encodeABI();
    let proxyModuleAddress = await proxyFactory.contract.methods.createProxy(myPermissionModuleMasterCopy.address, moduleData).call({from: accounts[0]});
    console.log('==========================================');
    console.log(network, accounts);
    console.log('==========================================');
    console.log(myPermissionModuleMasterCopy.address, proxyModuleAddress);
    console.log('==========================================');
};
