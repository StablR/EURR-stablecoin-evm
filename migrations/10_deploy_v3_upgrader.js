require("dotenv").config();
const some = require("lodash/some");

const FiatTokenV3 = artifacts.require("FiatTokenV3");
const FiatTokenProxy = artifacts.require("FiatTokenProxy");
const V3Upgrader = artifacts.require("V3Upgrader");

const { PROXY_ADMIN_ADDRESS = "", PROXY_CONTRACT_ADDRESS = "" } = process.env;

let proxyAdminAddress = PROXY_ADMIN_ADDRESS;
let proxyContractAddress = PROXY_CONTRACT_ADDRESS;

module.exports = async (deployer, network) => {
  if (some(["development", "coverage"], (v) => network.includes(v))) {
    // DO NOT USE THIS ADDRESS IN PRODUCTION
    proxyAdminAddress = "0x2F560290FEF1B3Ada194b6aA9c40aa71f8e95598";
    proxyContractAddress = (await FiatTokenProxy.deployed()).address;
  }
  proxyContractAddress =
    proxyContractAddress || (await FiatTokenProxy.deployed()).address;

  const fiatTokenV3 = await FiatTokenV3.deployed();

  console.log(`Proxy Admin:     ${proxyAdminAddress}`);
  console.log(`FiatTokenProxy:  ${proxyContractAddress}`);
  console.log(`FiatTokenV3:     ${fiatTokenV3.address}`);

  if (!proxyAdminAddress) {
    throw new Error("PROXY_ADMIN_ADDRESS must be provided in config.js");
  }

  console.log("Deploying V3Upgrader contract...");

  const v3Upgrader = await deployer.deploy(
    V3Upgrader,
    proxyContractAddress,
    fiatTokenV3.address,
    proxyAdminAddress,
    "EUR Coin"
  );

  console.log(`>>>>>>> Deployed V3Upgrader at ${v3Upgrader.address} <<<<<<<`);
};
