const { network } = require("hardhat")
const { developmentChains, BASE_FEE, GAS_PRICE_LINK } = require("../helper-hardhat-config.js")

module.exports = async function ({ getNamedAccounts, deployments }) {
    const { deploy, log } = deployments
    const { deployer } = await getNamedAccounts()
    const chainId = network.config.chainId

    if (developmentChains.includes(network.name)) {
        console.log("Local Network Detected. Deploying mocks ...")
        const args = [BASE_FEE, GAS_PRICE_LINK]
        await deploy("VRFCoordinatorV2Mock", {
            from: deployer,
            args: args,
            log: true,
        })

        console.log("Mocks Deployed")
        console.log("-------------------------------------------")
    }
}

module.exports.tags = ["all", "mock"]
