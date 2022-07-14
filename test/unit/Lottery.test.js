const { assert, expect } = require("chai")
const { network, getNamedAccounts, deployments, ethers } = require("hardhat")
const { developmentChains, networkConfig } = require("../../helper-hardhat-config.js")

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("Lottery", () => {
          let lottery, vrfCoordinatorMock, deployer, interval, lotteryEntranceFees
          beforeEach(async function () {
              deployer = (await getNamedAccounts()).deployer
              await deployments.fixture(["all"])
              lottery = await ethers.getContract("Lottery", deployer)
              vrfCoordinatorMock = await ethers.getContract("VRFCoordinatorV2Mock", deployer)
              interval = await lottery.getInterval()
              lotteryEntranceFees = await lottery.getEntryFee()
          })

          describe("constructor", () => {
              it("intitiallizes the raffle correctly", async function () {
                  const lotteryState = await lottery.getLotteryState()
                  assert.equal(lotteryState.toString(), "0")
                  assert.equal(
                      interval.toString(),
                      networkConfig[network.config.chainId]["interval"]
                  )
              })
          })

          describe("enterLottery", () => {
              it("reverts when you don't pay enough", async function () {
                  await expect(lottery.enterLottery()).to.be.revertedWith(
                      "Lottery__NotEnoughEthEntered"
                  )
              })

              it("records player when they enter", async function () {
                  await lottery.enterLottery({ value: lotteryEntranceFees })
                  const player = await lottery.getPlayer(0)
                  assert.equal(player, deployer)
              })

              it("emits event on enter", async function () {
                  await expect(lottery.enterLottery({ value: lotteryEntranceFees })).to.emit(
                      lottery,
                      "LotteryEnter"
                  )
              })

              it("doesn't allow entrance when raffle is calculating", async function () {
                  await lottery.enterLottery({ value: lotteryEntranceFees })
                  await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
                  await network.provider.send("evm_mine", [])
                  await lottery.performUpkeep([])
                  await expect(
                      lottery.enterLottery({ value: lotteryEntranceFees })
                  ).to.be.revertedWith("Lottery__LotteryNotOpen()")
              })
          })

          describe("checkUpkeep", () => {
              it("returns false if people haven't sent any ETH", async function () {
                  await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
                  await network.provider.send("evm_mine", [])
                  const { upkeepNeeded } = await lottery.callStatic.checkUpkeep([])
                  assert(!upkeepNeeded)
              })

              it("returns false if raffle isn't open", async function () {
                  await lottery.enterLottery({ value: lotteryEntranceFees })
                  await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
                  await network.provider.send("evm_mine", [])
                  await lottery.performUpkeep([])
                  const lotteryState = await lottery.getLotteryState()
                  const { upkeepNeeded } = await lottery.callStatic.checkUpkeep([])
                  assert(lotteryState.toString() == "1" && !upkeepNeeded)
              })

              it("returns false if enough time hasn't passed", async function () {
                  await lottery.enterLottery({ value: lotteryEntranceFees })
                  await network.provider.send("evm_increaseTime", [interval.toNumber() - 1])
                  await network.provider.send("evm_mine", [])
                  const { upkeepNeeded } = await lottery.callStatic.checkUpkeep([])
                  assert(!upkeepNeeded)
              })

              it("returns true if enough time has passed, has players, eth, and is open", async function () {
                  await lottery.enterLottery({ value: lotteryEntranceFees })
                  await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
                  await network.provider.send("evm_mine", [])
                  const { upkeepNeeded } = await lottery.callStatic.checkUpkeep([])
                  assert(upkeepNeeded)
              })
          })

          describe("performUpkeep", () => {
              it("can only run if checkupkeep is true", async function () {
                  await lottery.enterLottery({ value: lotteryEntranceFees })
                  await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
                  await network.provider.send("evm_mine", [])
                  const tx = await lottery.performUpkeep([])
                  assert(tx)
              })

              it("reverts if checkup is false", async function () {
                  await expect(lottery.performUpkeep([])).to.be.revertedWith(
                      "Lottery__UpkeepNotNeeded"
                  )
              })

              it("updates the raffle state and emits a requestId", async function () {
                  await lottery.enterLottery({ value: lotteryEntranceFees })
                  await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
                  await network.provider.send("evm_mine", [])
                  const transactionResponse = await lottery.performUpkeep([])
                  const transactionReciept = await transactionResponse.wait(1)
                  const requestId = await transactionReciept.events[1].args.requestId
                  const lotteryState = await lottery.getLotteryState()
                  assert(requestId && lotteryState.toString() == "1")
              })
          })

          describe("fulfillRandomWords", () => {
              beforeEach(async function () {
                  await lottery.enterLottery({ value: lotteryEntranceFees })
                  await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
                  await network.provider.send("evm_mine", [])
              })

              it("can only be called after performupkeep", async function () {
                  await expect(
                      vrfCoordinatorMock.fulfillRandomWords(0, lottery.address)
                  ).to.be.revertedWith("nonexistent request")
                  await expect(
                      vrfCoordinatorMock.fulfillRandomWords(1, lottery.address)
                  ).to.be.revertedWith("nonexistent request")
              })

              it("picks a winner, resets, and sends money", async function () {
                  const addEntry = 3
                  const startEntry = 1
                  const accounts = await ethers.getSigners()
                  for (i = startEntry; i < startEntry + addEntry; i++) {
                      const accountsConnected = lottery.connect(accounts[i])
                      await accountsConnected.enterLottery({ value: lotteryEntranceFees })
                  }
                  const startingTime = await lottery.getLastTimeStamp()
                  const startingBalance = await accounts[1].getBalance()
                  await new Promise(async (resolve, reject) => {
                      lottery.once("WinnerPicked", async function () {
                          try {
                              const lotteryState = await lottery.getLotteryState()
                              const endingTime = await lottery.getLastTimeStamp()
                              const numOfPlayers = await lottery.getNumOfPlayers()
                              const recentWinner = await lottery.getRecentWinner()
                              const endingBalance = await accounts[1].getBalance()
                              assert.equal(numOfPlayers.toString(), "0")
                              assert.equal(lotteryState.toString(), "0")
                              assert(endingTime > startingTime)
                              assert.equal(
                                  endingBalance.toString(),
                                  startingBalance
                                      .add(
                                          lotteryEntranceFees.mul(addEntry).add(lotteryEntranceFees)
                                      )
                                      .toString()
                              )
                              resolve()
                          } catch (e) {
                              reject(e)
                          }
                      })
                      const txResponse = await lottery.performUpkeep([])
                      const txReciept = await txResponse.wait(1)
                      await vrfCoordinatorMock.fulfillRandomWords(
                          txReciept.events[1].args.requestId,
                          lottery.address
                      )
                  })
              })
          })
      })
