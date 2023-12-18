process.env.TS_NODE_FILES = "true";

require("dotenv").config();
require("ts-node/register/transpile-only");
// Fix Typescript callsite reporting
Object.defineProperty(Error, "prepareStackTrace", { writable: false });

const HDWalletProvider = require("@truffle/hdwallet-provider");

// Read config file if it exists
const { MNEMONIC, INFURA_KEY, GAS_PRICE_GWEI, ETHERSCAN_API_KEY } = process.env;

module.exports = {
  compilers: {
    solc: {
      version: "0.6.12",
      settings: {
        optimizer: {
          enabled: true,
          runs: 1000000,
        },
      },
    },
  },
  networks: {
    development: {
      host: "localhost",
      port: 8545,
      network_id: "*", // Match any network id
    },
    local_testnet: {
      host: "ganache",
      port: 8545,
      network_id: "*", // Match any network id
    },
    mainnet: {
      provider: infuraProvider("mainnet"),
      network_id: 1,
    },
    sepolia: {
      provider: infuraProvider("sepolia"),
      network_id: 11155111, // Sepolia's network ID
      gas: 10000000,
      gasPrice: (GAS_PRICE_GWEI ?? 50) * 1000000000, // default: 50 gwei (in wei)
      confirmations: 2, // Set the number of confirmations needed for a transaction
      timeoutBlocks: 200, // Set the timeout for transactions
      skipDryRun: false, // Skip the dry run option
    },
    ropsten: {
      provider: infuraProvider("ropsten"),
      network_id: 3,
      confirmations: 0, // # of confs to wait between deployments. (default: 0)
      gas: 5000000, // Ropsten has a lower block limit than mainnet
      gasPrice: (GAS_PRICE_GWEI ?? 50) * 1000000000, // default: 50 gwei (in wei)
      networkCheckTimeout: 120000,
      skipDryRun: false, // Skip dry run before migrations? (default: false for public nets )
    },
  },
  mocha: {
    timeout: 60000, // prevents tests from failing when pc is under heavy load
    reporter: "Spec",
  },
  plugins: ["solidity-coverage", "truffle-plugin-verify"],
  api_keys: {
    etherscan: ETHERSCAN_API_KEY,
  },
};

function infuraProvider(network) {
  return () => {
    if (!MNEMONIC) {
      console.error("A valid MNEMONIC must be provided in env variables");
      process.exit(1);
    }
    if (!INFURA_KEY) {
      console.error("A valid INFURA_KEY must be provided in env variables");
      process.exit(1);
    }
    return new HDWalletProvider(
      MNEMONIC,
      `https://${network}.infura.io/v3/${INFURA_KEY}`
    );
  };
}
