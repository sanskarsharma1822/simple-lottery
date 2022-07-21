const { network, ethers } = require("hardhat")
const { networkConfig, developmentChains } = require("../helper-hardhat-config")
const { verify } = require("../utils/verify.js")
require("dotenv").config()
const VRF_SUB_FUND_AMOUNT = ethers.utils.parseEther("2")

module.exports = async function ({ deployments, getNamedAccounts }) {
    const { deploy, log } = deployments
    const { deployer } = await getNamedAccounts()
    const chainId = network.config.chainId
    let vrfCoordinatorV2Address, subscriptionId
    if (developmentChains.includes(network.name)) {
        const vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock")
        vrfCoordinatorV2Address = vrfCoordinatorV2Mock.address
        const transactionResponse = await vrfCoordinatorV2Mock.createSubscription()
        const transactionReciept = await transactionResponse.wait(1)
        subscriptionId = transactionReciept.events[0].args.subId
        await vrfCoordinatorV2Mock.fundSubscription(subscriptionId, VRF_SUB_FUND_AMOUNT)
    } else {
        vrfCoordinatorV2Address = networkConfig[chainId]["vrfV2Coordinator"]
        subscriptionId = networkConfig[chainId]["subscriptionId"]
    }

    console.log("Deploying Lottery Contract")
    const args = [
        vrfCoordinatorV2Address,
        networkConfig[chainId]["entranceFees"],
        networkConfig[chainId]["gasLane"],
        networkConfig[chainId]["interval"],
        subscriptionId,
        networkConfig[chainId]["callBackGasLimit"],
    ]
    const lottery = await deploy("Lottery", {
        from: deployer,
        args: args,
        log: true,
        waitingConfirmations: network.config.blockConfirmations || 1,
    })
    console.log("Lottery Contract Deployed")
    console.log("-------------------------------------------")

    // if (!developmentChains.includes(network.name) && process.env.ETHERSCAN_API_KEY) {
    //     console.log("Verifying ...")
    //     await verify(lottery.address, args)
    // }
}

module.exports.tags = ["all", "lottery"]
