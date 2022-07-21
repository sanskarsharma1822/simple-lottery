const { ethers, network } = require("hardhat")
const fs = require("fs")

const FRONT_END_CONTRACT_ADDRESS_FILE =
    "../hardhat-lottery-front-end/constants/contractAddress.json"
const FRONT_END_ABI = "../hardhat-lottery-front-end/constants/abi.json"

module.exports = async function () {
    if (process.env.UPDATE_FRONT_END) {
        console.log("Updating front end ...")
        await updateContractAddresses()
        await updateAbi()
    }
}

const updateContractAddresses = async function () {
    const lottery = await ethers.getContract("Lottery")
    const chainId = network.config.chainId.toString()
    const currentAddresses = JSON.parse(fs.readFileSync(FRONT_END_CONTRACT_ADDRESS_FILE, "utf8"))
    //const contractAddresses = JSON.parse(fs.readFileSync(frontEndContractsFile, "utf8"))
    console.log(chainId)
    if (chainId in currentAddresses) {
        if (!currentAddresses[chainId].includes(lottery.address)) {
            currentAddresses[chainId].push(lottery.address)
        }
    } else {
        currentAddresses[chainId] = [lottery.address]
    }
    fs.writeFileSync(FRONT_END_CONTRACT_ADDRESS_FILE, JSON.stringify(currentAddresses))
}

const updateAbi = async function () {
    const lottery = await ethers.getContract("Lottery")
    fs.writeFileSync(FRONT_END_ABI, lottery.interface.format(ethers.utils.FormatTypes.json))
}
