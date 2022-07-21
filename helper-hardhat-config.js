const { ethers } = require("hardhat")

const networkConfig = {
    4: {
        name: "rinkeby",
        vrfV2Coordinator: "0x6168499c0cFfCaCD319c818142124B7A15E857ab",
        entranceFees: ethers.utils.parseEther("0.01"),
        gasLane: "0xd89b2bf150e3b9e13446986e571fb9cab24b13cea0a43ea20a6049a85cc807cc",
        subscriptionId: 8378,
        callBackGasLimit: "500000",
        interval: "30",
    },
    31337: {
        name: "localhost",
        entranceFees: ethers.utils.parseEther("0.01"),
        gasLane: "0xd89b2bf150e3b9e13446986e571fb9cab24b13cea0a43ea20a6049a85cc807cc",
        callBackGasLimit: "500000",
        interval: "30",
    },
}

const developmentChains = ["hardhat", "localhost"]

const BASE_FEE = ethers.utils.parseEther("0.25")
const GAS_PRICE_LINK = 1e9

module.exports = {
    networkConfig,
    developmentChains,
    BASE_FEE,
    GAS_PRICE_LINK,
}
