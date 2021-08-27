// const Web3 = require('web3');
// var web3 = new Web3(Web3.givenProvider || "ws://localhost:8546");


const truffleAssert = require('truffle-assertions');
const utils = require('@gnosis.pm/safe-contracts/test/utils/general')

const truffleContract = require("@truffle/contract")




const GnosisSafeBuildInfo = require("@gnosis.pm/safe-contracts/build/contracts/GnosisSafe.json")
const GnosisSafe = truffleContract(GnosisSafeBuildInfo)
GnosisSafe.setProvider(web3.currentProvider)
const GnosisSafeProxyBuildInfo = require("@gnosis.pm/safe-contracts/build/contracts/GnosisSafeProxy.json")
const GnosisSafeProxy = truffleContract(GnosisSafeProxyBuildInfo)
GnosisSafeProxy.setProvider(web3.currentProvider)


const CreateAndAddModules = artifacts.require("./libraries/CreateAndAddModules.sol");
const ProxyFactoryInfo = require("@gnosis.pm/safe-contracts/build/contracts/GnosisSafeProxyFactory.json");
const ProxyFactory = truffleContract(ProxyFactoryInfo);
ProxyFactory.setProvider(web3.currentProvider);
const MyPermissionModule = artifacts.require("./MyPermissionModule.sol");

// const AllowanceModule = artifacts.require("./AllowanceModule.sol")
// const TestToken = artifacts.require("./TestToken.sol")

contract('my permission module', function(accounts) {
    let lw
    let gnosisSafe
    let safeModule
    let myPermissionModule

    // admin
    let Bob = accounts[4];
    // assistant
    let Alice= accounts[5];

    const CALL = 0
    const ADDRESS_0 = "0x0000000000000000000000000000000000000000"

    beforeEach(async function() {
        // Create lightwallet
        lw = await utils.createLightwallet()
        // Bob = lw.accounts[0];
        // Alice = lw.accounts[1];

        // Create Master Copies
        let proxyFactory = await ProxyFactory.new({ from: accounts[0] })
        console.log("proxyFactory address: ", proxyFactory.address);
        let createAndAddModules = await CreateAndAddModules.new({ from: accounts[0] })
        // let gnosisSafeMasterCopy = await utils.deployContract("deploying Gnosis Safe Mastercopy", GnosisSafe)
        let myPermissionModuleMasterCopy = await MyPermissionModule.new({ from: accounts[0] })
        console.log("myPermissionModuleMasterCopy address: ", myPermissionModuleMasterCopy.address);
        // Create Gnosis Safe and MyPermission Module in one transactions
        let moduleData = await myPermissionModuleMasterCopy.contract.methods.setup(Bob, [Alice]).encodeABI()
        
        let proxyFactoryData = await proxyFactory.contract.methods.createProxy(myPermissionModuleMasterCopy.address, moduleData).encodeABI()
        let modulesCreationData = utils.createAndAddModulesData([proxyFactoryData])
        let createAndAddModulesData = createAndAddModules.contract.methods.createAndAddModules(proxyFactory.address, modulesCreationData).encodeABI()

        const gnosisSafeMasterCopy = await GnosisSafe.new({ from: accounts[0] })
        const proxy = await GnosisSafeProxy.new(gnosisSafeMasterCopy.address, { from: accounts[0] })
        gnosisSafe = await GnosisSafe.at(proxy.address)
        await gnosisSafe.setup([Bob, Alice, accounts[1]], 2, createAndAddModules.address, createAndAddModulesData, ADDRESS_0, ADDRESS_0, 0, ADDRESS_0, { from: accounts[0] })
    })

    // let execTransaction = async function(to, value, data, operation, message) {
    //     let nonce = await gnosisSafe.nonce()
    //     let transactionHash = await gnosisSafe.getTransactionHash(to, value, data, operation, 0, 0, 0, ADDRESS_0, ADDRESS_0, nonce)
    //     let sigs = utils.signTransaction(lw, [lw.accounts[0], lw.accounts[1]], transactionHash)
    //     utils.logGasUsage(
    //         'execTransaction ' + message,
    //         await gnosisSafe.execTransaction(to, value, data, operation, 0, 0, 0, ADDRESS_0, ADDRESS_0, sigs, { from: accounts[0] })
    //     )
    // }

    it('check added module', async () => {
        console.log("-----------------------------------------------------------")
        console.log(await gnosisSafe.contract.methods.getModules().encodeABI());
        let modules = await gnosisSafe.getModules();
        console.log("module address:", modules[0]);
        myPermissionModule = await MyPermissionModule.at(modules[0]);
        assert.equal(await myPermissionModule.manager.call(), gnosisSafe.address);
        const admin = await myPermissionModule.admin.call();
        // check if Bob is the admin
        assert.equal(admin, Bob);

        // Deposit 10 eth
        let depositeAmount = web3.utils.toWei("10", 'ether');
        await web3.eth.sendTransaction({from: accounts[0], to: gnosisSafe.address, value: depositeAmount});
        // Bob grants Alice 1 ether to send to account[3]
        const NEXT_YEAR = 1661416525;
        let allowanceAmount = web3.utils.toWei("1", 'ether');
        await myPermissionModule.updatePermission( Alice, accounts[3], true, NEXT_YEAR, allowanceAmount, 0, {from: Bob});
        // Withdraw to whitelisted account should fail as Alice has no permission to send to account[2]
        await truffleAssert.reverts(
            myPermissionModule.executeByAssistantWhitelisted(
                accounts[2], allowanceAmount, "0x", {from: Alice}
            ),
            "Target account is not granted"
        );        
        // Alice should be able to send 1 ether account[3]
        await myPermissionModule.executeByAssistantWhitelisted(
            accounts[3], allowanceAmount, "0x", {from: Alice}
        );
        assert.equal(await web3.eth.getBalance(gnosisSafe.address), web3.utils.toWei("9", 'ether'));




        // let enableModuleData = await gnosisSafe.contract.methods.enableModule(safeModule.address).encodeABI()
        // await execTransaction(gnosisSafe.address, 0, enableModuleData, CALL, "enable module")
        // let modules = await gnosisSafe.getModules()
        // assert.equal(1, modules.length)
        // assert.equal(safeModule.address, modules[0])

        // // Add delegates
        // let addDelegateData = await safeModule.contract.methods.addDelegate(lw.accounts[4]).encodeABI()
        // await execTransaction(safeModule.address, 0, addDelegateData, CALL, "add delegate 1")

        // let addDelegateData2 = await safeModule.contract.methods.addDelegate(lw.accounts[5]).encodeABI()
        // await execTransaction(safeModule.address, 0, addDelegateData2, CALL, "add delegate 2")

        // let delegates = await safeModule.getDelegates(gnosisSafe.address, 0, 10)
        // assert.equal(2, delegates.results.length)
        // assert.equal(lw.accounts[5], delegates.results[0].toLowerCase())
        // assert.equal(lw.accounts[4], delegates.results[1].toLowerCase())

        // // Remove delegate
        // let removeDelegateData = await safeModule.contract.methods.removeDelegate(lw.accounts[5], true).encodeABI()
        // await execTransaction(safeModule.address, 0, removeDelegateData, CALL, "remove delegate 2")
        // delegates = await safeModule.getDelegates(gnosisSafe.address, 0, 10)
        // assert.equal(1, delegates.results.length)
        // assert.equal(lw.accounts[4], delegates.results[0].toLowerCase())
    })


})