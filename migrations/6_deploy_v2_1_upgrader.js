require("dotenv").config();
const some = require("lodash/some");

const FiatTokenV2_1 = artifacts.require("FiatTokenV2_1");
const FiatTokenProxy = artifacts.require("FiatTokenProxy");
const V2_1Upgrader = artifacts.require("V2_1Upgrader");

const { PROXY_ADMIN_ADDRESS = "", PROXY_CONTRACT_ADDRESS = "" } = process.env;

let proxyAdminAddress = PROXY_ADMIN_ADDRESS;
let proxyContractAddress = PROXY_CONTRACT_ADDRESS;

module.exports = async (deployer, network) => {
  if (some(["development", "coverage"], (v) => network.includes(v))) {
    // DO NOT USE THESE ADDRESSES IN PRODUCTION
    proxyAdminAddress = "0x2F560290FEF1B3Ada194b6aA9c40aa71f8e95598";
    proxyContractAddress = (await FiatTokenProxy.deployed()).address;
  }
  proxyContractAddress =
    proxyContractAddress || (await FiatTokenProxy.deployed()).address;

  const fiatTokenV2_1 = await FiatTokenV2_1.deployed();

  console.log(`Proxy Admin:     ${proxyAdminAddress}`);
  console.log(`FiatTokenProxy:  ${proxyContractAddress}`);
  console.log(`FiatTokenV2_1:   ${fiatTokenV2_1.address}`);

  if (!proxyAdminAddress) {
    throw new Error("PROXY_ADMIN_ADDRESS must be provided in config.js");
  }

  console.log("Deploying V2_1Upgrader contract...");

  const v2_1Upgrader = await deployer.deploy(
    V2_1Upgrader,
    proxyContractAddress,
    fiatTokenV2_1.address,
    proxyAdminAddress
  );

  console.log(
    `>>>>>>> Deployed V2_1Upgrader at ${v2_1Upgrader.address} <<<<<<<`
  );
};
