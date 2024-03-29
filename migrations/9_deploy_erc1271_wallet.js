const some = require("lodash/some");

const MockERC1271Wallet = artifacts.require("MockERC1271Wallet");

let { MOCK_ERC1271_WALLET_OWNER_ADDRESS = "" } = process.env;

module.exports = async (deployer, network, accounts) => {
  const isTestEnvironment = some(["development", "coverage"], (v) =>
    network.includes(v)
  );

  if (isTestEnvironment) {
    MOCK_ERC1271_WALLET_OWNER_ADDRESS = accounts[0];
    console.log(
      "MOCK_ERC1271_WALLET_OWNER_ADDRESS",
      MOCK_ERC1271_WALLET_OWNER_ADDRESS
    );
  }

  if (!MOCK_ERC1271_WALLET_OWNER_ADDRESS) {
    throw new Error(
      "MOCK_ERC1271_WALLET_OWNER_ADDRESS must be provided in config.js"
    );
  }

  console.log("Deploying MockERC1271Wallet contract...");

  await deployer.deploy(MockERC1271Wallet, MOCK_ERC1271_WALLET_OWNER_ADDRESS);
  const walletAddress = (await MockERC1271Wallet.deployed()).address;

  console.log(`>>>>>>> Deployed MockERC1271Wallet at ${walletAddress} <<<<<<<`);
};
